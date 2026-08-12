export type DayRecord = {
  date: string
  steps: number
  waterMl: number
}

export type WaterEntry = {
  id: string
  date: string
  time: string
  amount: number
}

export type WeightEntry = {
  date: string
  kg: number
}

export type Goals = {
  steps: number
  waterMl: number
  activeMinutes: number
  distanceKm: number
}

export type ActivityLevel = 'light' | 'moderate' | 'active'

export type Profile = {
  name: string
  age: number | null
  heightCm: number | null
  weightKg: number | null
  activityLevel: ActivityLevel
}

export type WellnessState = {
  version: 1
  profile: Profile
  goals: Goals
  days: Record<string, DayRecord>
  waterEntries: WaterEntry[]
  weights: WeightEntry[]
  motionPaused: boolean
}

const STORAGE_KEY = 'zsteps-wellness-v1'

/** Rough, transparent estimates derived from step count only. */
export const STRIDE_METERS = 0.762
export const KCAL_PER_STEP = 0.04
export const STEPS_PER_ACTIVE_MINUTE = 110

export const defaultProfile: Profile = {
  name: '',
  age: null,
  heightCm: null,
  weightKg: null,
  activityLevel: 'moderate',
}

/** Initial shown in the avatar; falls back to the brand letter before a name is set. */
export function profileInitial(profile: Profile) {
  return profile.name.trim().charAt(0).toUpperCase() || 'Z'
}

export const defaultGoals: Goals = {
  steps: 10000,
  waterMl: 2500,
  activeMinutes: 60,
  distanceKm: 7.5,
}

export function todayKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function emptyState(): WellnessState {
  return {
    version: 1,
    profile: { ...defaultProfile },
    goals: { ...defaultGoals },
    days: {},
    waterEntries: [],
    weights: [],
    motionPaused: false,
  }
}

export function emptyDay(date = todayKey()): DayRecord {
  return { date, steps: 0, waterMl: 0 }
}

function isBrowser() {
  return typeof window !== 'undefined'
}

export function readState(): WellnessState {
  if (!isBrowser()) return emptyState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<WellnessState>
    return {
      version: 1,
      profile: { ...defaultProfile, ...(parsed.profile ?? {}) },
      goals: { ...defaultGoals, ...(parsed.goals ?? {}) },
      days: parsed.days ?? {},
      waterEntries: Array.isArray(parsed.waterEntries) ? parsed.waterEntries : [],
      weights: Array.isArray(parsed.weights) ? parsed.weights : [],
      motionPaused: Boolean(parsed.motionPaused),
    }
  } catch {
    // Private browsing or corrupted payloads fall back to a clean slate.
    return emptyState()
  }
}

const listeners = new Set<(state: WellnessState) => void>()
let cache: WellnessState | null = null

export function getState(): WellnessState {
  if (!cache) cache = readState()
  return cache
}

export function subscribe(listener: (state: WellnessState) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setState(updater: (state: WellnessState) => WellnessState) {
  const next = updater(getState())
  cache = next
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Keep the in-memory session working even when storage is blocked.
    }
  }
  listeners.forEach((listener) => listener(next))
  return next
}

export function getDay(state: WellnessState, date = todayKey()): DayRecord {
  return state.days[date] ?? emptyDay(date)
}

export function derivedFromSteps(steps: number) {
  return {
    distanceMeters: Math.round(steps * STRIDE_METERS),
    calories: Math.round(steps * KCAL_PER_STEP),
    activeMinutes: Math.round(steps / STEPS_PER_ACTIVE_MINUTE),
  }
}

export function lastNDays(state: WellnessState, count: number, endDate = new Date()): DayRecord[] {
  const out: DayRecord[] = []
  for (let index = count - 1; index >= 0; index -= 1) {
    const day = new Date(endDate)
    day.setDate(day.getDate() - index)
    const key = todayKey(day)
    out.push(state.days[key] ?? emptyDay(key))
  }
  return out
}

export function percent(value: number, target: number) {
  if (!target) return 0
  return Math.max(0, Math.round((value / target) * 100))
}

export function streakDays(state: WellnessState) {
  let streak = 0
  const cursor = new Date()
  for (let index = 0; index < 365; index += 1) {
    const key = todayKey(cursor)
    const day = state.days[key]
    if (day && day.steps >= state.goals.steps) streak += 1
    else if (index > 0) break
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function exportPayload(state: WellnessState) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2)
}

export function clearAll() {
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore storage removal failures and reset the in-memory state below.
    }
  }
  return setState(() => emptyState())
}
