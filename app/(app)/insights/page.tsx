'use client'

import { Chart2, Clock, Flag, Lamp, TrendUp } from 'iconsax-react'
import { Stagger, StaggerItem } from '@/components/wellness/motion'
import { useTracking } from '@/components/wellness/tracking-provider'
import { derivedFromSteps, percent } from '@/lib/wellness/store'

export default function InsightsPage() {
  const { ready, today, goals, history, streak } = useTracking()

  const week = history(7)
  const previous = history(14).slice(0, 7)
  const weekTotal = week.reduce((total, day) => total + day.steps, 0)
  const previousTotal = previous.reduce((total, day) => total + day.steps, 0)
  const change = previousTotal > 0 ? Math.round(((weekTotal - previousTotal) / previousTotal) * 100) : null
  const daysTracked = week.filter((day) => day.steps > 0).length
  const goalDays = week.filter((day) => day.steps >= goals.steps).length
  const remaining = Math.max(0, goals.steps - today.steps)
  const weekDerived = derivedFromSteps(weekTotal)

  const insights = [
    {
      icon: TrendUp,
      color: 'var(--success)',
      tint: 'var(--tint-green)',
      kicker: 'Weekly trend',
      title:
        change === null
          ? 'Not enough history for a trend yet.'
          : `Steps are ${change >= 0 ? 'up' : 'down'} ${Math.abs(change)}% versus the previous week.`,
      body:
        change === null
          ? 'Track for a second week and this card will compare the two periods.'
          : `You covered ${(weekDerived.distanceMeters / 1000).toFixed(1)} km over the last seven days.`,
    },
    {
      icon: Flag,
      color: 'var(--accent-peach)',
      tint: 'var(--tint-peach)',
      kicker: 'Goal completion',
      title: `You hit your step goal on ${goalDays} of the last 7 days.`,
      body:
        streak > 0
          ? `Your current streak is ${streak} ${streak === 1 ? 'day' : 'days'}.`
          : `Reach ${goals.steps.toLocaleString()} steps today to start a new streak.`,
    },
    {
      icon: Clock,
      color: 'var(--accent-blue)',
      tint: 'var(--tint-blue)',
      kicker: 'Today',
      title:
        remaining === 0
          ? "Today's step goal is already complete."
          : `${remaining.toLocaleString()} steps left to reach today's goal.`,
      body: `That is roughly ${Math.max(1, Math.round(remaining / 110))} more minutes of walking at an average pace.`,
    },
    {
      icon: Lamp,
      color: 'var(--accent-lavender)',
      tint: 'var(--tint-lavender)',
      kicker: 'Data quality',
      title: `${daysTracked} of the last 7 days have recorded activity.`,
      body: 'Browser tracking only runs while the app is open, so gaps are expected on days you did not use it.',
    },
  ]

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Understand your data</p>
          <h1>Insights</h1>
          <p className="subheading">Patterns calculated from the activity stored on this device.</p>
        </div>
      </div>

      <Stagger className="dashboard-grid">
        {ready && weekTotal === 0 ? (
          <StaggerItem className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon">
              <Lamp size="26" color="var(--accent-lavender)" variant="Bold" />
            </div>
            <h2>No activity recorded yet</h2>
            <p>Once steps or water are logged, this page fills in with patterns from your own history.</p>
          </StaggerItem>
        ) : (
          <StaggerItem className="insights-list" style={{ gridColumn: '1 / -1' }}>
            {insights.map((insight) => (
              <div className="insight-card" key={insight.kicker}>
                <div className="insight-icon" style={{ background: insight.tint }}>
                  <insight.icon size="20" color={insight.color} variant="Bold" />
                </div>
                <div>
                  <p className="card-kicker">{insight.kicker}</p>
                  <h2 suppressHydrationWarning>{insight.title}</h2>
                  <p className="muted" suppressHydrationWarning>
                    {insight.body}
                  </p>
                </div>
              </div>
            ))}
          </StaggerItem>
        )}

        <StaggerItem className="panel" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Summary</p>
              <h2>Where you stand</h2>
            </div>
            <Chart2 size="20" color="var(--accent-lavender)" />
          </div>
          <p className="muted" style={{ marginTop: 18, maxWidth: 560 }} suppressHydrationWarning>
            Over the last week you recorded {weekTotal.toLocaleString()} steps, about{' '}
            {(weekDerived.distanceMeters / 1000).toFixed(1)} km and {weekDerived.calories.toLocaleString()} estimated
            calories. Today you are at {percent(today.steps, goals.steps)}% of your step goal.
          </p>
        </StaggerItem>
      </Stagger>
    </>
  )
}
