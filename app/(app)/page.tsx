'use client'

import useSWR from 'swr'
import { useEffect, useState } from 'react'
import { Activity, ArrowRight2, Chart2, Drop, Flash, Lamp, TrendUp } from 'iconsax-react'
import { Stagger, StaggerItem } from '@/components/wellness/motion'

const week = [42, 68, 51, 84, 62, 76, 58]
const activity = [18, 26, 31, 22, 38, 44, 28, 36, 29, 48, 39, 55, 46, 61, 52, 42, 63, 51, 68, 57, 72, 60, 48, 34]
const fetcher = (url: string) => fetch(url).then((response) => response.json())

function StepRing({ steps, stepPercent }: { steps: number; stepPercent: number }) {
  return (
    <div className="step-ring" aria-label={`${stepPercent} percent of daily step goal`}>
      <div>
        <strong suppressHydrationWarning>{steps.toLocaleString()}</strong>
        <span>steps</span>
        <small>{stepPercent}% of goal</small>
      </div>
    </div>
  )
}

function MiniBars({ values, color = 'var(--accent-blue)' }: { values: number[]; color?: string }) {
  return (
    <div className="mini-bars" aria-hidden="true">
      {values.map((value, index) => (
        <i key={index} style={{ height: `${value}%`, background: color }} />
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [metric, setMetric] = useState('Steps')
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { data } = useSWR(mounted ? '/api/dashboard' : null, fetcher)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Keep the server render and the first client render identical. Live Supabase
  // values are applied only after hydration has completed.
  const hasLiveData = mounted && Boolean(data?.activity)
  const steps = hasLiveData ? (data.activity.steps ?? 0) : 8420
  const calories = hasLiveData ? (data.activity.calories_burned ?? 0) : 426
  const distanceKm = hasLiveData ? ((data.activity.distance_meters ?? 0) / 1000).toFixed(1) : '6.2'
  const activeMinutes = hasLiveData ? (data.activity.active_minutes ?? 0) : 74
  const waterMl = hasLiveData ? (data.hydrationMl ?? 0) : 1200
  const waterGoalMl = hasLiveData ? (data.profile?.water_goal_ml ?? 2000) : 2500
  const stepPercent = hasLiveData ? Math.min(100, Math.round((steps / 10000) * 100)) : 84

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Tuesday, October 24, 2024</p>
          <h1>Good morning, Shadab</h1>
          <p className="subheading">Here&apos;s your health at a glance.</p>
        </div>
        <button className="date-button">
          Today <ArrowRight2 size="16" color="var(--muted-foreground)" />
        </button>
      </div>

      <Stagger className="dashboard-grid">
        <StaggerItem className="hero-card">
          <div>
            <p className="card-kicker">Today&apos;s movement</p>
            <h2>Keep your rhythm</h2>
            <p className="muted">You&apos;re building a great habit. A little more movement will get you to your goal.</p>
            <button className="soft-button">
              View activity <ArrowRight2 size="16" color="var(--muted-foreground)" />
            </button>
          </div>
          <StepRing steps={steps} stepPercent={stepPercent} />
        </StaggerItem>

        <StaggerItem className="metrics-grid">
          <article className="metric-card blue">
            <div className="metric-top">
              <span>Steps</span>
              <Activity size="18" color="var(--accent-blue)" />
            </div>
            <strong suppressHydrationWarning>{steps.toLocaleString()}</strong>
            <small>{stepPercent}% of daily goal</small>
            <MiniBars values={[30, 45, 42, 65, 50, 72, 64, 88]} />
          </article>
          <article className="metric-card peach">
            <div className="metric-top">
              <span>Calories</span>
              <Flash size="18" color="var(--accent-peach)" />
            </div>
            <strong suppressHydrationWarning>{calories} <em>kcal</em></strong>
            <small>Estimated burned</small>
            <MiniBars values={[42, 35, 52, 44, 68, 51, 60, 76]} color="var(--accent-peach)" />
          </article>
          <article className="metric-card green">
            <div className="metric-top">
              <span>Distance</span>
              <TrendUp size="18" color="var(--accent-green)" />
            </div>
            <strong suppressHydrationWarning>{distanceKm} <em>km</em></strong>
            <small>Distance walked</small>
            <MiniBars values={[40, 55, 34, 62, 52, 76, 68, 80]} color="var(--accent-green)" />
          </article>
          <article className="metric-card lavender">
            <div className="metric-top">
              <span>Active time</span>
              <Chart2 size="18" color="var(--accent-lavender)" />
            </div>
            <strong suppressHydrationWarning>{activeMinutes} <em>min</em></strong>
            <small>Active today</small>
            <MiniBars values={[32, 45, 39, 58, 63, 52, 72, 66]} color="var(--accent-lavender)" />
          </article>
        </StaggerItem>

        <StaggerItem className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Live overview</p>
              <h2>Today&apos;s activity</h2>
            </div>
            <div className="segmented">
              {['Steps', 'Calories', 'Active'].map((item) => (
                <button key={item} onClick={() => setMetric(item)} className={metric === item ? 'selected' : ''}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="activity-chart">
            <div className="chart-bars">
              {activity.map((value, index) => (
                <i key={index} style={{ height: `${value}%` }} />
              ))}
            </div>
            <div className="chart-labels">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>12 AM</span>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem className="panel weekly-panel">
          <div className="panel-heading">
            <div>
              <p className="card-kicker">This week</p>
              <h2>Activity</h2>
            </div>
            <button className="more-button">
              7 days <ArrowRight2 size="15" />
            </button>
          </div>
          <MiniBars values={week} color="var(--ink)" />
          <div className="week-labels">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <span key={i}>{day}</span>
            ))}
          </div>
          <div className="weekly-summary">
            <div>
              <strong>8,742</strong>
              <span>average steps/day</span>
            </div>
            <b>
              +12.4% <small>vs last week</small>
            </b>
          </div>
        </StaggerItem>

        <StaggerItem className="panel goals-panel">
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Keep going</p>
              <h2>Today&apos;s goals</h2>
            </div>
            <button className="more-button">
              Edit <ArrowRight2 size="15" />
            </button>
          </div>
          {[
            ['Steps', '8,420', '10,000', 84],
            ['Distance', '6.2 km', '7.5 km', 83],
            ['Active minutes', '74 min', '60 min', 100],
          ].map(([name, current, target, percent]) => (
            <div className="goal-row" key={String(name)}>
              <div>
                <span>{name}</span>
                <strong>
                  {current} <small>/ {target}</small>
                </strong>
              </div>
              <div className="progress-track">
                <i style={{ width: `${percent}%` }} />
              </div>
              <b>{percent}%</b>
            </div>
          ))}
        </StaggerItem>

        <StaggerItem className="insight-card">
          <div className="insight-icon">
            <Lamp size="20" color="var(--accent-lavender)" />
          </div>
          <div>
            <p className="card-kicker">A little insight</p>
            <h2>Your activity is highest between 6–8 PM.</h2>
            <p className="muted">That evening window is becoming your strongest movement habit.</p>
          </div>
        </StaggerItem>

        {!dismissed && (
          <StaggerItem className="recommendation">
            <div className="recommendation-icon">
              <Drop size="20" color="var(--accent-blue)" />
            </div>
            <div>
              <p className="card-kicker">Daily recommendation</p>
              <h2>Stay hydrated</h2>
              <p className="muted">You&apos;ve logged {(waterMl / 1000).toFixed(1)}L today. Target: {(waterGoalMl / 1000).toFixed(1)}L</p>
            </div>
            <button onClick={() => setDismissed(true)} className="dismiss">
              Dismiss
            </button>
            <ArrowRight2 size="18" />
          </StaggerItem>
        )}
      </Stagger>
    </>
  )
}
