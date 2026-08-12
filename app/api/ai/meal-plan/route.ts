import { generateText } from 'ai'
import { z } from 'zod'
import { zstepsModel } from '@/lib/ai/groq'

const requestSchema = z.object({
  days: z.number().int().min(1).max(7).default(7),
  mealsPerDay: z.number().int().min(2).max(6).default(3),
  preference: z.string().trim().max(200).optional(),
  activeMinutes: z.number().int().min(0).max(1440).optional(),
  averageSteps: z.number().int().min(0).max(500000).optional(),
})

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 })

  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'Plan generation is not configured yet. Add a GROQ_API_KEY to enable it.' }, { status: 503 })
  }

  const { days, mealsPerDay, preference, activeMinutes, averageSteps } = parsed.data

  try {
    const result = await generateText({
      model: zstepsModel,
      system:
        'You are the ZSTEPS nutrition planning assistant. Create practical, culturally flexible meal plans. Never give medical advice. Keep portions and calories approximate, respect stated preferences and allergies, and include a brief safety note. Return plain text with clear day and meal headings.',
      prompt: `Create a ${days}-day balanced meal plan with ${mealsPerDay} meals per day. Dietary preferences and allergies: ${preference || 'none stated'}. Recent activity: about ${averageSteps ?? 0} steps and ${activeMinutes ?? 0} active minutes per day. Include approximate calories and protein per meal, hydration reminders, and simple substitutions.`,
      temperature: 0.4,
    })

    return Response.json({ plan: result.text })
  } catch {
    return Response.json({ error: 'The plan could not be generated right now. Please try again.' }, { status: 502 })
  }
}
