'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Monitor, Apple, AlertTriangle, Download, CheckCircle2, Zap, RefreshCw, Bell, Shield, CloudOff, Layout } from 'lucide-react'

interface ReleaseInfo {
  version: string | null
  downloadUrl: string | null
  releaseNotes: string | null
}

export default function DesktopPage() {
  const [windowsRelease, setWindowsRelease] = useState<ReleaseInfo>({ version: null, downloadUrl: null, releaseNotes: null })
  const [macRelease, setMacRelease] = useState<ReleaseInfo>({ version: null, downloadUrl: null, releaseNotes: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReleases() {
      try {
        const [windowsRes, macRes] = await Promise.all([
          fetch('/api/desktop/install?platform=desktop_windows'),
          fetch('/api/desktop/install?platform=desktop_macos'),
        ])

        const windowsData = await windowsRes.json()
        const macData = await macRes.json()

        setWindowsRelease({
          version: windowsData.version,
          downloadUrl: windowsData.downloadUrl,
          releaseNotes: windowsData.releaseNotes,
        })
        setMacRelease({
          version: macData.version,
          downloadUrl: macData.downloadUrl,
          releaseNotes: macData.releaseNotes,
        })
      } catch (error) {
        console.error('Failed to fetch releases:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReleases()
  }, [])

  const features = [
    { icon: Layout, title: 'Full Dashboard', description: 'Same powerful features as the browser extension' },
    { icon: Bell, title: 'Native Notifications', description: 'Get alerts when workers go offline or profit drops' },
    { icon: RefreshCw, title: 'Auto-Updates', description: 'Always stay on the latest version automatically' },
    { icon: Monitor, title: 'System Tray', description: 'Quick access to stats without opening the full app' },
    { icon: Zap, title: 'Start on Boot', description: 'Launch automatically when your computer starts' },
    { icon: Shield, title: 'Secure Login', description: 'Same secure 2FA-enabled authentication' },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-white/10">
        <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <img src="/logo-icon.svg" alt="MineGlance" className="w-8 h-8" />
            MineGlance
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/#pricing" className="text-gray-400 hover:text-white transition">Pricing</Link>
            <Link href="/support" className="text-gray-400 hover:text-white transition">Support</Link>
            <Link href="/dashboard" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition">Dashboard</Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-sm mb-6">
          <Monitor size={16} />
          Desktop App Available
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          MineGlance for Desktop
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
          Native desktop application for Windows and macOS. Get real-time mining stats,
          system tray integration, and native notifications.
        </p>

        {/* Download Buttons */}
        <div className="flex flex-col md:flex-row gap-4 justify-center mb-8">
          {/* Windows Download */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 min-w-[280px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Monitor className="text-blue-400" size={24} />
              </div>
              <div className="text-left">
                <h3 className="font-bold">Windows</h3>
                <p className="text-sm text-gray-400">
                  {windowsRelease.version ? `v${windowsRelease.version}` : 'Coming Soon'}
                </p>
              </div>
            </div>
            {windowsRelease.downloadUrl ? (
              <a
                href={windowsRelease.downloadUrl}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition"
              >
                <Download size={18} />
                Download for Windows
              </a>
            ) : (
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-800 text-gray-500 rounded-lg font-semibold cursor-not-allowed"
              >
                Coming Soon
              </button>
            )}
          </div>

          {/* macOS Download */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 min-w-[280px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-500/20 rounded-xl flex items-center justify-center">
                <Apple className="text-gray-400" size={24} />
              </div>
              <div className="text-left">
                <h3 className="font-bold">macOS</h3>
                <p className="text-sm text-gray-400">
                  {macRelease.version ? `v${macRelease.version}` : 'Coming Soon'}
                </p>
              </div>
            </div>
            {macRelease.downloadUrl ? (
              <a
                href={macRelease.downloadUrl}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold transition"
              >
                <Download size={18} />
                Download for macOS
              </a>
            ) : (
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-800 text-gray-500 rounded-lg font-semibold cursor-not-allowed"
              >
                Coming Soon
              </button>
            )}
          </div>
        </div>

        {/* SmartScreen Warning */}
        <div className="max-w-xl mx-auto bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-left">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm">
              <p className="font-semibold text-yellow-400 mb-1">Windows SmartScreen Warning</p>
              <p className="text-gray-400">
                On first launch, Windows may show a SmartScreen warning because our app isn&apos;t code-signed yet.
                Click &quot;More info&quot; then &quot;Run anyway&quot; to proceed. This is safe - our app is open source.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Desktop-Exclusive Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <feature.icon className="text-green-400 mb-4" size={28} />
              <h3 className="font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* All Features */}
      <section className="max-w-6xl mx-auto px-4 py-20 border-t border-zinc-800">
        <h2 className="text-3xl font-bold text-center mb-4">Full Feature Parity</h2>
        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          Everything you love about the browser extension, now in a native desktop app
        </p>

        <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {[
            'Real-time hashrate & worker status',
            'Profit calculation with electricity costs',
            '12+ supported mining pools',
            '23+ supported cryptocurrencies',
            'Dark & light theme',
            'Cloud sync across devices',
            'Two-factor authentication',
            'Worker offline alerts',
            'Profit drop notifications',
            'Auto-refresh intervals',
            'Mining rig power tracking',
            'Multi-wallet support',
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-3 text-gray-300">
              <CheckCircle2 className="text-green-500 flex-shrink-0" size={18} />
              {feature}
            </div>
          ))}
        </div>
      </section>

      {/* System Requirements */}
      <section className="max-w-6xl mx-auto px-4 py-20 border-t border-zinc-800">
        <h2 className="text-3xl font-bold text-center mb-12">System Requirements</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Monitor className="text-blue-400" size={24} />
              <h3 className="font-bold text-lg">Windows</h3>
            </div>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>Windows 10 or later (64-bit)</li>
              <li>4 GB RAM minimum</li>
              <li>100 MB disk space</li>
              <li>Internet connection</li>
            </ul>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Apple className="text-gray-400" size={24} />
              <h3 className="font-bold text-lg">macOS</h3>
            </div>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>macOS 10.13 (High Sierra) or later</li>
              <li>Intel or Apple Silicon</li>
              <li>4 GB RAM minimum</li>
              <li>100 MB disk space</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center border-t border-zinc-800">
        <h2 className="text-3xl font-bold mb-4">Prefer the Browser Extension?</h2>
        <p className="text-gray-400 mb-8">
          MineGlance is also available as a browser extension for Chrome, Edge, Brave, and Opera
        </p>
        <Link
          href="/#download"
          className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold transition"
        >
          Get Browser Extension
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">&copy; 2026 MineGlance. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/support" className="hover:text-white transition">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
