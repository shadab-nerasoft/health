'use client'

import { Flag } from 'iconsax-react'
import { Stagger, StaggerItem } from '@/components/wellness/motion'
import { useTracking } from '@/components/wellness/tracking-provider'
import { percent } from '@/lib/wellness/store'

export default function GoalsPage() {
  const { today, derived, goals, streak, updateGoals } = useTracking()
  const distanceKm = derived.distanceMeters / 1000

  const rows = [
    {
      key: 'steps' as const,
      name: 'Daily steps',
      current: today.steps.toLocaleString(),
      value: goals.steps,
      unit: 'steps',
      pct: percent(today.steps, goals.steps),
    },
    {
      key: 'distanceKm' as const,
      name: 'Distance',
      current: `${distanceKm.toFixed(1)} km`,
      value: goals.distanceKm,
      unit: 'km',
      pct: percent(distanceKm, goals.distanceKm),
    },
    {
      key: 'activeMinutes' as const,
      name: 'Active minutes',
      current: `${derived.activeMinutes} min`,
      value: goals.activeMinutes,
      unit: 'min',
      pct: percent(derived.activeMinutes, goals.activeMinutes),
    },
    {
      key: 'waterMl' as const,
      name: 'Water',
      current: `${(today.waterMl / 1000).toFixed(1)} L`,
      value: goals.waterMl,
      unit: 'ml',
      pct: percent(today.waterMl, goals.waterMl),
    },
  ]

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Stay on target</p>
          <h1>Goals</h1>
          <p className="subheading">Set your own targets. Progress updates as you track.</p>
        </div>
      </div>

      <Stagger className="dashboard-grid">
        <StaggerItem className="panel goals-panel" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Today</p>
              <h2>Active goals</h2>
            </div>
          </div>
          {rows.map((row) => (
            <div className="goal-row editable" key={row.key}>
              <div>
                <span>{row.name}</span>
                <strong suppressHydrationWarning>{row.current}</strong>
              </div>
              <div className="progress-track">
                <i style={{ width: `${Math.min(row.pct, 100)}%` }} />
              </div>
              <label className="goal-input">
                <span className="sr-only">{row.name} target</span>
                <input
                  inputMode="decimal"
                  value={row.value}
                  onChange={(event) => {
                    const next = Number(event.target.value.replace(/[^0-9.]/g, ''))
                    updateGoals({ [row.key]: Number.isFinite(next) ? next : 0 } as never)
                  }}
                />
                <em>{row.unit}</em>
              </label>
              <b suppressHydrationWarning>{row.pct}%</b>
            </div>
          ))}
        </StaggerItem>

        <StaggerItem className="streak-row" style={{ gridColumn: '1 / -1' }}>
          <div>
            <strong suppressHydrationWarning>{streak === 0 ? 'No streak yet' : `${streak}-day streak`}</strong>
            <span>
              {streak === 0
                ? `Hit ${goals.steps.toLocaleString()} steps today to start a streak.`
                : 'Days in a row where you met your step goal.'}
            </span>
          </div>
          <div className="empty-state-icon" style={{ background: 'var(--card)' }}>
            <Flag size="22" color="var(--accent-peach)" variant="Bold" />
          </div>
        </StaggerItem>
      </Stagger>
    </>
  )
}
