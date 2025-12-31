import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const { installId, browser, version, email } = await request.json()

    if (!installId) {
      return NextResponse.json({ error: 'installId required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Upsert - insert new or update last_seen
    const { error } = await supabase
      .from('extension_installs')
      .upsert({
        install_id: installId,
        browser: browser || 'chrome',
        version: version || '1.0.0',
        email: email?.toLowerCase(),
        last_seen: new Date().toISOString()
      }, {
        onConflict: 'install_id'
      })

    if (error) {
      console.error('Track install error:', error)
      return NextResponse.json({ error: 'Failed to track' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// CORS for extension
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
