'use client'

import { useState } from 'react'

export default function NutritionPage() {
  const [plan, setPlan] = useState('')
  const [pending, setPending] = useState(false)
  async function generatePlan() { setPending(true); const response = await fetch('/api/ai/meal-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: 7 }) }); const data = await response.json(); setPlan(data.plan ?? data.error ?? 'Something went wrong.'); setPending(false) }
  return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">Food that fits your goal</p><h1>Nutrition plan</h1><p className="page-subtitle">Generate a simple, personalized seven-day plan for sustainable weight loss.</p></div><button className="primary-button" onClick={generatePlan} disabled={pending}>{pending ? 'Building plan…' : 'Generate plan'}</button></header><section className="nutrition-hero"><div><p className="card-kicker">Personalized by Groq</p><h2>Small choices, repeated often.</h2><p>Your plan uses the information from onboarding, including your activity level and food preferences.</p></div></section>{plan && <section className="content-card plan-output"><p className="card-kicker">Your seven-day plan</p><pre>{plan}</pre></section>}</div>
}
