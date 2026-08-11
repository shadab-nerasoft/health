'use client'

import { useState } from 'react'
import { ArrowRight2, TrendUp } from 'iconsax-react'
import { Stagger, StaggerItem } from '@/components/wellness/motion'

const ranges = ['7D', '30D', '3M', '6M', '1Y']
const week = [42, 68, 51, 84, 62, 76, 58]

export default function ProgressPage() {
  const [range, setRange] = useState('7D')

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">How you&apos;re trending</p>
          <h1>Progress</h1>
          <p className="subheading">See how your habits are building over time.</p>
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
            <span>Average steps</span>
            <strong>8,742</strong>
            <b className="up">
              <TrendUp size="13" color="#6d9750" /> +12.4%
            </b>
          </div>
          <div className="stat-card">
            <span>Total distance</span>
            <strong>43.4 <em>km</em></strong>
            <b className="up">
              <TrendUp size="13" color="#6d9750" /> +5.1 km
            </b>
          </div>
          <div className="stat-card">
            <span>Goal completion</span>
            <strong>86%</strong>
            <b className="up">
              <TrendUp size="13" color="#6d9750" /> +6 pts
            </b>
          </div>
          <div className="stat-card">
            <span>Current streak</span>
            <strong>6 <em>days</em></strong>
            <b className="up">
              <TrendUp size="13" color="#6d9750" /> personal best
            </b>
          </div>
        </StaggerItem>

        <StaggerItem className="panel weekly-panel" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Steps</p>
              <h2>Weekly trend</h2>
            </div>
            <button className="more-button">
              Compare <ArrowRight2 size="15" />
            </button>
          </div>
          <div className="mini-bars" style={{ height: 140, gap: 16, marginTop: 26 }}>
            {week.map((value, i) => (
              <i key={i} style={{ height: `${value}%`, background: 'var(--ink)', borderRadius: '8px 8px 3px 3px', opacity: 0.85 }} />
            ))}
          </div>
          <div className="week-labels" style={{ marginTop: 12, padding: '0 8px' }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <span key={i}>{day}</span>
            ))}
          </div>
        </StaggerItem>

        <StaggerItem className="streak-row" style={{ gridColumn: '1 / -1' }}>
          <div>
            <strong>6-day streak</strong>
            <span>Best streak yet — keep it going through the weekend.</span>
          </div>
          <div className="streak-dots">
            {[1, 1, 1, 1, 1, 1, 0].map((filled, i) => (
              <i key={i} className={filled ? 'filled' : ''} />
            ))}
          </div>
        </StaggerItem>

        <StaggerItem className="panel goals-panel">
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Highlights</p>
              <h2>Best day this period</h2>
            </div>
          </div>
          <div className="goal-row">
            <div>
              <span>Saturday</span>
              <strong>12,340 <small>steps</small></strong>
            </div>
            <div className="progress-track">
              <i style={{ width: '100%' }} />
            </div>
            <b>123%</b>
          </div>
          <div className="goal-row">
            <div>
              <span>Distance</span>
              <strong>9.1 km <small>/ 7.5 km</small></strong>
            </div>
            <div className="progress-track">
              <i style={{ width: '100%' }} />
            </div>
            <b>121%</b>
          </div>
        </StaggerItem>
      </Stagger>
    </>
  )
}
