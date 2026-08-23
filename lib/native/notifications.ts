'use client'

import { PushNotifications } from '@capacitor/push-notifications'
import { LocalNotifications, type ScheduleOptions } from '@capacitor/local-notifications'
import { createClient } from '@/lib/supabase/client'
import { isNativeApp } from '@/services/step-counter'
import type { AlarmItem } from '@/lib/wellness/alarm-store'

/**
 * Native Android notifications: remote (FCM) and scheduled (alarms).
 *
 * The alarm half is the one that actually mattered. The web implementation runs
 * `setInterval(check, 1000)` and compares the clock, which means alarms simply
 * do not fire once the screen is off — the same class of problem the step
 * counter had. Scheduling through LocalNotifications hands the trigger to
 * Android's AlarmManager, so it fires whether or not the app, the WebView, or
 * any JavaScript is alive.
 */

const CHANNEL_ID = 'zsteps_alarms'

// -------------------------------------------------------------- FCM (remote)

export type PushRegistration = {
  supported: boolean
  granted: boolean
  token?: string
  error?: string
}

/**
 * Register for FCM and persist the token.
 *
 * Note this is a *device token*, not a Web Push subscription — the existing
 * `push_subscriptions` row shape (endpoint/p256dh/auth) is a Web Push artefact
 * and does not apply here. The token is stored in `endpoint` so one table
 * serves both transports, with the other two columns marked as native.
 */
export async function registerPush(): Promise<PushRegistration> {
  if (!isNativeApp()) return { supported: false, granted: false }

  try {
    let permission = await PushNotifications.checkPermissions()
    if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
      permission = await PushNotifications.requestPermissions()
    }
    if (permission.receive !== 'granted') {
      return { supported: true, granted: false }
    }

    const token = await new Promise<string | undefined>((resolve) => {
      let settled = false
      const finish = (value?: string) => {
        if (settled) return
        settled = true
        resolve(value)
      }

      void PushNotifications.addListener('registration', (registration) => finish(registration.value))
      void PushNotifications.addListener('registrationError', () => finish(undefined))
      void PushNotifications.register()

      // Registration is asynchronous and can silently never arrive (no Play
      // Services, no network). Do not hang the caller on it.
      setTimeout(() => finish(undefined), 10_000)
    })

    if (token) await saveToken(token)
    return { supported: true, granted: true, token }
  } catch (cause) {
    return {
      supported: true,
      granted: false,
      error: cause instanceof Error ? cause.message : 'Push registration failed.',
    }
  }
}

async function saveToken(token: string) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('push_subscriptions').upsert(
      {
        endpoint: token,
        p256dh: 'fcm',
        auth: 'android',
        user_id: user.id,
      },
      { onConflict: 'endpoint' },
    )
  } catch {
    // A token we cannot store just means no server-sent push; alarms are local
    // and keep working regardless.
  }
}

// ---------------------------------------------------------- alarms (local)

/**
 * Capacitor notification ids must fit in a 32-bit int, and each alarm needs a
 * distinct id per weekday so Android can hold several repeating triggers for
 * one alarm. Derived rather than random so rescheduling replaces cleanly.
 */
function notificationId(alarmId: string, weekday: number) {
  let hash = 0
  for (let index = 0; index < alarmId.length; index += 1) {
    hash = (hash * 31 + alarmId.charCodeAt(index)) | 0
  }
  return Math.abs(hash % 1_000_000) * 10 + weekday
}

/** The app stores 0=Sunday; Capacitor/Android expect 1=Sunday. */
function toCapacitorWeekday(day: number) {
  return ((day % 7) + 7) % 7 + 1
}

async function ensureChannel() {
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Alarms and reminders',
      description: 'Scheduled wellness alarms and reminders.',
      importance: 5,
      visibility: 1,
      vibration: true,
    })
  } catch {
    // Channels only exist on Android 8+; failure elsewhere is expected.
  }
}

export async function requestAlarmPermission(): Promise<boolean> {
  if (!isNativeApp()) return false
  try {
    let permission = await LocalNotifications.checkPermissions()
    if (permission.display === 'prompt' || permission.display === 'prompt-with-rationale') {
      permission = await LocalNotifications.requestPermissions()
    }
    if (permission.display !== 'granted') return false
    await ensureChannel()
    return true
  } catch {
    return false
  }
}

/**
 * Replace every scheduled alarm with the current set.
 *
 * Cancel-then-schedule rather than diffing: the whole set is small, and a
 * rebuild cannot drift out of step with the store the way incremental updates
 * can.
 */
export async function syncAlarms(alarms: AlarmItem[]): Promise<{ scheduled: number; error?: string }> {
  if (!isNativeApp()) return { scheduled: 0 }

  try {
    const granted = await requestAlarmPermission()
    if (!granted) return { scheduled: 0, error: 'Notification permission is required for alarms.' }

    const existing = await LocalNotifications.getPending()
    if (existing.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: existing.notifications.map(({ id }) => ({ id })) })
    }

    const notifications: ScheduleOptions['notifications'] = []
    for (const alarm of alarms) {
      if (!alarm.enabled) continue
      const [hourText, minuteText] = alarm.time.split(':')
      const hour = Number(hourText)
      const minute = Number(minuteText)
      if (!Number.isInteger(hour) || !Number.isInteger(minute)) continue

      // No days selected means every day; Android repeats on `on` matches.
      const days = alarm.days.length > 0 ? alarm.days : [0, 1, 2, 3, 4, 5, 6]
      for (const day of days) {
        const weekday = toCapacitorWeekday(day)
        notifications.push({
          id: notificationId(alarm.id, weekday),
          title: `⏰ ${alarm.label}`,
          body: `It's ${alarm.time}. Time for your ${alarm.label}.`,
          channelId: CHANNEL_ID,
          schedule: {
            on: { weekday, hour, minute },
            // Fires even in Doze, which is the whole point of an alarm.
            allowWhileIdle: true,
          },
          smallIcon: 'ic_stat_steps',
          extra: { alarmId: alarm.id },
        })
      }
    }

    if (notifications.length > 0) await LocalNotifications.schedule({ notifications })
    return { scheduled: notifications.length }
  } catch (cause) {
    return {
      scheduled: 0,
      error: cause instanceof Error ? cause.message : 'Could not schedule alarms.',
    }
  }
}

/** Fires when the user taps a scheduled alarm notification. */
export async function onAlarmTapped(handler: (alarmId: string) => void) {
  if (!isNativeApp()) return () => undefined
  const handle = await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    const alarmId = action.notification.extra?.alarmId
    if (typeof alarmId === 'string') handler(alarmId)
  })
  return () => void handle.remove()
}
