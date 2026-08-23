'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Activity, ArrowRight2, Chart2, Drop, Flash, Lamp, TrendUp } from 'iconsax-react'
import { Stagger, StaggerItem } from '@/components/wellness/motion'
import { SensorPanel } from '@/components/wellness/sensor-panel'
import { useTracking } from '@/components/wellness/tracking-provider'
import { percent } from '@/lib/wellness/store'

function StepRing({ steps, stepPercent }: { steps: number; stepPercent: number }) {
  const capped = Math.min(stepPercent, 100)
  return (
    <div
      className="step-ring"
      style={{ background: `conic-gradient(var(--foreground) 0 ${capped}%, var(--ring-track) ${capped}% 100%)` }}
      aria-label={`${stepPercent} percent of daily step goal`}
    >
      <div>
        <strong suppressHydrationWarning>{steps.toLocaleString()}</strong>
        <span>steps</span>
        <small suppressHydrationWarning>{stepPercent}% of goal</small>
      </div>
    </div>
  )
}

function MiniBars({ values, color = 'var(--accent-blue)' }: { values: number[]; color?: string }) {
  return (
    <div className="mini-bars" aria-hidden="true">
      {values.map((value, index) => (
        <i key={index} style={{ height: `${Math.max(4, value)}%`, background: color }} />
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { ready, today, derived, goals, history, todayWaterEntries } = useTracking()
  const [dateLabel, setDateLabel] = useState('')

  useEffect(() => {
    setDateLabel(new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }))
  }, [])

  const week = history(7)
  const maxWeekSteps = Math.max(goals.steps, ...week.map((day) => day.steps))
  const weekBars = week.map((day) => Math.round((day.steps / maxWeekSteps) * 100))
  const weekAverage = Math.round(week.reduce((total, day) => total + day.steps, 0) / 7)
  const stepPercent = percent(today.steps, goals.steps)
  const distanceKm = derived.distanceMeters / 1000
  const hasSteps = ready && today.steps > 0
  const hasWeekData = week.some((day) => day.steps > 0)

  const goalRows = [
    ['Steps', today.steps.toLocaleString(), goals.steps.toLocaleString(), percent(today.steps, goals.steps)],
    ['Distance', `${distanceKm.toFixed(1)} km`, `${goals.distanceKm} km`, percent(distanceKm, goals.distanceKm)],
    [
      'Active minutes',
      `${derived.activeMinutes} min`,
      `${goals.activeMinutes} min`,
      percent(derived.activeMinutes, goals.activeMinutes),
    ],
    ['Water', `${(today.waterMl / 1000).toFixed(1)} L`, `${(goals.waterMl / 1000).toFixed(1)} L`, percent(today.waterMl, goals.waterMl)],
  ] as const

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow" suppressHydrationWarning>
            {dateLabel || 'Today'}
          </p>
          <h1>Your day so far</h1>
          <p className="subheading">Everything here is measured on this device.</p>
        </div>
        <Link href="/activity" className="date-button">
          Activity <ArrowRight2 size="16" color="var(--muted-foreground)" />
        </Link>
      </div>

      <Stagger className="dashboard-grid">
        <StaggerItem className="hero-card">
          <div>
            <p className="card-kicker">Today&apos;s movement</p>
            <h2>{hasSteps ? 'Keep your rhythm' : 'Start moving'}</h2>
            <p className="muted">
              {hasSteps
                ? `You're ${stepPercent}% of the way to your ${goals.steps.toLocaleString()} step goal.`
                : 'No steps recorded yet today. Walk with this tab open, or add steps manually below.'}
            </p>
            <Link href="/activity" className="soft-button">
              View activity <ArrowRight2 size="16" color="var(--muted-foreground)" />
            </Link>
          </div>
          <StepRing steps={today.steps} stepPercent={stepPercent} />
        </StaggerItem>

        <StaggerItem style={{ gridColumn: '1 / -1' }}>
          <SensorPanel />
        </StaggerItem>

        <StaggerItem className="metrics-grid">
          <article className="metric-card blue">
            <div className="metric-top">
              <span>Steps</span>
              <Activity size="18" color="var(--accent-blue)" />
            </div>
            <strong suppressHydrationWarning>{today.steps.toLocaleString()}</strong>
            <small suppressHydrationWarning>{stepPercent}% of daily goal</small>
            {hasWeekData && <MiniBars values={weekBars} />}
          </article>
          <article className="metric-card peach">
            <div className="metric-top">
              <span>Calories</span>
              <Flash size="18" color="var(--accent-peach)" />
            </div>
            <strong suppressHydrationWarning>
              {derived.calories} <em>kcal</em>
            </strong>
            <small>Estimated from steps</small>
            {hasWeekData && <MiniBars values={weekBars} color="var(--accent-peach)" />}
          </article>
          <article className="metric-card green">
            <div className="metric-top">
              <span>Distance</span>
              <TrendUp size="18" color="var(--accent-green)" />
            </div>
            <strong suppressHydrationWarning>
              {distanceKm.toFixed(1)} <em>km</em>
            </strong>
            <small>0.76 m average stride</small>
            {hasWeekData && <MiniBars values={weekBars} color="var(--accent-green)" />}
          </article>
          <article className="metric-card lavender">
            <div className="metric-top">
              <span>Active time</span>
              <Chart2 size="18" color="var(--accent-lavender)" />
            </div>
            <strong suppressHydrationWarning>
              {derived.activeMinutes} <em>min</em>
            </strong>
            <small>Estimated moving time</small>
            {hasWeekData && <MiniBars values={weekBars} color="var(--accent-lavender)" />}
          </article>
        </StaggerItem>

        <StaggerItem className="panel weekly-panel">
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Last 7 days</p>
              <h2>Steps</h2>
            </div>
            <Link href="/progress" className="more-button">
              Trends <ArrowRight2 size="15" color="#94a3b8" />
            </Link>
          </div>
          {hasWeekData ? (
            <>
              <MiniBars values={weekBars} color="var(--ink)" />
              <div className="week-labels">
                {week.map((day) => (
                  <span key={day.date} suppressHydrationWarning>
                    {new Date(`${day.date}T00:00:00`).toLocaleDateString([], { weekday: 'narrow' })}
                  </span>
                ))}
              </div>
              <div className="weekly-summary">
                <div>
                  <strong suppressHydrationWarning>{weekAverage.toLocaleString()}</strong>
                  <span>average steps/day</span>
                </div>
                <b suppressHydrationWarning>
                  {week.filter((day) => day.steps > 0).length} <small>days with data</small>
                </b>
              </div>
            </>
          ) : (
            <p className="panel-empty">
              Your weekly chart appears once a day of steps is recorded. Start tracking above to fill it in.
            </p>
          )}
        </StaggerItem>

        <StaggerItem className="panel goals-panel">
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Keep going</p>
              <h2>Today&apos;s goals</h2>
            </div>
            <Link href="/goals" className="more-button">
              Edit <ArrowRight2 size="15" color="#94a3b8" />
            </Link>
          </div>
          {goalRows.map(([name, current, target, value]) => (
            <div className="goal-row" key={name}>
              <div>
                <span>{name}</span>
                <strong suppressHydrationWarning>
                  {current} <small>/ {target}</small>
                </strong>
              </div>
              <div className="progress-track">
                <i style={{ width: `${Math.min(value, 100)}%` }} />
              </div>
              <b suppressHydrationWarning>{value}%</b>
            </div>
          ))}
        </StaggerItem>

        <StaggerItem className="insight-card">
          <div className="insight-icon">
            <Lamp size="20" color="var(--accent-lavender)" />
          </div>
          <div>
            <p className="card-kicker">A little insight</p>
            <h2 suppressHydrationWarning>
              {hasSteps
                ? `You've covered ${distanceKm.toFixed(1)} km on foot today.`
                : 'Your history builds as you use the app.'}
            </h2>
            <p className="muted">
              Estimates come from your own step count, so they get more useful the longer you keep tracking.
            </p>
          </div>
        </StaggerItem>

        <StaggerItem className="recommendation">
          <div className="recommendation-icon">
            <Drop size="20" color="var(--accent-blue)" />
          </div>
          <div>
            <p className="card-kicker">Hydration</p>
            <h2>Stay hydrated</h2>
            <p className="muted" suppressHydrationWarning>
              {(today.waterMl / 1000).toFixed(1)}L logged of {(goals.waterMl / 1000).toFixed(1)}L
              {todayWaterEntries.length > 0 ? ` across ${todayWaterEntries.length} entries.` : ' today.'}
            </p>
          </div>
          <Link href="/water" className="dismiss">
            Log water
          </Link>
          <ArrowRight2 size="18" color="#94a3b8" />
        </StaggerItem>
      </Stagger>
    </>
  )
}
