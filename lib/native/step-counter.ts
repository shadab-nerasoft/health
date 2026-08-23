import { registerPlugin } from '@capacitor/core'

/**
 * Typed handle on the native Android step counter.
 *
 * The native side owns the number. Nothing here can write a step count — the
 * only inputs are a date string and two booleans, all validated in Java.
 */

export type StepPermission = 'granted' | 'denied' | 'blocked' | 'prompt'

export type StepStatus = {
  platform: 'android' | 'web'
  /** False on devices with no hardware step counter, and always false on web. */
  sensorAvailable: boolean
  permission: StepPermission
  /** The sensor listener is currently attached. */
  tracking: boolean
  /** The user has tracking switched on, whether or not a listener is attached. */
  trackingEnabled: boolean
  backgroundService: boolean
  steps: number
  date: string
  trackingStartDate: string | null
  lastUpdated: number
  /** Diagnostic label for the last reading, e.g. 'steps' or 'reboot-credited'. */
  lastEvent: string
}

export type StepReading = {
  date: string
  steps: number
  lastUpdated?: number
}

export interface StepCounterPlugin {
  getStatus(): Promise<StepStatus>
  start(): Promise<StepStatus>
  stop(): Promise<StepStatus>
  getTodaySteps(): Promise<StepReading>
  getSteps(options: { date: string }): Promise<StepReading>
  getHistory(options?: { days?: number }): Promise<{ days: Record<string, number> }>
  requestPermission(): Promise<StepStatus>
  requestNotificationPermission(): Promise<StepStatus>
  openSettings(): Promise<void>
  setBackgroundService(options: { enabled: boolean }): Promise<StepStatus>
  addListener(
    event: 'stepsChanged',
    handler: (reading: StepReading) => void,
  ): Promise<{ remove: () => Promise<void> }>
  addListener(
    event: 'statusChanged',
    handler: (status: StepStatus) => void,
  ): Promise<{ remove: () => Promise<void> }>
}

const unavailable: StepStatus = {
  platform: 'web',
  sensorAvailable: false,
  permission: 'prompt',
  tracking: false,
  trackingEnabled: false,
  backgroundService: false,
  steps: 0,
  date: '',
  trackingStartDate: null,
  lastUpdated: 0,
  lastEvent: 'web',
}

/**
 * Browser fallback. It reports "no sensor" rather than throwing, so the React
 * layer can fall through to the existing DeviceMotion pedometer without any
 * platform branching of its own.
 */
class StepCounterWeb implements StepCounterPlugin {
  async getStatus() {
    return unavailable
  }
  async start() {
    return unavailable
  }
  async stop() {
    return unavailable
  }
  async getTodaySteps() {
    return { date: '', steps: 0 }
  }
  async getSteps(options: { date: string }) {
    return { date: options.date, steps: 0 }
  }
  async getHistory() {
    return { days: {} as Record<string, number> }
  }
  async requestPermission() {
    return unavailable
  }
  async requestNotificationPermission() {
    return unavailable
  }
  async openSettings() {
    return undefined
  }
  async setBackgroundService() {
    return unavailable
  }
  async addListener() {
    return { remove: async () => undefined }
  }
}

export const StepCounter = registerPlugin<StepCounterPlugin>('StepCounter', {
  web: () => new StepCounterWeb(),
})

export const webStepStatus = unavailable
