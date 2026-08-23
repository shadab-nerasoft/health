# ZSTEPS on Android — native background step counting

This document covers the Capacitor Android target: what it is, how it counts
steps with the screen off, how to build it, and what it does *not* guarantee.

The web app is unchanged in behaviour. `npm run build` still produces the same
Vercel deployment with the same API routes.

---

## 1. Architecture

```
Next.js app (unchanged React UI)
        │
        │  useStepCounter()            ← one hook, two backends
        ├──────────────► browser: useMotionPedometer (DeviceMotion, foreground only)
        │
        └──────────────► Android: StepCounter Capacitor plugin
                                   │
                              StepTracker (SensorManager)
                                   │
                         Sensor.TYPE_STEP_COUNTER  ← hardware, counts with the screen off
                                   │
                              StepStore (SharedPreferences)
                                   │
                         daily totals + 120 days of history
                                   │
                          bridge (read on resume / on event)
                                   │
                        lib/wellness/store.ts (localStorage)
```

### The one idea that makes screen-off counting work

`Sensor.TYPE_STEP_COUNTER` is not a stream the app has to stay awake to consume.
It is a **cumulative counter maintained by the device's sensor hub**. It keeps
incrementing while the screen is off, while the app is backgrounded, and while
the app's process is not running at all. It only resets on reboot.

So nothing has to run in the background to *collect* steps. The app only has to
*read* the counter when it next gets the chance and fold the difference into the
persisted day total. That is why this implementation has:

- no `setInterval`, `setTimeout`, `requestAnimationFrame` or Web Worker
- no Service Worker involvement in counting
- no Page Visibility or Web Sensor API involvement
- no wake lock
- **no mandatory foreground service**

Reads happen at exactly three moments, all event-driven: on mount, when the app
returns to the foreground (`appStateChange`), and when the plugin pushes a
`stepsChanged` event while the UI is actually in front.

---

## 2. What changed in the existing app

Nine files, none of them a rewrite:

| File | Change |
| --- | --- |
| `next.config.mjs` | Added a `CAPACITOR_BUILD=1` branch producing a static export. Web build untouched. |
| `capacitor.config.ts` | New. |
| `package.json` | Capacitor deps + four mobile scripts. |
| `hooks/use-motion-pedometer.ts` | Added an `enabled` option so it stays dormant inside the APK. Logic untouched. |
| `hooks/use-wellness.ts` | Added `backfillSteps()` for days recorded natively while the app was closed. |
| `components/wellness/tracking-provider.tsx` | Now consumes `useStepCounter` instead of `useMotionPedometer` directly. |
| `components/wellness/sensor-panel.tsx` | Native status copy, a settings deep-link for blocked permissions, a background-tracking toggle. Same markup, same classes, same design. |
| `lib/api-base.ts` | New. Points `/api/*` calls at the deployed origin when running in the APK. |
| 4 fetch call sites | Wrapped in `apiUrl(...)`. |

**Nothing else was touched.** Colors, typography, layout, animations, navigation,
cards, dashboard and branding are identical.

New files: `lib/native/step-counter.ts`, `services/step-counter.ts`,
`hooks/use-step-counter.ts`, `scripts/build-mobile.mjs`, and the `android/` project.

### Why a static export, and what it costs

Every page in this app is already `'use client'` (the only exception,
`auth/sign-up-success`, is static), and no page reads data on the server. So the
whole UI exports cleanly to static HTML that ships inside the APK — the app opens
and counts steps with no network at all.

The mobile build sets `pageExtensions: ['tsx']`, which drops every `route.ts`
from the export. All pages/layouts are `.tsx`, so this removes the server-only
code without touching the app tree. The APK reaches those endpoints over the
network instead:

```
NEXT_PUBLIC_API_BASE_URL=https://your-app.vercel.app
```

Only the AI coach, meal plan, nudge and web-push endpoints need it. Steps,
storage, goals, water and the dashboard all work offline.

---

## 3. The data model

`StepStore` (SharedPreferences, `zsteps_step_counter`):

| Key | Meaning |
| --- | --- |
| `sensorTotal` | Last observed raw `TYPE_STEP_COUNTER` value |
| `dayBaseline` | Sensor value when the current day opened |
| `daySteps` | **Accumulated** steps credited to `dayKey` |
| `dayKey` | Local calendar day, `yyyy-MM-dd` |
| `bootReference` | `currentTimeMillis - elapsedRealtime`, used to detect reboots |
| `lastUpdated` | Wall clock of the last reading |
| `trackingStartDate` | First day tracking was switched on |
| `history` | `{ "2026-08-22": 8412, ... }`, trimmed to 120 days |
| `lastEvent` | Diagnostic label for the last reading |

