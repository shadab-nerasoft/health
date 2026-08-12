import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)
  const [{ data: profile }, { data: activity }, { data: hydration }, { data: latestWeight }] = await Promise.all([
    supabase.from('profiles').select('first_name, water_goal_ml').eq('id', user.id).single(),
    supabase.from('daily_activity').select('steps, distance_meters, active_minutes, calories_burned').eq('user_id', user.id).eq('date', today).maybeSingle(),
    supabase.from('hydration_logs').select('amount_ml').eq('user_id', user.id).gte('logged_at', `${today}T00:00:00.000Z`),
    supabase.from('weight_logs').select('weight_kg').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const hydrationMl = (hydration ?? []).reduce((total, entry) => total + (entry.amount_ml ?? 0), 0)
  return Response.json({
    profile: profile ?? null,
    activity: activity ?? { steps: 0, distance_meters: 0, active_minutes: 0, calories_burned: 0 },
    hydrationMl,
    latestWeight: latestWeight?.weight_kg ?? null,
  })
}
