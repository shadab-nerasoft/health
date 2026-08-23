'use client'

import { useActionState } from 'react'
import { motion } from 'framer-motion'
import { Lock1 } from 'iconsax-react'
import { signInAsAdmin } from './actions'
import { durationLong, easeEmphasizedDecelerate, springExpressive } from '@/components/wellness/motion'

/**
 * PIN entry for the admin dashboard.
 *
 * Only the form lives on the client — the PIN is compared inside the Server
 * Action, so nothing here reveals it, and a wrong entry gets the same message
 * whether or not an admin session was ever possible.
 */
export function AdminPinForm() {
  const [state, action, pending] = useActionState(signInAsAdmin, { error: undefined as string | undefined })

  return (
    <motion.form
      action={action}
      className="admin-gate"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durationLong, ease: easeEmphasizedDecelerate }}
    >
      <motion.span
        className="admin-gate-mark"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springExpressive}
      >
        <Lock1 size="24" color="currentColor" variant="Bold" />
      </motion.span>

      <h1>Admin access</h1>
      <p className="subheading">Enter the admin PIN to view user analytics.</p>

      <input
        name="pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        maxLength={12}
        placeholder="••••"
        aria-label="Admin PIN"
        className="admin-gate-input"
      />

      <button type="submit" className="download-button" disabled={pending}>
        {pending ? 'Checking…' : 'Unlock'}
      </button>

      {state?.error && (
        <motion.p
          className="admin-gate-error"
          role="alert"
          initial={{ opacity: 0, x: 0 }}
          animate={{ opacity: 1, x: [0, -8, 7, -4, 0] }}
          transition={{ duration: 0.4, ease: easeEmphasizedDecelerate }}
        >
          {state.error}
        </motion.p>
      )}
    </motion.form>
  )
}
