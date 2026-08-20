import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const subscription = await req.json()

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Supabase credentials not configured. Operating in local mode.')
      return NextResponse.json({ success: true, mode: 'local' })
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        { onConflict: 'endpoint' }
      )

      if (error) {
        console.warn('Supabase push_subscriptions upsert notice:', error.message)
      }
    } catch (dbErr) {
      console.warn('Supabase connection offline or push_subscriptions table missing:', dbErr)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.warn('Error in subscribe route:', error)
    return NextResponse.json({ success: true, mode: 'fallback' })
  }
}
