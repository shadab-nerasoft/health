'use client'

import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { useWellness } from '@/hooks/use-wellness'
import { useStepCounter, type StepCounterStatus, type StepSource } from '@/hooks/use-step-counter'
import { useStepSync, type SyncState } from '@/hooks/use-step-sync'
import { isNativeApp } from '@/services/step-counter'
import { useCloudSync, type CloudState } from '@/hooks/use-cloud-sync'

type Wellness = ReturnType<typeof useWellness>

type TrackingValue = Wellness & {
  /** Where today's steps come from: the Android sensor, or the browser. */
  stepSource: StepSource
  motionStatus: StepCounterStatus
  permission: 'granted' | 'denied' | 'blocked' | 'prompt'
  sensorSupported: boolean
  backgroundService: boolean
  sessionSteps: number
  stepError: string | null
  sync: SyncState
  syncNow: () => void
  cloud: CloudState
  requestMotionAccess: () => Promise<boolean>
  refreshSteps: () => Promise<void>
  setBackgroundTracking: (enabled: boolean) => Promise<void>
  openStepSettings: () => Promise<void>
}

const TrackingContext = createContext<TrackingValue | null>(null)

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const wellness = useWellness()
  const { addSteps, setSteps, backfillSteps, state, setMotionPaused, today, ready, hydrateFromCloud } = wellness

  // Profile, goals, water and weight live in Supabase; steps have their own
  // path because daily_activity upserts on (user_id, date).
  const cloud = useCloudSync({
    ready,
    profile: state.profile,
    goals: state.goals,
    waterEntries: state.waterEntries,
    weights: state.weights,
    hydrate: hydrateFromCloud,
  })
  const sync = useStepSync(isNativeApp() ? 'android-step-counter' : 'web-motion')
  const { record } = sync

  // Native reports an authoritative daily total, so it replaces the stored
  // value. The browser pedometer only ever detects individual steps, so it adds.
  const handleTotal = useCallback((steps: number) => setSteps(steps), [setSteps])
  const handleDelta = useCallback((count: number) => addSteps(count), [addSteps])
  // Runs on mount and on every foreground resume, which is exactly the cadence
  // we want for pushing days recorded while the app was closed.
  const handleHistory = useCallback(
    (days: Record<string, number>) => {
      backfillSteps(days)
      record(days)
    },
    [backfillSteps, record],
  )

  // Queue today from a single place, so the native total, the browser
  // pedometer and manual entry all reach the backend the same way.
  useEffect(() => {
    if (!ready || today.steps <= 0) return
    record({ [today.date]: today.steps })
  }, [ready, today.date, today.steps, record])

  const counter = useStepCounter({
    paused: state.motionPaused,
    onTotal: handleTotal,
    onDelta: handleDelta,
    onHistory: handleHistory,
  })

  const { setPaused } = counter

  // Pausing has to reach the native layer too, not just the local flag.
  const pauseTracking = useCallback(
    (paused: boolean) => {
      setMotionPaused(paused)
      void setPaused(paused)
    },
    [setMotionPaused, setPaused],
  )

  const value = useMemo<TrackingValue>(
    () => ({
      ...wellness,
      setMotionPaused: pauseTracking,
      stepSource: counter.source,
      motionStatus: counter.status,
      permission: counter.permission,
      sensorSupported: counter.isSupported,
      backgroundService: counter.backgroundService,
      sessionSteps: counter.sessionSteps,
      stepError: counter.error,
      sync,
      syncNow: sync.syncNow,
      cloud,
      requestMotionAccess: counter.requestAccess,
      refreshSteps: counter.refresh,
      setBackgroundTracking: counter.setBackground,
      openStepSettings: counter.openSettings,
    }),
    [wellness, pauseTracking, counter, sync, cloud],
  )

  return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>
}

export function useTracking() {
  const context = useContext(TrackingContext)
  if (!context) throw new Error('useTracking must be used inside TrackingProvider')
  return context
}
