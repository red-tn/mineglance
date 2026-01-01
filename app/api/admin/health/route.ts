import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  latency?: number
  lastCheck: string
  details?: string
}

async function checkSupabase(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const { error } = await supabase.from('licenses').select('id').limit(1)
    const latency = Date.now() - start

    return {
      name: 'Supabase Database',
      status: error ? 'degraded' : 'healthy',
      latency,
      lastCheck: new Date().toISOString(),
      details: error ? error.message : 'Connected'
    }
  } catch (e) {
    return {
      name: 'Supabase Database',
      status: 'down',
      latency: Date.now() - start,
      lastCheck: new Date().toISOString(),
      details: e instanceof Error ? e.message : 'Connection failed'
    }
  }
}

async function checkStripe(): Promise<ServiceStatus> {
  try {
    const hasKey = !!process.env.STRIPE_SECRET_KEY
    return {
      name: 'Stripe Payments',
      status: hasKey ? 'healthy' : 'degraded',
      lastCheck: new Date().toISOString(),
      details: hasKey ? 'API key configured' : 'API key missing'
    }
  } catch (e) {
    return {
      name: 'Stripe Payments',
      status: 'unknown',
      lastCheck: new Date().toISOString(),
      details: e instanceof Error ? e.message : 'Unknown error'
    }
  }
}

async function checkSendGrid(): Promise<ServiceStatus> {
  try {
    const hasKey = !!process.env.SENDGRID_API_KEY
    return {
      name: 'SendGrid Email',
      status: hasKey ? 'healthy' : 'degraded',
      lastCheck: new Date().toISOString(),
      details: hasKey ? 'API key configured' : 'API key missing'
    }
  } catch (e) {
    return {
      name: 'SendGrid Email',
      status: 'unknown',
      lastCheck: new Date().toISOString(),
      details: e instanceof Error ? e.message : 'Unknown error'
    }
  }
}

async function checkWhatToMine(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const response = await fetch('https://whattomine.com/coins.json', {
      signal: AbortSignal.timeout(10000)
    })
    const latency = Date.now() - start

    return {
      name: 'WhatToMine API',
      status: response.ok ? 'healthy' : 'degraded',
      latency,
      lastCheck: new Date().toISOString(),
      details: response.ok ? 'Responding' : `HTTP ${response.status}`
    }
  } catch (e) {
    return {
      name: 'WhatToMine API',
      status: 'down',
      latency: Date.now() - start,
      lastCheck: new Date().toISOString(),
      details: e instanceof Error ? e.message : 'Connection failed'
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Run all health checks in parallel
    const [supabaseStatus, stripeStatus, sendgridStatus, wtmStatus] = await Promise.all([
      checkSupabase(),
      checkStripe(),
      checkSendGrid(),
      checkWhatToMine()
    ])

    const services: ServiceStatus[] = [
      supabaseStatus,
      stripeStatus,
      sendgridStatus,
      wtmStatus
    ]

    // Get environment info
    const environment = {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasStripePublicKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasStripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      hasSendGridKey: !!process.env.SENDGRID_API_KEY,
      hasAdminEmails: !!process.env.ADMIN_EMAILS
    }

    // Calculate overall status
    const healthyCount = services.filter(s => s.status === 'healthy').length
    const degradedCount = services.filter(s => s.status === 'degraded').length
    const downCount = services.filter(s => s.status === 'down').length

    let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy'
    if (downCount > 0) {
      overallStatus = 'down'
    } else if (degradedCount > 0) {
      overallStatus = 'degraded'
    }

    // Get recent error logs (if available)
    let recentErrors = null
    try {
      const { data } = await supabase
        .from('admin_audit_log')
        .select('*')
        .ilike('action', '%error%')
        .order('created_at', { ascending: false })
        .limit(10)
      recentErrors = data
    } catch {
      // Table may not exist yet
    }

    return NextResponse.json({
      overallStatus,
      services,
      environment,
      recentErrors: recentErrors || [],
      checkedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      overallStatus: 'unknown',
      services: [],
      environment: {},
      recentErrors: [],
      checkedAt: new Date().toISOString(),
      error: 'Health check failed'
    })
  }
}
