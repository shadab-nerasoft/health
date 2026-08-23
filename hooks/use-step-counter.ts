'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { App } from '@capacitor/app'
import { useMotionPedometer, type MotionStatus } from '@/hooks/use-motion-pedometer'
import { StepCounter, type StepPermission, type StepStatus } from '@/lib/native/step-counter'
import {
  isNativeApp,
  openAppSettings,
  readHistory,
  readStatus,
  readTodaySteps,
  requestActivityPermission,
  setBackgroundTracking,
  startNativeTracking,
  stopNativeTracking,
} from '@/services/step-counter'

export type StepSource = 'native' | 'motion'

/** Superset of the browser statuses, plus the Android-only 'blocked' state. */
export type StepCounterStatus = MotionStatus | 'blocked'

type Options = {
  paused?: boolean
  /** Native reported an authoritative day total; replace the stored value. */
  onTotal: (steps: number) => void
  /** The browser pedometer detected steps; add them to the stored value. */
  onDelta: (steps: number) => void
  /** Per-day totals recorded natively while the app was closed. */
  onHistory?: (days: Record<string, number>) => void
}

function statusFromNative(status: StepStatus, paused: boolean): StepCounterStatus {
  if (!status.sensorAvailable) return 'unsupported'
  if (status.permission === 'blocked') return 'blocked'
  if (status.permission === 'denied') return 'denied'
  if (status.permission === 'prompt') return 'permission-required'
  if (paused || !status.trackingEnabled) return 'paused'
  return status.tracking ? 'active' : 'starting'
}

/**
 * One step-counting interface over two very different mechanisms.
 *
 * On Android the native plugin is authoritative: the hardware counter keeps
 * running with the screen off, and this hook simply reads it back at the moments
 * that matter — on mount, when the app returns to the foreground, and whenever
 * the plugin pushes an update. There is no interval, no polling and no work at
 * all while the app is backgrounded.
 *
 * In a browser it falls through to the existing DeviceMotion pedometer, which
 * only runs while the page is visible. That limitation is real and is surfaced
 * through `source`, not hidden.
 */
export function useStepCounter({ paused = false, onTotal, onDelta, onHistory }: Options) {
  const [native] = useState(() => isNativeApp())
  const [status, setStatus] = useState<StepStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const onTotalRef = useRef(onTotal)
  const onHistoryRef = useRef(onHistory)
  useEffect(() => {
    onTotalRef.current = onTotal
    onHistoryRef.current = onHistory
  }, [onTotal, onHistory])

  // The browser pedometer stays wired up but idle inside the native shell.
  const motion = useMotionPedometer({ enabled: !native, paused, onStep: onDelta })

  /** Single read of the native truth. Called on demand, never on a timer. */
  const refresh = useCallback(async () => {
    if (!native) return
    try {
      const next = await readStatus()
      setStatus(next)
      if (next.sensorAvailable && next.permission === 'granted') {
        onTotalRef.current(await readTodaySteps())
        const history = await readHistory(30)
        if (onHistoryRef.current) onHistoryRef.current(history)
      }
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read the step counter.')
    }
  }, [native])

  // Start tracking, then subscribe to the events that mean "the number moved".
  useEffect(() => {
    if (!native) {
      setLoading(false)
      return
    }

    let cancelled = false
    const cleanups: Array<() => void> = []

    const attach = async () => {
      let current = await readStatus()

      if (current.sensorAvailable && current.permission === 'granted' && !paused) {
        try {
          current = await startNativeTracking()
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Could not start step tracking.')
        }
      }
      if (cancelled) return
      setStatus(current)
      setLoading(false)
      await refresh()

      const stepsHandle = await StepCounter.addListener('stepsChanged', (reading) => {
        onTotalRef.current(reading.steps)
      })
      const statusHandle = await StepCounter.addListener('statusChanged', (next) => {
        setStatus(next)
      })
      // Returning to the foreground is the moment every step taken while the
      // screen was off gets reconciled.
      const appHandle = await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) void refresh()
      })

      if (cancelled) {
        void stepsHandle.remove()
        void statusHandle.remove()
        void appHandle.remove()
        return
      }
      cleanups.push(
        () => void stepsHandle.remove(),
        () => void statusHandle.remove(),
        () => void appHandle.remove(),
      )
    }

    void attach()

    return () => {
      cancelled = true
      cleanups.forEach((cleanup) => cleanup())
    }
    // `paused` is read once at attach time; pausing afterwards goes through
    // setPaused below rather than tearing the listeners down.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [native, refresh])

  const requestAccess = useCallback(async () => {
    if (!native) return motion.requestAccess()
    try {
      const next = await requestActivityPermission()
      setStatus(next)
      if (next.permission === 'granted') {
        setStatus(await startNativeTracking())
        await refresh()
        return true
      }
      return false
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Permission request failed.')
      return false
    }
  }, [native, motion, refresh])

  const setPaused = useCallback(
    async (next: boolean) => {
      if (!native) return
      try {
        setStatus(next ? await stopNativeTracking() : await startNativeTracking())
        if (!next) await refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not change tracking.')
      }
    },
    [native, refresh],
  )

  const setBackground = useCallback(
    async (enabled: boolean) => {
      if (!native) return
      try {
        setStatus(await setBackgroundTracking(enabled))
        setError(null)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not change background tracking.')
      }
    },
    [native],
  )

  const permission: StepPermission = native
    ? (status?.permission ?? 'prompt')
    : motion.status === 'denied'
      ? 'denied'
      : motion.status === 'permission-required'
        ? 'prompt'
        : 'granted'

  return {
    source: (native ? 'native' : 'motion') as StepSource,
    status: native ? (status ? statusFromNative(status, paused) : 'starting') : motion.status,
    permission,
    isSupported: native ? Boolean(status?.sensorAvailable) : motion.status !== 'unsupported',
    backgroundService: Boolean(status?.backgroundService),
    trackingStartDate: status?.trackingStartDate ?? null,
    lastUpdated: status?.lastUpdated ?? 0,
    sessionSteps: motion.sessionSteps,
    loading,
    error,
    requestAccess,
    refresh,
    setPaused,
    setBackground,
    openSettings: openAppSettings,
  }
}
