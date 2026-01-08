import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Statuses that are "planned or higher" for public display
const PUBLIC_STATUSES = ['planned', 'in_progress', 'completed']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userEmail = searchParams.get('email')

    // Fetch public roadmap items (planned+ status only)
    const { data: publicItems, error: publicError } = await supabase
      .from('roadmap_items')
      .select('id, category, priority, platforms, title, description, status, progress, admin_response, target_version, created_at, submitter_email')
      .eq('is_public', true)
      .in('status', PUBLIC_STATUSES)
      .order('status', { ascending: true })
      .order('created_at', { ascending: false })

    if (publicError) throw publicError

    let userItems: any[] = []

    // If user email provided, also fetch their own submissions (all statuses)
    if (userEmail) {
      const { data: userSubmissions, error: userError } = await supabase
        .from('roadmap_items')
        .select('id, category, priority, platforms, title, description, status, progress, admin_response, target_version, created_at, submitter_email')
        .eq('submitter_email', userEmail.toLowerCase())
        .order('created_at', { ascending: false })

      if (userError) throw userError
      userItems = userSubmissions || []
    }

    // Combine and deduplicate (user items may overlap with public items)
    const publicIds = new Set((publicItems || []).map(i => i.id))
    const uniqueUserItems = userItems.filter(i => !publicIds.has(i.id))

    // Mark items as owned by user
    const itemsWithOwnership = [
      ...(publicItems || []).map(item => ({
        ...item,
        isOwned: userEmail ? item.submitter_email === userEmail.toLowerCase() : false
      })),
      ...uniqueUserItems.map(item => ({
        ...item,
        isOwned: true
      }))
    ]

    return NextResponse.json({ items: itemsWithOwnership })
  } catch (error) {
    console.error('Error fetching public roadmap:', error)
    return NextResponse.json({ error: 'Failed to fetch roadmap' }, { status: 500 })
  }
}
