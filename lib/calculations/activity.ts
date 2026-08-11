export type ActivityInput = {
  steps: number
  distanceMeters: number
  activeMinutes: number
  weightKg?: number
}

export type ActivityEstimate = {
  walkingCalories: number
  totalActivityCalories: number
  paceKmh: number
}

/** Estimates are directional wellness metrics, not medical measurements. */
export function estimateActivityCalories(input: ActivityInput): ActivityEstimate {
  const distanceKm = Math.max(input.distanceMeters, 0) / 1000
  const activeMinutes = Math.max(input.activeMinutes, 0)
  const weightKg = input.weightKg && input.weightKg > 0 ? input.weightKg : 70
  const paceKmh = activeMinutes > 0 ? distanceKm / (activeMinutes / 60) : 0
  const intensityFactor = paceKmh >= 6 ? 0.75 : paceKmh >= 4 ? 0.53 : 0.38
  const walkingCalories = Math.round(distanceKm * weightKg * intensityFactor)
  const activeMinutesCalories = Math.round(activeMinutes * (weightKg * 0.07))

  return {
    walkingCalories,
    totalActivityCalories: Math.max(walkingCalories, activeMinutesCalories),
    paceKmh: Math.round(paceKmh * 10) / 10,
  }
}

export function estimateBmr({ weightKg, heightCm, age, sex = 'unspecified' }: { weightKg: number; heightCm: number; age: number; sex?: 'male' | 'female' | 'unspecified' }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(sex === 'male' ? base + 5 : sex === 'female' ? base - 161 : base - 78)
}
