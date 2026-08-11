'use client'

import { useState } from 'react'
import Link from 'next/link'

const steps = ['Goal', 'Age', 'Height', 'Weight', 'Activity', 'Target']

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState('Stay active')
  const [target, setTarget] = useState('10000')

  return (
    <main className="onboarding-shell">
      <div className="onboarding-card">
        <Link href="/" className="back-link">← Back to dashboard</Link>
        <p className="eyebrow">Your starting point</p>
        <h1>Let&apos;s make wellness feel personal.</h1>
        <p className="subheading">A few details help us shape goals that fit your life. You can change them anytime.</p>
        <div className="onboarding-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((label, index) => <span key={label} className={index <= step ? 'filled' : ''}>{label}</span>)}
        </div>
        <section className="onboarding-question">
          <p className="card-kicker">Step {step + 1} of {steps.length}</p>
          <h2>{step === 0 ? 'What would you like to focus on?' : step === 5 ? 'Set your daily step target.' : `Tell us about your ${steps[step].toLowerCase()}.`}</h2>
          {step === 0 ? <div className="choice-grid">{['Stay active', 'Lose weight', 'Maintain weight', 'Improve fitness'].map((item) => <button key={item} className={goal === item ? 'choice selected' : 'choice'} onClick={() => setGoal(item)}>{item}<span>{goal === item ? 'Selected' : 'Choose'}</span></button>)}</div> : step === 5 ? <label className="number-field">Steps per day<input type="number" min="1000" max="50000" value={target} onChange={(event) => setTarget(event.target.value)} /></label> : <label className="number-field">{steps[step]}<input type="number" placeholder={steps[step] === 'Age' ? '28' : steps[step] === 'Height' ? '175 cm' : steps[step] === 'Weight' ? '74 kg' : 'Moderate'} /></label>}
        </section>
        <div className="onboarding-actions"><button className="quiet-button" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>Previous</button><button className="primary-button" onClick={() => setStep((current) => Math.min(current + 1, steps.length - 1))}>{step === steps.length - 1 ? 'Save my plan' : 'Continue'}</button></div>
      </div>
    </main>
  )
}
