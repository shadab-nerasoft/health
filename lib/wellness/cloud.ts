'use client'

import { createClient } from '@/lib/supabase/client'
import {
  type ActivityLevel,
  type Goals,
  type Profile,
  type WaterEntry,
  type WeightEntry,
  todayKey,
} from '@/lib/wellness/store'

/**
 * Supabase persistence for everything that is not steps.
 *
 * Steps have their own path (sync.ts) because daily_activity is keyed on
 * (user_id, date) and upserts cleanly. The rest of the tables are shaped
 * differently — profiles is one row per user, goals is a typed key/value table,
 * and hydration_logs / weight_logs are append-only — so each gets the write
 * strategy that actually fits it.
 *
 * Deliberately conservative: no write here assumes a unique constraint exists.
 * profiles is updated by primary key, goals are read-then-written, and the
 * append-only logs are guarded by a client-side record of what has already been
 * sent. That keeps this correct against the live schema without depending on
 * constraints I could not verify.
 */

const OUTBOX_KEY = 'zsteps-cloud-outbox-v1'
const SENT_KEY = 'zsteps-cloud-sent-v1'
const MAX_SENT_IDS = 600

type OutboxItem =
  | { kind: 'profile'; payload: Profile & { waterGoalMl: number } }
  | { kind: 'goals'; payload: Goals }
  | { kind: 'water'; payload: WaterEntry }
  | { kind: 'weight'; payload: WeightEntry }

export type CloudSnapshot = {
  profile: Partial<Profile> | null
  goals: Partial<Goals> | null
  waterEntries: WaterEntry[]
  weights: WeightEntry[]
}

// ------------------------------------------------------------- local memory

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage blocked: the current push still runs, only retry memory is lost.
  }
}

/** Ids of append-only rows already written, so a retry cannot duplicate them. */
function sentIds(): string[] {
  return readJson<string[]>(SENT_KEY, [])
}

function markSent(id: string) {
  const ids = sentIds()
  if (ids.includes(id)) return
  ids.push(id)
  writeJson(SENT_KEY, ids.slice(-MAX_SENT_IDS))
}

export function hasBeenSent(id: string) {
  return sentIds().includes(id)
}

function outbox(): OutboxItem[] {
  return readJson<OutboxItem[]>(OUTBOX_KEY, [])
}

/**
 * Queue a change for upload. Profile and goals collapse to a single pending
 * entry each, since only the latest value matters; the logs queue per row.
 */
export function enqueue(item: OutboxItem) {
  const pending = outbox().filter(
    (existing) => !((existing.kind === 'profile' || existing.kind === 'goals') && existing.kind === item.kind),
  )
  pending.push(item)
  writeJson(OUTBOX_KEY, pending.slice(-200))
}

export function outboxSize() {
  return outbox().length
}

// -------------------------------------------------------------- field maps

/** The app stores a coarse level; the database stores the onboarding label. */
const ACTIVITY_TO_DB: Record<ActivityLevel, string> = {
  light: 'Lightly active',
  moderate: 'Moderately active',
  active: 'Very active',
}

function activityFromDb(value: string | null | undefined): ActivityLevel | undefined {
  switch (value) {
    case 'Mostly sitting':
    case 'Lightly active':
      return 'light'
    case 'Moderately active':
      return 'moderate'
    case 'Very active':
      return 'active'
    default:
      return undefined
  }
}

function ageFromDateOfBirth(value: string | null | undefined): number | null {
  if (!value) return null
  const born = new Date(value)
  if (Number.isNaN(born.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const monthDelta = now.getMonth() - born.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) age -= 1
  return age >= 0 && age < 130 ? age : null
}

/** goals rows the app owns. Water lives on profiles.water_goal_ml instead. */
const GOAL_TYPES = {
  steps: { key: 'steps' as const, unit: 'steps' },
  active_minutes: { key: 'activeMinutes' as const, unit: 'min' },
  distance_km: { key: 'distanceKm' as const, unit: 'km' },
}

// ------------------------------------------------------------------- pull

/**
 * Read everything back from Supabase. Used on sign-in and on app open so a
 * fresh install, or a second device, comes up with the user's real data.
 */
export async function pullAll(): Promise<CloudSnapshot | null> {
  if (typeof window === 'undefined') return null
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const [profileRow, goalRows, hydrationRows, weightRows] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'first_name, height_cm, current_weight_kg, target_weight_kg, activity_level, primary_goal, dietary_preferences, meal_count, water_goal_ml, date_of_birth',
        )
        .eq('id', user.id)
        .maybeSingle(),
      supabase.from('goals').select('goal_type, target_value').eq('user_id', user.id),
      supabase
        .from('hydration_logs')
        .select('id, amount_ml, logged_at')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(200),
      supabase
        .from('weight_logs')
        .select('weight_kg, logged_at')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(200),
    ])

    const row = profileRow.data as Record<string, unknown> | null
    const profile: Partial<Profile> | null = row
      ? {
          name: typeof row.first_name === 'string' ? row.first_name : '',
          age: ageFromDateOfBirth(row.date_of_birth as string),
          heightCm: typeof row.height_cm === 'number' ? row.height_cm : null,
          weightKg: typeof row.current_weight_kg === 'number' ? row.current_weight_kg : null,
          activityLevel: activityFromDb(row.activity_level as string) ?? 'moderate',
          primary_goal: row.primary_goal as Profile['primary_goal'],
          dietary_preferences: Array.isArray(row.dietary_preferences)
            ? (row.dietary_preferences as string[])
            : undefined,
          meal_count: typeof row.meal_count === 'number' ? row.meal_count : undefined,
          target_weight_kg: typeof row.target_weight_kg === 'number' ? row.target_weight_kg : undefined,
        }
      : null

    const goals: Partial<Goals> = {}
    if (typeof row?.water_goal_ml === 'number') goals.waterMl = row.water_goal_ml
    for (const goalRow of (goalRows.data ?? []) as Array<{ goal_type: string; target_value: number }>) {
      const mapping = GOAL_TYPES[goalRow.goal_type as keyof typeof GOAL_TYPES]
      if (mapping && Number.isFinite(goalRow.target_value)) {
        goals[mapping.key] = goalRow.target_value
      }
    }

    const waterEntries: WaterEntry[] = (
      (hydrationRows.data ?? []) as Array<{ id: string; amount_ml: number; logged_at: string }>
    ).map((entry) => {
      const at = new Date(entry.logged_at)
      return {
        id: `cloud-${entry.id}`,
        date: todayKey(at),
        time: at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        amount: entry.amount_ml,
      }
    })

    // One weight per day, newest wins — matching how the local store keys them.
    const seenDays = new Set<string>()
    const weights: WeightEntry[] = []
    for (const entry of (weightRows.data ?? []) as Array<{ weight_kg: number; logged_at: string }>) {
      const date = todayKey(new Date(entry.logged_at))
      if (seenDays.has(date)) continue
      seenDays.add(date)
      weights.push({ date, kg: entry.weight_kg })
    }

    return { profile, goals: Object.keys(goals).length ? goals : null, waterEntries, weights }
  } catch {
    return null
  }
}

