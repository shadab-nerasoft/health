import { Capacitor } from '@capacitor/core'
import { StepCounter, webStepStatus, type StepStatus } from '@/lib/native/step-counter'

/**
 * Environment detection plus a thin wrapper over the native plugin.
 *
 * Everything above this file is platform-agnostic: components ask for steps and
 * a status, and never learn whether the answer came from Android or from the
 * browser accelerometer.
 */

/** True only inside the Capacitor Android shell, never in a browser or PWA. */
export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

export function nativePlatform() {
  return Capacitor.getPlatform()
}

export async function readStatus(): Promise<StepStatus> {
  if (!isNativeApp()) return webStepStatus
  try {
    return await StepCounter.getStatus()
  } catch {
    // A bridge failure must not blank the dashboard; degrade to the web path.
    return webStepStatus
  }
}

export async function startNativeTracking(): Promise<StepStatus> {
  return StepCounter.start()
}

export async function stopNativeTracking(): Promise<StepStatus> {
  return StepCounter.stop()
}

export async function requestActivityPermission(): Promise<StepStatus> {
  return StepCounter.requestPermission()
}

export async function readTodaySteps(): Promise<number> {
  if (!isNativeApp()) return 0
  const reading = await StepCounter.getTodaySteps()
  return Number.isFinite(reading.steps) ? reading.steps : 0
}

/**
 * Per-day totals the native layer recorded while the app was closed. Used to
 * backfill days the web store never saw.
 */
export async function readHistory(days = 30): Promise<Record<string, number>> {
  if (!isNativeApp()) return {}
  try {
    const result = await StepCounter.getHistory({ days })
    return result.days ?? {}
  } catch {
    return {}
  }
}

export async function setBackgroundTracking(enabled: boolean): Promise<StepStatus> {
  if (enabled) {
    // The persistent notification is mandatory on Android 13+, so ask for the
    // permission that lets the user actually see it.
    await StepCounter.requestNotificationPermission().catch(() => undefined)
  }
  return StepCounter.setBackgroundService({ enabled })
}

/**
 * Hand the native layer the metrics it cannot measure: the step goal, water
 * logged today, and the latest heart rate. The widget and the ongoing
 * notification read these straight from storage, so they stay accurate with the
 * app closed.
 */
export async function pushMetrics(metrics: {
  stepGoal?: number
  waterMl?: number
  waterGoalMl?: number
  heartRate?: number
}) {
  if (!isNativeApp()) return
  try {
    await StepCounter.setMetrics(metrics)
  } catch {
    // Widget freshness is not worth surfacing an error to the user over.
  }
}

export async function openAppSettings() {
  if (!isNativeApp()) return
  await StepCounter.openSettings()
}

export type { StepStatus }
