import { createClient } from '@/lib/supabase/server'

export type DailyActivity = {
  id: string
  date: string
  steps: number
  distance_meters: number
  active_minutes: number
  calories_burned: number
  source: string
}

export async function getCurrentUserActivity(limit = 30) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { user: null, activity: [] as DailyActivity[] }

  const { data, error } = await supabase
    .from('daily_activity')
    .select('id,date,steps,distance_meters,active_minutes,calories_burned,source')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(limit)

  if (error) throw new Error('Unable to load activity data.')
  return { user, activity: (data ?? []) as DailyActivity[] }
}

export async function upsertCurrentUserActivity(input: Omit<DailyActivity, 'id'>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Authentication required.')

  const { data, error } = await supabase
    .from('daily_activity')
    .upsert({ ...input, user_id: user.id }, { onConflict: 'user_id,date' })
    .select('id,date,steps,distance_meters,active_minutes,calories_burned,source')
    .single()

  if (error) throw new Error('Unable to save activity data.')
  return data as DailyActivity
}
