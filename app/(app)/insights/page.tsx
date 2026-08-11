'use client'

import { Chart2, Clock, Flag, Lamp, TrendUp } from 'iconsax-react'
import { Stagger, StaggerItem } from '@/components/wellness/motion'

const insights = [
  {
    icon: Lamp,
    color: '#8f6bb3',
    kicker: 'Timing pattern',
    title: 'Your activity is highest between 6–8 PM.',
    body: 'That evening window is becoming your strongest movement habit — consider scheduling workouts then.',
  },
  {
    icon: TrendUp,
    color: '#6d9750',
    kicker: 'Weekly trend',
    title: 'Steps are up 12.4% compared to last week.',
    body: "You're building consistent momentum. Keep the current routine to carry it into next week.",
  },
  {
    icon: Flag,
    color: '#c97d63',
    kicker: 'Goal completion',
    title: "You've hit your step goal 5 of the last 7 days.",
    body: 'Two more consistent days would put you on pace for a new monthly best.',
  },
  {
    icon: Clock,
    color: '#4f9eb3',
    kicker: 'Time to goal',
    title: "At this pace, you'll reach today's goal by 7:40 PM.",
    body: 'A short evening walk would get you there closer to 6:30 PM.',
  },
]

export default function InsightsPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Understand your data</p>
          <h1>Insights</h1>
          <p className="subheading">Patterns from your activity, surfaced so you can act on them.</p>
        </div>
      </div>

      <Stagger className="dashboard-grid">
        <StaggerItem className="insights-list" style={{ gridColumn: '1 / -1' }}>
          {insights.map((insight) => (
            <div className="insight-card" key={insight.title}>
              <div className="insight-icon" style={{ background: `${insight.color}22` }}>
                <insight.icon size="20" color={insight.color} variant="Bold" />
              </div>
              <div>
                <p className="card-kicker">{insight.kicker}</p>
                <h2>{insight.title}</h2>
                <p className="muted">{insight.body}</p>
              </div>
            </div>
          ))}
        </StaggerItem>

        <StaggerItem className="panel" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Summary</p>
              <h2>What&apos;s driving your progress</h2>
            </div>
            <Chart2 size="20" color="#8f6bb3" />
          </div>
          <p className="muted" style={{ marginTop: 18, maxWidth: 560 }}>
            Consistency in the evenings, plus a strong weekend, is carrying your weekly average. Keeping mornings
            active would help balance your day-to-day totals.
          </p>
        </StaggerItem>
      </Stagger>
    </>
  )
}
