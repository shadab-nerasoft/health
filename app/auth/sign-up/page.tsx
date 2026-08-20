'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppLogo } from '@/components/wellness/app-logo'

export default function SignUpPage() {
  const router = useRouter()
  const [form, setForm] = useState({ firstName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
        data: { first_name: form.firstName },
      },
    })
    if (signUpError) {
      setError(signUpError.message.toLowerCase().includes('password') ? signUpError.message : 'Unable to create your account. Check your details and try again.')
      setPending(false)
      return
    }
    if (data.session) router.push('/onboarding')
    else router.push('/auth/sign-up-success')
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card auth-card">
        <div className="auth-brand"><span className="brand-mark"><AppLogo size="18" color="currentColor" /></span><strong>ZSTEPS</strong></div>
        <p className="eyebrow">Start with yourself</p>
        <h1>A healthier rhythm starts here.</h1>
        <p className="subheading">Create your private account and we&apos;ll shape the experience around your goals.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="number-field">First name<input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required autoComplete="given-name" /></label>
          <label className="number-field">Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required autoComplete="email" /></label>
          <label className="number-field">Password<input type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required autoComplete="new-password" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={pending}>{pending ? 'Creating account…' : 'Create account'}</button>
        </form>
        <p className="auth-switch">Already have an account? <Link href="/auth/login">Sign in</Link></p>
      </section>
    </main>
  )
}
