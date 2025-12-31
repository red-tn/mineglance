import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

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
    const { plan, email } = await request.json()

    if (!plan || !plans[plan as keyof typeof plans]) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      )
    }

    const selectedPlan = plans[plan as keyof typeof plans]

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPlan.name,
              description: selectedPlan.description,
            },
            unit_amount: selectedPlan.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: email || undefined,
      metadata: {
        plan: plan
      },
      return_url: `${request.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    })

    return NextResponse.json({ clientSecret: session.client_secret })
  } catch (err) {
    console.error('Error creating checkout session:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
