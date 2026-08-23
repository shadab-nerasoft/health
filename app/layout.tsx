import type { Metadata, Viewport } from 'next'
import { DM_Sans, Outfit } from 'next/font/google'
import { ThemeProvider } from '@/components/wellness/theme-provider'
import { InstallPrompt } from '@/components/wellness/install-prompt'
import { SplashScreen } from '@/components/wellness/splash-screen'
import { ServiceWorkerRegister } from '@/components/wellness/service-worker-register'
import './globals.css'
import './material3.css'
import './m3-components.css'
import './lock.css'
import './web-pages.css'

const sansFont = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const displayFont = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ZSTEPS — Personal wellness dashboard',
  description: 'A calm, personal activity and wellness dashboard for building better daily movement habits.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/app-logo.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    shortcut: '/app-logo.svg',
    apple: '/app-logo.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6f3' },
    { media: '(prefers-color-scheme: dark)', color: '#14151a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`bg-background ${sansFont.variable} ${displayFont.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased font-sans" suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <SplashScreen />
          <InstallPrompt />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  )
}

