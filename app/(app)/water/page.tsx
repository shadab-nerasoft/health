'use client'

import { useState } from 'react'
import { Drop } from 'iconsax-react'
import { Stagger, StaggerItem } from '@/components/wellness/motion'

const goalMl = 2500
const quickAdds = [250, 500, 750]
const weekly = [58, 72, 64, 80, 45, 90, 72]

export default function WaterPage() {
  const [loggedMl, setLoggedMl] = useState(1200)
  const [entries, setEntries] = useState([
    { time: '7:20 AM', amount: 250 },
    { time: '10:05 AM', amount: 500 },
    { time: '1:15 PM', amount: 450 },
  ])

  const percent = Math.min(Math.round((loggedMl / goalMl) * 100), 100)

  function addWater(amount: number) {
    setLoggedMl((v) => v + amount)
    setEntries((rows) => [
      { time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), amount },
      ...rows,
    ])
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Stay on track</p>
          <h1>Water</h1>
          <p className="subheading">Log your intake and keep hydration part of the daily rhythm.</p>
        </div>
      </div>

      <Stagger className="dashboard-grid">
        <StaggerItem className="water-hero" style={{ gridColumn: '1 / -1' }}>
          <div>
            <p className="card-kicker">Today&apos;s intake</p>
            <h2>Keep sipping</h2>
            <p className="muted">
              You&apos;ve logged {(loggedMl / 1000).toFixed(1)}L of your {(goalMl / 1000).toFixed(1)}L goal today.
            </p>
            <div className="quick-actions">
              {quickAdds.map((amount) => (
                <button key={amount} onClick={() => addWater(amount)}>
                  <Drop size="16" color="var(--accent-blue)" /> +{amount}ml
                </button>
              ))}
            </div>
          </div>
          <div
            className="water-ring"
            style={{ background: `conic-gradient(var(--accent-blue) 0 ${percent}%, var(--ring-track) ${percent}% 100%)` }}
          >
            <div>
              <strong>{(loggedMl / 1000).toFixed(1)}L</strong>
              <span>{percent}% of goal</span>
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
          <div className="water-log-list">
            {entries.map((entry, i) => (
              <div className="water-log-row" key={`${entry.time}-${i}`}>
                <span>{entry.time}</span>
                <strong>+{entry.amount}ml</strong>
              </div>
            ))}
          </div>
        </StaggerItem>

        <StaggerItem className="panel weekly-panel">
          <div className="panel-heading">
            <div>
              <p className="card-kicker">This week</p>
              <h2>Hydration</h2>
            </div>
          </div>
          <div className="mini-bars" style={{ marginTop: 25 }}>
            {weekly.map((value, i) => (
              <i key={i} style={{ height: `${value}%`, background: 'var(--accent-blue)' }} />
            ))}
          </div>
          <div className="week-labels" style={{ marginTop: 10, padding: '0 7px' }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <span key={i}>{day}</span>
            ))}
          </div>
        </StaggerItem>
      </Stagger>
    </>
  )
}
