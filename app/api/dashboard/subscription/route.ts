import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Verify user token
async function verifyUser(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.substring(7)

  const { data: session } = await supabase
    .from('user_sessions')
    .select('user_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  return session?.user_id || null
}

// GET subscription info and payment history
export async function GET(request: NextRequest) {
  try {
    const userId = await verifyUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, plan, billing_type, license_key, amount_paid, subscription_start_date, subscription_end_date, stripe_payment_id, created_at, is_revoked')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get payment history
    const { data: paymentHistory } = await supabase
      .from('payment_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Calculate days since subscription
    let daysSinceSubscription = null
    if (user.subscription_start_date) {
      const start = new Date(user.subscription_start_date)
      const now = new Date()
      daysSinceSubscription = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Calculate days until expiry
    let daysUntilExpiry = null
    if (user.subscription_end_date) {
      const end = new Date(user.subscription_end_date)
      const now = new Date()
      daysUntilExpiry = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Check if eligible for refund (within 30 days of subscription start)
    const canRequestRefund = user.plan === 'pro' && daysSinceSubscription !== null && daysSinceSubscription <= 30 && !user.is_revoked

    // Check if should show renew button (within 30 days of expiry, not lifetime)
    const isLifetime = user.billing_type === 'lifetime'
    const shouldShowRenew = user.plan === 'pro' && !isLifetime && daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0

    return NextResponse.json({
      subscription: {
        plan: user.plan,
        billingType: user.billing_type,
        licenseKey: user.license_key,
        amountPaid: user.amount_paid,
        subscriptionStartDate: user.subscription_start_date,
        subscriptionEndDate: user.subscription_end_date,
        stripePaymentId: user.stripe_payment_id,
        createdAt: user.created_at,
        isRevoked: user.is_revoked,
        daysSinceSubscription,
        daysUntilExpiry,
        canRequestRefund,
        shouldShowRenew,
        isLifetime
      },
      paymentHistory: paymentHistory || []
    })

  } catch (error) {
    console.error('Subscription fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }
}

// POST request refund
export async function POST(request: NextRequest) {
  try {
    const userId = await verifyUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action } = await request.json()

    if (action !== 'request_refund') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, plan, amount_paid, subscription_start_date, is_revoked')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify eligibility
    if (user.plan !== 'pro' || user.is_revoked) {
      return NextResponse.json({ error: 'Not eligible for refund' }, { status: 400 })
    }

    // Check if within 30 days
    if (user.subscription_start_date) {
      const start = new Date(user.subscription_start_date)
      const now = new Date()
      const daysSince = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSince > 30) {
        return NextResponse.json({ error: 'Refund period has expired (30 days)' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'No subscription start date found' }, { status: 400 })
    }

    // Create refund request in payment_history
    await supabase
      .from('payment_history')
      .insert({
        user_id: userId,
        amount: 0, // Will be updated when processed
        status: 'pending',
        type: 'refund',
        description: 'User-requested refund - pending admin review'
      })

    // Send notification email to admin
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mineglance.com'}/api/send-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'control@mineglance.com',
          subject: 'Refund Request',
          email: user.email,
          message: `User ${user.email} has requested a refund.\n\nAmount Paid: $${((user.amount_paid || 5900) / 100).toFixed(2)}\nSubscription Started: ${user.subscription_start_date}\n\nPlease review in the admin dashboard.`
        })
      })
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'Refund request submitted. Our team will review and process within 3-5 business days.'
    })

  } catch (error) {
    console.error('Refund request error:', error)
    return NextResponse.json({ error: 'Failed to submit refund request' }, { status: 500 })
  }
}
