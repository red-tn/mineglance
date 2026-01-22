import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const plans = {
  monthly: {
    name: 'MineGlance Pro Monthly',
    description: 'Monthly subscription to all Pro features',
    amount: 699, // $6.99/month
    interval: 'month' as const,
    mode: 'subscription' as const
  },
  annual: {
    name: 'MineGlance Pro Annual',
    description: 'Annual subscription to all Pro features - Save 30%',
    amount: 5900, // $59.00/year
    interval: 'year' as const,
    mode: 'subscription' as const
  },
  lifetime: {
    name: 'MineGlance Pro Lifetime',
    description: 'One-time payment, lifetime access to all Pro features',
    amount: 9900, // $99.00 one-time
    interval: null,
    mode: 'payment' as const
  },
  // Legacy support for 'pro' plan - maps to annual
  pro: {
    name: 'MineGlance Pro Annual',
    description: 'Annual subscription to all Pro features',
    amount: 5900,
    interval: 'year' as const,
    mode: 'subscription' as const
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for Stripe configuration
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not configured')
      return NextResponse.json(
        { error: 'Payment system is not configured. Please contact support.' },
        { status: 503 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    })

    const body = await request.json()
    const { plan, email, isUpgrade, amount: customAmount, coupon } = body

    console.log('Creating checkout session for plan:', plan, 'email:', email, 'isUpgrade:', isUpgrade, 'coupon:', coupon)

    if (!plan || !plans[plan as keyof typeof plans]) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      )
    }

    const selectedPlan = plans[plan as keyof typeof plans]
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://mineglance.com'

    // Use custom amount for upgrades, otherwise use standard plan price
    const chargeAmount = customAmount || selectedPlan.amount
    const productName = isUpgrade
      ? 'MineGlance Bundle Upgrade'
      : selectedPlan.name
    const productDescription = isUpgrade
      ? 'Upgrade from Pro to Bundle - Add mobile app access'
      : selectedPlan.description

    console.log('Creating Stripe session with amount:', chargeAmount, 'origin:', origin, 'mode:', selectedPlan.mode)

    // Build price_data based on plan type
    const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
      currency: 'usd',
      product_data: {
        name: productName,
        description: productDescription,
      },
      unit_amount: chargeAmount,
    }

    // Add recurring interval for subscriptions
    if (selectedPlan.mode === 'subscription' && selectedPlan.interval) {
      priceData.recurring = {
        interval: selectedPlan.interval
      }
    }

    // Build session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      ui_mode: 'embedded',
      line_items: [
        {
          price_data: priceData,
          quantity: 1,
        },
      ],
      mode: selectedPlan.mode,
      customer_email: email || undefined,
      metadata: {
        plan: plan,
        planType: selectedPlan.mode,
        isUpgrade: isUpgrade ? 'true' : 'false',
        originalAmount: selectedPlan.amount.toString(),
        chargedAmount: chargeAmount.toString()
      },
      return_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    }

    // Auto-apply coupon if provided, otherwise allow manual promo code entry
    // Note: discounts and allow_promotion_codes are mutually exclusive in Stripe
    if (coupon) {
      sessionParams.discounts = [{ coupon }]
    } else {
      sessionParams.allow_promotion_codes = true
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    console.log('Checkout session created:', session.id)

    if (!session.client_secret) {
      console.error('No client secret returned from Stripe')
      return NextResponse.json(
        { error: 'Failed to initialize payment. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ clientSecret: session.client_secret })
  } catch (err) {
    console.error('Error creating checkout session:', err)

    // Provide specific error messages for common issues
    if (err instanceof Stripe.errors.StripeAuthenticationError) {
      return NextResponse.json(
        { error: 'Payment authentication failed. Please contact support.' },
        { status: 503 }
      )
    }

    if (err instanceof Stripe.errors.StripeInvalidRequestError) {
      return NextResponse.json(
        { error: 'Invalid payment request. Please try again.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session. Please try again.' },
      { status: 500 }
    )
  }
}