### Why an accumulator instead of `sensorTotal - baseline`

`currentSteps = sensorTotal - baselineSteps` is the right mental model but the
wrong implementation: it breaks the moment the counter resets underneath the
baseline. `daySteps` is instead advanced by each observed delta, so a reboot or
a vendor sensor reset costs at most the steps in that one gap rather than
corrupting the whole day. `dayBaseline` is still stored and re-anchored, because
it is what makes the first reading of a new day mean something.

`recordSensorTotal()` handles, in order:

1. **First reading ever** → establish the baseline, credit nothing.
2. **Reboot detected** → the counter restarted at zero, so `total` is steps
   since boot. Credit them only if the device booted *today*; otherwise the
   post-boot count spans days that cannot be split, and it undercounts rather
   than inventing steps for today.
3. **Counter went backwards** → vendor sensor reset. Re-anchor, credit nothing.
4. **Implausible jump** (> 25,000 in one delta) → dropped as a glitch.
5. **Normal delta** → credited.

---

## 4. Daily reset

The physical sensor is never reset — only the app-level day baseline moves.

```
Monday   sensor 52,430   baseline 50,000   →  2,430 today
Tuesday  sensor 53,800   baseline 52,430   →  1,370 today
```

Two mechanisms keep the boundary honest:

**Lazy roll.** Every read calls `rollIfNeeded()`, which compares the current
local calendar day to the stored one. If it changed, the old day is archived to
`history`, the baseline moves to the current sensor total, and the accumulator
resets. This is correct whenever the user opens the app, and it is what makes
timezone changes and manual clock changes work — the day key is always computed
from the *current* default timezone.

**Midnight alarm.** `StepEventReceiver` is woken by an `AlarmManager` alarm just
after local midnight, takes one sensor reading, closes yesterday at the right
number, and arms tomorrow's alarm.

The alarm is deliberately **inexact** (`setAndAllowWhileIdle`, not
`setExactAndAllowWhileIdle`). Exact alarms need `SCHEDULE_EXACT_ALARM`, which
Play restricts to alarm-clock-style apps, and a few minutes of slack at 00:00
costs at most a handful of steps.

**Travelling west** (or a clock rollback) can land the app back on a day it
already archived. `rollIfNeeded` detects this and resumes that day's total
instead of zeroing it.

---

## 5. Permissions

| State | What the UI shows |
| --- | --- |
| `prompt` | "Permission needed" + **Allow activity access** |
| `granted` | "Counting steps" |
| `denied` | "Activity access denied" + **Allow activity access** (asks again) |
| `blocked` | "Activity access blocked" + **Open settings** (deep-links to app info) |
| sensor missing | "No step counter" + manual entry |

`blocked` is derived from `shouldShowRequestPermissionRationale() == false`
*after* a request has been made — the store records whether the app has ever
asked, because that call also returns false before the first prompt.

Permission revoked while the app is backgrounded is picked up on the next
resume, because `handleOnResume` re-reads the live permission state rather than
trusting a cached flag. Nothing fails silently: every state has copy and, where
recovery is possible, a button.

`ACTIVITY_RECOGNITION` is a runtime permission from Android 10 (API 29). Below
that it is auto-granted and the native layer short-circuits the check.

---

## 6. Background execution and the optional foreground service

**There is no foreground service by default, and screen-off counting does not
need one.** The hardware counter does the work.

`StepCounterService` exists, is off by default, and is opt-in from the sensor
panel. Turn it on only if the app needs to *react* to steps while it is closed:

- live goal / streak notifications without the user opening the app
- exact day boundaries on devices whose battery management suppresses the
  inexact midnight alarm

If enabled:

- **Foreground service type** `health` (`FOREGROUND_SERVICE_HEALTH`), which is
  the correct type for step tracking on Android 14+.
- **Notification channel** `zsteps_step_tracking`, `IMPORTANCE_LOW`, created
  before `startForeground`.
- **Persistent notification** showing today's total. It is visible and ongoing —
  the background process is never hidden from the user.
- **Battery**: sensor events are batched at a five-minute report latency, so the
  CPU wakes a handful of times an hour rather than on every footfall. Still,
  a resident process costs more than not having one.
- **Play Store**: shipping a `health` foreground service requires a declaration
  in Play Console with a stated justification and, in practice, a demo video.
  Because the feature is opt-in and off by default, you can also ship without
  ever enabling it and skip that review entirely.

---

## 7. Offline behaviour and sync

```
Native sensor → SharedPreferences → bridge → localStorage → React UI
```

