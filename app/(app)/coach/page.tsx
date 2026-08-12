'use client'

import { useState, type FormEvent } from 'react'
import { Stagger, StaggerItem } from '@/components/wellness/motion'
import { useTracking } from '@/components/wellness/tracking-provider'

export default function CoachPage() {
  const { today, derived, goals, history } = useTracking()
  const [message, setMessage] = useState('')
  const [lastMessage, setLastMessage] = useState('')
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function ask(text: string) {
    if (!text.trim()) return
    setPending(true)
    setError('')
    setLastMessage(text)

    const week = history(7)
    const weeklyAverageSteps = Math.round(week.reduce((total, day) => total + day.steps, 0) / 7)

    try {
      const response = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: {
            steps: today.steps,
            stepGoal: goals.steps,
            waterMl: today.waterMl,
            waterGoalMl: goals.waterMl,
            activeMinutes: derived.activeMinutes,
            weeklyAverageSteps,
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) setError(data.error ?? 'The coach could not respond.')
      else {
        setReply(data.message ?? '')
        setMessage('')
      }
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void ask(message)
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Your personal guide</p>
          <h1>Coach</h1>
          <p className="subheading">Advice grounded in the activity tracked on this device today.</p>
        </div>
      </div>

      <Stagger className="dashboard-grid">
        <StaggerItem className="coach-card" style={{ gridColumn: '1 / -1' }}>
          <div className="coach-intro">
            <div className="insight-icon">Z</div>
            <div>
              <strong>Hi, I&apos;m your ZSTEPS coach.</strong>
              <p suppressHydrationWarning>
                I can see {today.steps.toLocaleString()} steps and {(today.waterMl / 1000).toFixed(1)}L of water logged
                today.
              </p>
            </div>
          </div>

          {pending && (
            <div className="coach-reply" aria-live="polite">
              <span>Coach</span>
              <p>Thinking through your day…</p>
            </div>
          )}

          {!pending && error && (
            <div className="coach-reply error" role="alert">
              <span>Something went wrong</span>
              <p>{error}</p>
              <button className="chip-button" onClick={() => void ask(lastMessage)} style={{ marginTop: 12 }}>
                Try again
              </button>
            </div>
          )}

          {!pending && !error && reply && (
            <div className="coach-reply" aria-live="polite">
              <span>Coach</span>
              <p>{reply}</p>
            </div>
          )}

          <form className="coach-form" onSubmit={submit}>
            <label htmlFor="coach-message" className="sr-only">
              Ask your wellness coach
            </label>
            <textarea
              id="coach-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What would make today easier?"
              rows={3}
              maxLength={1200}
            />
            <button className="primary-button" disabled={pending || !message.trim()}>
              {pending ? 'Thinking…' : 'Ask coach'}
            </button>
          </form>
        </StaggerItem>
      </Stagger>
    </>
  )
}
