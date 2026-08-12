'use client'

import { useCallback, useEffect, useState } from 'react'

type MotionStatus = 'starting' | 'active' | 'permission-required' | 'denied' | 'unsupported'

const STORAGE_KEY = 'zsteps-motion-steps'
const STEP_COOLDOWN_MS = 350
const MIN_STEP_INTERVAL_MS = 280
const PEAK_THRESHOLD = 1.18

function readStoredSteps() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed?.date === new Date().toISOString().slice(0, 10)) return Number(parsed.steps) || 0
  } catch {
    // Storage can be unavailable in private browsing.
  }
  return 0
}

export function useMotionPedometer() {
  const [steps, setSteps] = useState(0)
  const [status, setStatus] = useState<MotionStatus>('starting')

  const persist = useCallback((next: number) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: new Date().toISOString().slice(0, 10), steps: next }))
    } catch {
      // Continue counting for the current session if storage is unavailable.
    }
  }, [])

  const startListening = useCallback(async (userInitiated = false) => {
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
      setStatus('unsupported')
      return false
    }

    const MotionEvent = window.DeviceMotionEvent as typeof DeviceMotionEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    if (typeof MotionEvent.requestPermission === 'function') {
      if (!userInitiated) {
        setStatus('permission-required')
        return false
      }
      try {
        const permission = await MotionEvent.requestPermission()
        if (permission !== 'granted') {
          setStatus('denied')
          return false
        }
      } catch {
        setStatus('denied')
        return false
      }
    }

    setStatus('active')
    return true
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setSteps(readStoredSteps())

    let lastPeak = 0
    let previousMagnitude = 1
    let listening = false

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity
      if (!acceleration) return
      const magnitude = Math.sqrt(
        (acceleration.x ?? 0) ** 2 + (acceleration.y ?? 0) ** 2 + (acceleration.z ?? 0) ** 2,
      ) / 9.81
      const now = Date.now()
      const rising = magnitude > previousMagnitude
      const peak = magnitude > PEAK_THRESHOLD && rising && now - lastPeak > STEP_COOLDOWN_MS
      if (peak && now - lastPeak > MIN_STEP_INTERVAL_MS) {
        lastPeak = now
        setSteps((current) => {
          const next = current + 1
          persist(next)
          return next
        })
      }
      previousMagnitude = magnitude
    }

    const attach = () => {
      if (listening) return
      window.addEventListener('devicemotion', handleMotion)
      listening = true
    }
    const detach = () => {
      window.removeEventListener('devicemotion', handleMotion)
      listening = false
    }

    const begin = async () => {
      const started = await startListening()
      if (started) attach()
    }
    void begin()

    return detach
  }, [persist, startListening])

  return { steps, status, requestPermission: startListening }
}
