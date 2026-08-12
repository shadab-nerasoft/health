'use client'

import { useState } from 'react'
import { Activity, Pause, Play, Refresh2 } from 'iconsax-react'
import { useTracking } from './tracking-provider'

const copy: Record<string, { tone: string; label: string; detail: string }> = {
  idle: { tone: 'neutral', label: 'Preparing sensors', detail: 'Getting the motion sensor ready.' },
  starting: { tone: 'neutral', label: 'Starting', detail: 'Connecting to your device motion sensor.' },
  active: { tone: 'live', label: 'Counting steps', detail: 'Steps are counted while this tab stays open.' },
  paused: { tone: 'neutral', label: 'Paused', detail: 'Motion counting is paused. Resume any time.' },
  'permission-required': {
    tone: 'warn',
    label: 'Permission needed',
    detail: 'iPhone requires a tap before motion data can be read.',
  },
  denied: {
    tone: 'warn',
    label: 'Motion blocked',
    detail: 'Motion access was declined. You can allow it again or add steps manually.',
  },
  unsupported: {
    tone: 'warn',
    label: 'No motion sensor',
    detail: 'This device or browser has no usable accelerometer. Add steps manually below.',
  },
}

export function SensorPanel() {
  const { ready, motionStatus, sessionSteps, requestMotionAccess, state, setMotionPaused, addSteps, resetToday } =
    useTracking()
  const [manual, setManual] = useState('500')

  const status = ready ? motionStatus : 'idle'
  const info = copy[status] ?? copy.idle
  const paused = state.motionPaused

  return (
    <section className="sensor-panel" aria-label="Step sensor">
      <div className="sensor-head">
        <span className={`sensor-dot ${info.tone}`} aria-hidden="true" />
        <div>
          <strong>{info.label}</strong>
          <p>{info.detail}</p>
        </div>
        <span className="sensor-session" suppressHydrationWarning>
          {sessionSteps} <em>this session</em>
        </span>
      </div>

      <div className="sensor-actions">
        {(status === 'permission-required' || status === 'denied') && (
          <button className="chip-button primary" onClick={() => void requestMotionAccess()}>
            <Activity size="15" color="var(--background)" /> Allow motion
          </button>
        )}
        <button className="chip-button" onClick={() => setMotionPaused(!paused)} disabled={status === 'unsupported'}>
          {paused ? <Play size="15" color="var(--muted-foreground)" /> : <Pause size="15" color="var(--muted-foreground)" />}
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button className="chip-button" onClick={resetToday}>
          <Refresh2 size="15" color="var(--muted-foreground)" /> Reset today
        </button>
      </div>

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

      <p className="sensor-note">
        Browser step counting uses <code>DeviceMotionEvent</code> and only runs in the foreground. It stops when the
        screen locks or you switch apps, so totals are estimates rather than a background pedometer.
      </p>
    </section>
  )
}
