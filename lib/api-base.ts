import { Capacitor } from '@capacitor/core'

/**
 * Resolves the app's own API routes.
 *
 * On the web the app and its `/api/*` handlers share an origin, so relative
 * paths just work. The Android build is a static export loaded from
 * https://localhost inside the WebView — there is no server behind it — so those
 * same calls have to be pointed at the deployed origin.
 *
 * Set NEXT_PUBLIC_API_BASE_URL at build time for the APK:
 *   NEXT_PUBLIC_API_BASE_URL=https://your-app.vercel.app npm run build:mobile
 *
 * Only the AI and push endpoints go through here. Step counting, storage and
 * the whole dashboard work with no network at all.
 */
const configuredBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '')

export function apiUrl(path: `/${string}`) {
  if (typeof window === 'undefined') return path
  if (!Capacitor.isNativePlatform()) return path
  return configuredBase ? `${configuredBase}${path}` : path
}

/** False in the APK when no API origin was baked in, so callers can skip cleanly. */
export function hasRemoteApi() {
  if (typeof window === 'undefined') return true
  if (!Capacitor.isNativePlatform()) return true
  return configuredBase.length > 0
}
