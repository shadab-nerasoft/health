import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

/**
 * Admin access for the analytics dashboard.
 *
 * Gated by a PIN, checked *server-side*. That distinction is the whole design:
 * a PIN compared in the browser would ship inside the JavaScript bundle, and the
 * page would have to fetch every user's health data before it could decide
 * whether to show it. Here the check happens before any data is read, and an
 * unauthorised visitor never receives a single row.
 *
 * A correct PIN mints a short-lived cookie signed with HMAC-SHA256, so the
 * session cannot be forged by editing cookies, and the PIN itself is never
 * stored in the browser.
 *
 * Configure with:
 *   ADMIN_PIN=2580                 (defaults to 2580)
 *   ADMIN_SESSION_SECRET=<random>  (falls back to SUPABASE_JWT_SECRET)
 */

const COOKIE_NAME = 'zsteps_admin'
const SESSION_HOURS = 12

export function adminPin() {
  return process.env.ADMIN_PIN || '2580'
}

function signingSecret() {
  // Both are server-only secrets. A signing key must never be a public value,
  // so there is deliberately no NEXT_PUBLIC_* fallback here.
  return process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_JWT_SECRET || ''
}

function sign(payload: string) {
  return createHmac('sha256', signingSecret()).update(payload).digest('hex')
}

/** Constant-time compare, so a wrong signature cannot be found byte by byte. */
function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function checkPin(candidate: string) {
  const expected = adminPin()
  if (candidate.length !== expected.length) return false
  return safeEqual(candidate, expected)
}

/** Mints the signed session value. Callers set it as an httpOnly cookie. */
export function createSessionValue() {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000
  return `${expiresAt}.${sign(String(expiresAt))}`
}

export const ADMIN_COOKIE = COOKIE_NAME
export const ADMIN_SESSION_MAX_AGE = SESSION_HOURS * 60 * 60

/**
 * True only for a request carrying a valid, unexpired admin cookie.
 *
 * Returns false when no signing secret is configured rather than trusting an
 * unsigned cookie — failing closed matters more here than convenience.
 */
export async function isAdmin(): Promise<boolean> {
  if (!signingSecret()) return false

  const store = await cookies()
  const raw = store.get(COOKIE_NAME)?.value
  if (!raw) return false

  const [expiresAt, signature] = raw.split('.')
  if (!expiresAt || !signature) return false
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) < Date.now()) return false

  return safeEqual(signature, sign(expiresAt))
}

/** True when the deployment has no signing secret, so admin cannot be enabled. */
export function adminMisconfigured() {
  return signingSecret().length === 0
}
