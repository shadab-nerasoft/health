'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Edit2, TickCircle } from 'iconsax-react'
import { Stagger, StaggerItem } from '@/components/wellness/motion'
import { DataPanel } from '@/components/wellness/data-panel'
import { useWellness } from '@/hooks/use-wellness'
import { percent, profileInitial, type ActivityLevel } from '@/lib/wellness/store'

const activityOptions: { value: ActivityLevel; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'active', label: 'Active' },
]

function numberOrNull(value: string) {
  const parsed = Number(value)
  return value.trim() === '' || !Number.isFinite(parsed) || parsed <= 0 ? null : parsed
}

export default function ProfilePage() {
  const { ready, profile, goals, today, updateProfile } = useWellness()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ name: '', age: '', heightCm: '', weightKg: '' })

  // Keep the form aligned with stored values until the user opens the editor.
  useEffect(() => {
    if (editing) return
    setDraft({
      name: profile.name,
      age: profile.age?.toString() ?? '',
      heightCm: profile.heightCm?.toString() ?? '',
      weightKg: profile.weightKg?.toString() ?? '',
    })
  }, [editing, profile])

  function save() {
    updateProfile({
      name: draft.name.trim().slice(0, 40),
      age: numberOrNull(draft.age),
      heightCm: numberOrNull(draft.heightCm),
      weightKg: numberOrNull(draft.weightKg),
    })
    setEditing(false)
  }

  const details: [string, string][] = [
    ['Age', profile.age ? `${profile.age} years` : 'Not set'],
    ['Height', profile.heightCm ? `${profile.heightCm} cm` : 'Not set'],
    ['Weight', profile.weightKg ? `${profile.weightKg} kg` : 'Not set'],
    ['Activity level', activityOptions.find((row) => row.value === profile.activityLevel)?.label ?? 'Moderate'],
  ]

  const stepPercent = Math.min(100, percent(today.steps, goals.steps))

  return (
    <Stagger>
      <StaggerItem>
        <div className="profile-heading">
          <div className="avatar profile-avatar" suppressHydrationWarning>
            {ready ? profileInitial(profile) : 'Z'}
          </div>
          <div>
            <p className="eyebrow">Your profile</p>
            <h1 suppressHydrationWarning>{ready && profile.name ? profile.name : 'Add your name'}</h1>
            <p className="muted">Saved on this device only</p>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Personal information</p>
              <h2>Your details</h2>
            </div>
            <button className="more-button" onClick={() => setEditing((value) => !value)}>
              {editing ? (
                <>
                  <TickCircle size="15" color="var(--muted-foreground)" /> Close
                </>
              ) : (
                <>
                  <Edit2 size="15" color="var(--muted-foreground)" /> Edit
                </>
              )}
            </button>
          </div>

          {editing ? (
            <div className="profile-form">
              <div className="inline-field">
                <label htmlFor="profile-name">Name</label>
                <div>
                  <input
                    id="profile-name"
                    value={draft.name}
                    placeholder="Your name"
                    onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))}
                  />
                </div>
              </div>
              <div className="inline-field">
                <label htmlFor="profile-age">Age</label>
                <div>
                  <input
                    id="profile-age"
                    type="number"
                    inputMode="numeric"
                    value={draft.age}
                    placeholder="28"
                    onChange={(event) => setDraft((value) => ({ ...value, age: event.target.value }))}
                  />
                </div>
              </div>
              <div className="inline-field">
                <label htmlFor="profile-height">Height (cm)</label>
                <div>
                  <input
                    id="profile-height"
                    type="number"
                    inputMode="numeric"
                    value={draft.heightCm}
                    placeholder="175"
                    onChange={(event) => setDraft((value) => ({ ...value, heightCm: event.target.value }))}
                  />
                </div>
              </div>
              <div className="inline-field">
                <label htmlFor="profile-weight">Weight (kg)</label>
                <div>
                  <input
                    id="profile-weight"
                    type="number"
                    inputMode="decimal"
                    value={draft.weightKg}
                    placeholder="74"
                    onChange={(event) => setDraft((value) => ({ ...value, weightKg: event.target.value }))}
                  />
                </div>
              </div>
              <div className="inline-field">
                <span className="field-label">Activity level</span>
                <div className="sensor-actions">
                  {activityOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`chip-button ${profile.activityLevel === option.value ? 'primary' : ''}`}
                      onClick={() => updateProfile({ activityLevel: option.value })}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <button className="chip-button primary profile-save" onClick={save}>
                Save changes
              </button>
            </div>
          ) : (
            <div className="profile-details">
              {details.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong suppressHydrationWarning>{ready ? value : 'Not set'}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </StaggerItem>

      <StaggerItem>
        <section className="panel">
          <p className="card-kicker">Current goal</p>
          <h2>Stay active</h2>
          <p className="muted" suppressHydrationWarning>
            Daily target: {goals.steps.toLocaleString()} steps
          </p>
          <div className="progress-track" style={{ marginTop: 16 }}>
            <i style={{ width: `${ready ? stepPercent : 0}%` }} />
          </div>
        </section>
      </StaggerItem>

      <StaggerItem>
        <section className="profile-links">
          <Link href="/goals">
            Adjust daily goals <span>→</span>
          </Link>
          <Link href="/progress">
            Weight and history <span>→</span>
          </Link>
        </section>
      </StaggerItem>

      <StaggerItem>
        <DataPanel />
      </StaggerItem>
    </Stagger>
  )
}
