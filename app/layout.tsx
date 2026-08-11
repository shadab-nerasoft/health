import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Google_Sans, Google_Sans_Flex } from 'next/font/google'
import { ThemeProvider } from '@/components/wellness/theme-provider'
import './globals.css'

const googleSans = Google_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
  adjustFontFallback: false,
  display: 'swap',
})

const googleSansFlex = Google_Sans_Flex({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  adjustFontFallback: false,
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'wellnest — Personal wellness dashboard',
  description: 'A calm, personal activity and wellness dashboard for building better daily movement habits.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
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
      className={`bg-background ${googleSans.variable} ${googleSansFlex.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased font-sans">
        <ThemeProvider>
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
