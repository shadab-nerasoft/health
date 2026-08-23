/**
 * CORS for the Android app.
 *
 * The APK loads its UI from `https://localhost` inside the WebView, so calls to
 * the deployed API are cross-origin and need an explicit allow. Only that one
 * origin is permitted, and credentials are deliberately NOT allowed — these
 * routes authenticate server-side (service role) or not at all, so no cookie
 * ever needs to cross the boundary.
 *
 * The response headers themselves are applied in next.config.mjs for
 * `/api/:path*`. This module only handles the preflight, which needs a real
 * 2xx response rather than the 405 an undefined method would return.
 */

/** Matches `server.androidScheme: 'https'` in capacitor.config.ts. */
export const APP_ORIGIN = 'https://localhost'

export function preflight() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': APP_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    },
  })
}
