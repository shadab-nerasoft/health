/**
 * Two build targets share one codebase:
 *
 *  - Web / Vercel (default): server rendering + the `app/api/*` route handlers.
 *  - Capacitor Android (`CAPACITOR_BUILD=1`): a fully static export in `out/`
 *    that the WebView loads from the APK, so the app boots with no network.
 *
 * The mobile target drops every `.ts` route file via `pageExtensions` — all
 * pages/layouts in this project are `.tsx`, and every API route handler is
 * `route.ts`, so this cleanly removes server-only code from the export without
 * touching the app tree. The APK talks to the deployed API over
 * NEXT_PUBLIC_API_BASE_URL instead (see lib/api-base.ts).
 */
const isCapacitorBuild = process.env.CAPACITOR_BUILD === '1'

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  ...(isCapacitorBuild
    ? {}
    : {
        // `page.web.tsx` marks a route as web-only. The mobile target below
        // lists only 'tsx', so those files are simply not routes there — which
        // is how the admin dashboard (needs a server) and the Android download
        // page (pointless inside the app) stay out of the APK.
        pageExtensions: ['web.tsx', 'tsx', 'ts', 'jsx', 'js'],

        // The APK's WebView serves the UI from https://localhost, so its calls
        // to this deployment are cross-origin. Only that one origin is allowed,
        // and credentials are not: these routes authenticate server-side or not
        // at all, so no cookie needs to cross. Not applied to the static export,
        // which has no server to send headers.
        async headers() {
          return [
            {
              // Without an explicit type some browsers try to render the APK
              // instead of saving it, which surfaces as a failed download.
              source: '/downloads/zsteps.apk',
              headers: [
                { key: 'Content-Type', value: 'application/vnd.android.package-archive' },
                { key: 'Content-Disposition', value: 'attachment; filename="zsteps.apk"' },
                { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
              ],
            },
            {
              source: '/api/:path*',
              headers: [
                { key: 'Access-Control-Allow-Origin', value: 'https://localhost' },
                { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
                { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
                { key: 'Vary', value: 'Origin' },
              ],
            },
          ]
        },
      }),
  ...(isCapacitorBuild
    ? {
        output: 'export',
        // Capacitor's local asset server resolves directories to index.html,
        // so every route needs its own folder rather than a flat `x.html`.
        trailingSlash: true,
        distDir: 'mobile-build',
        pageExtensions: ['tsx'],
      }
    : {}),
}

export default nextConfig
