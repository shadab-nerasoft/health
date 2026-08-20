'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export type AlarmCategory = 'sun' | 'moon' | 'water' | 'heart' | 'activity' | 'medication'

export interface AlarmItem {
  id: string
  time: string // "07:30", "09:00" in 24h format
  label: string
  category: AlarmCategory
  enabled: boolean
  days: number[] // 0=Sun, 1=Mon, ..., 6=Sat
  soundEnabled: boolean
}

const DEFAULT_ALARMS: AlarmItem[] = [
  {
    id: 'alarm-1',
    time: '07:30',
    label: 'Morning Run',
    category: 'sun',
    enabled: true,
    days: [1, 2, 3, 4, 5], // Mon - Fri
    soundEnabled: true,
  },
  {
    id: 'alarm-2',
    time: '09:00',
    label: 'Late-Night',
    category: 'moon',
    enabled: true,
    days: [0, 6], // Sat, Sun
    soundEnabled: true,
  },
  {
    id: 'alarm-3',
    time: '12:30',
    label: 'Hydration Nudge',
    category: 'water',
    enabled: false,
    days: [0, 1, 2, 3, 4, 5, 6],
    soundEnabled: true,
  },
  {
    id: 'alarm-4',
    time: '21:30',
    label: 'Wind Down',
    category: 'moon',
    enabled: false,
    days: [1, 2, 3, 4, 5],
    soundEnabled: true,
  },
]

const STORAGE_KEY = 'zsteps-alarms-v1'

class AlarmAudioEngine {
  private ctx: AudioContext | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null

  start() {
    this.stop()
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      this.ctx = new AudioCtx()

      const playBeep = () => {
        if (!this.ctx || this.ctx.state === 'closed') return
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {})
        }
        
        const now = this.ctx.currentTime
        // High melodious chime pulse (A5 to C6)
        const osc1 = this.ctx.createOscillator()
        const gain1 = this.ctx.createGain()
        osc1.type = 'sine'
        osc1.frequency.setValueAtTime(880, now) // A5
        osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12) // C6
        gain1.gain.setValueAtTime(0.25, now)
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
        osc1.connect(gain1)
        gain1.connect(this.ctx.destination)
        osc1.start(now)
        osc1.stop(now + 0.35)

        // Harmonic echo
        const osc2 = this.ctx.createOscillator()
        const gain2 = this.ctx.createGain()
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(1318.5, now + 0.15) // E6
        gain2.gain.setValueAtTime(0.15, now + 0.15)
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
        osc2.connect(gain2)
        gain2.connect(this.ctx.destination)
        osc2.start(now + 0.15)
        osc2.stop(now + 0.45)
      }

      playBeep()
      this.intervalId = setInterval(playBeep, 900)
    } catch (e) {
      console.warn('Web Audio synth unavailable:', e)
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {})
      this.ctx = null
    }
  }
}

export const alarmAudio = new AlarmAudioEngine()

let alarmListeners: Array<() => void> = []

function notifyListeners() {
  alarmListeners.forEach((l) => l())
}

export function getStoredAlarms(): AlarmItem[] {
  if (typeof window === 'undefined') return DEFAULT_ALARMS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ALARMS))
      return DEFAULT_ALARMS
    }
    return JSON.parse(raw)
  } catch (e) {
    return DEFAULT_ALARMS
  }
}

export function saveStoredAlarms(alarms: AlarmItem[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms))
    notifyListeners()
  } catch (e) {
    console.error('Failed to save alarms:', e)
  }
}

