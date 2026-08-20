'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Notification, Timer1, VolumeHigh, CloseSquare } from 'iconsax-react'
import { useRingingAlarm } from '@/lib/wellness/alarm-store'
import { easeSmooth } from './motion'

export function AlarmRingingModal() {
  const { ringingAlarm, snooze, dismiss } = useRingingAlarm()

  if (!ringingAlarm) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={dismiss}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ duration: 0.35, ease: easeSmooth }}
          className="relative w-full max-w-sm rounded-3xl bg-[#141419] p-7 text-white shadow-2xl border border-purple-500/20 overflow-hidden text-center"
        >
          {/* Ambient Purple Pulsing Backlight */}
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-purple-600/30 blur-3xl pointer-events-none"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-indigo-600/30 blur-3xl pointer-events-none"
          />

          {/* Animated Ringing Bell Icon */}
          <div className="relative mx-auto my-4 flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/20 border border-purple-400/40">
            <motion.div
              animate={{ rotate: [-15, 15, -15, 15, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatDelay: 0.2,
              }}
            >
              <Notification size="40" color="#c084fc" variant="Bold" />
            </motion.div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wider text-purple-400 uppercase mb-2">
            <VolumeHigh size="14" color="#c084fc" variant="Bold" />
            <span>Alarm Ringing</span>
          </div>

          <h2 className="text-4xl font-extrabold tracking-tight text-white mb-1">
            {ringingAlarm.time}
          </h2>

          <p className="text-lg font-medium text-slate-300 mb-6">
            {ringingAlarm.label}
          </p>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={snooze}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-sm font-semibold transition-all text-purple-200 border border-white/10"
            >
              <Timer1 size="18" color="#d8b4fe" />
              <span>Snooze (5m)</span>
            </button>

            <button
              onClick={dismiss}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-sm font-semibold transition-all text-white shadow-lg shadow-purple-600/40"
            >
              <CloseSquare size="18" color="#ffffff" variant="Bold" />
              <span>Dismiss</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
