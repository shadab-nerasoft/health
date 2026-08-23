'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Activity, Pause, Play, Refresh2, Setting2 } from 'iconsax-react'
import { useTracking } from './tracking-provider'
import { Details, SettingRow, Switch } from './m3'
import type { SyncState } from '@/hooks/use-step-sync'

type PanelCopy = { tone: string; label: string; detail: string }

/** Browser (DeviceMotion) states — foreground-only counting. */
const webCopy: Record<string, PanelCopy> = {
  idle: { tone: 'neutral', label: 'Preparing sensors', detail: 'Getting the motion sensor ready.' },
  starting: { tone: 'neutral', label: 'Starting', detail: 'Connecting to your motion sensor.' },
  active: { tone: 'live', label: 'Counting steps', detail: 'Counted while this tab stays open.' },
  paused: { tone: 'neutral', label: 'Paused', detail: 'Resume any time.' },
  'permission-required': {
    tone: 'warn',
    label: 'Permission needed',
    detail: 'Tap allow to read motion data.',
  },
  denied: { tone: 'warn', label: 'Motion blocked', detail: 'Allow it again, or add steps manually.' },
  blocked: { tone: 'warn', label: 'Motion blocked', detail: 'Allow it again, or add steps manually.' },
  unsupported: {
    tone: 'warn',
    label: 'No motion sensor',
    detail: 'No usable accelerometer here. Add steps manually.',
  },
}

/** Android states — the hardware counter keeps running with the screen off. */
const nativeCopy: Record<string, PanelCopy> = {
  idle: { tone: 'neutral', label: 'Preparing sensors', detail: 'Getting the step counter ready.' },
  starting: { tone: 'neutral', label: 'Starting', detail: 'Connecting to your step counter.' },
  active: { tone: 'live', label: 'Counting steps', detail: 'Running with the screen off.' },
  paused: { tone: 'neutral', label: 'Paused', detail: 'Resume any time.' },
  'permission-required': {
    tone: 'warn',
    label: 'Permission needed',
    detail: 'Allow physical activity access to read your steps.',
  },
  denied: {
    tone: 'warn',
    label: 'Access denied',
    detail: 'Steps cannot be read without physical activity access.',
  },
  blocked: {
    tone: 'warn',
    label: 'Access blocked',
    detail: 'Turn on Physical activity in app settings to resume.',
  },
  unsupported: {
    tone: 'warn',
    label: 'No step counter',
    detail: 'This phone has no step sensor. Add steps manually.',
  },
}

/** Backup state, phrased so nothing ever fails silently. */
function syncNote(sync: SyncState) {
  switch (sync.status) {
    case 'syncing':
      return <>Backing up…</>
    case 'offline':
      return (
        <>
          Offline. {sync.pending} {sync.pending === 1 ? 'day' : 'days'} will back up when you reconnect.
        </>
      )
    case 'signed-out':
      return (
        <>
          Saved on this device only. <Link href="/auth/login">Sign in</Link> to back up.
        </>
      )
    case 'error':
      return <>Backup failed: {sync.message ?? 'unknown error'}.</>
    case 'synced':
      return <>Backed up.</>
    default:
      return null
  }
}

export function SensorPanel() {
  const {
    ready,
    stepSource,
    motionStatus,
    permission,
    backgroundService,
    sessionSteps,
    stepError,
    requestMotionAccess,
    refreshSteps,
    setBackgroundTracking,
    openStepSettings,
    sync,
    syncNow,
    state,
    setMotionPaused,
    addSteps,
    resetToday,
    today,
  } = useTracking()
  const [manual, setManual] = useState('500')

  const native = stepSource === 'native'
  const status = ready ? motionStatus : 'idle'
  const info = (native ? nativeCopy : webCopy)[status] ?? webCopy.idle
  const paused = state.motionPaused
  const note = syncNote(sync)

  return (
    <section className="sensor-panel" aria-label="Step sensor">
      <div className="sensor-head">
        <span className={`sensor-dot ${info.tone}`} aria-hidden="true" />
        <div>
          <strong>{info.label}</strong>
          <p>{info.detail}</p>
        </div>
        <span className="sensor-session" suppressHydrationWarning>
          {native ? today.steps.toLocaleString() : sessionSteps}
          <em>{native ? 'today' : 'session'}</em>
        </span>
      </div>

      {stepError && (
        <p className="m3-status-line" role="alert">
          {stepError}
        </p>
      )}

      <div className="sensor-actions">
        {permission === 'blocked' && native ? (
          <button className="chip-button primary" onClick={() => void openStepSettings()}>
            <Setting2 size="15" color="currentColor" /> Open settings
          </button>
        ) : (
          (status === 'permission-required' || status === 'denied') && (
            <button className="chip-button primary" onClick={() => void requestMotionAccess()}>
              <Activity size="15" color="currentColor" /> Allow access
            </button>
          )
        )}
        <button className="chip-button" onClick={() => setMotionPaused(!paused)} disabled={status === 'unsupported'}>
          {paused ? <Play size="15" color="currentColor" /> : <Pause size="15" color="currentColor" />}
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button className="chip-button" onClick={() => (native ? void refreshSteps() : resetToday())}>
          <Refresh2 size="15" color="currentColor" /> {native ? 'Refresh' : 'Reset'}
        </button>
      </div>

      {native ? (
        <SettingRow
          title="Background updates"
          description="Adds a permanent notification so reminders can fire while the app is closed. Your steps are counted either way."
          control={
            <Switch
              id="background-tracking"
              label="Background updates"
              checked={backgroundService}
              disabled={status === 'unsupported' || permission !== 'granted'}
              onChange={(next) => void setBackgroundTracking(next)}
            />
          }
        />
      ) : (
        <div className="sensor-manual">
          <label htmlFor="manual-steps">Add steps manually</label>
          <div>
            <input
              id="manual-steps"
              inputMode="numeric"
              value={manual}
              onChange={(event) => setManual(event.target.value.replace(/[^0-9]/g, ''))}
            />
            <button className="chip-button primary" onClick={() => addSteps(Number(manual) || 0)}>
              Add
            </button>
          </div>
        </div>
      )}

      {ready && note && (
        <p className="m3-status-line">
          {note}
          {(sync.status === 'error' || sync.status === 'offline') && (
            <button className="chip-button" onClick={() => syncNow()}>
              Retry
            </button>
          )}
        </p>
      )}

      <Details summary="How this works">
        {native
          ? "Steps come from Android's hardware step counter, which keeps counting while the screen is off and while the app is closed. Your total catches up as soon as you open the app."
          : 'Browser step counting only runs in the foreground. It stops when the screen locks or you switch apps, so totals are estimates rather than a background pedometer.'}
      </Details>
    </section>
  )
}
