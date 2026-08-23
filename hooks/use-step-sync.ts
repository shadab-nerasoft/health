'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { enqueueDays, flushQueue, lastSyncedAt, pendingCount, type SyncOutcome } from '@/lib/wellness/sync'

/**
 * Decides *when* to sync. `lib/wellness/sync.ts` decides what and how.
 *
 * Uploads are event-driven, never on a timer: the app syncs when it opens, when
 * it comes back to the foreground, and when the network returns. A throttle
 * stops a burst of those events turning into a burst of requests.
 */

/** Minimum gap between unforced attempts. Network restore ignores it. */
const THROTTLE_MS = 60_000

export type SyncState = {
  status: SyncOutcome['status'] | 'syncing'
  pending: number
  lastSyncedAt: number
  message?: string
}

export function useStepSync(source: string) {
  const [state, setState] = useState<SyncState>({ status: 'idle', pending: 0, lastSyncedAt: 0 })
  const lastAttempt = useRef(0)
  const inFlight = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const sync = useCallback(
    async (force = false) => {
      if (inFlight.current) return
      const now = Date.now()
      if (!force && now - lastAttempt.current < THROTTLE_MS) return
      if (pendingCount() === 0) {
        if (mounted.current) {
          setState({ status: 'idle', pending: 0, lastSyncedAt: lastSyncedAt() })
        }
        return
      }

      inFlight.current = true
      lastAttempt.current = now
      if (mounted.current) setState((prev) => ({ ...prev, status: 'syncing' }))

      const outcome = await flushQueue(source)

      inFlight.current = false
      if (!mounted.current) return
      setState({
        status: outcome.status,
        pending: pendingCount(),
        lastSyncedAt: lastSyncedAt(),
        message: outcome.status === 'error' ? outcome.message : undefined,
      })
    },
    [source],
  )

  /** Queue days locally, then try to push. Never blocks the caller. */
  const record = useCallback(
    (days: Record<string, number>) => {
      enqueueDays(days)
      if (mounted.current) setState((prev) => ({ ...prev, pending: pendingCount() }))
      void sync()
    },
    [sync],
  )

  useEffect(() => {
    void sync(true)

    // Network restored: retry immediately, throttle be damned.
    const onOnline = () => void sync(true)
    // Returning to the app is the other natural moment to push.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync()
    }

    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [sync])

  return { ...state, record, syncNow: () => sync(true) }
}
