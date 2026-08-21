'use client'

import { motion } from 'framer-motion'
import { Timer1 } from 'iconsax-react'
import { useAlarmStore } from '@/lib/wellness/alarm-store'
import { springTouch } from './motion'

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
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      transition={springTouch}
      className="fixed bottom-20 right-5 z-40 sm:bottom-6 sm:right-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-purple-700 via-purple-600 to-purple-500 text-white shadow-lg shadow-purple-600/30 border border-purple-400/30 backdrop-blur-md focus:outline-none"
      title="Open Alarms & Timers"
      aria-label="Open Alarms"
    >
      <Timer1 size="28" color="#ffffff" variant="Bold" />

      {activeCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-purple-300 text-[11px] font-extrabold text-purple-950 shadow-md">
          {activeCount}
        </span>
      )}
    </motion.button>
  )
}
