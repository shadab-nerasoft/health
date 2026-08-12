import { generateText } from 'ai'
import { z } from 'zod'
import { zstepsModel } from '@/lib/ai/groq'

const contextSchema = z
  .object({
    steps: z.number().int().min(0).max(500000).optional(),
    stepGoal: z.number().int().min(0).max(500000).optional(),
    waterMl: z.number().int().min(0).max(50000).optional(),
    waterGoalMl: z.number().int().min(0).max(50000).optional(),
    activeMinutes: z.number().int().min(0).max(1440).optional(),
    weeklyAverageSteps: z.number().int().min(0).max(500000).optional(),
  })
  .optional()

const requestSchema = z.object({
  message: z.string().trim().min(1).max(1200),
  context: contextSchema,
})

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'Enter a message to continue.' }, { status: 400 })

  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'The coach is not configured yet. Add a GROQ_API_KEY to enable it.' }, { status: 503 })
  }

  try {
    const result = await generateText({
      model: zstepsModel,
      system:
        'You are the ZSTEPS wellness coach. Be warm, concise, practical, and non-judgmental. Support sustainable habits without diagnosing, prescribing, or making extreme calorie recommendations. If symptoms, eating-disorder concerns, pregnancy, or medical conditions arise, recommend speaking with a qualified clinician. Base suggestions on the supplied activity numbers, which come from a phone motion sensor and are approximate.',
      prompt: `Today's tracked activity: ${JSON.stringify(parsed.data.context ?? {})}\nUser message: ${parsed.data.message}`,
      temperature: 0.5,
    })

    return Response.json({ message: result.text })
  } catch {
    return Response.json({ error: 'The coach could not respond right now. Please try again.' }, { status: 502 })
  }
}
