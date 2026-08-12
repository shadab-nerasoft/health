import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWebPush } from '@/lib/push'

export async function GET(request: Request) {
  try {
    // 1. Verify this request is actually coming from Vercel Cron.
    // Fail CLOSED: without CRON_SECRET this endpoint would let anyone on the
    // internet fire a push blast at every subscriber, so refuse to run at all.
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error('CRON_SECRET is not set; refusing to run the daily routine.')
      return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }
    if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // 2. Fetch all active push subscriptions from the database
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
    
    if (error) throw error

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No subscriptions found' })
    }

    // 3. Define the notification payload
    const payload = JSON.stringify({
      title: 'Time for your Daily Routine! 🏃‍♂️',
      body: 'Take a moment for your health. Open ZSTEPS to complete your daily goals.',
      url: '/', // You can change this to your routine specific page
      icon: '/icon.svg',
    })

    // 4. Send the notification to all subscribers
    const webpush = getWebPush()
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth,
            p256dh: sub.p256dh,
          }
        }
        
        try {
          await webpush.sendNotification(pushSubscription, payload)
        } catch (err: any) {
          // If the subscription is no longer valid (e.g. user revoked permission)
          // it returns a 410 Gone or 404 Not Found error. 
          // In a production app, we would delete the subscription from Supabase here.
          if (err.statusCode === 404 || err.statusCode === 410) {
            console.log('Subscription expired, deleting endpoint:', sub.endpoint)
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          } else {
            throw err
          }
        }
      })
    )

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Error running daily routine cron:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
