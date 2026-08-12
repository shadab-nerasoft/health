'use client'

import { useCallback, useEffect, useState } from 'react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setIsLoading(false)
      return
    }

    setIsSupported(true)
    setPermission(Notification.permission)

    let cancelled = false
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setSubscription(sub)
      })
      .catch(() => {
        if (!cancelled) setError('Could not read notification status.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const subscribe = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        setError(
          result === 'denied'
            ? 'Notifications are blocked. Enable them for this site in your browser settings.'
            : 'Notification permission was dismissed.'
        )
        return
      }

      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })

      // If the server can't store it, the daily reminder would never arrive.
      // Roll the browser subscription back so the UI doesn't claim success.
      if (!response.ok) {
        await sub.unsubscribe()
        setError('Could not save your subscription. Please try again.')
        return
      }

      setSubscription(sub)
    } catch (err) {
      console.error('Failed to subscribe:', err)
      setError('Could not enable notifications on this device.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    if (!subscription) return
    setIsLoading(true)
    setError(null)
    try {
      const { endpoint } = subscription
      await subscription.unsubscribe()
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      })
      setSubscription(null)
    } catch (err) {
      console.error('Failed to unsubscribe:', err)
      setError('Could not turn notifications off.')
    } finally {
      setIsLoading(false)
    }
  }, [subscription])

  /**
   * Fires a notification straight from the service worker. This deliberately
   * does NOT call /api/push/send — that route is admin-only, and the browser
   * must never hold the secret that protects it.
   */
  const sendTestNotification = useCallback(async () => {
    setError(null)
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification('ZSTEPS', {
        body: 'Notifications are working. This is what your daily nudge looks like.',
        icon: '/icon.svg',
        badge: '/icon.svg',
        data: { url: '/' },
      })
    } catch (err) {
      console.error('Failed to show test notification:', err)
      setError('Could not show the test notification.')
    }
  }, [])

  return {
    isSupported,
    isSubscribed: subscription !== null,
    isLoading,
    permission,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  }
}
