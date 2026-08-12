'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import {
  splashSlides,
  isSplashSeen,
  markSplashSeen,
  type SplashSlide,
} from '@/lib/wellness/splash'

const SWIPE_THRESHOLD = 50
const AUTO_ADVANCE_MS = 5000

/* ── Animation variants ─────────────────────────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0, transition: { duration: 0.35 } },
} as const

function slideVariants(direction: number) {
  return {
    enter: { x: direction > 0 ? '100%' : '-100%', opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: direction > 0 ? '-100%' : '100%', opacity: 0 },
  }
}

const imageVariants = {
  enter: { scale: 1.05, opacity: 0 },
  center: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.8, ease: [0.33, 1, 0.68, 1] },
  },
  exit: { opacity: 0, transition: { duration: 0.4 } },
} as const

const textVariants = {
  enter: { opacity: 0, y: 30 },
  center: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 24, stiffness: 180, delay: 0.2 },
  },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
} as const

const subtextVariants = {
  enter: { opacity: 0, y: 20 },
  center: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 24, stiffness: 180, delay: 0.3 },
  },
  exit: { opacity: 0, y: -15, transition: { duration: 0.18 } },
} as const

/* ── Slide component ────────────────────────────────────── */

function Slide({
  slide,
  direction,
}: {
  slide: SplashSlide
  direction: number
}) {
  const variants = slideVariants(direction)

  return (
    <motion.div
      className="splash-slide"
      style={{ backgroundColor: slide.bgColor }}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: 'spring' as const, damping: 28, stiffness: 260, mass: 0.9 }}
    >
      <motion.div
        className="splash-image-wrap"
        variants={imageVariants}
        initial="enter"
        animate="center"
        exit="exit"
      >
        <img
          src={slide.image}
          alt=""
          className="splash-image"
          draggable={false}
        />
      </motion.div>

      <div className="splash-text-block">
        <motion.h1
          className="splash-headline"
          variants={textVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {slide.headline}
        </motion.h1>

        <motion.p
          className="splash-subtext"
          variants={subtextVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {slide.subtext}
        </motion.p>
      </div>
    </motion.div>
  )
}

/* ── Main splash screen ─────────────────────────────────── */

export function SplashScreen() {
  const [show, setShow] = useState(false)
  const [[page, direction], setPage] = useState([0, 0])
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalSlides = splashSlides.length
  const isLast = page === totalSlides - 1

  useEffect(() => {
    if (!isSplashSeen()) {
      setShow(true)
      // Prevent body scroll while splash is visible
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Auto-advance
  useEffect(() => {
    if (!show) return
    if (isLast) return

    autoTimer.current = setTimeout(() => {
      setPage(([prev]) => [prev + 1, 1])
    }, AUTO_ADVANCE_MS)

    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current)
    }
  }, [page, show, isLast])

  const goNext = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current)
    setPage(([prev]) => [Math.min(prev + 1, totalSlides - 1), 1])
  }, [totalSlides])

  const goPrev = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current)
    setPage(([prev]) => [Math.max(prev - 1, 0), -1])
  }, [])

  const finish = useCallback(() => {
    markSplashSeen()
    document.body.style.overflow = ''
    setShow(false)
  }, [])

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info
      const swipe = Math.abs(offset.x) * velocity.x

      if (offset.x < -SWIPE_THRESHOLD || swipe < -1000) {
        if (isLast) {
          finish()
        } else {
          goNext()
        }
      } else if (offset.x > SWIPE_THRESHOLD || swipe > 1000) {
        goPrev()
      }
    },
    [isLast, goNext, goPrev, finish],
  )

  if (!show) return null

  const currentSlide = splashSlides[page]

  return (
    <motion.div
      className="splash-container"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Animated background color */}
      <motion.div
        className="splash-bg"
        animate={{ backgroundColor: currentSlide.bgColor }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      />

      {/* Swipeable slide area */}
      <div
        className="splash-viewport"
      >
        <AnimatePresence initial={false} mode="wait" custom={direction}>
          <motion.div
            key={page}
            className="splash-swipe-area"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            style={{ touchAction: 'pan-y' }}
          >
            <Slide slide={currentSlide} direction={direction} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="splash-controls">
        {/* Dot indicators */}
        <div className="splash-dots" role="tablist" aria-label="Splash slides">
          {splashSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`splash-dot ${index === page ? 'active' : ''}`}
              onClick={() => {
                if (autoTimer.current) clearTimeout(autoTimer.current)
                setPage([index, index > page ? 1 : -1])
              }}
              role="tab"
              aria-selected={index === page}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>

        {/* CTA button */}
        <motion.button
          type="button"
          className="splash-cta"
          onClick={isLast ? finish : goNext}
          whileTap={{ scale: 0.96 }}
        >
          {isLast ? 'Get Started' : 'Next'}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </motion.button>

        {/* Skip */}
        {!isLast && (
          <button
            type="button"
            className="splash-skip"
            onClick={finish}
          >
            Skip
          </button>
        )}
      </div>
    </motion.div>
  )
}
