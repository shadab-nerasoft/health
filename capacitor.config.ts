import type { CapacitorConfig } from '@capacitor/cli'

/**
 * `webDir` points at the static export produced by `CAPACITOR_BUILD=1 next build`
 * (see next.config.mjs). Everything the WebView loads ships inside the APK, so
 * the dashboard boots and counts steps with no network at all.
 */
const config: CapacitorConfig = {
  appId: 'com.gtftechnologies.zsteps',
  appName: 'ZSTEPS',
  webDir: 'mobile-build',
  android: {
    // Keep the WebView on https://localhost so Supabase auth cookies, the
    // existing service worker and localStorage all behave like they do on web.
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
}

export default config
