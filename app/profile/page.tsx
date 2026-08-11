import Link from 'next/link'

const details = [['Age', '28 years'], ['Height', '175 cm'], ['Weight', '74 kg'], ['Activity level', 'Moderate']]

export default function ProfilePage() {
  return <main className="profile-shell"><div className="profile-card"><Link href="/" className="back-link">← Back to dashboard</Link><div className="profile-heading"><div className="avatar profile-avatar">S</div><div><p className="eyebrow">Your profile</p><h1>Shadab</h1><p className="muted">Personal wellness plan</p></div></div><section className="profile-section"><div className="panel-heading"><div><p className="card-kicker">Personal information</p><h2>Your details</h2></div><button className="more-button">Edit</button></div><div className="profile-details">{details.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section><section className="profile-section soft-green"><p className="card-kicker">Current goal</p><h2>{'Stay active'}</h2><p className="muted">Daily target: 10,000 steps</p><div className="profile-progress"><i style={{ width: '84%' }} /></div></section><section className="profile-links"><Link href="/onboarding">Update wellness plan <span>→</span></Link><Link href="/">Privacy and data <span>→</span></Link></section></div></main>
}