export function useAlarmStore() {
  const [alarms, setAlarms] = useState<AlarmItem[]>(getStoredAlarms)

  useEffect(() => {
    const update = () => setAlarms(getStoredAlarms())
    alarmListeners.push(update)
    return () => {
      alarmListeners = alarmListeners.filter((l) => l !== update)
    }
  }, [])

  const addAlarm = useCallback((newAlarm: Omit<AlarmItem, 'id'>) => {
    const current = getStoredAlarms()
    const item: AlarmItem = {
      ...newAlarm,
      id: `alarm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    }
    const updated = [item, ...current]
    saveStoredAlarms(updated)
  }, [])

  const toggleAlarm = useCallback((id: string) => {
    const current = getStoredAlarms()
    const updated = current.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    saveStoredAlarms(updated)
  }, [])

  const updateAlarm = useCallback((id: string, updates: Partial<AlarmItem>) => {
    const current = getStoredAlarms()
    const updated = current.map((a) => (a.id === id ? { ...a, ...updates } : a))
    saveStoredAlarms(updated)
  }, [])

  const deleteAlarm = useCallback((id: string) => {
    const current = getStoredAlarms()
    const updated = current.filter((a) => a.id !== id)
    saveStoredAlarms(updated)
  }, [])

  return {
    alarms,
    addAlarm,
    toggleAlarm,
    updateAlarm,
    deleteAlarm,
  }
}

// Global active ringing state
let activeRingingAlarm: AlarmItem | null = null
let ringingListeners: Array<() => void> = []

export function setRingingAlarm(alarm: AlarmItem | null) {
  activeRingingAlarm = alarm
  if (alarm && alarm.soundEnabled) {
    alarmAudio.start()
  } else {
    alarmAudio.stop()
  }
  ringingListeners.forEach((l) => l())
}

export function getRingingAlarm() {
  return activeRingingAlarm
}

export function useRingingAlarm() {
  const [ringing, setRinging] = useState<AlarmItem | null>(getRingingAlarm)

  useEffect(() => {
    const update = () => setRinging(getRingingAlarm())
    ringingListeners.push(update)
    return () => {
      ringingListeners = ringingListeners.filter((l) => l !== update)
    }
  }, [])

  const snooze = useCallback(() => {
    if (!activeRingingAlarm) return
    alarmAudio.stop()
    // Snooze adds 5 minutes
    const [h, m] = activeRingingAlarm.time.split(':').map(Number)
    const d = new Date()
    d.setHours(h)
    d.setMinutes(m + 5)
    const snoozeTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

    const current = getStoredAlarms()
    const snoozedAlarm: AlarmItem = {
      ...activeRingingAlarm,
      id: `snooze-${Date.now()}`,
      label: `${activeRingingAlarm.label} (Snoozed)`,
      time: snoozeTime,
      enabled: true,
    }
    saveStoredAlarms([snoozedAlarm, ...current])
    setRingingAlarm(null)
  }, [])

  const dismiss = useCallback(() => {
    alarmAudio.stop()
    setRingingAlarm(null)
  }, [])

  return { ringingAlarm: ringing, snooze, dismiss }
}

export function useAlarmMonitor() {
  const triggeredKeysRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const check = () => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const currentFormatted = `${hours}:${minutes}`
      const dayOfWeek = now.getDay()
      const dateKey = `${now.toISOString().slice(0, 10)}-${currentFormatted}`

      const currentAlarms = getStoredAlarms()

      for (const alarm of currentAlarms) {
        if (!alarm.enabled) continue
        if (alarm.time !== currentFormatted) continue

        // Check day match if days configured
        if (alarm.days.length > 0 && !alarm.days.includes(dayOfWeek)) continue

        const triggerId = `${alarm.id}-${dateKey}`
        if (triggeredKeysRef.current.has(triggerId)) continue

        // Mark triggered
        triggeredKeysRef.current.add(triggerId)

        // Trigger Notification if browser supports it & permission granted
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            try {
              new Notification(`⏰ Alarm: ${alarm.label}`, {
                body: `It's ${alarm.time}! Time for your scheduled ${alarm.label}.`,
                icon: '/icon.svg',
                tag: alarm.id,
              })
            } catch (e) {
              console.error('Notification trigger error:', e)
            }
          }
        }

        // Set global ringing alarm
        setRingingAlarm(alarm)
        break
      }
    }

    const timer = setInterval(check, 1000)
    check()
    return () => clearInterval(timer)
  }, [])
}
