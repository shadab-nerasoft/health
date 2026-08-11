'use client'

import { Heart, Watch } from 'iconsax-react'
import { Stagger, StaggerItem } from '@/components/wellness/motion'

export default function HeartRatePage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Cardiovascular health</p>
          <h1>Heart rate</h1>
          <p className="subheading">Connect a device to see live and resting heart rate here.</p>
        </div>
      </div>

      <Stagger className="dashboard-grid">
        <StaggerItem className="empty-state" style={{ gridColumn: '1 / -1' }}>
          <div className="empty-state-icon">
            <Watch size="26" color="var(--danger)" variant="Bold" />
          </div>
          <h2>No device connected yet</h2>
          <p>
            Pair a wearable or heart-rate monitor to start tracking live bpm, resting heart rate, and activity zones
            right here on this page.
          </p>
          <button className="soft-button">
            <Heart size="16" color="var(--danger)" /> Connect a device
          </button>
        </StaggerItem>

        <StaggerItem className="panel" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-heading">
            <div>
              <p className="card-kicker">Why connect</p>
              <h2>What you&apos;ll see once paired</h2>
            </div>
          </div>
          <div className="zone-list">
            <div className="zone-row">
              <span>Resting bpm</span>
              <div className="progress-track">
                <i style={{ width: '0%' }} />
              </div>
              <b>—</b>
            </div>
            <div className="zone-row">
              <span>Active zone</span>
              <div className="progress-track">
                <i style={{ width: '0%' }} />
              </div>
              <b>—</b>
            </div>
            <div className="zone-row">
              <span>Peak zone</span>
              <div className="progress-track">
                <i style={{ width: '0%' }} />
              </div>
              <b>—</b>
            </div>
          </div>
        </StaggerItem>
      </Stagger>
    </>
  )
}
