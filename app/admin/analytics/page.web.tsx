import Link from 'next/link'
import type { Metadata } from 'next'
import { isAdmin } from '@/lib/admin'
import { getAnalytics } from '@/lib/health/analytics'
import { signOutAsAdmin } from '../actions'

/**
 * Cross-user analytics.
 *
 * A server component on purpose: the PIN session check and the service-role
 * read both stay on the server. Without a valid admin session the analytics
 * query never runs, so an unauthorised visitor receives no user data at all —
 * not hidden data, no data.
 *
 * Web only (`page.web.tsx`), so it never ships inside the Android app.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'User analytics — ZSTEPS',
  robots: { index: false, follow: false },
}

function formatNumber(value: number) {
  return value.toLocaleString('en-US')
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  // Checked before any query runs.
  if (!(await isAdmin())) {
    return (
      <main className="admin-shell admin-gate-shell">
        <div className="admin-gate">
          <h1>You don&apos;t have permission to open this</h1>
          <p className="subheading">This page is for the app administrator only.</p>
          <Link href="/admin" className="download-button">
            Enter admin PIN
          </Link>
          <Link href="/" className="download-secondary">
            Back to ZSTEPS
          </Link>
        </div>
      </main>
    )
  }

  const params = await searchParams
  const requested = Number(params.range)
  const rangeDays = [7, 30, 90].includes(requested) ? requested : 30

  const analytics = await getAnalytics(rangeDays)
  if (!analytics) {
    return (
      <main className="admin-shell">
        <h1>Analytics unavailable</h1>
        <p className="muted">
          SUPABASE_SERVICE_ROLE_KEY is not configured on this deployment, so cross-user data cannot be read.
        </p>
      </main>
    )
  }

  const { users, totals, daily } = analytics
  const peakDay = Math.max(1, ...daily.map((day) => day.steps))

  return (
    <main className="admin-shell">
      <div className="admin-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>User analytics</h1>
          <p className="subheading">Last {rangeDays} days across all users</p>
        </div>
        <div className="admin-ranges">
          {[7, 30, 90].map((days) => (
            <Link
              key={days}
              href={`/admin/analytics?range=${days}`}
              className={`chip-button${days === rangeDays ? ' primary' : ''}`}
            >
              {days}D
            </Link>
          ))}
          <form action={signOutAsAdmin}>
            <button type="submit" className="chip-button">
              Lock
            </button>
          </form>
        </div>
      </div>

      <section className="admin-stats">
        <article>
          <span>Total users</span>
          <strong>{formatNumber(totals.userCount)}</strong>
        </article>
        <article>
          <span>Active in range</span>
          <strong>{formatNumber(totals.activeUsers)}</strong>
        </article>
        <article>
          <span>Total steps</span>
          <strong>{formatNumber(totals.totalSteps)}</strong>
        </article>
        <article>
          <span>Avg steps / active user</span>
          <strong>{formatNumber(totals.averageStepsPerUser)}</strong>
        </article>
        <article>
          <span>Water logged</span>
          <strong>{(totals.totalWaterMl / 1000).toFixed(1)} L</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="card-kicker">Daily total</p>
            <h2>Steps across all users</h2>
          </div>
        </div>
        {daily.length === 0 ? (
          <p className="panel-empty">No activity recorded in this range yet.</p>
        ) : (
          <div className="admin-chart" role="img" aria-label="Daily steps across all users">
            {daily.map((day) => (
              <div key={day.date} className="admin-bar" title={`${day.date}: ${formatNumber(day.steps)} steps`}>
                <i style={{ height: `${Math.max(2, (day.steps / peakDay) * 100)}%` }} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="card-kicker">Per user</p>
            <h2>Breakdown</h2>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Total steps</th>
                <th>Daily avg</th>
                <th>Best day</th>
                <th>Days</th>
                <th>Water</th>
                <th>Weight</th>
                <th>Last active</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.userId}>
                  <td>{user.name}</td>
                  <td>{formatNumber(user.totalSteps)}</td>
                  <td>{formatNumber(user.averageSteps)}</td>
                  <td>{formatNumber(user.bestDaySteps)}</td>
                  <td>{user.daysTracked}</td>
                  <td>{(user.totalWaterMl / 1000).toFixed(1)} L</td>
                  <td>{user.latestWeightKg ? `${user.latestWeightKg} kg` : '—'}</td>
                  <td>{user.lastActive ?? '—'}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8}>No users yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="admin-note">
        This page shows individual health data for every user. Treat it as regulated personal data: restrict who
        holds an admin address, and check your obligations before exporting or sharing anything from it.
      </p>
    </main>
  )
}
