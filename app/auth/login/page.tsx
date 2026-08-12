'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError(signInError.message.toLowerCase().includes('confirm') ? 'Please confirm your email before signing in.' : 'Invalid email or password.')
      setPending(false)
      return
    }
    router.push('/onboarding')
    router.refresh()
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card auth-card">
        <div className="auth-brand"><span className="brand-mark">Z</span><strong>ZSTEPS</strong></div>
        <p className="eyebrow">Welcome back</p>
        <h1>Keep your next step simple.</h1>
        <p className="subheading">Sign in to continue your personal wellness plan.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="number-field">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
          <label className="number-field">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">New to ZSTEPS? <Link href="/auth/sign-up">Create an account</Link></p>
      </section>
    </main>
  )
}
