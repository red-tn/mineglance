import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Fetch public roadmap items
    const { data: items, error } = await supabase
      .from('roadmap_items')
      .select('id, category, priority, platforms, title, description, status, progress, admin_response, target_version, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ items: items || [] })
  } catch (error) {
    console.error('Error fetching public roadmap:', error)
    return NextResponse.json({ error: 'Failed to fetch roadmap' }, { status: 500 })
  }
}
