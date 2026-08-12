'use client'

import { useState } from 'react'
import { DocumentDownload, Trash } from 'iconsax-react'
import { useTracking } from './tracking-provider'

export function DataPanel() {
  const { exportData, clearEverything } = useTracking()
  const [confirming, setConfirming] = useState(false)

  function download() {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `zsteps-export-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="panel data-panel">
      <div className="panel-heading">
        <div>
          <p className="card-kicker">Privacy</p>
          <h2>Your data</h2>
        </div>
      </div>
      <p className="muted">
        Steps, water, weight, and goals stay in this browser&apos;s local storage. Nothing is uploaded, and no account is
        required. Clearing site data or switching devices starts a fresh history.
      </p>
      <div className="sensor-actions" style={{ marginTop: 18 }}>
        <button className="chip-button" onClick={download}>
          <DocumentDownload size="15" color="var(--muted-foreground)" /> Export JSON
        </button>
        {confirming ? (
          <>
            <button
              className="chip-button danger"
              onClick={() => {
                clearEverything()
                setConfirming(false)
              }}
            >
              Confirm delete
            </button>
            <button className="chip-button" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button className="chip-button" onClick={() => setConfirming(true)}>
            <Trash size="15" color="var(--muted-foreground)" /> Delete all data
          </button>
        )}
      </div>
    </section>
  )
}
