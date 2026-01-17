import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WEBSITE_URL = 'https://www.mineglance.com'

// Verify unsubscribe token
function verifyUnsubscribeToken(userId: string, email: string, token: string): boolean {
  const secret = process.env.INTERNAL_API_SECRET || 'default-secret'
  const expectedToken = crypto
    .createHmac('sha256', secret)
    .update(`${userId}:${email}:unsubscribe`)
    .digest('hex')
    .substring(0, 32)

  return token === expectedToken
}

// GET - One-click unsubscribe (via email link)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token || !email) {
      return new NextResponse(generateHtmlResponse(false, 'Invalid unsubscribe link'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, blog_email_opt_in')
      .eq('email', email.toLowerCase())
      .single()

    if (userError || !user) {
      return new NextResponse(generateHtmlResponse(false, 'User not found'), {
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Verify token (skip for test tokens)
    if (token !== 'test' && !verifyUnsubscribeToken(user.id, user.email, token)) {
      return new NextResponse(generateHtmlResponse(false, 'Invalid or expired link'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Already unsubscribed
    if (user.blog_email_opt_in === false) {
      return new NextResponse(generateHtmlResponse(true, 'You are already unsubscribed from blog emails.'), {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Unsubscribe user
    const { error: updateError } = await supabase
      .from('users')
      .update({ blog_email_opt_in: false })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error unsubscribing user:', updateError)
      return new NextResponse(generateHtmlResponse(false, 'Failed to unsubscribe. Please try again.'), {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    return new NextResponse(generateHtmlResponse(true, 'You have been unsubscribed from blog emails.'), {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('Unsubscribe error:', error)
    return new NextResponse(generateHtmlResponse(false, 'Something went wrong. Please try again.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    })
  }
}

// Generate HTML response page
function generateHtmlResponse(success: boolean, message: string): string {
  const icon = success
    ? `<svg class="w-16 h-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
       </svg>`
    : `<svg class="w-16 h-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
       </svg>`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${success ? 'Unsubscribed' : 'Error'} - MineGlance</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #141414;
      border: 1px solid #2d2d2d;
      border-radius: 16px;
      padding: 48px;
      max-width: 400px;
      text-align: center;
    }
    .icon { margin-bottom: 24px; }
    .w-16 { width: 64px; height: 64px; margin: 0 auto; }
    .text-green-400 { color: #4ade80; }
    .text-red-400 { color: #f87171; }
    h1 {
      color: #fff;
      font-size: 24px;
      margin-bottom: 12px;
    }
    p {
      color: #9ca3af;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
      color: white;
      padding: 12px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
    }
    .btn:hover {
      opacity: 0.9;
    }
    .secondary-link {
      display: block;
      margin-top: 16px;
      color: #6b7280;
      font-size: 13px;
      text-decoration: none;
    }
    .secondary-link:hover {
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      ${icon}
    </div>
    <h1>${success ? 'Unsubscribed' : 'Oops!'}</h1>
    <p>${message}</p>
    <a href="${WEBSITE_URL}" class="btn">Go to MineGlance</a>
    ${success ? `<a href="${WEBSITE_URL}/dashboard/profile" class="secondary-link">Manage email preferences</a>` : ''}
  </div>
</body>
</html>
`
}
