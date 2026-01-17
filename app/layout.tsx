import type { Metadata } from 'next'
import './globals.css'
import WireframeBackground from '@/components/WireframeBackground'
import AnalyticsTracker from '@/components/AnalyticsTracker'

export const metadata: Metadata = {
  title: 'MineGlance - Net Profit Dashboard for GPU Miners',
  description: 'Are you actually making money mining? Find out in 2 clicks. Free browser extension for GPU miners.',
  keywords: 'crypto mining dashboard, GPU mining profit, 2miners monitor, mining calculator, net profit mining',
  icons: {
    icon: '/logo-icon.svg',
    apple: '/logo-icon.svg',
  },
  openGraph: {
    title: 'MineGlance - Are You Actually Making Money Mining?',
    description: 'Net profit dashboard for GPU miners. No monthly fees.',
    url: 'https://mineglance.com',
    siteName: 'MineGlance',
    images: [{ url: 'https://mineglance.com/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MineGlance - Net Profit Dashboard for GPU Miners',
    description: 'Find out if you are actually making money mining. Free browser extension.',
    images: ['https://mineglance.com/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <AnalyticsTracker />
        <WireframeBackground />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  )
}
