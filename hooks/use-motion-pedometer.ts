'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type MotionStatus = 'idle' | 'starting' | 'active' | 'paused' | 'permission-required' | 'denied' | 'unsupported'

const STEP_COOLDOWN_MS = 300
const PEAK_THRESHOLD = 1.15
const VALLEY_THRESHOLD = 1.02
const SMOOTHING = 0.28

type Options = {
  paused?: boolean
  /** Set false inside the native Android shell, where the native counter wins. */
  enabled?: boolean
  onStep: (count: number) => void
}

/**
 * Counts walking steps from DeviceMotionEvent accelerometer peaks.
 * Browser sensors only run while this page is open and in the foreground.
 */
export function useMotionPedometer({ paused = false, enabled = true, onStep }: Options) {
  const [status, setStatus] = useState<MotionStatus>('idle')
  const [sessionSteps, setSessionSteps] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const onStepRef = useRef(onStep)
  const pausedRef = useRef(paused)
  const grantedRef = useRef(false)

  useEffect(() => {
    onStepRef.current = onStep
  }, [onStep])

  useEffect(() => {
    pausedRef.current = paused
    setStatus((current) => {
      if (paused) return current === 'active' ? 'paused' : current
      return current === 'paused' ? 'active' : current
    })
  }, [paused])

  const ensurePermission = useCallback(async (userInitiated: boolean) => {
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
      setStatus('unsupported')
      return false
    }

    const MotionEvent = window.DeviceMotionEvent as typeof DeviceMotionEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }

    if (typeof MotionEvent.requestPermission === 'function' && !grantedRef.current) {
      if (!userInitiated) {
        setStatus('permission-required')
        return false
      }
      try {
        const result = await MotionEvent.requestPermission()
        if (result !== 'granted') {
          setStatus('denied')
          return false
        }
      } catch {
        setStatus('denied')
        return false
      }
      grantedRef.current = true
    }

    return true
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return
    let detached = false
    let listening = false
    let smoothed = 1
    let rising = false
    let lastStepAt = 0
    let sawMotionData = false

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity
      if (!acceleration || acceleration.x === null) return
      sawMotionData = true
      if (pausedRef.current) return

      const magnitude =
        Math.sqrt((acceleration.x ?? 0) ** 2 + (acceleration.y ?? 0) ** 2 + (acceleration.z ?? 0) ** 2) / 9.81
      smoothed = smoothed + SMOOTHING * (magnitude - smoothed)

      const now = event.timeStamp || Date.now()
      if (!rising && smoothed > PEAK_THRESHOLD) {
        rising = true
        if (now - lastStepAt > STEP_COOLDOWN_MS) {
          lastStepAt = now
          setSessionSteps((count) => count + 1)
          onStepRef.current(1)
        }
      } else if (rising && smoothed < VALLEY_THRESHOLD) {
        rising = false
      }
    }

    const attach = async () => {
      const allowed = await ensurePermission(false)
      if (!allowed || detached) return
      setStatus(pausedRef.current ? 'paused' : 'active')
      window.addEventListener('devicemotion', handleMotion)
      listening = true
      // Desktop browsers expose the API but never emit usable readings.
      window.setTimeout(() => {
        if (!detached && !sawMotionData) setStatus('unsupported')
      }, 3000)
    }

    setStatus('starting')
    void attach()

    return () => {
      detached = true
      if (listening) window.removeEventListener('devicemotion', handleMotion)
    }
  }, [ensurePermission, attempt, enabled])

  const requestAccess = useCallback(async () => {
    const allowed = await ensurePermission(true)
    if (allowed) {
      setStatus(pausedRef.current ? 'paused' : 'active')
      setAttempt((value) => value + 1)
    }
    return allowed
  }, [ensurePermission])

  return { status, sessionSteps, requestAccess }
}
