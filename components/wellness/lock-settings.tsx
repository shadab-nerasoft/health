'use client'

import { useEffect, useState } from 'react'
import { FingerScan, Lock1, ScanBarcode } from 'iconsax-react'
import { SettingRow, Switch } from './m3'
import {
  biometryStatus,
  disableLock,
  readLockConfig,
  setBiometricsEnabled,
  setGraceMinutes,
  setPin,
  verifyPin,
  type BiometryKind,
} from '@/lib/wellness/app-lock'

const GRACE_OPTIONS = [
  { value: 0, label: 'Immediately' },
  { value: 1, label: 'After 1 min' },
  { value: 5, label: 'After 5 min' },
  { value: 15, label: 'After 15 min' },
]

function biometryLabel(kind: BiometryKind) {
  if (kind === 'face' || kind === 'iris') return 'Face unlock'
  if (kind === 'fingerprint') return 'Fingerprint unlock'
  return 'Biometric unlock'
}

export function LockSettings() {
  const [config, setConfig] = useState(() => readLockConfig())
  const [biometry, setBiometry] = useState<{ available: boolean; kind: BiometryKind; reason?: string }>({
    available: false,
    kind: 'none',
  })
  const [entry, setEntry] = useState('')
  const [confirm, setConfirm] = useState('')
  const [current, setCurrent] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void biometryStatus().then(setBiometry)
  }, [])

  const refresh = () => setConfig(readLockConfig())

  async function enableLock() {
    setMessage(null)
    if (!/^\d{4,8}$/.test(entry)) {
      setMessage('PIN must be 4 to 8 digits.')
      return
    }
    if (entry !== confirm) {
      setMessage('The two PINs do not match.')
      return
    }
    setBusy(true)
    const ok = await setPin(entry, config.graceMinutes)
    setBusy(false)
    if (!ok) {
      setMessage('Could not set that PIN.')
      return
    }
    setEntry('')
    setConfirm('')
    setMessage('App lock is on.')
    refresh()
  }

  async function turnOff() {
    setMessage(null)
    setBusy(true)
    const ok = await verifyPin(current)
    setBusy(false)
    if (!ok) {
      setMessage('That PIN is not correct.')
      return
    }
    disableLock()
    setCurrent('')
    setMessage('App lock is off.')
    refresh()
  }

  return (
    <section className="panel" aria-label="App lock">
      <div className="panel-heading">
        <div>
          <p className="card-kicker">Privacy</p>
          <h2>App lock</h2>
        </div>
        <span className="lock-state">{config.enabled ? 'On' : 'Off'}</span>
      </div>

      {!config.enabled ? (
        <>
          <p className="muted">
            Require a PIN to open ZSTEPS. Your health data stays on the device either way — this stops anyone
            else reading it.
          </p>
          <div className="sensor-manual">
            <label htmlFor="lock-pin">New PIN (4–8 digits)</label>
            <div>
              <input
                id="lock-pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={entry}
                onChange={(event) => setEntry(event.target.value.replace(/\D/g, '').slice(0, 8))}
              />
            </div>
          </div>
          <div className="sensor-manual">
            <label htmlFor="lock-pin-confirm">Confirm PIN</label>
            <div>
              <input
                id="lock-pin-confirm"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value.replace(/\D/g, '').slice(0, 8))}
              />
              <button className="chip-button primary" onClick={() => void enableLock()} disabled={busy}>
                <Lock1 size="15" color="currentColor" /> Turn on
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <SettingRow
            title={biometryLabel(biometry.kind)}
            description={
              biometry.available
                ? 'Unlock with your fingerprint or face instead of typing the PIN.'
                : (biometry.reason ?? 'No biometrics enrolled on this device.')
            }
            control={
              <Switch
                label={biometryLabel(biometry.kind)}
                checked={config.biometricsEnabled}
                disabled={!biometry.available}
                onChange={async (next) => {
                  await setBiometricsEnabled(next)
                  refresh()
                }}
              />
            }
          />

          <div className="sensor-manual">
            <label htmlFor="lock-grace">Lock when I leave the app</label>
            <div>
              <select
                id="lock-grace"
                className="lock-select"
                value={config.graceMinutes}
                onChange={(event) => {
                  setGraceMinutes(Number(event.target.value))
                  refresh()
                }}
              >
                {GRACE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sensor-manual">
            <label htmlFor="lock-current">Turn off — enter current PIN</label>
            <div>
              <input
                id="lock-current"
                type="password"
                inputMode="numeric"
                value={current}
                onChange={(event) => setCurrent(event.target.value.replace(/\D/g, '').slice(0, 8))}
              />
              <button className="chip-button" onClick={() => void turnOff()} disabled={busy}>
                Turn off
              </button>
            </div>
          </div>
        </>
      )}

      {message && <p className="m3-status-line">{message}</p>}

      <p className="m3-status-line">
        {biometry.kind === 'face' ? (
          <ScanBarcode size="13" color="currentColor" />
        ) : (
          <FingerScan size="13" color="currentColor" />
        )}
        Your PIN is never stored — only a salted PBKDF2 hash of it.
      </p>
    </section>
  )
}
