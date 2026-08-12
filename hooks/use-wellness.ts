'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  type Goals,
  type Profile,
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

  const today = getDay(state)
  const derived = derivedFromSteps(today.steps)

  return {
    ready,
    state,
    profile: state.profile,
    goals: state.goals,
    today,
    derived,
    history: (count: number) => lastNDays(state, count),
    streak: streakDays(state),
    todayWaterEntries: state.waterEntries.filter((row) => row.date === today.date),
    latestWeight: state.weights[0] ?? null,
    addSteps,
    setSteps,
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
