import { NextResponse } from 'next/server'
import { getCurrentUserActivity, upsertCurrentUserActivity } from '@/lib/health/data'

export async function GET() {
  try {
    const result = await getCurrentUserActivity()
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Unable to load activity.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const date = typeof body.date === 'string' ? body.date : ''
    const steps = Number(body.steps)
    const distanceMeters = Number(body.distance_meters ?? 0)
    const activeMinutes = Number(body.active_minutes ?? 0)
    const caloriesBurned = Number(body.calories_burned ?? 0)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || [steps, distanceMeters, activeMinutes, caloriesBurned].some((value) => !Number.isFinite(value) || value < 0)) {
      return NextResponse.json({ error: 'Invalid activity values.' }, { status: 400 })
    }

    const activity = await upsertCurrentUserActivity({
      date,
      steps: Math.round(steps),
      distance_meters: distanceMeters,
      active_minutes: Math.round(activeMinutes),
      calories_burned: caloriesBurned,
      source: 'manual',
    })

    return NextResponse.json({ activity }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unable to save activity.' }, { status: 500 })
  }
}
