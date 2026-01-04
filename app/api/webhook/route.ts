import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Generate a unique license key: XXXX-XXXX-XXXX-XXXX (alphanumeric)
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I, O, 0, 1 to avoid confusion
  const segments = []
  for (let s = 0; s < 4; s++) {
    let segment = ''
    for (let i = 0; i < 4; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    segments.push(segment)
  }
  return segments.join('-')
}

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

    // Get email from customer_email OR customer_details.email (Payment Links use the latter)
    const customerEmail = session.customer_email || session.customer_details?.email

    if (session.payment_status === 'paid' && customerEmail) {
      const amount = session.amount_total || 0

      console.log('Processing checkout:', {
        email: customerEmail,
        amount,
        productId: session.metadata?.product_id
      })

      await handleNewPurchase(supabase, {
        email: customerEmail,
        customerId: session.customer as string,
        paymentId: session.payment_intent as string,
        amount: amount,
        currency: session.currency || 'usd'
      })
    }
  }

  // Handle charge.succeeded (backup for Payment Links)
  if (event.type === 'charge.succeeded') {
    const charge = event.data.object as Stripe.Charge

    if (charge.paid && charge.billing_details?.email) {
      await handleNewPurchase(supabase, {
        email: charge.billing_details.email,
        customerId: charge.customer as string || null,
        paymentId: charge.payment_intent as string,
        amount: charge.amount,
        currency: charge.currency
      })
    }
  }

  return NextResponse.json({ received: true })
}

async function handleNewPurchase(supabase: any, data: {
  email: string
  customerId: string | null
  paymentId: string
  amount: number
  currency: string
}) {
  const emailLower = data.email.toLowerCase()

  // Check if user already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id, plan, license_key')
    .eq('email', emailLower)
    .single()

  if (existing) {
    // User exists - upgrade from free to pro or handle duplicate payment
    if (existing.plan === 'free') {
      // Upgrade free user to pro
      const licenseKey = generateLicenseKey()

      const { error } = await supabase
        .from('users')
        .update({
          plan: 'pro',
          license_key: licenseKey,
          stripe_customer_id: data.customerId,
          stripe_payment_id: data.paymentId,
          amount_paid: data.amount,
          updated_at: new Date().toISOString()
        })
        .eq('email', emailLower)

      if (error) {
        console.error('Error upgrading user:', error)
      } else {
        console.log('User upgraded to Pro:', emailLower, '- License:', licenseKey)
        await sendWelcomeEmail(emailLower, licenseKey)
      }
    } else {
      console.log('User already Pro:', emailLower)
      // Maybe send a duplicate payment notification?
    }
    return
  }

  // Generate new license key for new user
  const licenseKey = generateLicenseKey()

  const { error } = await supabase.from('users').insert({
    email: emailLower,
    license_key: licenseKey,
    stripe_customer_id: data.customerId,
    stripe_payment_id: data.paymentId,
    amount_paid: data.amount,
    currency: data.currency,
    plan: 'pro'
  })

  if (error) {
    console.error('Error saving user:', error)
  } else {
    console.log('Pro user added:', emailLower, '- License:', licenseKey)
    await sendWelcomeEmail(emailLower, licenseKey)
  }
}

async function sendWelcomeEmail(to: string, licenseKey: string) {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL || 'https://mineglance.com'

    const response = await fetch(`${baseUrl}/api/send-welcome-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-auth': process.env.INTERNAL_API_SECRET || 'internal-secret'
      },
      body: JSON.stringify({ to, licenseKey, plan: 'pro' })
    })

    if (!response.ok) {
      console.error('Failed to send welcome email:', await response.text())
    } else {
      console.log('Welcome email sent to:', to)
    }
  } catch (error) {
    console.error('Error sending welcome email:', error)
  }
}
