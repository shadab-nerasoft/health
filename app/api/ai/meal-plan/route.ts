import { generateText } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { zstepsModel } from '@/lib/ai/groq'

const requestSchema = z.object({ days: z.number().int().min(1).max(7).default(7) })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 })

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('first_name, current_weight_kg, target_weight_kg, height_cm, sex, activity_level, dietary_preferences, allergies, meal_count').eq('id', user.id).single()
  if (!profile) return Response.json({ error: 'Complete onboarding first' }, { status: 400 })

  const result = await generateText({
    model: zstepsModel,
    system: 'You are ZSTEPS nutrition planning assistant. Create practical, culturally flexible weight-loss meal plans. Never give medical advice. Keep portions and calories approximate, flag allergies, and include a brief safety note. Return plain text with clear day and meal headings.',
    prompt: `Create a ${parsed.data.days}-day weight-loss meal plan for this user: ${JSON.stringify(profile)}. Use ${profile.meal_count ?? 3} meals per day. Include approximate calories and protein per meal, hydration reminders, and simple substitutions.`,
    temperature: 0.4,
  })

  const { error } = await supabase.from('meal_plans').insert({ user_id: user.id, goal: 'weight_loss', plan: { text: result.text, days: parsed.data.days } })
  if (error) return Response.json({ error: 'Could not save meal plan' }, { status: 500 })
  return Response.json({ plan: result.text })
}
