'use client'

import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { AnimatePresence, motion } from 'framer-motion'
import { AppLogo } from './app-logo'

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { delay: 0.1 } },
} as const

const sheetVariants = {
  hidden: { y: '100%', opacity: 0.5 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring' as const, damping: 28, stiffness: 300, mass: 0.9 },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] as const },
  },
} as const

function ShareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

function PlusSquareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

export function InstallPrompt() {
  const { isVisible, isIOSDevice, hasNativePrompt, install, dismiss } = useInstallPrompt()

  function handleInstall() {
    if (hasNativePrompt) {
      install()
    }
    // Without native prompt, the button still closes the sheet so the user
    // can follow the hint instructions. No 7-day cooldown — it will reappear next visit.
  }

  function renderHint() {
    if (hasNativePrompt) return null

    if (isIOSDevice) {
      return (
        <div className="install-hint">
          <p>
            Or tap <ShareIcon /> <strong>Share</strong> → <PlusSquareIcon /> <strong>&quot;Add to Home Screen&quot;</strong>
          </p>
        </div>
      )
    }

    return (
      <div className="install-hint">
        <p>
          Or tap <strong>⋮</strong> menu → <strong>&quot;Add to Home Screen&quot;</strong>
        </p>
      </div>
    )
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Overlay */}
          <motion.div
            className="install-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={dismiss}
            aria-hidden="true"
          />

          {/* Bottom sheet */}
          <motion.div
            className="install-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Install ZSTEPS app"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Drag handle */}
            <div className="install-handle" aria-hidden="true" />

            {/* App icon + info */}
            <div className="install-header">
              <div className="install-app-icon" aria-hidden="true">
                <AppLogo size="28" color="currentColor" />
              </div>
              <div className="install-app-info">
                <strong>ZSTEPS</strong>
              </div>
            </div>

            {/* Description */}
            <p className="install-description">
              Install ZSTEPS on your home screen for instant access, offline support, and a full-screen experience.
            </p>

            {/* Feature pills */}
            <div className="install-features">
              <span className="install-feature-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                Instant launch
              </span>
              <span className="install-feature-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
                Full screen
              </span>
              <span className="install-feature-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                Secure
              </span>
            </div>

            {/* Install button — always visible */}
            <button
              type="button"
              className="install-cta"
              onClick={handleInstall}
              id="pwa-install-button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Install App
            </button>

            {/* Fallback hint when native prompt isn't available */}
            {renderHint()}

            <button
              type="button"
              className="install-dismiss"
              onClick={dismiss}
              id="pwa-dismiss-button"
            >
              Not now
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
