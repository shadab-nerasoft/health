'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { enqueue, flushOutbox, hasBeenSent, outboxSize, pullAll } from '@/lib/wellness/cloud'
import type { Goals, Profile, WaterEntry, WeightEntry } from '@/lib/wellness/store'

/**
 * Keeps profile, goals, water and weight in step with Supabase.
 *
 * Direction of travel:
 *   - Pull once when the app opens. That is what makes a reinstall, or a second
 *     device, come up with the user's real data instead of an empty dashboard.
 *   - Push on change, through an offline outbox, so edits made with no network
 *     land as soon as one appears.
 *
 * Uploads are event-driven — never on a timer — and the first render after a
 * pull is deliberately not treated as a local edit, which would otherwise echo
 * the freshly pulled values straight back to the server.
 */

export type CloudState = {
  status: 'idle' | 'pulling' | 'pushing' | 'synced' | 'offline' | 'signed-out' | 'error'
  pending: number
  message?: string
}

type Options = {
  ready: boolean
  profile: Profile
  goals: Goals
  waterEntries: WaterEntry[]
  weights: WeightEntry[]
  /** Applies pulled values to the local store. */
  hydrate: (snapshot: {
    profile: Partial<Profile> | null
    goals: Partial<Goals> | null
    waterEntries: WaterEntry[]
    weights: WeightEntry[]
  }) => void
}

export function useCloudSync({ ready, profile, goals, waterEntries, weights, hydrate }: Options) {
  const [state, setState] = useState<CloudState>({ status: 'idle', pending: 0 })
  const pulled = useRef(false)
  const flushing = useRef(false)
  const hydrateRef = useRef(hydrate)

  useEffect(() => {
    hydrateRef.current = hydrate
  }, [hydrate])

  const flush = useCallback(async () => {
    if (flushing.current) return
    if (outboxSize() === 0) {
      setState((prev) => ({ ...prev, pending: 0 }))
      return
    }
    flushing.current = true
    setState((prev) => ({ ...prev, status: 'pushing' }))

    const result = await flushOutbox()
    flushing.current = false

    if (result.error === 'offline') {
      setState({ status: 'offline', pending: result.remaining })
    } else if (result.error === 'signed-out') {
      setState({ status: 'signed-out', pending: result.remaining })
    } else if (result.error) {
      setState({ status: 'error', pending: result.remaining, message: result.error })
    } else {
      setState({ status: 'synced', pending: 0 })
    }
  }, [])

  // Pull once per app open, before any local change is treated as an edit.
  useEffect(() => {
    if (!ready || pulled.current) return
    pulled.current = true

    let cancelled = false
    void (async () => {
      setState((prev) => ({ ...prev, status: 'pulling' }))
      const snapshot = await pullAll()
      if (cancelled) return
      if (snapshot) hydrateRef.current(snapshot)
      setState((prev) => ({ ...prev, status: 'idle' }))
      await flush()
    })()

    return () => {
      cancelled = true
    }
  }, [ready, flush])

  // Profile and goals: queue the latest value whenever it changes locally.
  const profileSignature = JSON.stringify({ profile, waterMl: goals.waterMl })
  useEffect(() => {
    if (!ready || !pulled.current) return
    enqueue({ kind: 'profile', payload: { ...profile, waterGoalMl: goals.waterMl } })
    setState((prev) => ({ ...prev, pending: outboxSize() }))
    void flush()
    // Signature keeps this from firing on unrelated store updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, profileSignature, flush])

  const goalsSignature = JSON.stringify(goals)
  useEffect(() => {
    if (!ready || !pulled.current) return
    enqueue({ kind: 'goals', payload: goals })
    setState((prev) => ({ ...prev, pending: outboxSize() }))
    void flush()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, goalsSignature, flush])

  // Append-only logs: queue only rows that have never been uploaded. Entries
  // pulled from the server are prefixed `cloud-` and are skipped outright.
  useEffect(() => {
    if (!ready || !pulled.current) return
    let queued = false
    for (const entry of waterEntries) {
      if (entry.id.startsWith('cloud-') || hasBeenSent(entry.id)) continue
      enqueue({ kind: 'water', payload: entry })
      queued = true
    }
    if (!queued) return
    setState((prev) => ({ ...prev, pending: outboxSize() }))
    void flush()
  }, [ready, waterEntries, flush])

  useEffect(() => {
    if (!ready || !pulled.current) return
    let queued = false
    for (const entry of weights) {
      if (hasBeenSent(`weight-${entry.date}-${entry.kg}`)) continue
      enqueue({ kind: 'weight', payload: entry })
      queued = true
    }
    if (!queued) return
    setState((prev) => ({ ...prev, pending: outboxSize() }))
    void flush()
  }, [ready, weights, flush])

  // Network restored, or the user came back to the app.
  useEffect(() => {
    const retry = () => void flush()
    const onVisible = () => {
      if (document.visibilityState === 'visible') retry()
    }
    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', retry)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [flush])

  return { ...state, flushNow: flush }
}
