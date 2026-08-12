import webpush from 'web-push'

/**
 * Configures web-push once for any route that sends notifications.
 * Throws if the VAPID keys are missing so a misconfigured deploy fails loudly
 * instead of silently never delivering notifications.
 */
let configured = false

export function getWebPush() {
  if (!configured) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY

    if (!publicKey || !privateKey) {
      throw new Error('Missing VAPID keys: set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY')
    }

    // The VAPID subject identifies you to push services if delivery goes wrong.
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? 'mailto:shadab@nerasoft.com',
      publicKey,
      privateKey,
    )
    configured = true
  }

  return webpush
}
