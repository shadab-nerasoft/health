'use client'

import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth'
import { isNativeApp } from '@/services/step-counter'

/**
 * App lock: a PIN, optionally backed by fingerprint or face unlock.
 *
 * The PIN is never stored. What is stored is a PBKDF2-SHA256 hash with a random
 * per-install salt, verified by re-deriving and comparing. That way a dump of
 * localStorage does not hand anyone the PIN, and the same code path works on
 * web and native.
 *
 * Biometrics never carry the PIN either — the platform answers "this is the
 * device owner" and the app unlocks on that answer. The PIN stays the fallback
 * for when a sensor is unavailable or a face is not recognised.
 */

const LOCK_KEY = 'zsteps-app-lock-v1'

/** OWASP's floor for PBKDF2-SHA256; high enough to matter, fast enough to feel instant. */
const ITERATIONS = 210_000

export type BiometryKind = 'none' | 'fingerprint' | 'face' | 'iris' | 'generic'

export type LockConfig = {
  enabled: boolean
  salt: string
  hash: string
  biometricsEnabled: boolean
  /** Minutes of background time before the app re-locks. 0 locks immediately. */
  graceMinutes: number
}

const empty: LockConfig = {
  enabled: false,
  salt: '',
  hash: '',
  biometricsEnabled: false,
  graceMinutes: 0,
}

// ------------------------------------------------------------------ storage

export function readLockConfig(): LockConfig {
  if (typeof window === 'undefined') return empty
  try {
    const raw = window.localStorage.getItem(LOCK_KEY)
    if (!raw) return empty
    return { ...empty, ...(JSON.parse(raw) as Partial<LockConfig>) }
  } catch {
    return empty
  }
}

function writeLockConfig(config: LockConfig) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCK_KEY, JSON.stringify(config))
  } catch {
    // Nothing useful to do: the lock simply will not persist.
  }
}

export function isLockEnabled() {
  return readLockConfig().enabled
}

// -------------------------------------------------------------- PIN hashing

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function derive(pin: string, saltHex: string) {
  const encoder = new TextEncoder()
  const salt = Uint8Array.from(saltHex.match(/.{2}/g) ?? [], (byte) => parseInt(byte, 16))
  const key = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  )
  return toHex(bits)
}

/** Constant-time-ish compare, so verification does not leak via timing. */
function equals(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return diff === 0
}

export async function setPin(pin: string, graceMinutes = 0): Promise<boolean> {
  if (!/^\d{4,8}$/.test(pin)) return false
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer)
  const hash = await derive(pin, salt)
  writeLockConfig({ ...readLockConfig(), enabled: true, salt, hash, graceMinutes })
  return true
}

export async function verifyPin(pin: string): Promise<boolean> {
  const config = readLockConfig()
  if (!config.enabled || !config.salt) return true
  return equals(await derive(pin, config.salt), config.hash)
}

export function disableLock() {
  writeLockConfig(empty)
}

export function setGraceMinutes(minutes: number) {
  writeLockConfig({ ...readLockConfig(), graceMinutes: Math.max(0, Math.round(minutes)) })
}

// -------------------------------------------------------------- biometrics

export type BiometryStatus = {
  available: boolean
  kind: BiometryKind
  reason?: string
}

function kindFor(type: BiometryType): BiometryKind {
  switch (type) {
    case BiometryType.touchId:
    case BiometryType.fingerprintAuthentication:
      return 'fingerprint'
    case BiometryType.faceId:
    case BiometryType.faceAuthentication:
      return 'face'
    case BiometryType.irisAuthentication:
      return 'iris'
    case BiometryType.none:
      return 'none'
    default:
      return 'generic'
  }
}

export async function biometryStatus(): Promise<BiometryStatus> {
  if (!isNativeApp()) return { available: false, kind: 'none', reason: 'Only available in the app.' }
  try {
    const info = await BiometricAuth.checkBiometry()
    return {
      available: info.isAvailable,
      kind: kindFor(info.biometryType),
      reason: info.isAvailable ? undefined : info.reason || 'No biometrics enrolled on this device.',
    }
  } catch (cause) {
    return {
      available: false,
      kind: 'none',
      reason: cause instanceof Error ? cause.message : 'Biometrics unavailable.',
    }
  }
}

export async function setBiometricsEnabled(enabled: boolean): Promise<boolean> {
  if (enabled) {
    const status = await biometryStatus()
    if (!status.available) return false
  }
  writeLockConfig({ ...readLockConfig(), biometricsEnabled: enabled })
  return true
}

/**
 * Prompt for fingerprint / face. Returns false on any failure so the caller
 * falls back to the PIN rather than locking the user out.
 */
export async function unlockWithBiometrics(): Promise<boolean> {
  const config = readLockConfig()
  if (!isNativeApp() || !config.biometricsEnabled) return false
  try {
    await BiometricAuth.authenticate({
      reason: 'Unlock ZSTEPS',
      cancelTitle: 'Use PIN',
      allowDeviceCredential: false,
      androidTitle: 'Unlock ZSTEPS',
      androidSubtitle: 'Confirm it is you',
      androidConfirmationRequired: false,
    })
    return true
  } catch {
    return false
  }
}
