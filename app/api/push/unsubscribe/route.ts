import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { preflight } from '@/lib/cors'

/**
 * Removes a push subscription so we stop sending to a dead endpoint.
 *
 * The endpoint string is itself the capability, so knowing it is what
 * authorises deleting it — no additional auth is required or possible here.
 */
export async function POST(req: Request) {
  try {
    const { endpoint } = await req.json()

    if (typeof endpoint !== 'string' || !endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)

    if (error) {
      console.error('Failed to delete push subscription:', error)
      return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing push subscription:', error)
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }
}

/** Preflight for the Android WebView origin. */
export function OPTIONS() {
  return preflight()
}
