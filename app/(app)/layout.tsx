import { WellnessShell } from '@/components/wellness/shell'
import { TrackingProvider } from '@/components/wellness/tracking-provider'

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <TrackingProvider>
      <WellnessShell>{children}</WellnessShell>
    </TrackingProvider>
  )
}
