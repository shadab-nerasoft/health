'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ComponentType } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  Activity,
  ArrowLeft2,
  ArrowRight2,
  CloseCircle,
  Drop,
  Flag,
  Heart,
  Home2,
  Lamp,
  Moon,
  More,
  Notification,
  Setting2,
  Setting4,
  Sun1,
  TrendUp,
  User,
} from 'iconsax-react'
import { AppLogo } from './app-logo'
import { easeSmooth, navItemVariants } from './motion'
import { useWellness } from '@/hooks/use-wellness'
import { profileInitial } from '@/lib/wellness/store'

import { NotificationModal } from './notification-modal'
import { useNotifications } from '@/hooks/use-notifications'
import { AlarmModal } from './alarm-modal'
import { AlarmRingingModal } from './alarm-ringing-modal'
import { FloatingAlarmButton } from './floating-alarm-button'
import { useAlarmMonitor } from '@/lib/wellness/alarm-store'
import { useNativeNotifications } from '@/hooks/use-native-notifications'
import { Timer1 } from 'iconsax-react'

type NavLinkDef = { href: string; label: string; icon: ComponentType<any> }

const overviewLinks: NavLinkDef[] = [
  { href: '/', label: 'Home', icon: Home2 },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/progress', label: 'Progress', icon: TrendUp },
  { href: '/goals', label: 'Goals', icon: Flag },
  { href: '/insights', label: 'Insights', icon: Lamp },
]

const wellnessLinks: NavLinkDef[] = [
  { href: '/water', label: 'Water', icon: Drop },
  { href: '/nutrition', label: 'Nutrition', icon: Lamp },
  { href: '/coach', label: 'Coach', icon: User },
  { href: '/heart-rate', label: 'Heart rate', icon: Heart },
  { href: '/profile', label: 'Profile', icon: User },
]

const mobileLinks: NavLinkDef[] = [
  { href: '/', label: 'Home', icon: Home2 },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/goals', label: 'Goals', icon: Flag },
  { href: '/insights', label: 'Insights', icon: Lamp },
  { href: '/profile', label: 'Profile', icon: User },
]

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: NavLinkDef & { active: boolean; collapsed: boolean }) {
  return (
    <Link href={href} className={`nav-item ${active ? 'active' : ''}`} title={collapsed ? label : undefined}>
      <Icon size="19" color={active ? 'var(--primary)' : 'var(--muted-foreground)'} variant={active ? 'Bold' : 'Linear'} />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.22, ease: easeSmooth }}
            style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  )
}

