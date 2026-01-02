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
      // Determine plan from metadata or infer from amount
      let plan: 'pro' | 'bundle' = (session.metadata?.plan as 'pro' | 'bundle') || 'pro'
      const amount = session.amount_total || 0

      // Infer plan from amount if no metadata (Payment Links)
      if (!session.metadata?.plan) {
        if (amount >= 5500) {
          plan = 'bundle' // $55+ is bundle
        } else if (amount >= 2500 && amount <= 3100) {
          // $25-$31 could be Pro ($29) or upgrade ($27-$30)
          // Check if user exists with pro plan - if so, this is an upgrade
          const emailLower = customerEmail.toLowerCase()
          const { data: existing } = await supabase
            .from('paid_users')
            .select('plan')
            .eq('email', emailLower)
            .single()

          if (existing?.plan === 'pro' || existing?.plan === 'lifetime_pro') {
            plan = 'bundle' // Existing Pro user paying again = upgrade
          }
        }
      }

      const isUpgrade = session.metadata?.isUpgrade === 'true' ||
        (plan === 'bundle' && amount < 5500) // Upgrade if bundle but paid less than full price

      console.log('Processing checkout:', {
        email: customerEmail,
        plan,
        isUpgrade,
        amount,
        metadataPlan: session.metadata?.plan
      })

      await handleNewPurchase(supabase, {
        email: customerEmail,
        customerId: session.customer as string,
        paymentId: session.payment_intent as string,
        amount: amount || 2900,
        currency: session.currency || 'usd',
        plan,
        isUpgrade
      })
    }
  }

  // Handle charge.succeeded (backup for Payment Links)
  if (event.type === 'charge.succeeded') {
    const charge = event.data.object as Stripe.Charge

    if (charge.paid && charge.billing_details?.email) {
      const plan = charge.amount >= 5900 ? 'bundle' : 'pro'

      await handleNewPurchase(supabase, {
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

async function handleNewPurchase(supabase: any, data: {
  email: string
  customerId: string | null
  paymentId: string
  amount: number
  currency: string
  plan: 'pro' | 'bundle'
  isUpgrade?: boolean
}) {
  const emailLower = data.email.toLowerCase()

  // Check if user already exists
  const { data: existing } = await supabase
    .from('paid_users')
    .select('id, plan, license_key')
    .eq('email', emailLower)
    .single()

  if (existing) {
    // Normalize existing plan name
    const existingPlan = existing.plan === 'lifetime_pro' ? 'pro'
      : existing.plan === 'lifetime_bundle' ? 'bundle'
      : existing.plan

    // If upgrading from pro to bundle, update the record
    // Also handle case where plan is already 'lifetime_pro' (not normalized in DB)
    if ((existingPlan === 'pro' || existing.plan === 'lifetime_pro') && data.plan === 'bundle') {
      const { error } = await supabase
        .from('paid_users')
        .update({
          plan: 'bundle',
          amount_paid: (existing.amount_paid || 2900) + data.amount, // Track total paid
          stripe_payment_id: data.paymentId,
          max_activations: 5, // Upgrade to 5 activations
          updated_at: new Date().toISOString()
        })
        .eq('email', emailLower)

      if (error) {
        console.error('Error upgrading user:', error)
      } else {
        console.log('User upgraded to bundle:', emailLower, '- Upgrade price:', data.amount)
        // Send upgrade confirmation email with existing license key
        await sendUpgradeEmail(emailLower, existing.license_key)
      }
    } else {
      console.log('User already exists with plan:', existingPlan, 'email:', emailLower)
    }
    return
  }

  // Generate new license key for new user
  const licenseKey = generateLicenseKey()

  const { error } = await supabase.from('paid_users').insert({
    email: emailLower,
    license_key: licenseKey,
    stripe_customer_id: data.customerId,
    stripe_payment_id: data.paymentId,
    amount_paid: data.amount,
    currency: data.currency,
    plan: data.plan,
    max_activations: data.plan === 'bundle' ? 5 : 3
  })

  if (error) {
    console.error('Error saving paid user:', error)
  } else {
    console.log('Pro user added:', emailLower, '- License:', licenseKey)
    // Send welcome email with license key
    await sendWelcomeEmail(emailLower, licenseKey, data.plan)
  }
}

async function sendWelcomeEmail(to: string, licenseKey: string, plan: 'pro' | 'bundle') {
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
      body: JSON.stringify({ to, licenseKey, plan })
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

async function sendUpgradeEmail(to: string, licenseKey: string) {
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
      body: JSON.stringify({
        to,
        licenseKey,
        plan: 'bundle',
        isUpgrade: true
      })
    })

    if (!response.ok) {
      console.error('Failed to send upgrade email:', await response.text())
    } else {
      console.log('Upgrade email sent to:', to)
    }
  } catch (error) {
    console.error('Error sending upgrade email:', error)
  }
}
