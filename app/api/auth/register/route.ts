import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'hello@mineglance.com'

// Generate session token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Send welcome email with MINE26 coupon
async function sendWelcomeEmail(email: string): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.log('SendGrid not configured, skipping welcome email')
    return
  }

  const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to MineGlance!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #141414; border-radius: 16px; border: 1px solid #2d2d2d;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #38a169; font-size: 28px; font-weight: bold;">
                Welcome to MineGlance!
              </h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Your free account is ready! You can now track your mining operations from any device.
              </p>

              <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 30px;">
                With your free account, you can monitor 1 wallet and see your net profit calculations. Ready for more?
              </p>

              <!-- Upgrade CTA -->
              <div style="background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
                <h2 style="color: white; margin: 0 0 10px; font-size: 22px;">Upgrade to Pro - $59 Lifetime</h2>
                <p style="color: rgba(255,255,255,0.9); margin: 0 0 20px; font-size: 14px;">
                  One-time payment. No subscriptions. Ever.
                </p>

                <!-- Coupon -->
                <div style="background-color: rgba(0,0,0,0.2); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                  <p style="color: #fbbf24; margin: 0 0 5px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                    New User Discount
                  </p>
                  <p style="color: white; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">
                    MINE26
                  </p>
                  <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0; font-size: 14px;">
                    Use this code for <strong>10% off</strong> - Pay only $53.10!
                  </p>
                </div>

                <a href="https://www.mineglance.com/#pricing" style="display: inline-block; background-color: white; color: #38a169; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                  Upgrade Now
                </a>
              </div>

              <!-- Features -->
              <h3 style="color: #e5e7eb; font-size: 16px; margin: 0 0 15px;">Pro Features Include:</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #38a169; margin-right: 10px;">&#10003;</span>
                    <span style="color: #d1d5db;">Unlimited wallets across all pools</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #38a169; margin-right: 10px;">&#10003;</span>
                    <span style="color: #d1d5db;">Mobile app (iOS & Android)</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #38a169; margin-right: 10px;">&#10003;</span>
                    <span style="color: #d1d5db;">Cloud sync across all devices</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #38a169; margin-right: 10px;">&#10003;</span>
                    <span style="color: #d1d5db;">Email alerts when workers go offline</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #38a169; margin-right: 10px;">&#10003;</span>
                    <span style="color: #d1d5db;">Real-time coin comparison</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #38a169; margin-right: 10px;">&#10003;</span>
                    <span style="color: #d1d5db;">Priority support</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #2d2d2d;">
              <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">
                Questions? Reply to this email or visit <a href="https://www.mineglance.com/support" style="color: #38a169;">mineglance.com/support</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: FROM_EMAIL, name: 'MineGlance' },
        subject: 'Welcome to MineGlance! Here\'s 10% off Pro',
        content: [{ type: 'text/html', value: emailContent }],
      }),
    })

    if (!response.ok) {
      console.error('Failed to send welcome email:', await response.text())
    }
  } catch (error) {
    console.error('Error sending welcome email:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, instanceId, deviceType, deviceName, browser, version } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, plan, license_key')
      .eq('email', normalizedEmail)
      .single()

    if (existingUser) {
      // User exists - they should use login instead
      return NextResponse.json({
        error: 'Account already exists',
        exists: true,
        hasPro: existingUser.plan === 'pro',
        requiresLicenseKey: existingUser.plan === 'pro'
      }, { status: 409 })
    }

    // Create new free user
    const userId = crypto.randomUUID()
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: normalizedEmail,
        plan: 'free',
        license_key: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error creating user:', insertError)
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }

    // Create default settings for the user
    await supabase
      .from('user_settings')
      .insert({
        user_id: userId,
        refresh_interval: 30,
        electricity_rate: 0.12,
        electricity_currency: 'USD',
        currency: 'USD'
      })

    // Generate session token
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Create session
    await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString()
      })

    // Register device instance if provided
    if (instanceId && deviceType) {
      await supabase
        .from('user_instances')
        .upsert({
          user_id: userId,
          instance_id: instanceId,
          device_type: deviceType,
          device_name: deviceName || null,
          browser: browser || null,
          version: version || null,
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'user_id,instance_id'
        })
    }

    // Send welcome email (async, don't block response)
    sendWelcomeEmail(normalizedEmail)

    return NextResponse.json({
      success: true,
      userId,
      token,
      email: normalizedEmail,
      plan: 'free',
      wallets: [],
      settings: {
        refreshInterval: 30,
        electricityRate: 0.12,
        electricityCurrency: 'USD',
        currency: 'USD',
        notifyWorkerOffline: true,
        notifyProfitDrop: true,
        profitDropThreshold: 20,
        notifyBetterCoin: false,
        showDiscoveryCoins: true,
        liteMode: false
      }
    })

  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
