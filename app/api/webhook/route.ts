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

// Generate random blog display name
function generateDisplayName(): string {
  const adjectives = ['Swift', 'Lucky', 'Golden', 'Crypto', 'Hash', 'Block', 'Mega', 'Ultra', 'Super', 'Turbo', 'Power', 'Quick', 'Fast', 'Smart', 'Wise']
  const nouns = ['Miner', 'Hasher', 'Digger', 'Finder', 'Seeker', 'Hunter', 'Runner', 'Worker', 'Builder', 'Crafter']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 9000) + 1000 // 1000-9999
  return `${adj}${noun}${num}`
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
    const paymentIntentId = session.payment_intent as string

    if (session.payment_status === 'paid' && customerEmail && paymentIntentId) {
      // Idempotency check: Skip if this payment_intent was already processed
      const { data: existingPayment } = await supabase
        .from('payment_history')
        .select('id')
        .eq('stripe_payment_intent', paymentIntentId)
        .single()

      if (existingPayment) {
        console.log('Payment already processed, skipping:', paymentIntentId)
        return NextResponse.json({ received: true, skipped: 'duplicate' })
      }

      const amount = session.amount_total || 0
      // Get billing type from metadata (monthly, annual, lifetime)
      const billingType = session.metadata?.plan || 'annual'

      console.log('Processing checkout:', {
        email: customerEmail,
        amount,
        billingType
      })

      await handleNewPurchase(supabase, {
        email: customerEmail,
        customerId: session.customer as string,
        paymentId: paymentIntentId,
        amount: amount,
        currency: session.currency || 'usd',
        billingType: billingType
      })
    }
  }

  // Handle charge.succeeded (backup for Payment Links)
  if (event.type === 'charge.succeeded') {
    const charge = event.data.object as Stripe.Charge
    const paymentIntentId = charge.payment_intent as string

    if (charge.paid && charge.billing_details?.email && paymentIntentId) {
      // Idempotency check: Skip if this payment_intent was already processed
      const { data: existingPayment } = await supabase
        .from('payment_history')
        .select('id')
        .eq('stripe_payment_intent', paymentIntentId)
        .single()

      if (existingPayment) {
        console.log('Payment already processed (charge), skipping:', paymentIntentId)
        return NextResponse.json({ received: true, skipped: 'duplicate' })
      }

      // Infer billing type from amount for Payment Links
      // $6.99 = 699 (monthly), $59 = 5900 (annual), $99 = 9900 (lifetime)
      let billingType = 'annual' // default
      const amount = charge.amount
      if (amount >= 9500 && amount <= 10500) {
        billingType = 'lifetime' // ~$99
      } else if (amount >= 5500 && amount <= 6500) {
        billingType = 'annual' // ~$59
      } else if (amount >= 600 && amount <= 800) {
        billingType = 'monthly' // ~$6.99
      }

      console.log('Processing charge (Payment Link):', {
        email: charge.billing_details.email,
        amount,
        inferredBillingType: billingType
      })

      await handleNewPurchase(supabase, {
        email: charge.billing_details.email,
        customerId: charge.customer as string || null,
        paymentId: paymentIntentId,
        amount: charge.amount,
        currency: charge.currency,
        billingType: billingType
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
  billingType?: string
}) {
  const emailLower = data.email.toLowerCase()
  const now = new Date().toISOString()
  const billingType = data.billingType || 'annual'

  // Calculate subscription end date based on billing type
  const endDate = new Date()
  let subscriptionEndDate: string | null

  if (billingType === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1)
    subscriptionEndDate = endDate.toISOString()
  } else if (billingType === 'lifetime') {
    // Lifetime = no end date (null means never expires)
    subscriptionEndDate = null
  } else {
    // annual (default)
    endDate.setFullYear(endDate.getFullYear() + 1)
    subscriptionEndDate = endDate.toISOString()
  }

  // Format billing type for display: "MineGlance Pro-Monthly", etc.
  const billingLabel = billingType.charAt(0).toUpperCase() + billingType.slice(1)
  const planDescription = `MineGlance Pro-${billingLabel}`

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
          billing_type: billingType,
          subscription_start_date: now,
          subscription_end_date: subscriptionEndDate,
          updated_at: now
        })
        .eq('email', emailLower)

      if (error) {
        console.error('Error upgrading user:', error)
      } else {
        console.log('User upgraded to Pro:', emailLower)

        // Record payment in payment_history
        const { error: historyError } = await supabase.from('payment_history').insert({
          user_id: existing.id,
          stripe_payment_id: data.paymentId,
          stripe_payment_intent: data.paymentId,
          amount: data.amount,
          currency: data.currency,
          status: 'succeeded',
          type: 'upgrade',
          description: `Upgraded to ${planDescription}`
        })

        if (historyError) {
          console.error('Error recording upgrade payment history:', historyError)
        }

        await sendWelcomeEmail(emailLower, licenseKey)
      }
    } else {
      console.log('User already Pro, processing renewal:', emailLower)

      // Record as renewal payment
      const { error: renewalHistoryError } = await supabase.from('payment_history').insert({
        user_id: existing.id,
        stripe_payment_id: data.paymentId,
        stripe_payment_intent: data.paymentId,
        amount: data.amount,
        currency: data.currency,
        status: 'succeeded',
        type: 'renewal',
        description: `${planDescription} renewal`
      })

      if (renewalHistoryError) {
        console.error('Error recording renewal payment history:', renewalHistoryError)
      }

      // Extend subscription based on billing type
      if (billingType !== 'lifetime') {
        const currentEnd = new Date()
        if (billingType === 'monthly') {
          currentEnd.setMonth(currentEnd.getMonth() + 1)
        } else {
          currentEnd.setFullYear(currentEnd.getFullYear() + 1)
        }

        await supabase
          .from('users')
          .update({
            subscription_end_date: currentEnd.toISOString(),
            billing_type: billingType,
            updated_at: now
          })
          .eq('id', existing.id)
      } else {
        // Lifetime - clear end date
        await supabase
          .from('users')
          .update({
            subscription_end_date: null,
            billing_type: billingType,
            updated_at: now
          })
          .eq('id', existing.id)
      }
    }
    return
  }

  // Generate new license key for new user
  const licenseKey = generateLicenseKey()

  const { data: newUser, error } = await supabase.from('users').insert({
    email: emailLower,
    license_key: licenseKey,
    stripe_customer_id: data.customerId,
    stripe_payment_id: data.paymentId,
    amount_paid: data.amount,
    currency: data.currency,
    plan: 'pro',
    billing_type: billingType,
    subscription_start_date: now,
    subscription_end_date: subscriptionEndDate,
    blog_display_name: generateDisplayName()
  }).select('id').single()

  if (error) {
    console.error('Error saving user:', error)
  } else {
    console.log('New Pro user added:', emailLower)

    // Record payment in payment_history
    if (newUser) {
      const { error: newUserHistoryError } = await supabase.from('payment_history').insert({
        user_id: newUser.id,
        stripe_payment_id: data.paymentId,
        stripe_payment_intent: data.paymentId,
        amount: data.amount,
        currency: data.currency,
        status: 'succeeded',
        type: 'subscription',
        description: `New ${planDescription}`
      })

      if (newUserHistoryError) {
        console.error('Error recording new subscription payment history:', newUserHistoryError)
      }
    }

    await sendWelcomeEmail(emailLower, licenseKey)
  }
}

