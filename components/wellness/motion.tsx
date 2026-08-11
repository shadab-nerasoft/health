'use client'

import type { CSSProperties, ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'

/**
 * Centralized animation tokens for the wellness app.
 * Every sequenced reveal across the shell, page templates, and
 * dashboard cards pulls from this single source so motion feels
 * consistent everywhere.
 */
export const easeSmooth = [0.16, 1, 0.3, 1] as const

export const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.08 },
  },
}

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.98, filter: 'blur(4px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: easeSmooth },
  },
}

export const navItemVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: easeSmooth } },
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
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: easeSmooth }}
    >
      {children}
    </motion.div>
  )
}