function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={collapsed ? (isDark ? 'Light mode' : 'Dark mode') : undefined}
    >
      <span className="theme-toggle-icon">
        <AnimatePresence initial={false} mode="wait">
          {mounted && (
            <motion.span
              key={isDark ? 'moon' : 'sun'}
              initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
              transition={{ duration: 0.3, ease: easeSmooth }}
            >
              {isDark ? (
                <Moon size="18" color="var(--muted-foreground)" variant="Bold" />
              ) : (
                <Sun1 size="18" color="var(--muted-foreground)" variant="Bold" />
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.22, ease: easeSmooth }}
            style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
          >
            {isDark ? 'Dark mode' : 'Light mode'}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

function TopbarThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      type="button"
      className="icon-button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <AnimatePresence initial={false} mode="wait">
        {mounted && (
          <motion.span
            key={isDark ? 'sun' : 'moon'}
            initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
            transition={{ duration: 0.25, ease: easeSmooth }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isDark ? (
              <Sun1 size="19" color="var(--foreground)" variant="Bold" />
            ) : (
              <Moon size="19" color="var(--foreground)" variant="Bold" />
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

export function WellnessShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { ready, profile } = useWellness()
  const { isSubscribed } = useNotifications()
  const initial = ready ? profileInitial(profile) : 'Z'
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAlarms, setShowAlarms] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useAlarmMonitor()
  // Hands the alarm triggers to Android so they fire with the app closed.
  // The monitor above still drives the in-app ringing modal while it is open.
  useNativeNotifications()

  useEffect(() => {
    const stored = window.localStorage.getItem('zsteps-sidebar-collapsed')
    if (stored) setCollapsed(stored === '1')
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) window.localStorage.setItem('zsteps-sidebar-collapsed', collapsed ? '1' : '0')
  }, [collapsed, hydrated])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <div className="wellness-app">
      <motion.aside
        className={`sidebar ${collapsed ? 'collapsed' : ''}`}
        animate={{ width: collapsed ? 84 : 238 }}
        transition={{ duration: 0.45, ease: easeSmooth }}
      >
        <div className="sidebar-head">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <AppLogo size="18" color="#a855f7" />
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  ZSTEPS
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <button
            className="collapse-toggle"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={collapsed}
          >
            <motion.span
              style={{ display: 'flex' }}
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.4, ease: easeSmooth }}
            >
              <ArrowLeft2 size="15" color="var(--muted-foreground)" />
            </motion.span>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.p className="nav-label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              Overview
            </motion.p>
          )}
        </AnimatePresence>
        <motion.nav initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }}>
          {overviewLinks.map((link) => (
            <motion.div key={link.href} variants={navItemVariants}>
              <NavLink {...link} active={pathname === link.href} collapsed={collapsed} />
            </motion.div>
          ))}
        </motion.nav>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.p className="nav-label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              Wellness
            </motion.p>
          )}
        </AnimatePresence>
        <nav>
          {wellnessLinks.map((link) => (
            <NavLink key={link.href} {...link} active={pathname === link.href} collapsed={collapsed} />
          ))}
        </nav>

        <div className="sidebar-bottom">
          <ThemeToggle collapsed={collapsed} />
          <NavLink href="/profile" label="Settings" icon={Setting2} active={pathname === '/settings'} collapsed={collapsed} />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Link href="/profile" className="user-chip">
                  <div className="avatar" suppressHydrationWarning>
                    {initial}
                  </div>
                  <div>
                    <strong suppressHydrationWarning>{ready && profile.name ? profile.name : 'Add your name'}</strong>
                    <span>Edit profile</span>
                  </div>
                  <ArrowRight2 size="16" color="var(--muted-foreground)" />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              className="mobile-overlay"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
            <motion.aside
              className="mobile-drawer"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.4, ease: easeSmooth }}
            >
              <div className="sidebar-head">
                <div className="brand">
                  <div className="brand-mark">
                    <AppLogo size="18" color="#a855f7" />
                  </div>
                  <span>ZSTEPS</span>
                </div>
                <button className="collapse-toggle" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                  <CloseCircle size="18" color="var(--muted-foreground)" />
                </button>
              </div>
              <p className="nav-label">Overview</p>
              <nav>
                {overviewLinks.map((link) => (
                  <NavLink key={link.href} {...link} active={pathname === link.href} collapsed={false} />
                ))}
              </nav>
              <p className="nav-label">Wellness</p>
              <nav>
                {wellnessLinks.map((link) => (
                  <NavLink key={link.href} {...link} active={pathname === link.href} collapsed={false} />
                ))}
              </nav>
              <div className="sidebar-bottom" style={{ marginTop: 'auto', paddingTop: 16 }}>
                <ThemeToggle collapsed={false} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <section className="content">
        <header className="topbar">
          <div className="mobile-brand">
            <div className="brand-mark" aria-hidden="true">
              <AppLogo size="18" color="#a855f7" />
            </div>
            <span>ZSTEPS</span>
          </div>
          <div className="topbar-actions">
            <button
              className="icon-button"
              aria-label="Alarms"
              onClick={() => setShowAlarms(true)}
              title="Open Alarms"
            >
              <Timer1 size="19" color="var(--foreground)" />
            </button>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() => setShowNotifications(true)}
              title="Open Notifications"
            >
              <Notification size="19" color="var(--foreground)" />
              {isSubscribed && <span className="notification-badge" />}
            </button>
            <TopbarThemeToggle />
            <button
              type="button"
              className="icon-button"
              aria-label="Settings"
              onClick={() => setMobileOpen(true)}
              title="Settings & Menu"
            >
              <Setting4 size="19" color="var(--foreground)" />
            </button>
          </div>
        </header>
        {children}
        <nav className="bottom-nav">
          {mobileLinks.map((link) => {
            const active = pathname === link.href
            return (
              <Link key={link.href} href={link.href} className={`nav-item ${active ? 'active' : ''}`}>
                <link.icon size="19" color={active ? 'var(--nav-active)' : 'var(--muted-foreground)'} variant={active ? 'Bold' : 'Linear'} />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>
      </section>

      <FloatingAlarmButton onClick={() => setShowAlarms(true)} />

      <AlarmModal
        isOpen={showAlarms}
        onClose={() => setShowAlarms(false)}
      />

      <AlarmRingingModal />

      <NotificationModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  )
}

