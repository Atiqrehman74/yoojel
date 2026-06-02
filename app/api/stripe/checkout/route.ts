import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_1TddAhJG9rRK9s1lnHnMctNv'

export async function POST(req: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!stripeKey) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY not set in Vercel env vars' }, { status: 500 })
    }

    // Get user from Authorization header token
    let userEmail = ''
    let userId = ''
    if (supabaseUrl && serviceKey) {
      const token = req.headers.get('authorization')?.replace('Bearer ', '')
      if (token) {
        const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
        const { data: { user } } = await admin.auth.getUser(token)
        if (user) { userEmail = user.email ?? ''; userId = user.id }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripe = new Stripe(stripeKey, { apiVersion: '2026-05-27.dahlia' as any })
    const origin = req.headers.get('origin') ?? 'https://yoojel.com'

    // Use price_data to define the recurring price inline (avoids one-time vs recurring mismatch)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: 500, // $5.00
          recurring: { interval: 'month' },
          product_data: { name: 'Yoojel Pro', description: 'Unlimited chats, web search & more.' },
        },
        quantity: 1,
      }],
      ...(userEmail ? { customer_email: userEmail } : {}),
      ...(userId ? { metadata: { user_id: userId } } : {}),
      success_url: `${origin}/?success=true`,
      cancel_url:  `${origin}/?canceled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
