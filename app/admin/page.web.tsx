import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { adminMisconfigured, isAdmin } from '@/lib/admin'
import { AdminPinForm } from './pin-form'

/**
 * Admin entry point: the PIN gate.
 *
 * Web only (`page.web.tsx`), so it never ships inside the Android app.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Admin — ZSTEPS',
  robots: { index: false, follow: false },
}

export default async function AdminGatePage() {
  if (await isAdmin()) redirect('/admin/analytics')

  if (adminMisconfigured()) {
    return (
      <main className="admin-shell admin-gate-shell">
        <div className="admin-gate">
          <h1>Admin is not configured</h1>
          <p className="subheading">
            Neither ADMIN_SESSION_SECRET nor SUPABASE_JWT_SECRET is set on this deployment, so the admin session
            cookie cannot be signed. Admin access stays disabled rather than falling back to an unsigned cookie.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="admin-shell admin-gate-shell">
      <AdminPinForm />
    </main>
  )
}
