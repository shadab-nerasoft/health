'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CloseCircle,
  Notification as NotificationIcon,
  NotificationBing,
  Danger,
  InfoCircle,
  MagicStar,
} from 'iconsax-react'
import { useNotifications } from '@/hooks/use-notifications'
import { useWellness } from '@/hooks/use-wellness'
import {
  fetchAINudge,
  generateDynamicNudgesFromState,
  getStoredAINudges,
  saveAINudge,
  triggerBrowserPush,
  type AINudge,
} from '@/lib/wellness/ai-notifications'
import { easeSmooth } from './motion'

export interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const {
    isSubscribed,
    isLoading,
    permission,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = useNotifications()

  const { profile, goals, today, derived, latestWeight } = useWellness()
  const [showGuide, setShowGuide] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [nudges, setNudges] = useState<AINudge[]>([])

  // Calculate 100% dynamic initial nudges on mount / open from live telemetry
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredAINudges()
      if (stored.length > 0) {
        setNudges(stored)
      } else {
        const dynamicNudges = generateDynamicNudgesFromState(
          profile,
          goals,
          today,
          derived,
          latestWeight
        )
        setNudges(dynamicNudges)
      }
    }
  }, [isOpen])

  // Trigger AI to craft a fresh, 100% dynamic diet / meal / weight goal nudge
  const handleGenerateAINudge = async () => {
    setIsGeneratingAI(true)
    try {
      const payload = {
        primary_goal: profile?.primary_goal || 'weight_loss',
        dietary_preferences: profile?.dietary_preferences || ['Balanced'],
        meal_count: profile?.meal_count || 3,
        current_weight_kg: latestWeight?.kg || profile?.weightKg || 70,
        target_weight_kg: profile?.target_weight_kg || 65,
        current_steps: today?.steps || 0,
        step_goal: goals?.steps || 10000,
        current_water_ml: today?.waterMl || 0,
        water_goal_ml: goals?.waterMl || 2500,
        activity_level: profile?.activityLevel || 'moderate',
      }

      const newNudge = await fetchAINudge(payload)
      const updated = saveAINudge(newNudge)
      setNudges(updated.length > 0 ? updated : [newNudge, ...nudges])

      // Push browser notification if allowed
      await triggerBrowserPush(newNudge)
    } catch (err) {
      console.error('Failed to generate dynamic AI nudge:', err)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Handle dynamic test notification button click
  const handleSendDynamicTestAlert = async () => {
    const isWeightLoss = profile?.primary_goal === 'weight_loss'
    const stepTarget = goals?.steps || 10000
    const waterTarget = goals?.waterMl || 2500
    const stepsLogged = today?.steps || 0
    const waterLogged = today?.waterMl || 0

    const dynamicTitle = `🥗 ZSTEPS AI: ${isWeightLoss ? 'Weight Loss Deficit' : 'Weight Gain Surplus'}`
    const dynamicBody = `Logged ${stepsLogged.toLocaleString()}/${stepTarget.toLocaleString()} steps & ${waterLogged.toLocaleString()}/${waterTarget.toLocaleString()}ml water. Keep powering your daily goals!`

    await sendTestNotification({
      title: dynamicTitle,
      body: dynamicBody,
    })
  }

  const primaryGoal = profile?.primary_goal || 'weight_loss'
  const goalLabel =
    primaryGoal === 'weight_loss'
      ? 'Weight Loss'
      : primaryGoal === 'weight_gain'
        ? 'Weight Gain'
        : 'Maintenance'
  const dietPref = profile?.dietary_preferences?.[0] || 'Balanced'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="notification-modal-wrapper">
          {/* Backdrop */}
          <motion.div
            className="notification-modal-overlay"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Modal Dialog */}
          <motion.div
            className="notification-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: easeSmooth }}
            role="dialog"
            aria-modal="true"
            aria-label="AI Dynamic Notification Center"
          >
            {/* Header */}
            <div className="notification-modal-header">
              <div className="notification-modal-title">
                <div className="notification-icon-mark">
                  <NotificationBing size="20" color="var(--foreground)" variant="Bold" />
                </div>
                <div>
                  <h3>Notifications</h3>
                  <p>Dynamic AI Diet & Goal Nudges</p>
                </div>
              </div>
              <button
                type="button"
                className="notification-close-btn"
                onClick={onClose}
                aria-label="Close modal"
              >
                <CloseCircle size="20" color="var(--muted-foreground)" />
              </button>
            </div>

            {/* Dynamic AI Goal Context Pill */}
            <div className="ai-goal-badge">
              <MagicStar size="16" color="var(--accent-blue)" variant="Bold" />
              <span>
                <strong>Live Dynamic Profile:</strong> {goalLabel} • {dietPref} ({profile?.meal_count || 3} meals/day)
              </span>
            </div>

            {/* Quick Status Bar */}
            <div className={`notification-status-bar ${isSubscribed ? 'active' : ''}`}>
              <div className="status-info">
                <span className={`status-pill-dot ${isSubscribed ? 'on' : ''}`} />
                <div>
                  <strong>{isSubscribed ? 'Continuous AI Reminders Active' : 'Reminders Disabled'}</strong>
                  <span>
                    {isSubscribed
                      ? 'Automated real-time notifications calculated dynamically from your live steps, water & weight goals.'
                      : 'Enable notifications to receive daily dynamic meal & weight nudges.'}
                  </span>
                </div>
              </div>

              {permission === 'denied' && (
                <div className="permission-warning">
                  <Danger size="16" color="var(--danger)" />
                  <div>
                    <strong>Permission Blocked by Browser</strong>
                    <p style={{ margin: '2px 0 0', fontSize: 11.5, opacity: 0.9 }}>
                      Browser is blocking notifications. Click below to see how to allow them in settings.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Row */}
            <div className="notification-actions-row">
              {isSubscribed ? (
                <>
                  <button
                    type="button"
                    className="notification-btn secondary"
                    onClick={unsubscribe}
                    disabled={isLoading}
                  >
                    Turn off
                  </button>
                  <button
                    type="button"
                    className="notification-btn primary"
                    onClick={handleGenerateAINudge}
                    disabled={isGeneratingAI}
                  >
                    <MagicStar size="16" color="#ffffff" variant="Bold" />
                    {isGeneratingAI ? 'Crafting AI Nudge…' : 'Generate AI Nudge'}
                  </button>
                </>
              ) : (
                <>
                  {permission === 'denied' ? (
                    <button
                      type="button"
                      className="notification-btn secondary full"
                      onClick={() => setShowGuide((v) => !v)}
                    >
                      <InfoCircle size="16" color="#94a3b8" />
                      {showGuide ? 'Hide Instructions' : 'How to Unblock Notifications'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="notification-btn primary full"
                      onClick={subscribe}
                      disabled={isLoading}
                    >
                      <NotificationBing size="16" color="#ffffff" variant="Bold" />
                      {isLoading ? 'Enabling…' : 'Turn On Dynamic Reminders'}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Browser Settings Guide */}
            {showGuide && permission === 'denied' && (
              <div className="notification-guide-box">
                <strong>How to allow notifications:</strong>
                <ol>
                  <li>Click the 🔒 <strong>Lock / Tune icon</strong> on the left side of your browser address bar.</li>
                  <li>Find <strong>Notifications</strong> in the popup menu.</li>
                  <li>Change setting from <em>Block</em> to <strong>Allow</strong>.</li>
                  <li>Refresh this page and tap <strong>Turn On Dynamic Reminders</strong>.</li>
                </ol>
              </div>
            )}

            {error && (
              <p className="notification-error-msg" role="alert">
                {error}
              </p>
            )}

            {/* Dynamic Recent Nudges List */}
            <div className="notification-nudges-section">
              <div className="nudges-section-head">
                <h4>Dynamic AI Nudges</h4>
                <button
                  type="button"
                  className="test-link-btn"
                  onClick={handleSendDynamicTestAlert}
                >
                  Send Dynamic Alert
                </button>
              </div>

              <div className="nudges-list">
                {nudges.map((item) => (
                  <div key={item.id} className={`nudge-item ${item.read ? 'read' : 'unread'}`}>
                    <div className="nudge-dot" />
                    <div className="nudge-content">
                      <div className="nudge-header">
                        <strong>{item.title}</strong>
                        <span>{item.time}</span>
                      </div>
                      <p>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
