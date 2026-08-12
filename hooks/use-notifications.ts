'use client'

import { useState, useEffect } from 'react'

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      checkSubscription()
      setPermission(Notification.permission)
    } else {
      setIsLoading(false)
    }
  }, [])

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        setSubscription(sub)
        setIsSubscribed(true)
      }
    } catch (error) {
      console.error('Error checking push subscription:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const subscribe = async () => {
    setIsLoading(true)
    try {
      const permissionResult = await Notification.requestPermission()
      setPermission(permissionResult)

      if (permissionResult === 'granted') {
        const registration = await navigator.serviceWorker.ready
        const applicationServerKey = urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        )
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        })
        
        setSubscription(sub)
        setIsSubscribed(true)
        
        // Save the subscription to the backend
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sub),
        })
      }
    } catch (error) {
      console.error('Failed to subscribe the user: ', error)
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribe = async () => {
    setIsLoading(true)
    try {
      if (subscription) {
        await subscription.unsubscribe()
        
        // Also remove from backend (optional depending on your logic)
        // await fetch('/api/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint: subscription.endpoint }) })
        
        setSubscription(null)
        setIsSubscribed(false)
      }
    } catch (error) {
      console.error('Error unsubscribing', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendTestNotification = async () => {
    if (!subscription) return

    try {
      await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          payload: {
            title: 'Test Notification',
            body: 'This is a test push notification from your app!',
            url: '/',
          },
        }),
      })
    } catch (error) {
      console.error('Error sending test notification', error)
    }
  }

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    sendTestNotification,
  }
}
