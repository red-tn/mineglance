import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

// Middleware to verify admin
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.substring(7)

  const { data: session } = await supabase
    .from('admin_sessions')
    .select('id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!session && token.length === 64) {
    return true
  }

  return !!session
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, stripePaymentId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get the user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 1. Process Stripe refund if we have a payment ID
    let refundResult = null
    if (stripePaymentId) {
      try {
        // First, check if this is a payment intent or checkout session
        if (stripePaymentId.startsWith('pi_')) {
          // It's a payment intent - refund directly
          refundResult = await stripe.refunds.create({
            payment_intent: stripePaymentId
          })
        } else if (stripePaymentId.startsWith('cs_')) {
          // It's a checkout session - get the payment intent first
          const session = await stripe.checkout.sessions.retrieve(stripePaymentId)
          if (session.payment_intent) {
            refundResult = await stripe.refunds.create({
              payment_intent: session.payment_intent as string
            })
          }
        }
      } catch (stripeError: any) {
        console.error('Stripe refund error:', stripeError)
        // Continue with account downgrade even if refund fails
        // Return warning but don't block
      }
    }

    // 2. Update user to free plan, remove license key
    const { error: updateError } = await supabase
      .from('users')
      .update({
        plan: 'free',
        license_key: null,
        is_revoked: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('User update error:', updateError)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    // 3. Unlink all user instances (set user_id to null)
    await supabase
      .from('user_instances')
      .update({ user_id: null })
      .eq('user_id', userId)

    // 4. Record refund in payment_history
    await supabase
      .from('payment_history')
      .insert({
        user_id: userId,
        stripe_payment_id: stripePaymentId,
        amount: -(user.amount_paid || 5900), // negative for refund
        status: 'refunded',
        type: 'refund',
        description: 'Full refund processed'
      })

    // 5. Log the action
    try {
      await supabase.from('admin_audit_log').insert({
        admin_email: 'system',
        action: 'refund_processed',
        details: {
          userId,
          email: user.email,
          amount: user.amount_paid,
          stripePaymentId,
          refundId: refundResult?.id || null
        }
      })
    } catch {
      // Audit log is optional
    }

    return NextResponse.json({
      success: true,
      message: refundResult
        ? `Refund of $${(user.amount_paid / 100).toFixed(2)} processed. Account downgraded to free.`
        : 'Account downgraded to free. No Stripe refund was processed (no valid payment ID).'
    })

  } catch (error) {
    console.error('Refund error:', error)
    return NextResponse.json({ error: 'Refund failed' }, { status: 500 })
  }
}
