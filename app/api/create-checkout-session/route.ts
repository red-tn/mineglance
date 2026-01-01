import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const plans = {
  pro: {
    name: 'MineGlance Pro',
    description: 'Lifetime access to all Pro features',
    amount: 2900 // $29.00
  },
  bundle: {
    name: 'MineGlance Pro + Mobile Bundle',
    description: 'Lifetime access to Pro extension + upcoming mobile app',
    amount: 5900 // $59.00
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
    const { plan, email, isUpgrade, amount: customAmount } = body

    console.log('Creating checkout session for plan:', plan, 'email:', email, 'isUpgrade:', isUpgrade)

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

    console.log('Creating Stripe session with amount:', chargeAmount, 'origin:', origin)

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              description: productDescription,
            },
            unit_amount: chargeAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: email || undefined,
      metadata: {
        plan: plan,
        isUpgrade: isUpgrade ? 'true' : 'false',
        originalAmount: selectedPlan.amount.toString(),
        chargedAmount: chargeAmount.toString()
      },
      return_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    })

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
