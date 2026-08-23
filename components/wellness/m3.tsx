'use client'

import type { ReactNode } from 'react'

/**
 * Small Material 3 controls the app was missing.
 *
 * Deliberately unstyled in JS — everything lives in m3-components.css so these
 * pick up dynamic colour and theme changes without a re-render.
 */

/**
 * M3 switch. A real `role="switch"` button rather than a styled checkbox, so it
 * announces its state to screen readers and takes keyboard focus properly.
 */
export function Switch({
  checked,
  onChange,
  disabled,
  label,
  id,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label: string
  id?: string
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="m3-switch"
      onClick={() => onChange(!checked)}
    />
  )
}

/** A settings row: title and description on the left, a control on the right. */
export function SettingRow({
  title,
  description,
  control,
}: {
  title: string
  description: string
  control: ReactNode
}) {
  return (
    <div className="m3-setting-row">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {control}
    </div>
  )
}

/** Collapsible help text, so long explanations stop dominating a card. */
export function Details({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="m3-details">
      <summary>{summary}</summary>
      <p>{children}</p>
    </details>
  )
}
