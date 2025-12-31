import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    if (session.payment_status === 'paid' && session.customer_email) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const { error } = await supabase.from('paid_users').insert({
        email: session.customer_email.toLowerCase(),
        stripe_customer_id: session.customer as string,
        stripe_payment_id: session.payment_intent as string,
        amount_paid: session.amount_total,
        currency: session.currency
      })

      if (error) {
        console.error('Error saving paid user:', error)
      } else {
        console.log('Pro user added:', session.customer_email)
      }
    }
  }

  return NextResponse.json({ received: true })
}
