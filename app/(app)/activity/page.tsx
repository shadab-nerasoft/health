'use client'

import { useState } from 'react'
import { Activity, ArrowRight2, Chart2, Flash, TrendUp } from 'iconsax-react'
import { Stagger, StaggerItem } from '@/components/wellness/motion'

const ranges = ['Today', 'Week', 'Month', 'Year']

const timeline = [
  { time: '7:15 AM', title: 'Morning walk', detail: '1,240 steps · 0.9 km', tone: 'blue' },
  { time: '9:40 AM', title: 'Commute', detail: '860 steps · 0.6 km', tone: 'peach' },
  { time: '12:30 PM', title: 'Lunch break stroll', detail: '2,110 steps · 1.5 km', tone: 'green' },
  { time: '4:05 PM', title: 'Errands', detail: '1,480 steps · 1.1 km', tone: 'lavender' },
  { time: '6:50 PM', title: 'Evening run', detail: '2,730 steps · 2.1 km', tone: 'blue' },
]

export default function ActivityPage() {
  const [range, setRange] = useState('Today')

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Movement history</p>
          <h1>Activity</h1>
          <p className="subheading">Every step, walk, and workout logged throughout your day.</p>
        </div>
        <div className="filter-tabs">
          {ranges.map((item) => (
            <button key={item} className={range === item ? 'selected' : ''} onClick={() => setRange(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <Stagger className="dashboard-grid">
        <StaggerItem className="stat-grid" style={{ gridColumn: '1 / -1' }}>
          <div className="stat-card">
            <span>Total steps</span>
            <strong>8,420</strong>
            <b className="up">
              <TrendUp size="13" color="var(--success)" /> +12.4% vs yesterday
            </b>
          </div>
          <div className="stat-card">
            <span>Distance</span>
            <strong>6.2 <em>km</em></strong>
            <b className="up">
              <TrendUp size="13" color="var(--success)" /> +0.8 km
            </b>
          </div>
          <div className="stat-card">
            <span>Calories</span>
            <strong>426 <em>kcal</em></strong>
            <b className="up">
              <TrendUp size="13" color="var(--success)" /> +48 kcal
            </b>
          </div>
          <div className="stat-card">
            <span>Active minutes</span>
            <strong>74 <em>min</em></strong>
            <b className="up">
              <TrendUp size="13" color="var(--success)" /> +9 min
            </b>
          </div>
        </StaggerItem>

        <StaggerItem className="panel activity-panel" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Timeline</p>
              <h2>Today&apos;s movement log</h2>
            </div>
            <button className="more-button">
              Export <ArrowRight2 size="15" />
            </button>
          </div>
          <div className="timeline-list">
            {timeline.map((row) => (
              <div className="timeline-row" key={row.time}>
                <time>{row.time}</time>
                <div>
                  <strong>{row.title}</strong>
                  <br />
                  <span>{row.detail}</span>
                </div>
                <div className={`timeline-badge metric-card ${row.tone}`}>
                  <Activity size="16" color="var(--foreground)" />
                </div>
              </div>
            ))}
          </div>
        </StaggerItem>

        <StaggerItem className="panel" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Breakdown</p>
              <h2>Movement by type</h2>
            </div>
          </div>
          <div className="stat-grid" style={{ marginTop: 22 }}>
            <div className="stat-card">
              <span>Walking</span>
              <strong>5,940 <em>steps</em></strong>
            </div>
            <div className="stat-card">
              <span>Running</span>
              <strong>2,480 <em>steps</em></strong>
            </div>
            <div className="stat-card">
              <span>Stairs</span>
              <strong>6 <em>flights</em></strong>
            </div>
            <div className="stat-card">
              <span>Standing</span>
              <strong>3.4 <em>hrs</em></strong>
            </div>
          </div>
        </StaggerItem>
      </Stagger>
    </>
  )
}
