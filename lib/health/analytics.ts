import { createClient } from '@supabase/supabase-js'

/**
 * Cross-user analytics, read with the service role.
 *
 * Deliberately server-only. The service role bypasses RLS, so this module must
 * never be imported into a client component — the `requireAdmin` gate on the
 * page is what authorises reaching it at all.
 */

export type UserSummary = {
  userId: string
  name: string
  email: string | null
  totalSteps: number
  averageSteps: number
  bestDaySteps: number
  daysTracked: number
  totalWaterMl: number
  latestWeightKg: number | null
  lastActive: string | null
}

export type AnalyticsOverview = {
  users: UserSummary[]
  totals: {
    userCount: number
    activeUsers: number
    totalSteps: number
    totalWaterMl: number
    averageStepsPerUser: number
  }
  daily: Array<{ date: string; steps: number; users: number }>
  rangeDays: number
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function dayKey(date: Date) {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export async function getAnalytics(rangeDays = 30): Promise<AnalyticsOverview | null> {
  const supabase = serviceClient()
  if (!supabase) return null

  const since = new Date()
  since.setDate(since.getDate() - (rangeDays - 1))
  const sinceKey = dayKey(since)

  const [profiles, activity, hydration, weights] = await Promise.all([
    supabase.from('profiles').select('id, first_name'),
    supabase.from('daily_activity').select('user_id, date, steps').gte('date', sinceKey),
    supabase.from('hydration_logs').select('user_id, amount_ml, logged_at').gte('logged_at', `${sinceKey}T00:00:00Z`),
    supabase.from('weight_logs').select('user_id, weight_kg, logged_at').order('logged_at', { ascending: false }),
  ])

  const profileRows = (profiles.data ?? []) as Array<{ id: string; first_name: string | null }>
  const activityRows = (activity.data ?? []) as Array<{ user_id: string; date: string; steps: number }>
  const hydrationRows = (hydration.data ?? []) as Array<{ user_id: string; amount_ml: number; logged_at: string }>
  const weightRows = (weights.data ?? []) as Array<{ user_id: string; weight_kg: number; logged_at: string }>

  const summaries = new Map<string, UserSummary>()
  for (const profile of profileRows) {
    summaries.set(profile.id, {
      userId: profile.id,
      name: profile.first_name?.trim() || 'Unnamed',
      email: null,
      totalSteps: 0,
      averageSteps: 0,
      bestDaySteps: 0,
      daysTracked: 0,
      totalWaterMl: 0,
      latestWeightKg: null,
      lastActive: null,
    })
  }

  const dailyTotals = new Map<string, { steps: number; users: Set<string> }>()

  for (const row of activityRows) {
    const summary = summaries.get(row.user_id)
    const steps = Number(row.steps) || 0
    if (summary) {
      summary.totalSteps += steps
      summary.daysTracked += 1
      if (steps > summary.bestDaySteps) summary.bestDaySteps = steps
      if (!summary.lastActive || row.date > summary.lastActive) summary.lastActive = row.date
    }
    const bucket = dailyTotals.get(row.date) ?? { steps: 0, users: new Set<string>() }
    bucket.steps += steps
    bucket.users.add(row.user_id)
    dailyTotals.set(row.date, bucket)
  }

  for (const row of hydrationRows) {
    const summary = summaries.get(row.user_id)
    if (summary) summary.totalWaterMl += Number(row.amount_ml) || 0
  }

  // Rows arrive newest-first, so the first one seen per user is the latest.
  for (const row of weightRows) {
    const summary = summaries.get(row.user_id)
    if (summary && summary.latestWeightKg === null) summary.latestWeightKg = Number(row.weight_kg) || null
  }

  const users = [...summaries.values()]
    .map((summary) => ({
      ...summary,
      averageSteps: summary.daysTracked > 0 ? Math.round(summary.totalSteps / summary.daysTracked) : 0,
    }))
    .sort((a, b) => b.totalSteps - a.totalSteps)

  const daily = [...dailyTotals.entries()]
    .map(([date, bucket]) => ({ date, steps: bucket.steps, users: bucket.users.size }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const totalSteps = users.reduce((sum, user) => sum + user.totalSteps, 0)
  const activeUsers = users.filter((user) => user.daysTracked > 0).length

  return {
    users,
    totals: {
      userCount: users.length,
      activeUsers,
      totalSteps,
      totalWaterMl: users.reduce((sum, user) => sum + user.totalWaterMl, 0),
      averageStepsPerUser: activeUsers > 0 ? Math.round(totalSteps / activeUsers) : 0,
    },
    daily,
    rangeDays,
  }
}
