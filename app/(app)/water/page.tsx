'use client'

import { useState } from 'react'
import { Drop, Trash } from 'iconsax-react'
import { Stagger, StaggerItem } from '@/components/wellness/motion'
import { useTracking } from '@/components/wellness/tracking-provider'
import { percent } from '@/lib/wellness/store'

const quickAdds = [200, 250, 500, 750]

export default function WaterPage() {
  const { ready, today, goals, history, todayWaterEntries, addWater, undoWater, updateGoals } = useTracking()
  const [custom, setCustom] = useState('300')

  const week = history(7)
  const maxWater = Math.max(goals.waterMl, ...week.map((day) => day.waterMl))
  const progress = percent(today.waterMl, goals.waterMl)
  const capped = Math.min(progress, 100)

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Stay on track</p>
          <h1>Water</h1>
          <p className="subheading">Log intake as you drink. Entries are stored on this device only.</p>
        </div>
      </div>

      <Stagger className="dashboard-grid">
        <StaggerItem className="water-hero" style={{ gridColumn: '1 / -1' }}>
          <div>
            <p className="card-kicker">Today&apos;s intake</p>
            <h2>{today.waterMl >= goals.waterMl ? 'Goal reached' : 'Keep sipping'}</h2>
            <p className="muted" suppressHydrationWarning>
              {(today.waterMl / 1000).toFixed(1)}L of your {(goals.waterMl / 1000).toFixed(1)}L goal.
            </p>
            <div className="quick-actions">
              {quickAdds.map((amount) => (
                <button key={amount} onClick={() => addWater(amount)}>
                  <Drop size="16" color="var(--accent-blue)" /> +{amount}ml
                </button>
              ))}
            </div>
            <div className="inline-field">
              <label htmlFor="custom-water">Custom amount (ml)</label>
              <div>
                <input
                  id="custom-water"
                  inputMode="numeric"
                  value={custom}
                  onChange={(event) => setCustom(event.target.value.replace(/[^0-9]/g, ''))}
                />
                <button className="chip-button primary" onClick={() => addWater(Number(custom) || 0)}>
                  Log
                </button>
              </div>
            </div>
          </div>
          <div
            className="water-ring"
            style={{ background: `conic-gradient(var(--accent-blue) 0 ${capped}%, var(--ring-track) ${capped}% 100%)` }}
          >
            <div>
              <strong suppressHydrationWarning>{(today.waterMl / 1000).toFixed(1)}L</strong>
              <span suppressHydrationWarning>{progress}% of goal</span>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem className="panel">
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Log</p>
              <h2>Today&apos;s entries</h2>
            </div>
          </div>
          {!ready || todayWaterEntries.length === 0 ? (
            <p className="muted empty-note">No water logged yet today. Use a quick add above to start.</p>
          ) : (
            <div className="water-log-list">
              {todayWaterEntries.map((entry) => (
                <div className="water-log-row" key={entry.id}>
                  <span>{entry.time}</span>
                  <strong>+{entry.amount}ml</strong>
                  <button className="icon-ghost" onClick={() => undoWater(entry.id)} aria-label={`Remove ${entry.amount}ml entry`}>
                    <Trash size="15" color="var(--muted-foreground)" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </StaggerItem>

        <StaggerItem className="panel weekly-panel">
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Last 7 days</p>
              <h2>Hydration</h2>
            </div>
          </div>
          <div className="mini-bars" style={{ marginTop: 25 }}>
            {week.map((day) => (
              <i
                key={day.date}
                style={{ height: `${Math.max(4, Math.round((day.waterMl / maxWater) * 100))}%`, background: 'var(--accent-blue)' }}
              />
            ))}
          </div>
          <div className="week-labels" style={{ marginTop: 10, padding: '0 7px' }}>
            {week.map((day) => (
              <span key={day.date} suppressHydrationWarning>
                {new Date(`${day.date}T00:00:00`).toLocaleDateString([], { weekday: 'narrow' })}
              </span>
            ))}
          </div>
          <div className="inline-field" style={{ marginTop: 22 }}>
            <label htmlFor="water-goal">Daily goal (ml)</label>
            <div>
              <input
                id="water-goal"
                inputMode="numeric"
                value={goals.waterMl}
                onChange={(event) => updateGoals({ waterMl: Number(event.target.value.replace(/[^0-9]/g, '')) || 0 })}
              />
            </div>
          </div>
        </StaggerItem>
      </Stagger>
    </>
  )
}
