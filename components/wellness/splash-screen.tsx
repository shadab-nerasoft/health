'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, type PanInfo } from 'framer-motion'
import {
  splashSlides,
  isSplashSeen,
  markSplashSeen,
  type SplashSlide,
} from '@/lib/wellness/splash'

const SWIPE_THRESHOLD = 40
const AUTO_ADVANCE_MS = 5000

/* ── Spring transition configuration for liquid smooth sliding ── */
const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 32,
  mass: 0.8,
}

export function SplashScreen() {
  const [show, setShow] = useState(false)
  const [page, setPage] = useState(0)
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const totalSlides = splashSlides.length
  const isLast = page === totalSlides - 1

  // Handle client-side visibility check and body scroll lock
  useEffect(() => {
    if (!isSplashSeen()) {
      setShow(true)
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [])

  const finish = useCallback(() => {
    markSplashSeen()
    document.body.style.overflow = ''
    document.body.style.touchAction = ''
    setShow(false)
  }, [])

  const goNext = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current)
    setPage((prev) => Math.min(prev + 1, totalSlides - 1))
  }, [totalSlides])

  const goPrev = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current)
    setPage((prev) => Math.max(prev - 1, 0))
  }, [])

  // Auto-advance mechanism
  useEffect(() => {
    if (!show || isLast) return

    autoTimer.current = setTimeout(() => {
      setPage((prev) => (prev < totalSlides - 1 ? prev + 1 : prev))
    }, AUTO_ADVANCE_MS)

    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current)
    }
  }, [page, show, isLast, totalSlides])

  // Keyboard navigation for accessibility
  useEffect(() => {
    if (!show) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        if (isLast) finish()
        else goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        finish()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [show, isLast, goNext, goPrev, finish])

  // Real-time continuous drag end calculation
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info
      const swipe = offset.x * velocity.x

      if (offset.x < -SWIPE_THRESHOLD || swipe < -500) {
        if (isLast) {
          finish()
        } else {
          goNext()
        }
      } else if (offset.x > SWIPE_THRESHOLD || swipe > 500) {
        goPrev()
      }
    },
    [isLast, goNext, goPrev, finish],
  )

  if (!show) return null

  const currentSlide = splashSlides[page]

  return (
    <div
      ref={containerRef}
      className="splash-container"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome and Onboarding"
    >
      {/* Background color layer */}
      <motion.div
        className="splash-bg"
        animate={{ backgroundColor: currentSlide.bgColor }}
        transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
      />

      {/* Hardware-accelerated continuous horizontal sliding track */}
      <div className="splash-viewport">
        <motion.div
          className="splash-track"
          animate={{ x: `-${page * 100}%` }}
          transition={springTransition}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragStart={() => {
            if (autoTimer.current) clearTimeout(autoTimer.current)
          }}
          onDragEnd={handleDragEnd}
        >
          {splashSlides.map((slide, index) => {
            const isActive = index === page
            return (
              <div key={slide.id} className="splash-slide-item">
                <div className="splash-image-wrap">
                  <img
                    src={slide.image}
                    alt=""
                    className="splash-image"
                    draggable={false}
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                </div>

                <div className="splash-text-block">
                  <motion.h1
                    className="splash-headline"
                    animate={{
                      opacity: isActive ? 1 : 0.4,
                      y: isActive ? 0 : 15,
                    }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {slide.headline}
                  </motion.h1>

                  <motion.p
                    className="splash-subtext"
                    animate={{
                      opacity: isActive ? 0.92 : 0.3,
                      y: isActive ? 0 : 10,
                    }}
                    transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {slide.subtext}
                  </motion.p>
                </div>
              </div>
            )
          })}
        </motion.div>
      </div>

      {/* Fixed bottom controls overlay */}
      <div className="splash-controls">
        {/* Active dot indicators */}
        <div className="splash-dots" role="tablist" aria-label="Onboarding slides">
          {splashSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`splash-dot ${index === page ? 'active' : ''}`}
              onClick={() => {
                if (autoTimer.current) clearTimeout(autoTimer.current)
                setPage(index)
              }}
              role="tab"
              aria-selected={index === page}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* CTA Next / Get Started button */}
        <motion.button
          type="button"
          className="splash-cta"
          onClick={isLast ? finish : goNext}
          whileHover={{ scale: 1.02 }}
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

        {/* Skip action button */}
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
    </div>
  )
}
