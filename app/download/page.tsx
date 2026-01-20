'use client'

import { useState, useEffect } from 'react'
import { Monitor, Apple, AlertTriangle, Download, CheckCircle2, Zap, RefreshCw, Bell, Shield, Layout, Globe } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ExtensionDownloadModal from '@/components/ExtensionDownloadModal'

interface ReleaseInfo {
  version: string | null
  downloadUrl: string | null
  releaseNotes: string | null
}

export default function DownloadPage() {
  const [windowsRelease, setWindowsRelease] = useState<ReleaseInfo>({ version: null, downloadUrl: null, releaseNotes: null })
  const [macRelease, setMacRelease] = useState<ReleaseInfo>({ version: null, downloadUrl: null, releaseNotes: null })
  const [loading, setLoading] = useState(true)
  const [showExtensionModal, setShowExtensionModal] = useState(false)

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

  const extensionFeatures = [
    { icon: Globe, title: 'Browser Integration', description: 'Works seamlessly with Chrome, Edge, Brave, and Opera' },
    { icon: Zap, title: 'Quick Access', description: 'One click from your browser toolbar' },
    { icon: RefreshCw, title: 'Auto-Refresh', description: 'Real-time updates without manual refresh' },
  ]

  const desktopFeatures = [
    { icon: Layout, title: 'Full Dashboard', description: 'Complete mining dashboard experience' },
    { icon: Bell, title: 'Native Notifications', description: 'System-level alerts for workers and profit' },
    { icon: Monitor, title: 'System Tray', description: 'Quick access from taskbar, minimize to tray' },
    { icon: Zap, title: 'Start on Boot', description: 'Launch automatically with your computer' },
    { icon: RefreshCw, title: 'Auto-Updates', description: 'Downloads in background, one-click install' },
    { icon: Shield, title: 'Clean Uninstall', description: 'Removes device from account automatically' },
  ]

  return (
    <div className="min-h-screen bg-dark-bg">
      <Header />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Download <span className="text-gradient">MineGlance</span>
        </h1>
        <p className="text-xl text-dark-text-muted max-w-2xl mx-auto">
          Get real-time mining stats wherever you are. Choose the version that works best for you.
        </p>
      </section>

      {/* Browser Extension Section */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="glass-card bg-gradient-to-br from-primary/10 to-transparent border border-primary/30 rounded-3xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 rounded-full text-primary text-sm mb-4">
                <Globe size={14} />
                Browser Extension
              </div>
              <h2 className="text-3xl font-bold text-dark-text mb-4">Browser Extension</h2>
              <p className="text-dark-text-muted mb-6">
                The easiest way to track your mining profits. Install in seconds and access your stats from any tab.
              </p>

              <button
                onClick={() => setShowExtensionModal(true)}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary-light rounded-xl font-bold transition w-full md:w-auto text-white shadow-glow hover:shadow-glow-lg"
              >
                <Download size={20} />
                Install Browser Extension
              </button>

              <div className="flex flex-wrap items-center gap-4 mt-6">
                <span className="text-sm text-dark-text-dim">Available for:</span>
                {/* Chrome */}
                <button onClick={() => setShowExtensionModal(true)} className="flex items-center gap-2 text-dark-text-muted hover:text-primary transition">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-3.952 6.848a12.014 12.014 0 0 0 9.26-5.382H17.31a5.458 5.458 0 0 1-2.037-8.557zm-2.818 2.817a3.272 3.272 0 1 0 0 6.545 3.272 3.272 0 0 0 0-6.545z"/>
                  </svg>
                  Chrome
                </button>
                {/* Edge */}
                <button onClick={() => setShowExtensionModal(true)} className="flex items-center gap-2 text-dark-text-muted hover:text-primary transition">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.86 17.86q.14 0 .25.12.1.13.1.25t-.11.33l-.32.46-.43.53-.44.5q-.21.25-.38.42l-.22.23q-.58.53-1.34 1.04-.76.51-1.6.91-.86.4-1.74.64t-1.67.24q-.9 0-1.69-.28-.8-.28-1.48-.78-.68-.5-1.22-1.17-.53-.66-.92-1.44-.38-.77-.58-1.6-.2-.83-.2-1.67 0-1 .32-1.96.33-.97.87-1.8.14.95.55 1.77.41.81 1.02 1.49.6.68 1.38 1.21.78.54 1.64.9.86.35 1.79.54.92.18 1.85.18h.22q.22 0 .43-.02zM9.8 7.28q.15-.94.58-1.8.44-.85 1.1-1.55.66-.7 1.49-1.22.84-.52 1.76-.8.93-.28 1.89-.28 1.24 0 2.31.47 1.07.48 1.85 1.33.79.85 1.24 2.01.44 1.17.44 2.53 0 .27-.02.53-.01.27-.05.53-.18 1.43-.77 2.64-.6 1.21-1.53 2.12-.94.9-2.15 1.46-1.22.55-2.62.63-.23 0-.44.02-.22.01-.43.01-.97 0-1.93-.22-.95-.21-1.83-.64-.87-.43-1.61-1.08-.74-.64-1.25-1.51-.5-.87-.74-1.94-.24-1.06-.24-2.33 0-.66.08-1.28.08-.63.22-1.24-.88.69-1.58 1.62-.7.94-1.14 2.02-.45 1.09-.6 2.24-.16 1.15-.16 2.28 0 .9.14 1.75.15.85.43 1.65.27.8.67 1.52.4.73.9 1.36.51.64 1.1 1.16.59.51 1.26.9.68.39 1.4.63.72.24 1.49.34-.87.14-1.73.04-.86-.09-1.67-.38-.82-.28-1.56-.73-.74-.44-1.37-1.03-.63-.6-1.13-1.33-.5-.73-.83-1.57-.34-.84-.5-1.75-.17-.91-.17-1.85 0-1.72.53-3.25.53-1.52 1.48-2.76.95-1.23 2.25-2.11 1.3-.87 2.82-1.26z"/>
                  </svg>
                  Edge
                </button>
                {/* Brave */}
                <button onClick={() => setShowExtensionModal(true)} className="flex items-center gap-2 text-dark-text-muted hover:text-primary transition">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0L3 4.5v6.75c0 5.32 3.83 10.29 9 11.25 5.17-.96 9-5.93 9-11.25V4.5L12 0zm0 2.18l7.5 3.75v6.32c0 4.45-3.21 8.61-7.5 9.57-4.29-.96-7.5-5.12-7.5-9.57V5.93L12 2.18z"/>
                  </svg>
                  Brave
                </button>
                {/* Opera */}
                <button onClick={() => setShowExtensionModal(true)} className="flex items-center gap-2 text-dark-text-muted hover:text-primary transition">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.14 4.18c-1.32 1.56-2.16 3.9-2.2 6.52v2.6c.04 2.62.88 4.96 2.2 6.52 1.56 1.84 3.54 2.82 5.66 2.82 1.34 0 2.6-.4 3.7-1.14-2.02 1.3-4.32 2-6.74 2-6.76 0-12.24-5.38-12.24-12S4 .5 10.76.5c2.42 0 4.72.7 6.74 2-1.1-.74-2.36-1.14-3.7-1.14-2.12 0-4.1.98-5.66 2.82z"/>
                  </svg>
                  Opera
                </button>
              </div>
            </div>

            <div className="flex-shrink-0">
              <div className="w-48 h-48 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl flex items-center justify-center">
                <Globe className="w-24 h-24 text-primary" />
              </div>
            </div>
          </div>

          {/* Extension Features */}
          <div className="grid md:grid-cols-3 gap-4 mt-8 pt-8 border-t border-dark-border">
            {extensionFeatures.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <feature.icon className="text-primary flex-shrink-0 mt-1" size={20} />
                <div>
                  <h4 className="font-semibold text-sm text-dark-text">{feature.title}</h4>
                  <p className="text-dark-text-dim text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Desktop App Section */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="glass-card bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/30 rounded-3xl p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full text-blue-400 text-sm mb-4">
              <Monitor size={14} />
              Desktop App
            </div>
            <h2 className="text-3xl font-bold text-dark-text mb-4">Desktop Application</h2>
            <p className="text-dark-text-muted max-w-2xl mx-auto">
              Native desktop app for Windows and macOS. Get system tray integration, native notifications, and auto-start on boot.
            </p>
          </div>

          {/* Download Buttons */}
          <div className="flex flex-col md:flex-row gap-6 justify-center mb-8">
            {/* Windows Download */}
            <div className="glass-card border border-dark-border rounded-2xl p-6 min-w-[280px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Monitor className="text-blue-400" size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-dark-text">Windows</h3>
                  <p className="text-sm text-dark-text-muted">
                    {windowsRelease.version ? `v${windowsRelease.version}` : 'Coming Soon'}
                  </p>
                </div>
              </div>
              {windowsRelease.downloadUrl ? (
                <a
                  href={windowsRelease.downloadUrl}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition text-white"
                >
                  <Download size={18} />
                  Download for Windows
                </a>
              ) : (
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 py-3 bg-dark-card-hover text-dark-text-dim rounded-lg font-semibold cursor-not-allowed"
                >
                  Coming Soon
                </button>
              )}
            </div>

            {/* macOS Download */}
            <div className="glass-card border border-dark-border rounded-2xl p-6 min-w-[280px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-500/20 rounded-xl flex items-center justify-center">
                  <Apple className="text-gray-400" size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-dark-text">macOS</h3>
                  <p className="text-sm text-dark-text-muted">
                    {macRelease.version ? `v${macRelease.version}` : 'Coming Soon'}
                  </p>
                </div>
              </div>
              {macRelease.downloadUrl ? (
                <a
                  href={macRelease.downloadUrl}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold transition text-white"
                >
                  <Download size={18} />
                  Download for macOS
                </a>
              ) : (
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 py-3 bg-dark-card-hover text-dark-text-dim rounded-lg font-semibold cursor-not-allowed"
                >
                  Coming Soon
                </button>
              )}
            </div>
          </div>

          {/* SmartScreen Warning */}
          <div className="max-w-xl mx-auto bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-left mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm">
                <p className="font-semibold text-yellow-400 mb-1">Windows SmartScreen Warning</p>
                <p className="text-dark-text-muted">
                  On first launch, Windows may show a SmartScreen warning because our app isn&apos;t code-signed yet.
                  Click &quot;More info&quot; then &quot;Run anyway&quot; to proceed.
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 pt-8 border-t border-dark-border">
            {desktopFeatures.map((feature, i) => (
              <div key={i} className="flex items-start gap-3 bg-dark-card/30 rounded-xl p-4">
                <feature.icon className="text-blue-400 flex-shrink-0 mt-1" size={20} />
                <div>
                  <h4 className="font-semibold text-sm text-dark-text">{feature.title}</h4>
                  <p className="text-dark-text-dim text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Works On Section */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-dark-text mb-8">Works On All Major Platforms</h2>
        <div className="flex flex-wrap justify-center gap-6">
          {/* Browsers */}
          <div className="flex items-center gap-4 px-6 py-3 glass-card rounded-xl">
            <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0z"/>
            </svg>
            <span className="text-dark-text-muted">Chrome</span>
          </div>
          <div className="flex items-center gap-4 px-6 py-3 glass-card rounded-xl">
            <svg className="w-8 h-8 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.86 17.86q.14 0 .25.12.1.13.1.25t-.11.33l-.32.46-.43.53-.44.5q-.21.25-.38.42l-.22.23q-.58.53-1.34 1.04-.76.51-1.6.91-.86.4-1.74.64t-1.67.24q-.9 0-1.69-.28z"/>
            </svg>
            <span className="text-dark-text-muted">Edge</span>
          </div>
          <div className="flex items-center gap-4 px-6 py-3 glass-card rounded-xl">
            <svg className="w-8 h-8 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L3 4.5v6.75c0 5.32 3.83 10.29 9 11.25 5.17-.96 9-5.93 9-11.25V4.5L12 0z"/>
            </svg>
            <span className="text-dark-text-muted">Brave</span>
          </div>
          <div className="flex items-center gap-4 px-6 py-3 glass-card rounded-xl">
            <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.14 4.18c-1.32 1.56-2.16 3.9-2.2 6.52v2.6c.04 2.62.88 4.96 2.2 6.52"/>
            </svg>
            <span className="text-dark-text-muted">Opera</span>
          </div>
          {/* Desktop */}
          <div className="flex items-center gap-4 px-6 py-3 glass-card rounded-xl">
            <Monitor className="w-8 h-8 text-blue-400" />
            <span className="text-dark-text-muted">Windows</span>
          </div>
          <div className="flex items-center gap-4 px-6 py-3 glass-card rounded-xl">
            <Apple className="w-8 h-8 text-gray-400" />
            <span className="text-dark-text-muted">macOS</span>
          </div>
        </div>
      </section>

      {/* Features List */}
      <section className="max-w-6xl mx-auto px-4 py-16 border-t border-dark-border">
        <h2 className="text-3xl font-bold text-center text-dark-text mb-4">Everything You Need</h2>
        <p className="text-dark-text-muted text-center mb-12 max-w-2xl mx-auto">
          All versions include the same powerful mining monitoring features
        </p>

        <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {[
            'Real-time hashrate & worker status',
            'Profit calculation with electricity costs',
            '14+ supported mining pools',
            '25+ supported cryptocurrencies',
            'Price alerts with email notifications',
            'Payout time predictions',
            'Performance charts (7/30/90 days)',
            'Dark & light theme',
            'Cloud sync across devices (Pro)',
            'Worker offline alerts',
            'Profit drop notifications',
            'Background auto-updates (Desktop)',
            'System tray integration (Desktop)',
            'Multi-wallet support (Pro)',
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-3 text-dark-text-muted">
              <CheckCircle2 className="text-primary flex-shrink-0" size={18} />
              {feature}
            </div>
          ))}
        </div>
      </section>

      {/* System Requirements */}
      <section className="max-w-6xl mx-auto px-4 py-16 border-t border-dark-border">
        <h2 className="text-3xl font-bold text-center text-dark-text mb-12">System Requirements</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="glass-card border border-dark-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="text-primary" size={24} />
              <h3 className="font-bold text-lg text-dark-text">Browser Extension</h3>
            </div>
            <ul className="space-y-2 text-dark-text-muted text-sm">
              <li>Chrome 88+, Edge 88+, Brave, or Opera</li>
              <li>Internet connection</li>
              <li>That&apos;s it!</li>
            </ul>
          </div>
          <div className="glass-card border border-dark-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Monitor className="text-blue-400" size={24} />
              <h3 className="font-bold text-lg text-dark-text">Windows</h3>
            </div>
            <ul className="space-y-2 text-dark-text-muted text-sm">
              <li>Windows 10 or later (64-bit)</li>
              <li>4 GB RAM minimum</li>
              <li>100 MB disk space</li>
              <li>Internet connection</li>
            </ul>
          </div>
          <div className="glass-card border border-dark-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Apple className="text-gray-400" size={24} />
              <h3 className="font-bold text-lg text-dark-text">macOS</h3>
            </div>
            <ul className="space-y-2 text-dark-text-muted text-sm">
              <li>macOS 10.13 (High Sierra) or later</li>
              <li>Intel or Apple Silicon</li>
              <li>4 GB RAM minimum</li>
              <li>100 MB disk space</li>
            </ul>
          </div>
        </div>
      </section>

      <Footer />

      {/* Extension Download Modal */}
      <ExtensionDownloadModal
        isOpen={showExtensionModal}
        onClose={() => setShowExtensionModal(false)}
      />
    </div>
  )
}
