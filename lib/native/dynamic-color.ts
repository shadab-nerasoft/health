import { registerPlugin } from '@capacitor/core'
import { isNativeApp } from '@/services/step-counter'

/**
 * Applies Android's Material You palette to the M3 token layer.
 *
 * material3.css generates every tone in oklch from a hue and chroma, which is
 * what the web and pre-Android-12 devices use. When the system does have a
 * dynamic palette, its exact tones are written over those variables instead —
 * so the app picks up the user's wallpaper colours and matches the rest of
 * their device rather than approximating it.
 *
 * Everything downstream (containers, surfaces, outlines, both themes) is defined
 * in terms of those tone variables, so nothing else has to know this happened.
 */

type Tones = Record<string, string>

type Palette = {
  supported: boolean
  primary?: Tones
  secondary?: Tones
  tertiary?: Tones
  neutral?: Tones
  neutralVariant?: Tones
}

interface DynamicColorPlugin {
  getPalette(): Promise<Palette>
}

const DynamicColor = registerPlugin<DynamicColorPlugin>('DynamicColor', {
  web: () => ({ getPalette: async () => ({ supported: false }) }),
})

/** Tone variables material3.css defines, per palette. */
const VARIABLE_PREFIX: Record<keyof Omit<Palette, 'supported'>, string> = {
  primary: '--m3-primary-',
  secondary: '--m3-secondary-',
  tertiary: '--m3-tertiary-',
  neutral: '--m3-neutral-',
  neutralVariant: '--m3-nv-',
}

const HEX = /^#[0-9a-f]{6}$/i

function applyPalette(name: keyof typeof VARIABLE_PREFIX, tones: Tones | undefined) {
  if (!tones) return
  const prefix = VARIABLE_PREFIX[name]
  const root = document.documentElement
  for (const [tone, value] of Object.entries(tones)) {
    // The bridge is a trust boundary like any other; only write real hex.
    if (!/^\d{1,3}$/.test(tone) || !HEX.test(value)) continue
    root.style.setProperty(`${prefix}${tone}`, value)
  }
}

/**
 * The neutral ramp needs tones material3.css uses that Android does not publish
 * (4, 6, 12, 17, 22, 24, 87, 92, 94, 96, 98). They are interpolated from the
 * nearest published tones so dark surface containers stay correctly stepped.
 */
const NEUTRAL_INTERPOLATED: Array<[number, number, number]> = [
  // [target tone, lower published tone, upper published tone]
  [4, 0, 10],
  [6, 0, 10],
  [12, 10, 20],
  [17, 10, 20],
  [22, 20, 30],
  [24, 20, 30],
  [87, 80, 90],
  [92, 90, 95],
  [94, 90, 95],
  [96, 95, 99],
  [98, 95, 99],
]

function mix(lower: string, upper: string, ratio: number) {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
  const [r1, g1, b1] = parse(lower)
  const [r2, g2, b2] = parse(upper)
  const channel = (a: number, b: number) => Math.round(a + (b - a) * ratio)
  return `#${[channel(r1, r2), channel(g1, g2), channel(b1, b2)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`
}

function fillNeutralGaps(tones: Tones | undefined) {
  if (!tones) return
  const root = document.documentElement
  for (const [target, lower, upper] of NEUTRAL_INTERPOLATED) {
    const from = tones[String(lower)]
    const to = tones[String(upper)]
    if (!from || !to || !HEX.test(from) || !HEX.test(to)) continue
    const ratio = (target - lower) / (upper - lower)
    root.style.setProperty(`--m3-neutral-${target}`, mix(from, to, ratio))
  }
}

/**
 * Reads the system palette and applies it. No-op on web and on Android below
 * 12, where the oklch-generated brand palette stays in place.
 *
 * @returns whether a dynamic palette was applied
 */
export async function applyDynamicColor(): Promise<boolean> {
  if (typeof document === 'undefined' || !isNativeApp()) return false
  try {
    const palette = await DynamicColor.getPalette()
    if (!palette.supported) return false

    applyPalette('primary', palette.primary)
    applyPalette('secondary', palette.secondary)
    applyPalette('tertiary', palette.tertiary)
    applyPalette('neutral', palette.neutral)
    applyPalette('neutralVariant', palette.neutralVariant)
    fillNeutralGaps(palette.neutral)

    document.documentElement.dataset.dynamicColor = 'on'
    return true
  } catch {
    // A missing plugin or an unexpected payload must never break theming.
    return false
  }
}
