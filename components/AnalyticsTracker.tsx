'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

export default function AnalyticsTracker() {
  const pathname = usePathname()

  // Track page view on route change (skip admin pages)
  useEffect(() => {
    if (pathname?.startsWith('/admin')) return
    trackPageView()
  }, [pathname])

  return null
}
