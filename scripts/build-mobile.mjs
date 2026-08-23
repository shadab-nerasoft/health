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

const result = spawnSync('npx', ['next', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, CAPACITOR_BUILD: '1' },
})

if (result.error) {
  console.error(result.error)
  process.exit(1)
}
process.exit(result.status ?? 1)
