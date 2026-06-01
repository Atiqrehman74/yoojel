import Stripe from 'stripe'
import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_1TddAhJG9rRK9s1lnHnMctNv'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const origin = req.headers.get('origin') ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    customer_email: user.email,
    metadata: { user_id: user.id },
    success_url: `${origin}/?success=true`,
    cancel_url:  `${origin}/?canceled=true`,
  })

  return NextResponse.json({ url: session.url })
}
