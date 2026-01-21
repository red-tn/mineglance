import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

// Hash IP address for privacy
function hashIp(ip: string): string {
  const salt = process.env.ADMIN_SALT || 'analytics';
  return crypto.createHash('sha256').update(ip + salt).digest('hex').substring(0, 16);
}

// Extract useful info from user agent
function parseUserAgent(ua: string): { browser: string; os: string; device: string } {
  const browser = ua.includes('Chrome') ? 'Chrome' :
    ua.includes('Firefox') ? 'Firefox' :
    ua.includes('Safari') ? 'Safari' :
    ua.includes('Edge') ? 'Edge' :
    ua.includes('Opera') ? 'Opera' : 'Other';

  const os = ua.includes('Windows') ? 'Windows' :
    ua.includes('Mac') ? 'macOS' :
    ua.includes('Linux') ? 'Linux' :
    ua.includes('Android') ? 'Android' :
    ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad') ? 'iOS' : 'Other';

  const device = ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone') ? 'Mobile' :
    ua.includes('Tablet') || ua.includes('iPad') ? 'Tablet' : 'Desktop';

  return { browser, os, device };
}

// Extract referrer domain
function getReferrerDomain(referrer: string): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    // Don't count self-referrals
    if (url.hostname.includes('mineglance.com')) return null;
    return url.hostname;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.path || !data.sessionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
    const ipHash = hashIp(ip);

    // Parse user agent
    const { browser, os, device } = parseUserAgent(data.userAgent || '');

    // Get referrer domain
    const referrerDomain = getReferrerDomain(data.referrer || '');

    // Insert page view
    const { error } = await supabaseAdmin.from('page_views').insert({
      path: data.path,
      session_id: data.sessionId,
      ip_hash: ipHash,
      referrer: data.referrer || null,
      referrer_domain: referrerDomain,
      user_agent: data.userAgent?.substring(0, 500) || null,
      browser,
      os,
      device,
      screen_width: data.screenWidth || null,
      screen_height: data.screenHeight || null,
    });

    if (error) {
      console.error('Analytics insert error:', error);
      // Don't expose internal errors
      return NextResponse.json({ success: true });
    }

    // Update or create session
    await supabaseAdmin.rpc('upsert_analytics_session', {
      p_session_id: data.sessionId,
      p_path: data.path,
      p_ip_hash: ipHash,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics error:', error);
    // Always return success to not break client
    return NextResponse.json({ success: true });
  }
}

// GET endpoint to retrieve analytics data (admin only)
export async function GET(request: NextRequest) {
  try {
    // Verify admin token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: session } = await supabaseAdmin
      .from('admin_sessions')
      .select('admin_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';

    // Calculate date range
    let startDate: Date;
    const now = new Date();

    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get total page views
    const { count: totalViews } = await supabaseAdmin
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Get unique visitors (by session)
    const { data: uniqueSessions } = await supabaseAdmin
      .from('page_views')
      .select('session_id')
      .gte('created_at', startDate.toISOString());

    const uniqueVisitors = new Set(uniqueSessions?.map(s => s.session_id)).size;

    // Get top pages
    const { data: topPages } = await supabaseAdmin.rpc('get_top_pages', {
      start_date: startDate.toISOString(),
      limit_count: 10,
    });

    // Get traffic sources
    const { data: trafficSources } = await supabaseAdmin.rpc('get_traffic_sources', {
      start_date: startDate.toISOString(),
      limit_count: 10,
    });

    // Get device breakdown
    const { data: devices } = await supabaseAdmin.rpc('get_device_breakdown', {
      start_date: startDate.toISOString(),
    });

    // Get browser breakdown
    const { data: browsers } = await supabaseAdmin.rpc('get_browser_breakdown', {
      start_date: startDate.toISOString(),
    });

    // Get views for chart - hourly for 24h, daily for other periods
    let dailyViews;
    if (period === '24h') {
      // Get hourly views for last 24 hours
      const { data: pageViews } = await supabaseAdmin
        .from('page_views')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      // Create hourly buckets for last 24 hours
      const hourlyBuckets: { [key: string]: number } = {};
      for (let i = 23; i >= 0; i--) {
        const bucketTime = new Date(now.getTime() - i * 60 * 60 * 1000);
        const bucketKey = bucketTime.toISOString().substring(0, 13) + ':00:00.000Z';
        hourlyBuckets[bucketKey] = 0;
      }

      // Count views per hour
      pageViews?.forEach(pv => {
        const viewTime = new Date(pv.created_at);
        const bucketKey = viewTime.toISOString().substring(0, 13) + ':00:00.000Z';
        if (hourlyBuckets.hasOwnProperty(bucketKey)) {
          hourlyBuckets[bucketKey]++;
        }
      });

      // Convert to array format
      dailyViews = Object.entries(hourlyBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, views]) => ({ date, views }));
    } else {
      // Get daily views for other periods
      const { data } = await supabaseAdmin.rpc('get_daily_views', {
        start_date: startDate.toISOString(),
      });
      dailyViews = data;
    }

    // Calculate bounce rate (sessions with only 1 page view)
    const { data: sessions } = await supabaseAdmin
      .from('analytics_sessions')
      .select('page_count')
      .gte('started_at', startDate.toISOString());

    const bounceCount = sessions?.filter(s => s.page_count === 1).length || 0;
    const totalSessions = sessions?.length || 1;
    const bounceRate = Math.round((bounceCount / totalSessions) * 100);

    return NextResponse.json({
      totalViews: totalViews || 0,
      uniqueVisitors,
      bounceRate,
      topPages: topPages || [],
      trafficSources: trafficSources || [],
      devices: devices || [],
      browsers: browsers || [],
      dailyViews: dailyViews || [],
      period,
    });
  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
