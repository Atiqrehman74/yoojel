import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })
  const body = await req.text()
  const sig  = headers().get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id
    const email = session.customer_details?.email ?? session.customer_email ?? undefined
    const update = {
      plan: 'pro',
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
    }
    if (userId) {
      const { error } = await supabase.from('profiles').update(update).eq('id', userId)
      if (error) console.error('Stripe webhook: failed to upgrade by user_id', userId, error)
    } else if (email) {
      const { error } = await supabase.from('profiles').update(update).eq('email', email)
      if (error) console.error('Stripe webhook: failed to upgrade by email fallback', email, error)
    } else {
      console.error('Stripe webhook: checkout.session.completed has no user_id metadata and no email — cannot upgrade', session.id)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    await supabase.from('profiles')
      .update({ plan: 'free', stripe_subscription_id: null })
      .eq('stripe_customer_id', sub.customer as string)
  }

  return NextResponse.json({ received: true })
}
