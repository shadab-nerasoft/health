import Link from 'next/link'
import type { Metadata } from 'next'
import { AppLogo } from '@/components/wellness/app-logo'

/**
 * Android download page.
 *
 * The APK URL comes from NEXT_PUBLIC_ANDROID_APK_URL so the binary can live
 * wherever you host it — a GitHub release, Vercel Blob, object storage — rather
 * than being committed into this repo. With the variable unset the page still
 * renders and says so, instead of offering a dead link.
 */
export const metadata: Metadata = {
  title: 'Get ZSTEPS for Android',
  description: 'Download the ZSTEPS Android app for step tracking that keeps counting with the screen off.',
}

const apkUrl = process.env.NEXT_PUBLIC_ANDROID_APK_URL ?? ''
const version = process.env.NEXT_PUBLIC_ANDROID_VERSION ?? '1.0'

const features = [
  {
    title: 'Counts with the screen off',
    body: 'Uses Android’s hardware step counter, so walking still counts while your phone is locked or the app is closed.',
  },
  {
    title: 'Works offline',
    body: 'The whole dashboard ships inside the app. Steps, water and goals all work with no connection, and sync when one returns.',
  },
  {
    title: 'Home screen widget',
    body: 'Today’s steps and goal progress, without opening the app.',
  },
  {
    title: 'Material You',
    body: 'Picks up your wallpaper colours on Android 12 and above.',
  },
]

export default function DownloadPage() {
  return (
    <main className="download-shell">
      <div className="download-hero">
        <span className="download-mark">
          <AppLogo size="34" color="currentColor" />
        </span>
        <p className="eyebrow">Android app</p>
        <h1>ZSTEPS for Android</h1>
        <p className="subheading">
          Step tracking that does not stop when your screen does. Version {version}.
        </p>

        {apkUrl ? (
          <a className="download-button" href={apkUrl} download>
            Download APK
          </a>
        ) : (
          <p className="download-pending">
            The download link is not configured yet. Set <code>NEXT_PUBLIC_ANDROID_APK_URL</code> to the hosted
            APK and redeploy.
          </p>
        )}

        <Link href="/" className="download-secondary">
          Or keep using the web app
        </Link>
      </div>

      <section className="download-features">
        {features.map((feature) => (
          <article key={feature.title}>
            <h2>{feature.title}</h2>
            <p>{feature.body}</p>
          </article>
        ))}
      </section>

      <section className="download-steps">
        <h2>Installing</h2>
        <ol>
          <li>Tap <strong>Download APK</strong> above.</li>
          <li>Open the downloaded file from your notifications or Files app.</li>
          <li>
            Android will ask permission to <strong>install unknown apps</strong> for your browser — allow it. This
            is normal for apps installed outside the Play Store.
          </li>
          <li>Tap <strong>Install</strong>, then open ZSTEPS and allow <strong>Physical activity</strong> access.</li>
        </ol>
        <p className="download-note">
          Requires Android 7.0 or later, and a device with a step counter sensor. Most phones from the last decade
          have one; the app tells you plainly if yours does not.
        </p>
      </section>
    </main>
  )
}
