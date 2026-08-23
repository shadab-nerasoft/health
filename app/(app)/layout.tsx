import { WellnessShell } from '@/components/wellness/shell'
import { TrackingProvider } from '@/components/wellness/tracking-provider'
import { AppLockGate } from '@/components/wellness/app-lock-gate'

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLockGate>
      <TrackingProvider>
        <WellnessShell>{children}</WellnessShell>
      </TrackingProvider>
    </AppLockGate>
  )
}