async function sendWelcomeEmail(to: string, licenseKey: string) {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
  const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'hello@mineglance.com'

  if (!SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY not configured - cannot send welcome email')
    return
  }

  try {
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to MineGlance Pro!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #1a365d; font-size: 28px; margin: 0;">Welcome to MineGlance Pro!</h1>
      <p style="color: #718096; font-size: 16px; margin-top: 8px;">Your mining dashboard just got a whole lot better.</p>
    </div>

    <!-- License Key Box -->
    <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 32px;">
      <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">Your License Key</p>
      <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <code style="color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: 2px; font-family: 'SF Mono', 'Fira Code', monospace;">${licenseKey}</code>
      </div>
      <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin: 0;">Keep this safe! You'll need it to activate Pro features.</p>
    </div>

    <!-- Activation Steps -->
    <div style="background: #ffffff; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
      <h2 style="color: #1a365d; font-size: 18px; margin: 0 0 16px 0;">How to Activate</h2>
      <ol style="color: #4a5568; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0;">
        <li>Open the MineGlance extension</li>
        <li>Click the <strong>gear icon</strong> (Settings)</li>
        <li>Find the <strong>"Pro License"</strong> section</li>
        <li>Paste your license key above</li>
        <li>Click <strong>"Activate"</strong></li>
      </ol>
    </div>

    <!-- Features -->
    <div style="background: #f0fff4; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #9ae6b4;">
      <h2 style="color: #276749; font-size: 18px; margin: 0 0 16px 0;">What You Get</h2>
      <ul style="color: #2f855a; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0;">
        <li>Unlimited pools & coins</li>
        <li>Auto-refresh every 5 minutes</li>
        <li>Desktop notifications</li>
        <li>Coin comparison tool</li>
        <li>Historical charts</li>
        <li>Priority support</li>
      </ul>
    </div>

    <!-- Dashboard Link -->
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="https://www.mineglance.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Open Your Dashboard</a>
    </div>

    <!-- Support -->
    <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 14px; margin: 0 0 8px 0;">Questions? We're here to help!</p>
      <a href="https://www.mineglance.com/support" style="color: #38a169; text-decoration: none; font-weight: 500;">Visit Support</a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 24px;">
      <p style="color: #a0aec0; font-size: 12px; margin: 0;">
        MineGlance - Mining Profitability Dashboard<br>
        <a href="https://www.mineglance.com" style="color: #a0aec0;">mineglance.com</a>
      </p>
    </div>

  </div>
</body>
</html>
    `

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: 'MineGlance' },
        subject: 'Your MineGlance Pro License Key',
        content: [
          { type: 'text/html', value: emailHtml }
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('SendGrid error:', error)
    } else {
      console.log('Welcome email sent to:', to)
    }
  } catch (error) {
    console.error('Error sending welcome email:', error)
  }
}
