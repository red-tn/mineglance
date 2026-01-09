'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

export default function AnalyticsTracker() {
  const pathname = usePathname()

  // Track page view on route change
  useEffect(() => {
    trackPageView()
  }, [pathname])

  return null
}
