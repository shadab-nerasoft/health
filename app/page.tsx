'use client'

import { useState } from 'react'
import { Activity, ArrowRight2, Chart2, Drop, Flag, Flash, HambergerMenu, Heart, Home2, Lamp, Notification, Setting2, TrendUp, User } from 'iconsax-react'

const week = [42, 68, 51, 84, 62, 76, 58]
const activity = [18, 26, 31, 22, 38, 44, 28, 36, 29, 48, 39, 55, 46, 61, 52, 42, 63, 51, 68, 57, 72, 60, 48, 34]

function StepRing() {
  return <div className="step-ring" aria-label="84 percent of daily step goal"><div><strong>8,420</strong><span>steps</span><small>84% of goal</small></div></div>
}

function MiniBars({ values, color = 'var(--accent-blue)' }: { values: number[]; color?: string }) {
  return <div className="mini-bars" aria-hidden="true">{values.map((value, index) => <i key={index} style={{ height: `${value}%`, background: color }} />)}</div>
}

function NavItem({ icon: Icon, label, active = false }: { icon: typeof Home2; label: string; active?: boolean }) {
  return <button className={`nav-item ${active ? 'active' : ''}`}><Icon size="19" color={active ? '#202124' : '#747474'} variant={active ? 'Bold' : 'Linear'} /><span>{label}</span></button>
}

export default function Page() {
  const [metric, setMetric] = useState('Steps')
  const [dismissed, setDismissed] = useState(false)
  return <main className="wellness-app">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Activity size="18" color="#202124" variant="Bold" /></div><span>wellnest</span></div>
      <p className="nav-label">Overview</p><nav><NavItem icon={Home2} label="Home" active /><NavItem icon={Activity} label="Activity" /><NavItem icon={TrendUp} label="Progress" /><NavItem icon={Flag} label="Goals" /><NavItem icon={Lamp} label="Insights" /></nav>
      <p className="nav-label">Wellness</p><nav><NavItem icon={Drop} label="Water" /><NavItem icon={Heart} label="Heart rate" /><NavItem icon={User} label="Profile" /></nav>
      <div className="sidebar-bottom"><NavItem icon={Setting2} label="Settings" /><div className="user-chip"><div className="avatar">S</div><div><strong>Shadab</strong><span>Personal plan</span></div><ArrowRight2 size="16" color="#747474" /></div></div>
    </aside>
    <section className="content">
      <header className="topbar"><button className="mobile-menu" aria-label="Open menu"><HambergerMenu size="21" /></button><div className="mobile-brand">wellnest</div><div className="topbar-actions"><button className="icon-button" aria-label="Notifications"><Notification size="19" color="#202124" /></button><div className="avatar large">S</div></div></header>
      <div className="page-heading"><div><p className="eyebrow">Tuesday, October 24, 2024</p><h1>Good morning, Shadab</h1><p className="subheading">Here&apos;s your health at a glance.</p></div><button className="date-button">Today <ArrowRight2 size="16" color="#747474" /></button></div>
      <div className="dashboard-grid">
        <section className="hero-card"><div><p className="card-kicker">Today&apos;s movement</p><h2>Keep your rhythm</h2><p className="muted">You&apos;re building a great habit. A little more movement will get you to your goal.</p><button className="soft-button">View activity <ArrowRight2 size="16" color="#747474" /></button></div><StepRing /></section>
        <section className="metrics-grid"><article className="metric-card blue"><div className="metric-top"><span>Steps</span><Activity size="18" color="#4f9eb3" /></div><strong>8,420</strong><small>84% of daily goal</small><MiniBars values={[30, 45, 42, 65, 50, 72, 64, 88]} /></article><article className="metric-card peach"><div className="metric-top"><span>Calories</span><Flash size="18" color="#c97d63" /></div><strong>426 <em>kcal</em></strong><small>Estimated burned</small><MiniBars values={[42, 35, 52, 44, 68, 51, 60, 76]} color="var(--accent-peach)" /></article><article className="metric-card green"><div className="metric-top"><span>Distance</span><TrendUp size="18" color="#6d9750" /></div><strong>6.2 <em>km</em></strong><small>Distance walked</small><MiniBars values={[40, 55, 34, 62, 52, 76, 68, 80]} color="var(--accent-green)" /></article><article className="metric-card lavender"><div className="metric-top"><span>Active time</span><Chart2 size="18" color="#8f6bb3" /></div><strong>74 <em>min</em></strong><small>Active today</small><MiniBars values={[32, 45, 39, 58, 63, 52, 72, 66]} color="var(--accent-lavender)" /></article></section>
        <section className="panel activity-panel"><div className="panel-heading"><div><p className="card-kicker">Live overview</p><h2>Today&apos;s activity</h2></div><div className="segmented">{['Steps', 'Calories', 'Active'].map(item => <button key={item} onClick={() => setMetric(item)} className={metric === item ? 'selected' : ''}>{item}</button>)}</div></div><div className="activity-chart"><div className="chart-bars">{activity.map((value, index) => <i key={index} style={{ height: `${value}%` }} />)}</div><div className="chart-labels"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span></div></div></section>
        <section className="panel weekly-panel"><div className="panel-heading"><div><p className="card-kicker">This week</p><h2>Activity</h2></div><button className="more-button">7 days <ArrowRight2 size="15" /></button></div><MiniBars values={week} color="var(--ink)" /><div className="week-labels">{['M','T','W','T','F','S','S'].map((day, i) => <span key={i}>{day}</span>)}</div><div className="weekly-summary"><div><strong>8,742</strong><span>average steps/day</span></div><b>+12.4% <small>vs last week</small></b></div></section>
        <section className="panel goals-panel"><div className="panel-heading"><div><p className="card-kicker">Keep going</p><h2>Today&apos;s goals</h2></div><button className="more-button">Edit <ArrowRight2 size="15" /></button></div>{[['Steps','8,420','10,000',84],['Distance','6.2 km','7.5 km',83],['Active minutes','74 min','60 min',100]].map(([name, current, target, percent]) => <div className="goal-row" key={String(name)}><div><span>{name}</span><strong>{current} <small>/ {target}</small></strong></div><div className="progress-track"><i style={{ width: `${percent}%` }} /></div><b>{percent}%</b></div>)}</section>
        <section className="insight-card"><div className="insight-icon"><Lamp size="20" color="#8f6bb3" /></div><div><p className="card-kicker">A little insight</p><h2>Your activity is highest between 6–8 PM.</h2><p className="muted">That evening window is becoming your strongest movement habit.</p></div></section>
        {!dismissed && <section className="recommendation"><div className="recommendation-icon"><Drop size="20" color="#4f9eb3" /></div><div><p className="card-kicker">Daily recommendation</p><h2>Stay hydrated</h2><p className="muted">You&apos;ve logged 1.2L today. Target: 2.5L</p></div><button onClick={() => setDismissed(true)} className="dismiss">Dismiss</button><ArrowRight2 size="18" /></section>}
      </div>
      <nav className="bottom-nav"><NavItem icon={Home2} label="Home" active /><NavItem icon={Activity} label="Activity" /><NavItem icon={Flag} label="Goals" /><NavItem icon={Lamp} label="Insights" /><NavItem icon={User} label="Profile" /></nav>
    </section>
  </main>
}
