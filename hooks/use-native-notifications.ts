'use client'

import { useEffect, useRef, useState } from 'react'
import { useAlarmStore } from '@/lib/wellness/alarm-store'
import { onAlarmTapped, registerPush, syncAlarms } from '@/lib/native/notifications'
import { isNativeApp } from '@/services/step-counter'

/**
 * Hands alarm scheduling to Android, and registers the device for FCM.
 *
 * The web alarm monitor stays in place and keeps handling the in-app ringing
 * modal while the app is open. What this adds is the case the web version could
 * never cover: the alarm firing when the app is closed and the screen is off,
 * because Android — not JavaScript — is holding the trigger.
 */
export function useNativeNotifications() {
  const { alarms } = useAlarmStore()
  const [scheduled, setScheduled] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pushToken, setPushToken] = useState<string | null>(null)
  const registered = useRef(false)

  // Re-schedule whenever the alarm set changes. The signature keeps this from
  // firing on unrelated re-renders.
  const signature = JSON.stringify(
    alarms.map((alarm) => [alarm.id, alarm.time, alarm.enabled, alarm.days, alarm.label]),
  )

  useEffect(() => {
    if (!isNativeApp()) return
    let cancelled = false

    void (async () => {
      const result = await syncAlarms(alarms)
      if (cancelled) return
      setScheduled(result.scheduled)
      setError(result.error ?? null)
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  // FCM registration runs once per app start.
  useEffect(() => {
    if (!isNativeApp() || registered.current) return
    registered.current = true

    void (async () => {
      const result = await registerPush()
      if (result.token) setPushToken(result.token)
    })()
  }, [])

  // Tapping a scheduled alarm should open the app on that alarm.
  useEffect(() => {
    if (!isNativeApp()) return
    let dispose: (() => void) | undefined
    void onAlarmTapped(() => {
      // The in-app monitor picks the alarm up from the store on open; nothing
      // more is needed here beyond bringing the app forward, which Android does.
    }).then((cleanup) => {
      dispose = cleanup
    })
    return () => dispose?.()
  }, [])

  return { scheduled, error, pushToken, native: isNativeApp() }
}
