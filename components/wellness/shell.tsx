'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ComponentType } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  ArrowLeft2,
  ArrowRight2,
  CloseCircle,
  Drop,
  Flag,
  HambergerMenu,
  Heart,
  Home2,
  Lamp,
  Notification,
  Setting2,
  TrendUp,
  User,
} from 'iconsax-react'
import { easeSmooth, navItemVariants } from './motion'

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
      <Icon size="19" color={active ? '#202124' : '#747474'} variant={active ? 'Bold' : 'Linear'} />
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

export function WellnessShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem('wellnest-sidebar-collapsed')
    if (stored) setCollapsed(stored === '1')
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) window.localStorage.setItem('wellnest-sidebar-collapsed', collapsed ? '1' : '0')
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
            <div className="brand-mark">
              <Activity size="18" color="#202124" variant="Bold" />
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  wellnest
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
              <ArrowLeft2 size="15" color="#747474" />
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
          <NavLink href="/profile" label="Settings" icon={Setting2} active={pathname === '/settings'} collapsed={collapsed} />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                className="user-chip"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="avatar">S</div>
                <div>
                  <strong>Shadab</strong>
                  <span>Personal plan</span>
                </div>
                <ArrowRight2 size="16" color="#747474" />
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
                    <Activity size="18" color="#202124" variant="Bold" />
                  </div>
                  <span>wellnest</span>
                </div>
                <button className="collapse-toggle" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                  <CloseCircle size="18" color="#747474" />
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
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <section className="content">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <HambergerMenu size="21" color="#202124" />
          </button>
          <div className="mobile-brand">wellnest</div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications">
              <Notification size="19" color="#202124" />
            </button>
            <Link href="/profile" className="avatar large" aria-label="Profile">
              S
            </Link>
          </div>
        </header>
        {children}
        <nav className="bottom-nav">
          {mobileLinks.map((link) => {
            const active = pathname === link.href
            return (
              <Link key={link.href} href={link.href} className={`nav-item ${active ? 'active' : ''}`}>
                <link.icon size="19" color={active ? '#202124' : '#747474'} variant={active ? 'Bold' : 'Linear'} />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>
      </section>
    </div>
  )
}
