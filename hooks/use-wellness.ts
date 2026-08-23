'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  type Goals,
  type Profile,
  type WaterEntry,
  type WeightEntry,
  type WellnessState,
  clearAll,
  derivedFromSteps,
  emptyState,
  exportPayload,
  getDay,
  getState,
  lastNDays,
  setState,
  streakDays,
  subscribe,
  todayKey,
} from '@/lib/wellness/store'

/** Drops undefined keys so a partial cloud row cannot blank a local value. */
function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>
}

export function useWellness() {
  // Start from an empty state so the server and first client render match.
  const [state, setLocalState] = useState<WellnessState>(emptyState)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setLocalState(getState())
    setReady(true)
    return subscribe(setLocalState)
  }, [])

  const addSteps = useCallback((amount: number) => {
    if (amount <= 0) return
    setState((current) => {
      const date = todayKey()
      const day = current.days[date] ?? { date, steps: 0, waterMl: 0 }
      return { ...current, days: { ...current.days, [date]: { ...day, steps: day.steps + amount } } }
    })
  }, [])

  const setSteps = useCallback((amount: number) => {
    setState((current) => {
      const date = todayKey()
      const day = current.days[date] ?? { date, steps: 0, waterMl: 0 }
      return { ...current, days: { ...current.days, [date]: { ...day, steps: Math.max(0, Math.round(amount)) } } }
    })
  }, [])

  /**
   * Overwrite per-day step totals from an authoritative source (the native
   * Android counter), including days the app never had open. Water and other
   * fields on those days are left alone.
   */
  const backfillSteps = useCallback((byDate: Record<string, number>) => {
    const entries = Object.entries(byDate)
    if (entries.length === 0) return
    setState((current) => {
      const days = { ...current.days }
      let changed = false
      for (const [date, steps] of entries) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(steps)) continue
        const value = Math.max(0, Math.round(steps))
        const day = days[date] ?? { date, steps: 0, waterMl: 0 }
        if (day.steps === value) continue
        days[date] = { ...day, steps: value }
        changed = true
      }
      return changed ? { ...current, days } : current
    })
  }, [])

  /**
   * Apply values pulled from Supabase. Server data wins for profile and goals,
   * which is what makes a reinstall or a second device come up correctly.
   * Water and weight rows are merged by id/date rather than replaced, so
   * anything logged locally while offline is not thrown away.
   */
  const hydrateFromCloud = useCallback(
    (snapshot: {
      profile: Partial<Profile> | null
      goals: Partial<Goals> | null
      waterEntries: WaterEntry[]
      weights: WeightEntry[]
    }) => {
      setState((current) => {
        const profile = snapshot.profile
          ? { ...current.profile, ...stripUndefined(snapshot.profile) }
          : current.profile
        const goals = snapshot.goals ? { ...current.goals, ...stripUndefined(snapshot.goals) } : current.goals

        const waterById = new Map(current.waterEntries.map((entry) => [entry.id, entry]))
        for (const entry of snapshot.waterEntries) waterById.set(entry.id, entry)
        const waterEntries = [...waterById.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 200)

        const weightByDate = new Map(current.weights.map((entry) => [entry.date, entry]))
        for (const entry of snapshot.weights) {
          if (!weightByDate.has(entry.date)) weightByDate.set(entry.date, entry)
        }
        const weights = [...weightByDate.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 200)

        // Day water totals are derived from the merged entries so the dashboard
        // matches the log rather than double-counting a pulled row.
        const days = { ...current.days }
        const totals = new Map<string, number>()
        for (const entry of waterEntries) {
          totals.set(entry.date, (totals.get(entry.date) ?? 0) + entry.amount)
        }
        for (const [date, waterMl] of totals) {
          const day = days[date] ?? { date, steps: 0, waterMl: 0 }
          days[date] = { ...day, waterMl }
        }

        return { ...current, profile, goals, waterEntries, weights, days }
      })
    },
    [],
  )

  const addWater = useCallback((amount: number) => {
    if (amount <= 0) return
    setState((current) => {
      const date = todayKey()
      const day = current.days[date] ?? { date, steps: 0, waterMl: 0 }
      const entry = {
        id: `${date}-${Date.now()}`,
        date,
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        amount,
      }
      return {
        ...current,
        days: { ...current.days, [date]: { ...day, waterMl: day.waterMl + amount } },
        waterEntries: [entry, ...current.waterEntries].slice(0, 200),
      }
    })
  }, [])

  const undoWater = useCallback((id: string) => {
    setState((current) => {
      const entry = current.waterEntries.find((row) => row.id === id)
      if (!entry) return current
      const day = current.days[entry.date] ?? { date: entry.date, steps: 0, waterMl: 0 }
      return {
        ...current,
        days: { ...current.days, [entry.date]: { ...day, waterMl: Math.max(0, day.waterMl - entry.amount) } },
        waterEntries: current.waterEntries.filter((row) => row.id !== id),
      }
    })
  }, [])

  const logWeight = useCallback((kg: number) => {
    if (!Number.isFinite(kg) || kg <= 0) return
    setState((current) => {
      const date = todayKey()
      const rest = current.weights.filter((row) => row.date !== date)
      return { ...current, weights: [{ date, kg: Math.round(kg * 10) / 10 }, ...rest].slice(0, 200) }
    })
  }, [])

  const updateProfile = useCallback((changes: Partial<Profile>) => {
    setState((current) => ({ ...current, profile: { ...current.profile, ...changes } }))
  }, [])

  const updateGoals = useCallback((changes: Partial<Goals>) => {
    setState((current) => ({ ...current, goals: { ...current.goals, ...changes } }))
  }, [])

  const setMotionPaused = useCallback((paused: boolean) => {
    setState((current) => ({ ...current, motionPaused: paused }))
  }, [])

  const resetToday = useCallback(() => {
    setState((current) => {
      const date = todayKey()
      return {
        ...current,
        days: { ...current.days, [date]: { date, steps: 0, waterMl: 0 } },
        waterEntries: current.waterEntries.filter((row) => row.date !== date),
      }
    })
  }, [])

  const clearEverything = useCallback(() => {
    clearAll()
  }, [])

  const exportData = useCallback(() => exportPayload(getState()), [])

  const today = useMemo(() => getDay(state), [state])
  const derived = useMemo(() => derivedFromSteps(today.steps), [today.steps])
  const todayWaterEntries = useMemo(
    () => state.waterEntries.filter((row) => row.date === today.date),
    [state.waterEntries, today.date]
  )

  return {
    ready,
    state,
    profile: state.profile,
    goals: state.goals,
    today,
    derived,
    history: (count: number) => lastNDays(state, count),
    streak: streakDays(state),
    todayWaterEntries,
    latestWeight: state.weights[0] ?? null,
    addSteps,
    setSteps,
    backfillSteps,
    hydrateFromCloud,
    addWater,
    undoWater,
    logWeight,
    updateProfile,
    updateGoals,
    setMotionPaused,
    resetToday,
    clearEverything,
    exportData,
  }
}
