'use client'

import { AnimatePresence } from 'framer-motion'
import { AppLockScreen, useAppLock } from './app-lock-screen'

/**
 * Wraps the app shell and holds the lock screen above it.
 *
 * The children stay mounted underneath rather than being torn down, so
 * unlocking reveals an app that is already warm — no reload, no lost state, and
 * the exit animation has something to reveal.
 */
export function AppLockGate({ children }: { children: React.ReactNode }) {
  const { locked, unlock } = useAppLock()

  return (
    <>
      {children}
      <AnimatePresence>{locked && <AppLockScreen key="lock" onUnlock={unlock} />}</AnimatePresence>
    </>
  )
}
