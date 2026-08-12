'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

const SHOW_DELAY_MS = 3000

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua)
  return isIOS && isSafari
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export interface InstallPromptState {
  /** Whether the install popup should be visible */
  isVisible: boolean
  /** True on iOS Safari where we show manual share→add instructions */
  isIOSDevice: boolean
  /** True when the native beforeinstallprompt was captured */
  hasNativePrompt: boolean
  /** Trigger the native install prompt (Android/desktop) */
  install: () => Promise<void>
  /** Dismiss the popup for 7 days */
  dismiss: () => void
}

export function useInstallPrompt(): InstallPromptState {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isIOSDevice, setIsIOSDevice] = useState(false)
  const [hasNativePrompt, setHasNativePrompt] = useState(false)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Already installed as PWA — never show
    if (isStandalone()) return

    const ios = isIOSSafari()

    // Capture native prompt when available (Chrome/Edge/Samsung)
    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      setHasNativePrompt(true)

      // If we haven't shown yet, show now
      if (showTimer.current) clearTimeout(showTimer.current)
      showTimer.current = setTimeout(() => setIsVisible(true), 1500)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Detect iOS for instruction variant
    if (ios) setIsIOSDevice(true)

    // Always show the prompt after a delay on any device
    showTimer.current = setTimeout(() => setIsVisible(true), SHOW_DELAY_MS)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      if (showTimer.current) clearTimeout(showTimer.current)
    }
  }, [])

  const install = useCallback(async () => {
    const prompt = deferredPrompt.current
    if (!prompt) return

    await prompt.prompt()
    const { outcome } = await prompt.userChoice

    if (outcome === 'accepted') {
      setIsVisible(false)
    }
    deferredPrompt.current = null
  }, [])

  const dismiss = useCallback(() => {
    setIsVisible(false)
  }, [])

  return { isVisible, isIOSDevice, hasNativePrompt, install, dismiss }
}
