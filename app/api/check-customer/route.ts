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

    // Check if user exists
    const { data: user, error } = await supabase
      .from('users')
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

    return NextResponse.json({
      exists: true,
      plan: user.plan
    })

  } catch (error) {
    console.error('Check customer error:', error)
    return NextResponse.json({ exists: false, plan: null })
  }
}
