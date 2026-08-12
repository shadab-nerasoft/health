'use client'

import { useState } from 'react'
import { Activity, TrendUp } from 'iconsax-react'
import { Stagger, StaggerItem } from '@/components/wellness/motion'
import { SensorPanel } from '@/components/wellness/sensor-panel'
import { useTracking } from '@/components/wellness/tracking-provider'
import { derivedFromSteps } from '@/lib/wellness/store'

const ranges = [
  { label: '7D', days: 7 },
  { label: '14D', days: 14 },
  { label: '30D', days: 30 },
]

export default function ActivityPage() {
  const { ready, today, derived, history } = useTracking()
  const [range, setRange] = useState(ranges[0])

  const days = history(range.days)
  const totals = days.reduce((total, day) => total + day.steps, 0)
  const rangeDerived = derivedFromSteps(totals)
  const activeDays = days.filter((day) => day.steps > 0)
  const best = days.reduce((top, day) => (day.steps > top.steps ? day : top), days[0])
  const recent = [...days].reverse().filter((day) => day.steps > 0)

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Movement history</p>
          <h1>Activity</h1>
          <p className="subheading">Steps recorded by this browser, grouped by day.</p>
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
        <StaggerItem style={{ gridColumn: '1 / -1' }}>
          <SensorPanel />
        </StaggerItem>

        <StaggerItem className="stat-grid" style={{ gridColumn: '1 / -1' }}>
          <div className="stat-card">
            <span>Steps today</span>
            <strong suppressHydrationWarning>{today.steps.toLocaleString()}</strong>
            <b className="up">
              <TrendUp size="13" color="var(--success)" /> {derived.activeMinutes} active min
            </b>
          </div>
          <div className="stat-card">
            <span>Steps in range</span>
            <strong suppressHydrationWarning>{totals.toLocaleString()}</strong>
            <b className="up" suppressHydrationWarning>
              {activeDays.length} of {range.days} days tracked
            </b>
          </div>
          <div className="stat-card">
            <span>Distance in range</span>
            <strong suppressHydrationWarning>
              {(rangeDerived.distanceMeters / 1000).toFixed(1)} <em>km</em>
            </strong>
          </div>
          <div className="stat-card">
            <span>Calories in range</span>
            <strong suppressHydrationWarning>
              {rangeDerived.calories.toLocaleString()} <em>kcal</em>
            </strong>
          </div>
        </StaggerItem>

        <StaggerItem className="panel activity-panel" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Daily log</p>
              <h2>Recorded days</h2>
            </div>
          </div>
          {!ready || recent.length === 0 ? (
            <p className="muted empty-note">
              Nothing recorded yet. Keep this tab open while you walk, or add steps manually above.
            </p>
          ) : (
            <div className="timeline-list">
              {recent.map((day) => {
                const dayDerived = derivedFromSteps(day.steps)
                return (
                  <div className="timeline-row" key={day.date}>
                    <time suppressHydrationWarning>
                      {new Date(`${day.date}T00:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </time>
                    <div>
                      <strong suppressHydrationWarning>{day.steps.toLocaleString()} steps</strong>
                      <br />
                      <span suppressHydrationWarning>
                        {(dayDerived.distanceMeters / 1000).toFixed(1)} km · {dayDerived.calories} kcal ·{' '}
                        {(day.waterMl / 1000).toFixed(1)}L water
                      </span>
                    </div>
                    <div className="timeline-badge metric-card blue">
                      <Activity size="16" color="var(--foreground)" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </StaggerItem>

        <StaggerItem className="panel" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Range summary</p>
              <h2>How this period looks</h2>
            </div>
          </div>
          <div className="stat-grid" style={{ marginTop: 22 }}>
            <div className="stat-card">
              <span>Best day</span>
              <strong suppressHydrationWarning>{(best?.steps ?? 0).toLocaleString()} <em>steps</em></strong>
            </div>
            <div className="stat-card">
              <span>Daily average</span>
              <strong suppressHydrationWarning>{Math.round(totals / range.days).toLocaleString()} <em>steps</em></strong>
            </div>
            <div className="stat-card">
              <span>Active minutes</span>
              <strong suppressHydrationWarning>{rangeDerived.activeMinutes} <em>min</em></strong>
            </div>
            <div className="stat-card">
              <span>Days tracked</span>
              <strong suppressHydrationWarning>{activeDays.length} <em>days</em></strong>
            </div>
          </div>
        </StaggerItem>
      </Stagger>
    </>
  )
}
