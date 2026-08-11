'use client'

import { PageFade } from '@/components/wellness/motion'

/**
 * Next.js remounts `template.tsx` on every navigation, so this gives every
 * route inside the app shell a fresh, sequenced entrance animation without
 * needing manual route-transition wiring.
 */
export default function AppGroupTemplate({ children }: { children: React.ReactNode }) {
  return <PageFade>{children}</PageFade>
}
