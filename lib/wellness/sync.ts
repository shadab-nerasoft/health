'use client'

import { createClient } from '@/lib/supabase/client'
import { derivedFromSteps } from '@/lib/wellness/store'

/**
 * Offline-first step sync.
 *
 * Days are queued locally the moment they change and uploaded when there is
 * both a network and a signed-in user. Nothing is ever dropped because a sync
 * failed — the queue survives restarts in localStorage and is retried on the
 * next opportunity.
 *
 * This talks to Supabase directly rather than through `/api/activity`, because
 * the Android build is a static export with no server behind it. The browser
 * client works identically in both targets, and RLS is what protects the rows.
 *
 * Duplicate records are impossible by construction: `daily_activity` is unique
 * on `(user_id, date)` and every write is an upsert on that key, so replaying
 * the same day any number of times converges on one row.
 */

const QUEUE_KEY = 'zsteps-sync-queue-v1'

/** Keeps a long offline stretch from growing the queue without bound. */
const MAX_QUEUED_DAYS = 180

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export type SyncOutcome =
  | { status: 'synced'; days: number }
  | { status: 'idle' }
  | { status: 'offline' }
  | { status: 'signed-out' }
  | { status: 'error'; message: string }

type Queue = {
  /** date -> step total awaiting upload */
  pending: Record<string, number>
  lastSyncedAt: number
}

const emptyQueue: Queue = { pending: {}, lastSyncedAt: 0 }

function readQueue(): Queue {
  if (typeof window === 'undefined') return emptyQueue
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY)
    if (!raw) return emptyQueue
    const parsed = JSON.parse(raw) as Partial<Queue>
    return {
      pending: parsed.pending && typeof parsed.pending === 'object' ? parsed.pending : {},
      lastSyncedAt: Number(parsed.lastSyncedAt) || 0,
    }
  } catch {
    return emptyQueue
  }
}

function writeQueue(queue: Queue) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // Storage blocked. The in-flight sync still runs; only retry memory is lost.
  }
}

export function pendingCount() {
  return Object.keys(readQueue().pending).length
}

export function lastSyncedAt() {
  return readQueue().lastSyncedAt
}

/**
 * Mark days as needing upload. Cheap and synchronous — safe to call on every
 * step update, since it never touches the network.
 */
export function enqueueDays(days: Record<string, number>) {
  const entries = Object.entries(days).filter(
    ([date, steps]) => DATE_PATTERN.test(date) && Number.isFinite(steps) && steps > 0,
  )
  if (entries.length === 0) return

  const queue = readQueue()
  let changed = false
  for (const [date, steps] of entries) {
    const value = Math.round(steps)
    if (queue.pending[date] === value) continue
    queue.pending[date] = value
    changed = true
  }
  if (!changed) return

  const dates = Object.keys(queue.pending).sort()
  if (dates.length > MAX_QUEUED_DAYS) {
    // Drop the oldest days first; recent activity matters more than backfill.
    for (const date of dates.slice(0, dates.length - MAX_QUEUED_DAYS)) {
      delete queue.pending[date]
    }
  }
  writeQueue(queue)
}

/**
 * Upload everything queued. Safe to call often — it no-ops when the queue is
 * empty, when offline, and when signed out, leaving the queue intact each time.
 */
export async function flushQueue(source: string): Promise<SyncOutcome> {
  if (typeof window === 'undefined') return { status: 'idle' }

  const queue = readQueue()
  const dates = Object.keys(queue.pending)
  if (dates.length === 0) return { status: 'idle' }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { status: 'offline' }
  }

  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return { status: 'signed-out' }

    const rows = dates.map((date) => {
      const steps = queue.pending[date]
      const derived = derivedFromSteps(steps)
      return {
        user_id: user.id,
        date,
        steps,
        distance_meters: derived.distanceMeters,
        active_minutes: derived.activeMinutes,
        calories_burned: derived.calories,
        source,
      }
    })

    const { error } = await supabase.from('daily_activity').upsert(rows, { onConflict: 'user_id,date' })
    if (error) return { status: 'error', message: error.message }

    // Re-read rather than reusing the snapshot: days may have been queued while
    // the request was in flight, and those must not be marked as sent.
    const latest = readQueue()
    for (const date of dates) {
      if (latest.pending[date] === queue.pending[date]) delete latest.pending[date]
    }
    latest.lastSyncedAt = Date.now()
    writeQueue(latest)

    return { status: 'synced', days: rows.length }
  } catch (cause) {
    return { status: 'error', message: cause instanceof Error ? cause.message : 'Sync failed.' }
  }
}
