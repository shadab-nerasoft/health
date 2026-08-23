'use client'

import { useState } from 'react'
import { Stagger, StaggerItem } from '@/components/wellness/motion'
import { useTracking } from '@/components/wellness/tracking-provider'
import { apiUrl } from '@/lib/api-base'

export default function NutritionPage() {
  const { derived, history } = useTracking()
  const [plan, setPlan] = useState('')
  const [preference, setPreference] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function generatePlan() {
    setPending(true)
    setError('')

    const week = history(7)
    const averageSteps = Math.round(week.reduce((total, day) => total + day.steps, 0) / 7)

    try {
      const response = await fetch(apiUrl('/api/ai/meal-plan'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days: 7,
          mealsPerDay: 3,
          preference,
          averageSteps,
          activeMinutes: derived.activeMinutes,
        }),
      })
      const data = await response.json()
      if (!response.ok) setError(data.error ?? 'The plan could not be generated.')
      else setPlan(data.plan ?? '')
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Food that fits your routine</p>
          <h1>Nutrition</h1>
          <p className="subheading">Generate a simple seven-day plan shaped by your tracked activity.</p>
        </div>
      </div>

      <Stagger className="dashboard-grid">
        <StaggerItem className="nutrition-hero" style={{ gridColumn: '1 / -1' }}>
          <div>
            <p className="card-kicker">Personalized</p>
            <h2>Small choices, repeated often.</h2>
            <p>Tell the planner about preferences or allergies, and it will work around them.</p>
            <div className="inline-field">
              <label htmlFor="preference">Preferences and allergies</label>
              <div>
                <input
                  id="preference"
                  value={preference}
                  onChange={(event) => setPreference(event.target.value)}
                  placeholder="Vegetarian, no peanuts"
                  maxLength={200}
                />
                <button className="chip-button primary" onClick={generatePlan} disabled={pending}>
                  {pending ? 'Building…' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </StaggerItem>

        {pending && (
          <StaggerItem className="panel" style={{ gridColumn: '1 / -1' }}>
            <p className="muted" aria-live="polite">
              Building your seven-day plan…
            </p>
          </StaggerItem>
        )}

        {!pending && error && (
          <StaggerItem className="panel" style={{ gridColumn: '1 / -1' }}>
            <p className="form-error" role="alert">
              {error}
            </p>
            <button className="chip-button" onClick={generatePlan} style={{ marginTop: 12 }}>
              Try again
            </button>
          </StaggerItem>
        )}

        {!pending && !error && plan && (
          <StaggerItem className="panel plan-output" style={{ gridColumn: '1 / -1' }}>
            <p className="card-kicker">Your seven-day plan</p>
            <pre>{plan}</pre>
          </StaggerItem>
        )}
      </Stagger>
    </>
  )
}
