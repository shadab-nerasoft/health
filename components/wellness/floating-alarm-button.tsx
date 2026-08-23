'use client'

import { motion } from 'framer-motion'
import { Timer1 } from 'iconsax-react'
import { useAlarmStore } from '@/lib/wellness/alarm-store'
import { springExpressive } from './motion'

interface FloatingAlarmButtonProps {
  onClick: () => void
}

export function FloatingAlarmButton({ onClick }: FloatingAlarmButtonProps) {
  const { alarms } = useAlarmStore()
  const activeCount = alarms.filter((a) => a.enabled).length

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.92 }}
      transition={springExpressive}
      className="m3-fab"
      title="Open Alarms & Timers"
      aria-label="Open Alarms"
    >
      <Timer1 size="26" color="currentColor" variant="Bold" />

      {activeCount > 0 && (
        <span className="m3-fab-badge">{activeCount}</span>
      )}
    </motion.button>
  )
}
