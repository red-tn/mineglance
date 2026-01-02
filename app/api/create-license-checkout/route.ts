import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Product ID for additional licenses - $5 per unit, 5 licenses per unit
const LICENSE_PRODUCT_ID = 'prod_Tib34OtCif3xEs'

export async function POST(request: NextRequest) {
  try {
    const { email, quantity } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (!quantity || quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 })
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('paid_users')
      .select('id, email, license_key, plan, max_activations')
      .eq('email', email.toLowerCase())
      .single()

    if (userError || !user) {
      return NextResponse.json({
        error: 'No account found with this email. You must have an existing MineGlance Pro license to purchase additional activations.'
      }, { status: 404 })
    }

    // Get the price for the product
    const prices = await stripe.prices.list({
      product: LICENSE_PRODUCT_ID,
      active: true,
      limit: 1
    })

    if (prices.data.length === 0) {
      return NextResponse.json({ error: 'License product not configured' }, { status: 500 })
    }

    const priceId = prices.data[0].id

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      ui_mode: 'embedded',
      customer_email: email.toLowerCase(),
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      metadata: {
        type: 'license_purchase',
        email: email.toLowerCase(),
        quantity: quantity.toString(),
        licenses_per_unit: '5',
        total_licenses: (quantity * 5).toString()
      },
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mineglance.com'}/dashboard/devices?success=true`,
    })

    return NextResponse.json({
      clientSecret: session.client_secret,
      licensesToAdd: quantity * 5
    })

  } catch (error) {
    console.error('Error creating license checkout:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
