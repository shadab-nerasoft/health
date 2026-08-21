'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('ServiceWorker registration successful:', registration.scope)
          }
        })
        .catch((err) => {
          console.warn('ServiceWorker registration warning:', err)
        })
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
      return () => window.removeEventListener('load', register)
    }
  }, [])

  return null
}

