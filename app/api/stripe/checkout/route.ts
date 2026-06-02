import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_1TddAhJG9rRK9s1lnHnMctNv'

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!stripeKey) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

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

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-05-27.dahlia' as any })
  const origin = req.headers.get('origin') ?? 'https://yoojel.com'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    ...(userEmail ? { customer_email: userEmail } : {}),
    ...(userId ? { metadata: { user_id: userId } } : {}),
    success_url: `${origin}/?success=true`,
    cancel_url:  `${origin}/?canceled=true`,
  })

  return NextResponse.json({ url: session.url })
}