None of that path touches the network. Internet is only needed to push totals to
Supabase.

`getHistory({ days })` returns per-day totals the native layer recorded while the
app was closed, and `backfillSteps()` writes them into the web store keyed by
date. Because both sides key on the local `yyyy-MM-dd` date and the write is an
**overwrite, not an increment**, replaying the same history is idempotent — no
duplicate step records, however many times a sync runs.

`daily_activity` in Supabase already upserts on `(user_id, date)`, so the same
property holds server-side.

---

## 8. Security

- The native layer is the source of truth on Android. **The bridge has no
  method that lets JavaScript write a step count.** The only inputs are a
  `YYYY-MM-DD` string (regex-validated), a day count (clamped to 1–120) and a
  boolean (rejected if not a boolean).
- No sensitive Android API is exposed — no raw SensorManager handle, no file
  access, no arbitrary intent launching. `openSettings` opens this app's own
  settings page and nothing else.
- No credentials are baked into the APK. Only `NEXT_PUBLIC_*` values are
  inlined, exactly as on the web. `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`
  and `VAPID_PRIVATE_KEY` stay server-side, which is why the AI and push
  endpoints are called over the network rather than reimplemented in the app.
- Auth tokens live in the WebView's own storage for `https://localhost`, private
  to the app sandbox — the same handling as the web app, not a new store.
- `android/keystore.properties` is gitignored, and the release build stays
  unsigned if it is missing rather than silently falling back to a debug key.

---

## 9. Health Connect — evaluated, deliberately not added

**Recommendation: do not add it for this app's current requirement.**

The stated requirement is "keep counting when the screen is off". `TYPE_STEP_COUNTER`
satisfies that completely, with no extra dependency, no extra permission
dialog, no Play Store health-data declaration, and no failure mode when the
Health Connect app is absent.

Health Connect would earn its place if you later want:

- **historical steps from before install** — the raw sensor cannot provide this;
  Health Connect can read back what other apps have written
- **cross-device / cross-app data** — steps from a watch, Fitbit, Samsung Health
- **writing** ZSTEPS steps into the Android health ecosystem
- **deduplication** against another tracker on the same phone

If you do add it, keep it as a *separate* abstraction behind the same
`services/step-counter.ts` facade — an enrichment source, not a replacement.
The app must not become dependent on it.

What it would cost:

- Permissions `android.permission.health.READ_STEPS` and, to write,
  `WRITE_STEPS`, granted through Health Connect's own consent screen rather
  than the standard runtime dialog.
