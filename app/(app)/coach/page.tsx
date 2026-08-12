'use client'

import { FormEvent, useState } from 'react'

export default function CoachPage() {
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!message.trim()) return
    setPending(true)
    const response = await fetch('/api/ai/coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })
    const data = await response.json()
    setReply(data.message ?? data.error ?? 'Something went wrong.')
    setPending(false)
    setMessage('')
  }

  return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">Your personal guide</p><h1>Wellness coach</h1><p className="page-subtitle">Ask for a practical next step around food, movement, water, or recovery.</p></div></header><section className="coach-card"><div className="coach-intro"><div className="insight-icon">Z</div><div><strong>Hi, I&apos;m your ZSTEPS coach.</strong><p>I&apos;ll keep the advice sustainable and grounded in your profile.</p></div></div>{reply && <div className="coach-reply"><span>Coach</span><p>{reply}</p></div>}<form className="coach-form" onSubmit={submit}><label htmlFor="coach-message" className="sr-only">Ask your wellness coach</label><textarea id="coach-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What would make today easier?" rows={3} maxLength={1200} /><button className="primary-button" disabled={pending}>{pending ? 'Thinking…' : 'Ask coach'}</button></form></section></div>
}
