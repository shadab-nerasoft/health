import Link from 'next/link'

export default function SignUpSuccessPage() {
  return (
    <main className="onboarding-shell">
      <section className="onboarding-card auth-card">
        <div className="auth-brand"><span className="brand-mark">Z</span><strong>ZSTEPS</strong></div>
        <p className="eyebrow">One more step</p>
        <h1>Check your inbox.</h1>
        <p className="subheading">We sent a confirmation link to your email. Confirm it, then return here to finish your ZSTEPS profile.</p>
        <Link className="primary-button button-link" href="/auth/login">Back to sign in</Link>
      </section>
    </main>
  )
}
