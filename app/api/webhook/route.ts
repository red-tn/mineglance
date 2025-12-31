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
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

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

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Handle checkout.session.completed (primary method)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    if (session.payment_status === 'paid' && session.customer_email) {
      await savePaidUser(supabase, {
        email: session.customer_email,
        customerId: session.customer as string,
        paymentId: session.payment_intent as string,
        amount: session.amount_total || 2900,
        currency: session.currency || 'usd',
        plan: (session.metadata?.plan as 'pro' | 'bundle') || 'pro'
      })
    }
  }

  // Handle charge.succeeded (backup for Payment Links)
  if (event.type === 'charge.succeeded') {
    const charge = event.data.object as Stripe.Charge

    if (charge.paid && charge.billing_details?.email) {
      // Determine plan from amount
      const plan = charge.amount >= 5900 ? 'bundle' : 'pro'

      await savePaidUser(supabase, {
        email: charge.billing_details.email,
        customerId: charge.customer as string || null,
        paymentId: charge.payment_intent as string,
        amount: charge.amount,
        currency: charge.currency,
        plan
      })
    }
  }

  return NextResponse.json({ received: true })
}

async function savePaidUser(supabase: ReturnType<typeof createClient>, data: {
  email: string
  customerId: string | null
  paymentId: string
  amount: number
  currency: string
  plan: 'pro' | 'bundle'
}) {
  // Check if user already exists
  const { data: existing } = await supabase
    .from('paid_users')
    .select('id, plan')
    .eq('email', data.email.toLowerCase())
    .single()

  if (existing) {
    // If upgrading from pro to bundle, update the record
    if (existing.plan === 'pro' && data.plan === 'bundle') {
      const { error } = await supabase
        .from('paid_users')
        .update({
          plan: 'bundle',
          amount_paid: data.amount,
          stripe_payment_id: data.paymentId,
          updated_at: new Date().toISOString()
        })
        .eq('email', data.email.toLowerCase())

      if (error) {
        console.error('Error upgrading user:', error)
      } else {
        console.log('User upgraded to bundle:', data.email)
      }
    } else {
      console.log('User already exists:', data.email)
    }
    return
  }

  const { error } = await supabase.from('paid_users').insert({
    email: data.email.toLowerCase(),
    stripe_customer_id: data.customerId,
    stripe_payment_id: data.paymentId,
    amount_paid: data.amount,
    currency: data.currency,
    plan: data.plan
  })

  if (error) {
    console.error('Error saving paid user:', error)
  } else {
    console.log('Pro user added:', data.email, '- Plan:', data.plan)
  }
}
