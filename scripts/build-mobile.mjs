/**
 * Produces the static export the Android APK ships.
 *
 * Exists so the same command works in PowerShell, cmd and bash — `VAR=1 next
 * build` is bash-only, and this repo is developed on Windows.
 *
 * Optionally point the APK at your deployed API (only the AI and push endpoints
 * need it; step counting and the dashboard work offline):
 *
 *   NEXT_PUBLIC_API_BASE_URL=https://your-app.vercel.app
 */
import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'

const OUT_DIR = 'mobile-build'

/**
 * Files under public/ that must not travel inside the app.
 *
 * public/downloads holds the APK the website offers. Next copies public/ into
 * the export verbatim, so without this the APK would be packaged inside itself
 * — each build roughly doubling its own size.
 */
const EXCLUDE_FROM_APP = ['downloads']

const result = spawnSync('npx', ['next', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, CAPACITOR_BUILD: '1' },
})

if (result.error) {
  console.error(result.error)
  process.exit(1)
}
if (result.status !== 0) process.exit(result.status ?? 1)

for (const entry of EXCLUDE_FROM_APP) {
  rmSync(`${OUT_DIR}/${entry}`, { recursive: true, force: true })
  console.log(`Excluded ${entry}/ from the app bundle.`)
}
