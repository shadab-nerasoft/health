import { createClient as createServerClient } from '@/lib/supabase/server'

/**
 * Admin gate for the analytics dashboard.
 *
 * Membership comes from the ADMIN_EMAILS environment variable rather than a
 * database column, so nothing in the schema has to change and access can be
 * revoked by editing one env var and redeploying. It is read server-side only —
 * the list never reaches the browser.
 *
 *   ADMIN_EMAILS=you@example.com,someone@example.com
 *
 * With the variable unset, nobody is an admin and the page 404s. That is the
 * intended default: an analytics view over every user's health data should fail
 * closed, not open.
 */
function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

export type AdminSession = { email: string; id: string }

/** Returns the admin's identity, or null for everyone else. */
export async function requireAdmin(): Promise<AdminSession | null> {
  const allowed = adminEmails()
  if (allowed.length === 0) return null

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return null

  return allowed.includes(user.email.toLowerCase()) ? { email: user.email, id: user.id } : null
}
