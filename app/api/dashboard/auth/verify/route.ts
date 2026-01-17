import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Find session
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('*, user:users(*)')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      // Clean up expired session
      await supabase.from('user_sessions').delete().eq('id', session.id)
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const user = session.user as {
      id: string
      email: string
      full_name: string | null
      plan: string
      profile_photo_url: string | null
      is_revoked: boolean
      license_key: string
      subscription_end_date: string | null
      renewal_reminder_sent: boolean
      renewal_ignored: boolean
      billing_type: 'monthly' | 'annual' | 'lifetime' | null
    }

    // Check if user is still valid
    if (user.is_revoked) {
      await supabase.from('user_sessions').delete().eq('id', session.id)
      return NextResponse.json({ error: 'License has been revoked' }, { status: 403 })
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        plan: user.plan,
        profilePhoto: user.profile_photo_url,
        licenseKey: user.license_key,
        subscriptionEndDate: user.subscription_end_date,
        renewalReminderSent: user.renewal_reminder_sent || false,
        renewalIgnored: user.renewal_ignored || false,
        billingType: user.billing_type
      }
    })

  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
