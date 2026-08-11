'use client'

import { useState } from 'react'
import { Add, Flag } from 'iconsax-react'
import { Stagger, StaggerItem } from '@/components/wellness/motion'

const initialGoals = [
  { name: 'Daily steps', current: '8,420', target: '10,000', percent: 84 },
  { name: 'Distance', current: '6.2 km', target: '7.5 km', percent: 83 },
  { name: 'Active minutes', current: '74 min', target: '60 min', percent: 100 },
  { name: 'Calories burned', current: '426 kcal', target: '500 kcal', percent: 85 },
  { name: 'Weekly activity', current: '5', target: '7 days', percent: 71 },
]

export default function GoalsPage() {
  const [goals] = useState(initialGoals)

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Stay on target</p>
          <h1>Goals</h1>
          <p className="subheading">Track the targets that matter most to your routine.</p>
        </div>
        <button className="date-button">
          <Add size="16" color="var(--muted-foreground)" /> New goal
        </button>
      </div>

      <Stagger className="dashboard-grid">
        <StaggerItem className="panel goals-panel" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Today</p>
              <h2>Active goals</h2>
            </div>
          </div>
          {goals.map((goal) => (
            <div className="goal-row" key={goal.name}>
              <div>
                <span>{goal.name}</span>
                <strong>
                  {goal.current} <small>/ {goal.target}</small>
                </strong>
              </div>
              <div className="progress-track">
                <i style={{ width: `${Math.min(goal.percent, 100)}%` }} />
              </div>
              <b>{goal.percent}%</b>
            </div>
          ))}
        </StaggerItem>

        <StaggerItem className="streak-row" style={{ gridColumn: '1 / -1' }}>
          <div>
            <strong>6-day streak</strong>
            <span>Hit every goal 6 days running — one more for a new personal best.</span>
          </div>
          <div className="empty-state-icon" style={{ background: 'var(--card)' }}>
            <Flag size="22" color="var(--accent-peach)" variant="Bold" />
          </div>
        </StaggerItem>
      </Stagger>
    </>
  )
}
