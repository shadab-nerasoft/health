import { generateText } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { zstepsModel } from '@/lib/ai/groq'

const requestSchema = z.object({ message: z.string().trim().min(1).max(1200) })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 })
  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'Enter a message to continue' }, { status: 400 })

  const [{ data: profile }, { data: history }] = await Promise.all([
    supabase.from('profiles').select('first_name, current_weight_kg, target_weight_kg, activity_level, dietary_preferences, allergies, water_goal_ml, sleep_goal_hours').eq('id', user.id).single(),
    supabase.from('coach_messages').select('role, content').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
  ])

  await supabase.from('coach_messages').insert({ user_id: user.id, role: 'user', content: parsed.data.message })
  const result = await generateText({
    model: zstepsModel,
    system: 'You are the ZSTEPS wellness coach. Be warm, concise, practical, and non-judgmental. Support sustainable weight loss without diagnosing, prescribing, or making extreme calorie recommendations. If symptoms, eating-disorder concerns, pregnancy, or medical conditions arise, recommend speaking with a qualified clinician. Use the user profile only to personalize general wellness suggestions.',
    prompt: `User profile: ${JSON.stringify(profile)}\nRecent conversation: ${JSON.stringify((history ?? []).reverse())}\nUser message: ${parsed.data.message}`,
    temperature: 0.5,
  })
  const { error } = await supabase.from('coach_messages').insert({ user_id: user.id, role: 'assistant', content: result.text })
  if (error) return Response.json({ error: 'Could not save coach response' }, { status: 500 })
  return Response.json({ message: result.text })
}
