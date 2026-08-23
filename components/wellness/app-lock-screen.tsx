'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { FingerScan, Lock1, ScanBarcode } from 'iconsax-react'
import { AppLogo } from './app-logo'
import {
  biometryStatus,
  isLockEnabled,
  readLockConfig,
  unlockWithBiometrics,
  verifyPin,
  type BiometryKind,
} from '@/lib/wellness/app-lock'
import { durationLong, easeEmphasizedAccelerate, easeEmphasizedDecelerate, springExpressive } from './motion'

/**
 * Full-screen lock gate.
 *
 * Renders above everything until the PIN or a biometric check passes. On native
 * it offers fingerprint / face first (and prompts automatically on open, which
 * is what makes it feel like a system unlock rather than a form), with the PIN
 * always available underneath as the fallback.
 */

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const

function BiometryIcon({ kind }: { kind: BiometryKind }) {
  if (kind === 'face' || kind === 'iris') return <ScanBarcode size="22" color="currentColor" variant="Bold" />
  return <FingerScan size="22" color="currentColor" variant="Bold" />
}

export function AppLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)
  const [biometry, setBiometry] = useState<{ available: boolean; kind: BiometryKind }>({
    available: false,
    kind: 'none',
  })
  const reduced = useReducedMotion()
  const promptedRef = useRef(false)
  const config = readLockConfig()

  const runBiometrics = useCallback(async () => {
    const ok = await unlockWithBiometrics()
    if (ok) onUnlock()
    return ok
  }, [onUnlock])

  // Offer the sensor immediately on open. Failing here is not an error — the
  // user simply types their PIN instead.
  useEffect(() => {
    if (promptedRef.current) return
    promptedRef.current = true

    void (async () => {
      const status = await biometryStatus()
      setBiometry({ available: status.available, kind: status.kind })
      if (status.available && config.biometricsEnabled) await runBiometrics()
    })()
  }, [config.biometricsEnabled, runBiometrics])

  const submit = useCallback(
    async (candidate: string) => {
      setChecking(true)
      const ok = await verifyPin(candidate)
      setChecking(false)
      if (ok) {
        onUnlock()
        return
      }
      setError(true)
      setPin('')
      // Clear the error state after the shake so the dots settle calmly.
      window.setTimeout(() => setError(false), 600)
    },
    [onUnlock],
  )

  const press = useCallback(
    (key: string) => {
      if (checking) return
      if (key === 'del') {
        setPin((value) => value.slice(0, -1))
        return
      }
      if (!key) return
      setPin((value) => {
        const next = (value + key).slice(0, 8)
        // Four digits is the common case; verify as soon as it could be right.
        if (next.length >= 4) void submit(next)
        return next
      })
    },
    [checking, submit],
  )

  // Hardware keyboard, for the web build.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) press(event.key)
      else if (event.key === 'Backspace') press('del')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press])

  return (
    <motion.div
      className="lock-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
      transition={{ duration: durationLong, ease: easeEmphasizedAccelerate }}
      role="dialog"
      aria-modal="true"
      aria-label="App locked"
    >
      <motion.div
        className="lock-brand"
        initial={reduced ? false : { scale: 0.8, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={springExpressive}
      >
        <span className="lock-mark">
          <AppLogo size="26" color="currentColor" />
        </span>
        <strong>ZSTEPS</strong>
      </motion.div>

      <motion.p
        className="lock-title"
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: durationLong, ease: easeEmphasizedDecelerate, delay: 0.08 }}
      >
        {error ? 'Wrong PIN, try again' : 'Enter your PIN'}
      </motion.p>

      {/* Dots shake on failure — the one piece of motion that carries meaning. */}
      <motion.div
        className={`lock-dots${error ? ' error' : ''}`}
        animate={error && !reduced ? { x: [0, -10, 9, -6, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.45, ease: easeEmphasizedDecelerate }}
        aria-live="polite"
      >
        {Array.from({ length: Math.max(4, pin.length) }).map((_, index) => (
          <motion.i
            key={index}
            className={index < pin.length ? 'filled' : ''}
            animate={{ scale: index < pin.length ? 1 : 0.72 }}
            transition={springExpressive}
          />
        ))}
      </motion.div>

      <div className="lock-pad">
        {KEYS.map((key, index) => (
          <motion.button
            key={`${key}-${index}`}
            type="button"
            className={`lock-key${key ? '' : ' empty'}`}
            onClick={() => press(key)}
            disabled={!key || checking}
            whileTap={reduced || !key ? undefined : { scale: 0.9 }}
            transition={springExpressive}
            aria-label={key === 'del' ? 'Delete' : key || undefined}
          >
            {key === 'del' ? '⌫' : key}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {biometry.available && config.biometricsEnabled && (
          <motion.button
            type="button"
            className="lock-biometric"
            onClick={() => void runBiometrics()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: durationLong, ease: easeEmphasizedDecelerate, delay: 0.16 }}
          >
            <BiometryIcon kind={biometry.kind} />
            {biometry.kind === 'face' ? 'Unlock with face' : 'Unlock with fingerprint'}
          </motion.button>
        )}
      </AnimatePresence>

      {!config.biometricsEnabled && (
        <p className="lock-hint">
          <Lock1 size="13" color="currentColor" /> PIN required
        </p>
      )}
    </motion.div>
  )
}

/** True once the app should be showing the lock gate. */
export function useAppLock() {
  const [locked, setLocked] = useState(false)
  const [ready, setReady] = useState(false)
  const backgroundedAt = useRef<number | null>(null)

  useEffect(() => {
    setLocked(isLockEnabled())
    setReady(true)
  }, [])

  // Re-lock after the app has been away longer than the grace period.
  useEffect(() => {
    const onVisibility = () => {
      if (!isLockEnabled()) return
      if (document.visibilityState === 'hidden') {
        backgroundedAt.current = Date.now()
        return
      }
      const since = backgroundedAt.current
      backgroundedAt.current = null
      if (since === null) return
      const graceMs = readLockConfig().graceMinutes * 60_000
      if (Date.now() - since >= graceMs) setLocked(true)
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return { locked: ready && locked, unlock: () => setLocked(false) }
}
