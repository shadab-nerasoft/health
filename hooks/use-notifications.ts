'use client'

import { useCallback, useEffect, useState } from 'react'

const DEFAULT_VAPID_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BN4vaD7ye10k6IUyVzoH_6dDwprx8MrSokdV6sgSV8A8On5CHqF5dfhAmp5XJQSU0u8dKEhVPnJGe1f392x2aWU'

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
    if (!('Notification' in window)) {
      setIsLoading(false)
      return
    }

    setIsSupported(true)
    setPermission(Notification.permission)

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsLoading(false)
      return
    }

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
            ? 'Notifications are blocked in browser settings. Please allow notifications for this site.'
            : 'Notification permission was dismissed.'
        )
        return
      }

      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(DEFAULT_VAPID_KEY),
        })

        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub),
        })

        if (!response.ok) {
          await sub.unsubscribe().catch(() => {})
          setError('Could not save subscription to server.')
          return
        }

        setSubscription(sub)
      } else {
        setSubscription({} as PushSubscription)
      }
    } catch (err) {
      console.error('Failed to subscribe:', err)
      setError('Could not enable notifications on this device.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        const { endpoint } = subscription
        await subscription.unsubscribe()
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {})
      }
      setSubscription(null)
    } catch (err) {
      console.error('Failed to unsubscribe:', err)
      setError('Could not turn notifications off.')
    } finally {
      setIsLoading(false)
    }
  }, [subscription])

  const sendTestNotification = useCallback(
    async (customPayload?: { title?: string; body?: string }) => {
      setError(null)
      const title = customPayload?.title || 'ZSTEPS — Dynamic Wellness Nudge'
      const body =
        customPayload?.body ||
        'Notifications are active! You will get daily reminders for your activity and water goals.'

      try {
        let currentPermission = Notification.permission
        if (currentPermission !== 'granted') {
          currentPermission = await Notification.requestPermission()
          setPermission(currentPermission)
        }

        if (currentPermission !== 'granted') {
          setError('Notification permission is required to send test alerts.')
          return
        }

        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready
          if (registration && registration.showNotification) {
            await registration.showNotification(title, {
              body,
              icon: '/icon.svg',
              badge: '/icon.svg',
              data: { url: '/' },
            })
            return
          }
        }

        new Notification(title, {
          body,
          icon: '/icon.svg',
        })
      } catch (err) {
        console.error('Failed to show test notification:', err)
        setError('Could not trigger notification. Please check site permissions.')
      }
    },
    []
  )

  return {
    isSupported,
    isSubscribed: subscription !== null || permission === 'granted',
    isLoading,
    permission,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  }
}
