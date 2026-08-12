'use client'

import { createContext, useCallback, useContext, useMemo } from 'react'
import { useWellness } from '@/hooks/use-wellness'
import { useMotionPedometer, type MotionStatus } from '@/hooks/use-motion-pedometer'

type Wellness = ReturnType<typeof useWellness>

type TrackingValue = Wellness & {
  motionStatus: MotionStatus
  sessionSteps: number
  requestMotionAccess: () => Promise<boolean>
}

const TrackingContext = createContext<TrackingValue | null>(null)

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const wellness = useWellness()
  const { addSteps } = wellness

  const handleStep = useCallback((count: number) => addSteps(count), [addSteps])

  const { status, sessionSteps, requestAccess } = useMotionPedometer({
    paused: wellness.state.motionPaused,
    onStep: handleStep,
  })

  const value = useMemo<TrackingValue>(
    () => ({ ...wellness, motionStatus: status, sessionSteps, requestMotionAccess: requestAccess }),
    [wellness, status, sessionSteps, requestAccess],
  )

  return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>
}

export function useTracking() {
  const context = useContext(TrackingContext)
  if (!context) throw new Error('useTracking must be used inside TrackingProvider')
  return context
}
