import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ exists: false, plan: null })
    }

    const emailLower = email.toLowerCase().trim()

    // Check if user exists in paid_users
    const { data: user, error } = await supabase
      .from('paid_users')
      .select('plan, is_revoked')
      .eq('email', emailLower)
      .single()

    if (error || !user) {
      return NextResponse.json({ exists: false, plan: null })
    }

    // If license is revoked, treat as no plan
    if (user.is_revoked) {
      return NextResponse.json({ exists: false, plan: null })
    }

    // Normalize plan names (lifetime_pro -> pro, lifetime_bundle -> bundle)
    let plan = user.plan
    if (plan === 'lifetime_pro') plan = 'pro'
    if (plan === 'lifetime_bundle') plan = 'bundle'

    return NextResponse.json({
      exists: true,
      plan
    })

  } catch (error) {
    console.error('Check customer error:', error)
    return NextResponse.json({ exists: false, plan: null })
  }
}
