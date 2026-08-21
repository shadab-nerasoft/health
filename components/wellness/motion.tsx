'use client'

import type { CSSProperties, ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'

/**
 * Centralized animation tokens inspired by Material 3 / One UI physics curves.
 */
export const easeSmooth = [0.16, 1, 0.3, 1] as const
export const easeEmphasized = [0.2, 0, 0, 1] as const
export const easeDecelerate = [0, 0, 0.2, 1] as const
export const easeAccelerate = [0.3, 0, 1, 1] as const

export const springTouch = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 0.8,
} as const

export const springSheet = {
  type: 'spring',
  stiffness: 350,
  damping: 32,
  mass: 1,
} as const

export const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
}

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: easeEmphasized },
  },
}

export const navItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: easeEmphasized } },
}

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 12 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.35, ease: easeEmphasized },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.22, ease: easeAccelerate },
  },
}

export const bottomSheetVariants: Variants = {
  hidden: { y: '100%', opacity: 0.5 },
  show: {
    y: 0,
    opacity: 1,
    transition: springSheet,
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: { duration: 0.25, ease: easeAccelerate },
  },
}

export function Stagger({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section'
}) {
  const Component = motion[as]
  return (
    <Component className={className} variants={containerVariants} initial="hidden" animate="show">
      {children}
    </Component>
  )
}

export function StaggerItem({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <motion.div className={className} style={style} variants={itemVariants}>
      {children}
    </motion.div>
  )
}

export function PageFade({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeEmphasized }}
    >
      {children}
    </motion.div>
  )
}

