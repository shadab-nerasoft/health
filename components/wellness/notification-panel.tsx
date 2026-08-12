'use client'

import { Notification as NotificationIcon, NotificationBing } from 'iconsax-react'
import { useNotifications } from '@/hooks/use-notifications'

export function NotificationPanel() {
  const { isSupported, isSubscribed, isLoading, permission, error, subscribe, unsubscribe, sendTestNotification } =
    useNotifications()

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="card-kicker">Reminders</p>
          <h2>Daily nudge</h2>
        </div>
        <span className={`status-dot ${isSubscribed ? 'on' : ''}`} aria-hidden="true" />
      </div>

      {!isSupported ? (
        <p className="muted">
          This browser doesn&apos;t support push notifications. On iPhone, add ZSTEPS to your home screen first, then
          turn reminders on from there.
        </p>
      ) : (
        <>
          <p className="muted">
            {isSubscribed
              ? "You'll get one reminder each morning to log your movement."
              : 'Get a single reminder each morning to log your movement. No other notifications are sent.'}
          </p>

          {error && (
            <p className="notify-error" role="alert">
              {error}
            </p>
          )}

          <div className="sensor-actions" style={{ marginTop: 18 }}>
            {isSubscribed ? (
              <>
                <button className="chip-button" onClick={unsubscribe} disabled={isLoading}>
                  {isLoading ? 'Working…' : 'Turn off'}
                </button>
                <button className="chip-button" onClick={sendTestNotification} disabled={isLoading}>
                  <NotificationBing size="15" color="var(--muted-foreground)" /> Send test
                </button>
              </>
            ) : (
              <button
                className="chip-button primary"
                onClick={subscribe}
                disabled={isLoading || permission === 'denied'}
              >
                <NotificationIcon size="15" color="currentColor" />
                {isLoading ? 'Working…' : 'Turn on reminders'}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
