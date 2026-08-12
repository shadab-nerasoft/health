import { NextResponse } from 'next/server'
import { getWebPush } from '@/lib/push'

/**
 * Admin/test endpoint for sending a single push notification.
 *
 * This MUST stay authenticated. Unprotected, it is a spam relay: anyone could
 * post their own subscription and payload and send arbitrary notifications
 * signed with our VAPID keys.
 */
export async function POST(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }
    if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subscription, payload } = await req.json()

    if (!subscription?.endpoint || !subscription?.keys || !payload) {
      return NextResponse.json({ error: 'Missing subscription or payload' }, { status: 400 })
    }

    await getWebPush().sendNotification(subscription, JSON.stringify(payload))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending push notification:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
