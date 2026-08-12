'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const steps = ['Goal', 'Basics', 'Body', 'Activity', 'Preferences']
const activityOptions = ['Mostly sitting', 'Lightly active', 'Moderately active', 'Very active']
const dietOptions = ['No preference', 'Vegetarian', 'Vegan', 'High protein']

type FormState = {
  primary_goal: 'weight_loss'
  date_of_birth: string
  sex: string
  height_cm: string
  current_weight_kg: string
  target_weight_kg: string
  activity_level: string
  dietary_preferences: string
  allergies: string
  medical_conditions: string
  meal_count: string
  water_goal_ml: string
  sleep_goal_hours: string
}

const initialForm: FormState = {
  primary_goal: 'weight_loss', date_of_birth: '', sex: '', height_cm: '', current_weight_kg: '', target_weight_kg: '', activity_level: 'Moderately active', dietary_preferences: 'No preference', allergies: '', medical_conditions: '', meal_count: '3', water_goal_ml: '2000', sleep_goal_hours: '8',
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(initialForm)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function update(field: keyof FormState, value: string) { setForm((current) => ({ ...current, [field]: value })) }
  function validateCurrentStep() {
    if (step === 1 && !form.date_of_birth) return 'Please add your date of birth.'
    if (step === 2 && (!form.height_cm || !form.current_weight_kg || !form.target_weight_kg)) return 'Add your height, current weight, and target weight.'
    if (step === 2 && Number(form.target_weight_kg) >= Number(form.current_weight_kg)) return 'Your target weight should be lower than your current weight for weight loss.'
    return ''
  }
  function next() {
    const message = validateCurrentStep()
    if (message) { setError(message); return }
    setError(''); setStep((current) => Math.min(current + 1, steps.length - 1))
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    const message = validateCurrentStep()
    if (message) { setError(message); return }
    setPending(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { error: profileError } = await supabase.from('profiles').update({ ...form, height_cm: Number(form.height_cm), current_weight_kg: Number(form.current_weight_kg), target_weight_kg: Number(form.target_weight_kg), meal_count: Number(form.meal_count), water_goal_ml: Number(form.water_goal_ml), sleep_goal_hours: Number(form.sleep_goal_hours), dietary_preferences: [form.dietary_preferences], allergies: form.allergies ? form.allergies.split(',').map((item) => item.trim()).filter(Boolean) : [], medical_conditions: form.medical_conditions ? form.medical_conditions.split(',').map((item) => item.trim()).filter(Boolean) : [], onboarding_completed: true, updated_at: new Date().toISOString() }).eq('id', user.id)
    if (profileError) { setError('We could not save your profile. Please try again.'); setPending(false); return }
    await supabase.from('weight_logs').insert({ user_id: user.id, weight_kg: Number(form.current_weight_kg) })
    await supabase.from('goals').insert({ user_id: user.id, goal_type: 'weight_loss', target_value: Number(form.target_weight_kg), unit: 'kg' })
    router.push('/')
    router.refresh()
  }

  return (
    <main className="onboarding-shell">
      <form className="onboarding-card" onSubmit={save}>
        <Link href="/" className="back-link">Back to dashboard</Link>
        <p className="eyebrow">Your starting point</p>
        <h1>Let&apos;s make wellness feel personal.</h1>
        <p className="subheading">A few details help us shape safe, practical weight-loss guidance. You can change them anytime.</p>
        <div className="onboarding-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>{steps.map((label, index) => <span key={label} className={index <= step ? 'filled' : ''}>{label}</span>)}</div>
        <section className="onboarding-question" aria-live="polite">
          <p className="card-kicker">Step {step + 1} of {steps.length}</p>
          {step === 0 && <><h2>What would you like to focus on?</h2><div className="choice-grid"><button type="button" className="choice selected">Lose weight<span>Selected</span></button><button type="button" className="choice" disabled>Build a habit<span>Coming soon</span></button></div></>}
          {step === 1 && <><h2>Tell us a little about you.</h2><div className="form-grid"><label className="number-field">Date of birth<input type="date" value={form.date_of_birth} onChange={(event) => update('date_of_birth', event.target.value)} required /></label><label className="number-field">Sex<select value={form.sex} onChange={(event) => update('sex', event.target.value)}><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option></select></label></div></>}
          {step === 2 && <><h2>Set a realistic target.</h2><div className="form-grid"><label className="number-field">Height (cm)<input type="number" min="100" max="250" value={form.height_cm} onChange={(event) => update('height_cm', event.target.value)} required /></label><label className="number-field">Current weight (kg)<input type="number" min="30" max="400" step="0.1" value={form.current_weight_kg} onChange={(event) => update('current_weight_kg', event.target.value)} required /></label><label className="number-field">Target weight (kg)<input type="number" min="30" max="400" step="0.1" value={form.target_weight_kg} onChange={(event) => update('target_weight_kg', event.target.value)} required /></label></div></>}
          {step === 3 && <><h2>How active is a normal day?</h2><div className="choice-grid">{activityOptions.map((item) => <button type="button" key={item} className={form.activity_level === item ? 'choice selected' : 'choice'} onClick={() => update('activity_level', item)}>{item}<span>{form.activity_level === item ? 'Selected' : 'Choose'}</span></button>)}</div></>}
          {step === 4 && <><h2>Make the plan fit your life.</h2><div className="choice-grid">{dietOptions.map((item) => <button type="button" key={item} className={form.dietary_preferences === item ? 'choice selected' : 'choice'} onClick={() => update('dietary_preferences', item)}>{item}<span>{form.dietary_preferences === item ? 'Selected' : 'Choose'}</span></button>)}</div><div className="form-grid"><label className="number-field">Meals per day<input type="number" min="2" max="6" value={form.meal_count} onChange={(event) => update('meal_count', event.target.value)} /></label><label className="number-field">Water goal (ml)<input type="number" min="500" max="6000" step="250" value={form.water_goal_ml} onChange={(event) => update('water_goal_ml', event.target.value)} /></label></div><label className="number-field">Allergies, separated by commas<input value={form.allergies} onChange={(event) => update('allergies', event.target.value)} placeholder="Optional" /></label></>}
        </section>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="onboarding-actions"><button type="button" className="quiet-button" disabled={step === 0 || pending} onClick={() => { setError(''); setStep((current) => current - 1) }}>Previous</button>{step === steps.length - 1 ? <button className="primary-button" type="submit" disabled={pending}>{pending ? 'Saving your plan…' : 'Save my plan'}</button> : <button type="button" className="primary-button" onClick={next}>Continue</button>}</div>
      </form>
    </main>
  )
}