- Android 14+ ships Health Connect in the platform. Android 9–13 requires the
  user to install the Health Connect app from Play; on Android 8 and below it
  does not exist at all (this project's `minSdk` is 24).
- A Play Console health-data declaration and privacy-policy review.
- Availability must be checked at runtime (`HealthConnectClient.getSdkStatus`)
  with a graceful degrade to the sensor-only path — which is exactly what the
  app already does today.

---

## 10. Build and run

### Development

```bash
npm install
npm run build:mobile        # static export → mobile-build/
npx cap sync android        # copy assets + plugins into android/
npx cap open android        # launch Android Studio
```

Or all three at once:

```bash
npm run android
```

Then in Android Studio: **Run ▸ app** with a device connected (USB debugging on).

To point the APK at your deployed API, set `NEXT_PUBLIC_API_BASE_URL` before
`build:mobile` — see `.env.mobile.example`.

> Re-run `npm run sync:android` after **every** web change. The APK serves a
> copied snapshot of `mobile-build/`; editing React alone changes nothing on the
> device.

### Debug APK

```bash
cd android
./gradlew assembleDebug          # Windows: gradlew.bat assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Or Android Studio: **Build ▸ Build Bundle(s) / APK(s) ▸ Build APK(s)**.

**A debug APK is not suitable for production.** It is signed with the shared
Android debug key, is debuggable, is not minified, and cannot be uploaded to
Play.

### Signed release APK

1. Create a keystore (once, and back it up — losing it means you can never
   update the app on Play):

   ```bash
   keytool -genkey -v -keystore zsteps-release.jks \
     -keyalg RSA -keysize 2048 -validity 10000 -alias zsteps
   ```

2. Copy `android/keystore.properties.example` to `android/keystore.properties`
   and fill it in. It is gitignored.

3. Build:

   ```bash
   cd android
   ./gradlew assembleRelease      # → app/build/outputs/apk/release/app-release.apk
   ./gradlew bundleRelease        # → app/build/outputs/bundle/release/app-release.aab  (Play upload format)
   ```

Without `keystore.properties`, `assembleRelease` produces an **unsigned** APK
that will refuse to install — deliberately loud rather than silently shipping a
debug key.

Verify before shipping:

```bash
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --print-certs \
  android/app/build/outputs/apk/release/app-release.apk
```

Bump `versionCode` and `versionName` in `android/app/build.gradle` for each
release.

---

## 11. Test matrix

Run on a **real device**. Emulators do not have a real step counter — the
Extended Controls "Virtual sensors" panel can inject values, which is enough for
plumbing but proves nothing about screen-off behaviour.

| # | Scenario | Expected |
| --- | --- | --- |
| 1 | App open, walk 50 steps | Total rises live |
| 2 | **Start tracking, lock screen, walk 200 steps, unlock, open app** | **Total includes all 200** — the critical test |
| 3 | Minimise (Home), walk, reopen | Total includes the walk |
| 4 | Force-stop from Settings, walk, reopen | Total includes the walk |
| 5 | Reboot, walk, open app | Steps since boot credited; no negative or absurd jump |
| 6 | Reboot at 23:50, walk after midnight, open next evening | Yesterday intact; today conservative (see limitations) |
| 7 | Deny permission at the prompt | "Activity access denied" + retry button; no silent failure |
| 8 | Deny twice / "Don't allow" | "Activity access blocked" + **Open settings** |
| 9 | Revoke permission in Settings while backgrounded, return | State flips to denied/blocked on resume |
| 10 | Device with no step counter | "No step counter" + manual entry; app still usable |
| 11 | Cross local midnight with the app closed | Yesterday archived, today starts near zero |
| 12 | Change device timezone (e.g. +8h) | Day key follows local time; no total lost |
| 13 | Set date forward a day, then back | Forward archives; back resumes the archived total |
| 14 | Airplane mode, walk, reopen | Counting unaffected |
| 15 | Restore connectivity | Sync runs once; no duplicate day records |
| 16 | Battery saver on, screen off, walk 30 min | Total reconciles on open (may lag until then) |
| 17 | Two walks 6h apart, screen off throughout | Both included |
| 18 | Enable background tracking | Persistent notification appears and updates |
| 19 | Disable background tracking | Notification disappears; counting continues |
| 20 | Android 12, 13, 14, 15, 16 | Permission flow, FGS type and alarm behaviour all correct |
| 21 | Same build in Chrome on desktop | Falls back to DeviceMotion; no bridge errors |
| 22 | Same build as an installed PWA | Unchanged from today's behaviour |

For #2, the honest check is a stopwatch and a counted walk — compare against the
phone's own step count in Google Fit or Samsung Health over the same window.

---

## 12. Known limitations

**Verified by construction:** Android's sensor APIs provide step-count data
independently of browser JavaScript execution. `TYPE_STEP_COUNTER` is maintained
in hardware and survives the screen being off and the process being killed. This
is the documented contract of the API.

**Not yet verified:** this specific build has **not been run on a physical
Android device**. This machine has the Android SDK but no JDK and no Android
Studio, so the Java has not been compiled and no APK has been produced. Treat
test #2 as *unproven until you run it*.

**Do not claim** that any Android phone will count steps perfectly. Real
constraints:

- **Hardware.** Some devices have no step counter at all. Some implement it in
  software on the application processor, where it stops during deep sleep. The
  app detects absence and degrades to manual entry, but it cannot detect a
  low-quality implementation.
- **Vendor battery management.** Xiaomi, Huawei, Oppo, Vivo and Samsung apply
  aggressive app-freezing beyond stock Doze. This does not stop the hardware
  counter, but it can suppress the midnight alarm — which shifts a day boundary,
  not the total. Users on these devices should exempt ZSTEPS from battery
  optimisation.
- **Reboot spanning days.** If the phone reboots on Monday and the app is not
  opened until Tuesday evening, the post-boot count covers both days and cannot
  be split. The app credits nothing for that gap rather than inflating Tuesday.
  The midnight alarm normally prevents this; enabling background tracking
  removes it entirely.
- **Accuracy.** Vendor step algorithms differ. Expect a few percent divergence
  from Google Fit on the same phone, and more from a wrist tracker.
- **Distance and calories** remain estimates derived from step count and a fixed
  0.762 m stride, exactly as on the web. Native step counting does not make them
  measurements.
- **Web push in the APK.** The WebView has no push service, so `sw.js` push
  subscription will not work inside the app. In-app notifications and the
  existing alarm system are unaffected. Delivering push to the APK properly
  means FCM and `@capacitor/push-notifications`, which is out of scope here.
- **OAuth sign-in** is not wired for the native shell. Email/password (what the
  app uses today) works unchanged.