// ------------------------------------------------------------------- push

async function pushProfile(supabase: ReturnType<typeof createClient>, userId: string, payload: OutboxItem & { kind: 'profile' }) {
  const profile = payload.payload
  const update: Record<string, unknown> = {
    first_name: profile.name,
    height_cm: profile.heightCm,
    current_weight_kg: profile.weightKg,
    activity_level: ACTIVITY_TO_DB[profile.activityLevel],
    water_goal_ml: profile.waterGoalMl,
    updated_at: new Date().toISOString(),
  }
  if (profile.primary_goal) update.primary_goal = profile.primary_goal
  if (profile.dietary_preferences) update.dietary_preferences = profile.dietary_preferences
  if (typeof profile.meal_count === 'number') update.meal_count = profile.meal_count
  if (typeof profile.target_weight_kg === 'number') update.target_weight_kg = profile.target_weight_kg

  // The row is created at sign-up, so this updates by primary key. `age` is not
  // written back: the column of record is date_of_birth, and deriving one from
  // the other would lose the real birthday.
  const { error } = await supabase.from('profiles').update(update).eq('id', userId)
  if (error) throw new Error(error.message)
}

async function pushGoals(supabase: ReturnType<typeof createClient>, userId: string, goals: Goals) {
  const { data: existing, error: readError } = await supabase
    .from('goals')
    .select('id, goal_type')
    .eq('user_id', userId)
  if (readError) throw new Error(readError.message)

  const rows = (existing ?? []) as Array<{ id: string; goal_type: string }>
  for (const [goalType, mapping] of Object.entries(GOAL_TYPES)) {
    const value = goals[mapping.key]
    if (!Number.isFinite(value)) continue
    const match = rows.find((row) => row.goal_type === goalType)
    // Read-then-write rather than upsert, because a unique index on
    // (user_id, goal_type) is not guaranteed to exist.
    const { error } = match
      ? await supabase.from('goals').update({ target_value: value }).eq('id', match.id)
      : await supabase
          .from('goals')
          .insert({ user_id: userId, goal_type: goalType, target_value: value, unit: mapping.unit })
    if (error) throw new Error(error.message)
  }
}

/**
 * Send everything queued. Stops at the first failure and keeps the remainder,
 * so a transient error retries rather than silently dropping a change.
 */
export async function flushOutbox(): Promise<{ sent: number; remaining: number; error?: string }> {
  const pending = outbox()
  if (pending.length === 0) return { sent: 0, remaining: 0 }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { sent: 0, remaining: pending.length, error: 'offline' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { sent: 0, remaining: pending.length, error: 'signed-out' }

  let sent = 0
  try {
    while (pending.length > 0) {
      const item = pending[0]
      if (item.kind === 'profile') {
        await pushProfile(supabase, user.id, item)
      } else if (item.kind === 'goals') {
        await pushGoals(supabase, user.id, item.payload)
      } else if (item.kind === 'water') {
        if (!hasBeenSent(item.payload.id)) {
          const { error } = await supabase.from('hydration_logs').insert({
            user_id: user.id,
            amount_ml: item.payload.amount,
            logged_at: new Date().toISOString(),
          })
          if (error) throw new Error(error.message)
          markSent(item.payload.id)
        }
      } else if (item.kind === 'weight') {
        const marker = `weight-${item.payload.date}-${item.payload.kg}`
        if (!hasBeenSent(marker)) {
          const { error } = await supabase.from('weight_logs').insert({
            user_id: user.id,
            weight_kg: item.payload.kg,
            logged_at: new Date(`${item.payload.date}T12:00:00`).toISOString(),
          })
          if (error) throw new Error(error.message)
          markSent(marker)
        }
      }
      pending.shift()
      sent += 1
      writeJson(OUTBOX_KEY, pending)
    }
    return { sent, remaining: 0 }
  } catch (cause) {
    writeJson(OUTBOX_KEY, pending)
    return {
      sent,
      remaining: pending.length,
      error: cause instanceof Error ? cause.message : 'Upload failed.',
    }
  }
}
