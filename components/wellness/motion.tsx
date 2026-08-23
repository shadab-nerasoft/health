'use client'

import type { CSSProperties, ReactNode } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'

/**
 * Material 3 expressive motion.
 *
 * The curves and durations here are M3's, not approximations. What makes
 * Material motion feel driven rather than merely animated is the asymmetry:
 * things decelerate slowly into place (emphasized-decelerate) and accelerate
 * away quickly (emphasized-accelerate), so entrances feel considered and exits
 * feel decisive. Symmetric easing is the usual reason an animated UI still
 * feels flat.
 *
 * Every export respects prefers-reduced-motion via the hooks below.
 */

// --------------------------------------------------------------- easing

/** Standard M3 easing. Overshoots very slightly at the end. */
export const easeEmphasized = [0.2, 0, 0, 1] as const
/** Entrances: slow, confident settle. */
export const easeEmphasizedDecelerate = [0.05, 0.7, 0.1, 1] as const
/** Exits: quick departure, no lingering. */
export const easeEmphasizedAccelerate = [0.3, 0, 0.8, 0.15] as const
export const easeStandard = [0.2, 0, 0, 1] as const
export const easeDecelerate = [0, 0, 0, 1] as const
export const easeAccelerate = [0.3, 0, 1, 1] as const
/** Retained for callers that predate the M3 pass. */
export const easeSmooth = [0.16, 1, 0.3, 1] as const

// ------------------------------------------------------------- durations

export const durationShort = 0.15
export const durationMedium = 0.3
export const durationLong = 0.45
export const durationExtraLong = 0.7

// --------------------------------------------------------------- springs

/** Touch feedback: fast, barely any bounce. */
export const springTouch = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 0.8,
} as const

/** Sheets and large surfaces: heavier, more physical. */
export const springSheet = {
  type: 'spring',
  stiffness: 350,
  damping: 32,
  mass: 1,
} as const

/** M3 expressive: enough bounce to read as spatial, not as a wobble. */
export const springExpressive = {
  type: 'spring',
  stiffness: 380,
  damping: 26,
  mass: 0.9,
} as const

// -------------------------------------------------------------- variants

export const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
}

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: durationLong, ease: easeEmphasizedDecelerate },
  },
}

export const navItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: durationMedium, ease: easeEmphasized } },
}

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 12 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: durationLong, ease: easeEmphasizedDecelerate },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: durationShort, ease: easeEmphasizedAccelerate },
  },
}

export const bottomSheetVariants: Variants = {
  hidden: { y: '100%', opacity: 0.5 },
  show: { y: 0, opacity: 1, transition: springSheet },
  exit: {
    y: '100%',
    opacity: 0,
    transition: { duration: durationMedium, ease: easeEmphasizedAccelerate },
  },
}

/**
 * M3 shared-axis Z: the transition for moving between peers at the same level
 * of hierarchy. Content scales in from slightly behind while fading, which
 * reads as depth rather than as a slide.
 */
export const sharedAxisVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: durationLong, ease: easeEmphasizedDecelerate },
  },
  exit: {
    opacity: 0,
    scale: 1.02,
    transition: { duration: durationShort, ease: easeEmphasizedAccelerate },
  },
}

// ---------------------------------------------------------------- helpers

/** Collapses a variant set to plain fades when the OS asks for less motion. */
function useVariants(variants: Variants): Variants {
  const reduced = useReducedMotion()
  if (!reduced) return variants
  return {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: durationShort } },
    exit: { opacity: 0, transition: { duration: durationShort } },
  }
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
  const reduced = useReducedMotion()
  return (
    <Component
      className={className}
      variants={reduced ? { hidden: {}, show: {} } : containerVariants}
      initial="hidden"
      animate="show"
    >
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
  const variants = useVariants(itemVariants)
  return (
    <motion.div className={className} style={style} variants={variants}>
      {children}
    </motion.div>
  )
}

/** Route-level transition. Named for what it did before; now M3 shared-axis. */
export function PageFade({ children }: { children: ReactNode }) {
  const variants = useVariants(sharedAxisVariants)
  return (
    <motion.div variants={variants} initial="hidden" animate="show">
      {children}
    </motion.div>
  )
}

/**
 * M3 press feedback. Wrap any tappable surface to get the scale response the
 * platform uses, without hand-writing it at each call site.
 */
export function Pressable({
  children,
  className,
  onClick,
  style,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  style?: CSSProperties
}) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      style={style}
      onClick={onClick}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={springTouch}
    >
      {children}
    </motion.div>
  )
}
