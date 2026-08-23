'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_COOKIE, ADMIN_SESSION_MAX_AGE, checkPin, createSessionValue } from '@/lib/admin'

/**
 * Verifies the admin PIN and mints the session cookie.
 *
 * A Server Action, so the PIN is compared on the server and never reaches the
 * browser bundle. The cookie is httpOnly (script cannot read it), sameSite
 * strict (not sent cross-site) and secure in production.
 */
export async function signInAsAdmin(_state: { error?: string }, formData: FormData) {
  const pin = String(formData.get('pin') ?? '')

  if (!checkPin(pin)) {
    // A uniform delay on failure blunts brute-forcing a short PIN over the
    // network. It is a mitigation, not a fix — see the note on the page.
    await new Promise((resolve) => setTimeout(resolve, 700))
    return { error: "You don't have permission to open this." }
  }

  const store = await cookies()
  store.set(ADMIN_COOKIE, createSessionValue(), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: ADMIN_SESSION_MAX_AGE,
  })

  redirect('/admin/analytics')
}

export async function signOutAsAdmin() {
  const store = await cookies()
  store.delete({ name: ADMIN_COOKIE, path: '/admin' })
  redirect('/admin')
}
