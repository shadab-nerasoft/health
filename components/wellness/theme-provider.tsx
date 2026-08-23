'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { useEffect } from 'react'
import type { ComponentProps } from 'react'
import { applyDynamicColor } from '@/lib/native/dynamic-color'

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  // Material You: on Android 12+ the system palette overwrites the generated
  // brand tones. Runs once, before paint settles, and no-ops everywhere else.
  useEffect(() => {
    void applyDynamicColor()
  }, [])

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
