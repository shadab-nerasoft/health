import { generateText } from 'ai'
import { z } from 'zod'
import { zstepsModel } from '@/lib/ai/groq'

const nudgeContextSchema = z.object({
  primary_goal: z.enum(['weight_loss', 'weight_gain', 'maintenance', 'habit']).default('weight_loss'),
  dietary_preferences: z.array(z.string()).default(['No preference']),
  meal_count: z.number().int().min(1).max(8).default(3),
  current_weight_kg: z.number().optional(),
  target_weight_kg: z.number().optional(),
  activity_level: z.string().optional(),
  water_goal_ml: z.number().optional(),
  current_water_ml: z.number().optional(),
  current_steps: z.number().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = nudgeContextSchema.safeParse(body)
    const ctx = parsed.success ? parsed.data : nudgeContextSchema.parse({})

    const isWeightLoss = ctx.primary_goal === 'weight_loss'
    const isWeightGain = ctx.primary_goal === 'weight_gain'
    const dietStr = ctx.dietary_preferences.join(', ') || 'Standard'

    if (process.env.GROQ_API_KEY) {
      try {
        const result = await generateText({
          model: zstepsModel,
          system: `You are the ZSTEPS AI Nutrition & Wellness Coach.
Your task is to craft 1 short, highly actionable, encouraging daily push notification tailored precisely to the user's specific health profile.
Rules:
- Title: 3-5 words max, engaging with 1 relevant emoji (e.g. "🥗 High Protein Fuel", "💪 Weight Surplus Nudge", "💧 Hydration Check").
- Body: 1-2 short sentences (max 120 chars) providing specific meal/diet/hydration advice for their specific goal (${ctx.primary_goal}) and diet preference (${dietStr}).
- If weight_loss: focus on protein pacing, satiety, fiber, water, and smart calorie deficit.
- If weight_gain: focus on nutrient-dense calorie surplus, meal frequency (${ctx.meal_count} meals/day), healthy fats, and post-workout fuel.
- Output MUST be valid JSON with keys: "title" and "body".`,
          prompt: `User Profile:
- Goal: ${ctx.primary_goal}
- Current Weight: ${ctx.current_weight_kg ? `${ctx.current_weight_kg}kg` : 'Not set'} -> Target: ${ctx.target_weight_kg ? `${ctx.target_weight_kg}kg` : 'Not set'}
- Diet Preference: ${dietStr}
- Daily Meal Target: ${ctx.meal_count} meals per day
- Activity Level: ${ctx.activity_level || 'Moderate'}
- Water Tracked: ${ctx.current_water_ml || 1200}ml / Goal: ${ctx.water_goal_ml || 2500}ml

Generate 1 notification JSON:`,
          temperature: 0.7,
        })

        // Clean up markdown wrapping if present
        const cleanText = result.text.replace(/```json/g, '').replace(/```/g, '').trim()
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsedNotification = JSON.parse(jsonMatch[0])
          return Response.json(parsedNotification)
        }
      } catch (aiErr) {
        console.error('Groq AI generation fallback:', aiErr)
      }
    }

    // High quality algorithmic fallback if AI API is unavailable
    let title = '🥗 Balanced Meal Nudge'
    let bodyText = `Time for meal focus! Stick to your ${dietStr} preference for optimal energy.`

    if (isWeightLoss) {
      title = '🔥 Weight Loss Protein Fuel'
      bodyText = `Prioritize lean protein & fiber for your next meal to stay full while in a healthy deficit.`
    } else if (isWeightGain) {
      title = '💪 Weight Gain Energy Surplus'
      bodyText = `Ensure meal ${Math.min(ctx.meal_count, 3)} includes healthy fats & complex carbs to hit your target surplus.`
    }

    return Response.json({
      title,
      body: bodyText,
    })
  } catch (error) {
    console.error('AI Nudge API Error:', error)
    return Response.json(
      {
        title: '🥗 Smart Diet Nudge',
        body: 'Remember to log your meal and water intake to stay aligned with your wellness goal!',
      },
      { status: 200 }
    )
  }
}
