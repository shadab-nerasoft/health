'use client'

import { useState } from 'react'
import { TrendUp } from 'iconsax-react'
import { Stagger, StaggerItem } from '@/components/wellness/motion'
import { DataPanel } from '@/components/wellness/data-panel'
import { useTracking } from '@/components/wellness/tracking-provider'
import { derivedFromSteps, percent } from '@/lib/wellness/store'

const ranges = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
]

export default function ProgressPage() {
  const { ready, goals, history, streak, state, latestWeight, logWeight } = useTracking()
  const [range, setRange] = useState(ranges[0])
  const [weight, setWeight] = useState('')

  const days = history(range.days)
  const totalSteps = days.reduce((total, day) => total + day.steps, 0)
  const average = Math.round(totalSteps / range.days)
  const rangeDerived = derivedFromSteps(totalSteps)
  const goalsMet = days.filter((day) => day.steps >= goals.steps).length
  const maxSteps = Math.max(goals.steps, ...days.map((day) => day.steps))
  const bars = days.slice(-14)
  const weights = state.weights.slice(0, 8)

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">How you&apos;re trending</p>
          <h1>Progress</h1>
          <p className="subheading">Trends build from the days you track on this device.</p>
        </div>
        <div className="filter-tabs">
          {ranges.map((item) => (
            <button key={item.label} className={range.label === item.label ? 'selected' : ''} onClick={() => setRange(item)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <Stagger className="dashboard-grid">
        <StaggerItem className="stat-grid" style={{ gridColumn: '1 / -1' }}>
          <div className="stat-card">
            <span>Average steps</span>
            <strong suppressHydrationWarning>{average.toLocaleString()}</strong>
          </div>
          <div className="stat-card">
            <span>Total distance</span>
            <strong suppressHydrationWarning>
              {(rangeDerived.distanceMeters / 1000).toFixed(1)} <em>km</em>
            </strong>
          </div>
          <div className="stat-card">
            <span>Goal completion</span>
            <strong suppressHydrationWarning>{percent(goalsMet, range.days)}%</strong>
            <b className="up" suppressHydrationWarning>
              <TrendUp size="13" color="var(--success)" /> {goalsMet} of {range.days} days
            </b>
          </div>
          <div className="stat-card">
            <span>Current streak</span>
            <strong suppressHydrationWarning>
              {streak} <em>days</em>
            </strong>
          </div>
        </StaggerItem>

        <StaggerItem className="panel weekly-panel" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Steps</p>
              <h2>Recent trend</h2>
            </div>
          </div>
          {!ready || totalSteps === 0 ? (
            <p className="muted empty-note">No history yet. Your trend appears once steps are recorded.</p>
          ) : (
            <>
              <div className="mini-bars" style={{ height: 140, gap: 8, marginTop: 26 }}>
                {bars.map((day) => (
                  <i
                    key={day.date}
                    style={{
                      height: `${Math.max(4, Math.round((day.steps / maxSteps) * 100))}%`,
                      background: 'var(--ink)',
                      borderRadius: '8px 8px 3px 3px',
                      opacity: 0.85,
                    }}
                  />
                ))}
              </div>
              <div className="week-labels" style={{ marginTop: 12, padding: '0 8px' }}>
                {bars.map((day) => (
                  <span key={day.date} suppressHydrationWarning>
                    {new Date(`${day.date}T00:00:00`).toLocaleDateString([], { weekday: 'narrow' })}
                  </span>
                ))}
              </div>
            </>
          )}
        </StaggerItem>

        <StaggerItem className="panel">
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Body</p>
              <h2>Weight log</h2>
            </div>
          </div>
          <div className="inline-field" style={{ marginTop: 18 }}>
            <label htmlFor="weight-input">Today&apos;s weight (kg)</label>
            <div>
              <input
                id="weight-input"
                inputMode="decimal"
                placeholder={latestWeight ? String(latestWeight.kg) : '70'}
                value={weight}
                onChange={(event) => setWeight(event.target.value.replace(/[^0-9.]/g, ''))}
              />
              <button
                className="chip-button primary"
                onClick={() => {
                  logWeight(Number(weight))
                  setWeight('')
                }}
              >
                Save
              </button>
            </div>
          </div>
          {weights.length === 0 ? (
            <p className="muted empty-note">No weight entries yet.</p>
          ) : (
            <div className="water-log-list" style={{ marginTop: 16 }}>
              {weights.map((entry) => (
                <div className="water-log-row" key={entry.date}>
                  <span suppressHydrationWarning>
                    {new Date(`${entry.date}T00:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  <strong>{entry.kg} kg</strong>
                </div>
              ))}
            </div>
          )}
        </StaggerItem>

        <StaggerItem>
          <DataPanel />
        </StaggerItem>
      </Stagger>
    </>
  )
}
