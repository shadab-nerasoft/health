/**
 * AI Continuous Diet, Meal & Weight Goal Notification Engine
 */

export interface AINudge {
  id: string
  title: string
  desc: string
  time: string
  category: 'diet' | 'weight' | 'water' | 'activity'
  read: boolean
}

const STORAGE_KEY = 'zsteps-ai-nudges'

export function generateDynamicNudgesFromState(
  profile: any,
  goals: any,
  today: any,
  derived: any,
  latestWeight: any
): AINudge[] {
  const nudges: AINudge[] = []
  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const hour = new Date().getHours()

  // 1. DYNAMIC DIET / MEAL / WEIGHT GOAL NUDGE
  const primaryGoal = profile?.primary_goal || 'weight_loss'
  const isWeightLoss = primaryGoal === 'weight_loss'
  const isWeightGain = primaryGoal === 'weight_gain'
  const dietPref = profile?.dietary_preferences?.[0] || 'Balanced'
  const mealCount = profile?.meal_count || 3
  const currentKg = latestWeight?.kg || profile?.weightKg || 70
  const targetKg = profile?.target_weight_kg || (isWeightLoss ? Math.round(currentKg * 0.9) : Math.round(currentKg * 1.1))

  // Determine current meal window dynamically by hour
  let mealNum = 1
  let mealPeriod = 'Breakfast'
  if (hour >= 11 && hour < 16) {
    mealNum = 2
    mealPeriod = 'Lunch'
  } else if (hour >= 16 && hour < 22) {
    mealNum = Math.min(3, mealCount)
    mealPeriod = 'Dinner'
  }

  if (isWeightLoss) {
    nudges.push({
      id: `dynamic-diet-${Date.now()}`,
      title: `🔥 ${mealPeriod} Protein Fuel (Meal ${mealNum}/${mealCount})`,
      desc: `Current weight: ${currentKg}kg → Target: ${targetKg}kg. Focus on ${dietPref} with high protein & fiber to maintain a safe deficit.`,
      time: timeNow,
      category: 'diet',
      read: false,
    })
  } else if (isWeightGain) {
    nudges.push({
      id: `dynamic-diet-${Date.now()}`,
      title: `💪 ${mealPeriod} Calorie Surplus (Meal ${mealNum}/${mealCount})`,
      desc: `Current weight: ${currentKg}kg → Target: ${targetKg}kg. Consume a nutrient-dense ${dietPref} meal with healthy fats for muscle growth.`,
      time: timeNow,
      category: 'diet',
      read: false,
    })
  } else {
    nudges.push({
      id: `dynamic-diet-${Date.now()}`,
      title: `🥗 ${mealPeriod} Balanced Nutrition (Meal ${mealNum}/${mealCount})`,
      desc: `Maintain your healthy ${dietPref} balance. Include lean protein and fresh greens for steady daily energy.`,
      time: timeNow,
      category: 'diet',
      read: false,
    })
  }

  // 2. DYNAMIC HYDRATION NUDGE
  const loggedWater = today?.waterMl || 0
  const waterTarget = goals?.waterMl || 2500
  const remainingWater = Math.max(0, waterTarget - loggedWater)

  if (remainingWater > 0) {
    nudges.push({
      id: `dynamic-water-${Date.now()}`,
      title: `💧 Hydration Check: ${loggedWater.toLocaleString()}/${waterTarget.toLocaleString()}ml`,
      desc: `You have logged ${loggedWater.toLocaleString()}ml today. Drink ${Math.min(350, remainingWater)}ml now to stay on track for your ${waterTarget.toLocaleString()}ml goal.`,
      time: timeNow,
      category: 'water',
      read: true,
    })
  } else {
    nudges.push({
      id: `dynamic-water-${Date.now()}`,
      title: `🎉 Daily Water Goal Achieved!`,
      desc: `Great work! You reached your ${waterTarget.toLocaleString()}ml hydration target today.`,
      time: timeNow,
      category: 'water',
      read: true,
    })
  }

  // 3. DYNAMIC STEP & ACTIVITY NUDGE
  const stepsLogged = today?.steps || 0
  const stepTarget = goals?.steps || 10000
  const remainingSteps = Math.max(0, stepTarget - stepsLogged)
  const caloriesBurned = derived?.calories || Math.round(stepsLogged * 0.04)
  const activeMins = derived?.activeMinutes || Math.round(stepsLogged / 110)

  if (remainingSteps > 0) {
    nudges.push({
      id: `dynamic-activity-${Date.now()}`,
      title: `🏃 Activity Checkpoint: ${stepsLogged.toLocaleString()}/${stepTarget.toLocaleString()} steps`,
      desc: `You've burned ${caloriesBurned} kcal across ${activeMins} active mins. ${remainingSteps.toLocaleString()} steps remaining to reach your goal!`,
      time: timeNow,
      category: 'activity',
      read: true,
    })
  } else {
    nudges.push({
      id: `dynamic-activity-${Date.now()}`,
      title: `🏆 Daily Movement Goal Crushed!`,
      desc: `Awesome job! You reached ${stepsLogged.toLocaleString()} steps and burned ${caloriesBurned} kcal today.`,
      time: timeNow,
      category: 'activity',
      read: true,
    })
  }

  return nudges
}

export async function fetchAINudge(payload: any): Promise<AINudge> {
  try {
    const res = await fetch('/api/ai/nudge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    })

    if (!res.ok) throw new Error('AI request failed')
    const data = await res.json()

    return {
      id: `ai-${Date.now()}`,
      title: data.title || '🥗 AI Meal Reminder',
      desc: data.body || 'Keep up with your healthy diet choices today!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'diet',
      read: false,
    }
  } catch (err) {
    console.warn('AI Nudge fetch fallback:', err)
    const isWeightLoss = payload?.primary_goal === 'weight_loss'
    const currentKg = payload?.current_weight_kg || 70
    const targetKg = payload?.target_weight_kg || (isWeightLoss ? Math.round(currentKg * 0.9) : Math.round(currentKg * 1.1))

    return {
      id: `ai-${Date.now()}`,
      title: isWeightLoss ? '🔥 Weight Loss Protein Fuel' : '💪 Weight Gain Energy Surplus',
      desc: isWeightLoss
        ? `Current weight ${currentKg}kg → Target ${targetKg}kg. Focus on protein & high fiber for satiety.`
        : `Current weight ${currentKg}kg → Target ${targetKg}kg. Eat a nutrient-dense surplus meal now.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'diet',
      read: false,
    }
  }
}

export function getStoredAINudges(): AINudge[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveAINudge(nudge: AINudge): AINudge[] {
  if (typeof window === 'undefined') return []
  try {
    const current = getStoredAINudges()
    const updated = [nudge, ...current.slice(0, 19)]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return updated
  } catch {
    return []
  }
}

export async function triggerBrowserPush(nudge: AINudge) {
  if (typeof window === 'undefined' || !('Notification' in window)) return

  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const readyPromise = navigator.serviceWorker.ready
        const timeoutPromise = new Promise<undefined>((resolve) =>
          setTimeout(() => resolve(undefined), 1500)
        )
        const registration = await Promise.race([readyPromise, timeoutPromise])

        if (registration && registration.showNotification) {
          await registration.showNotification(nudge.title, {
            body: nudge.desc,
            icon: '/icon.svg',
            badge: '/icon.svg',
            data: { url: '/' },
          })
          return
        }
      }
      new Notification(nudge.title, {
        body: nudge.desc,
        icon: '/icon.svg',
      })
    } catch (e) {
      console.warn('Browser push trigger warning:', e)
    }
  }
}
