'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import FAQ from '@/components/FAQ'

export default function Support() {
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="min-h-screen bg-dark-bg">
      <Header />

      {/* Support Hero */}
      <div className="py-16 bg-gradient-to-r from-primary/20 to-primary/10 border-b border-dark-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">
            <span className="text-gradient">Support & Documentation</span>
          </h1>
          <p className="text-xl text-dark-text-muted">
            Everything you need to get the most out of MineGlance
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="py-8 border-b border-dark-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3">
            <a href="#getting-started" className="px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-medium hover:bg-primary/30 transition">Getting Started</a>
            <a href="#features" className="px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-medium hover:bg-primary/30 transition">Features</a>
            <a href="#pro-vs-free" className="px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-medium hover:bg-primary/30 transition">Pro vs Free</a>
            <a href="#pools" className="px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-medium hover:bg-primary/30 transition">Supported Pools</a>
            <a href="#coins" className="px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-medium hover:bg-primary/30 transition">Supported Coins</a>
            <a href="#cloud-sync" className="px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-medium hover:bg-primary/30 transition">Cloud Sync</a>
            <a href="#dashboard" className="px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-medium hover:bg-primary/30 transition">Dashboard</a>
            <a href="#troubleshooting" className="px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-medium hover:bg-primary/30 transition">Troubleshooting</a>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div id="getting-started" className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gradient mb-6">Getting Started</h2>

          <div className="space-y-6">
            <div className="glass-card rounded-xl p-6 border border-dark-border">
              <h3 className="font-semibold text-dark-text mb-4">Quick Setup (5 minutes)</h3>
              <ol className="list-decimal pl-6 space-y-3 text-dark-text-muted">
                <li><strong className="text-dark-text">Install the extension</strong> from our website (Chrome, Edge, Brave, Opera)</li>
                <li><strong className="text-dark-text">Click the MineGlance icon</strong> in your browser toolbar (puzzle piece &rarr; pin MineGlance)</li>
                <li><strong className="text-dark-text">Add your wallet</strong> &mdash; enter the address you use for mining</li>
                <li><strong className="text-dark-text">Select your pool</strong> &mdash; choose from 10+ supported mining pools</li>
                <li><strong className="text-dark-text">Enter electricity costs</strong> &mdash; your $/kWh rate and GPU power consumption</li>
                <li><strong className="text-dark-text">See your net profit!</strong> &mdash; revenue minus electricity in real-time</li>
              </ol>
            </div>

            <div className="glass-card rounded-xl p-6 border border-dark-border">
              <h3 className="font-semibold text-dark-text mb-4">Finding Your Wallet Address</h3>
              <p className="text-dark-text-muted mb-4">
                Use the same address from your mining software config. Common formats:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2 font-mono">
                  <p><span className="font-bold text-primary">BTC:</span> <span className="text-dark-text-muted">bc1... or 1... or 3...</span></p>
                  <p><span className="font-bold text-primary">ETC:</span> <span className="text-dark-text-muted">0x... (42 chars)</span></p>
                  <p><span className="font-bold text-primary">RVN:</span> <span className="text-dark-text-muted">R... (34 chars)</span></p>
                  <p><span className="font-bold text-primary">FIRO:</span> <span className="text-dark-text-muted">a... (34 chars)</span></p>
                  <p><span className="font-bold text-primary">KAS:</span> <span className="text-dark-text-muted">kaspa:...</span></p>
                </div>
                <div className="space-y-2 font-mono">
                  <p><span className="font-bold text-primary">XMR:</span> <span className="text-dark-text-muted">4... or 8...</span></p>
                  <p><span className="font-bold text-primary">ERG:</span> <span className="text-dark-text-muted">9... (51 chars)</span></p>
                  <p><span className="font-bold text-primary">FLUX:</span> <span className="text-dark-text-muted">t1...</span></p>
                  <p><span className="font-bold text-primary">ALPH:</span> <span className="text-dark-text-muted">1...</span></p>
                  <p><span className="font-bold text-primary">ZEC:</span> <span className="text-dark-text-muted">t1... or t3...</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div id="features" className="py-12 border-t border-dark-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gradient mb-6">Features Overview</h2>

          <div className="space-y-6">
            <div className="glass-card rounded-xl p-6 border border-dark-border">
              <h3 className="font-semibold text-dark-text mb-4">Core Features (All Users)</h3>
              <ul className="space-y-3 text-dark-text-muted">
                <li className="flex items-start gap-3">
                  <span className="text-primary">&#10003;</span>
                  <div><strong className="text-dark-text">Net Profit Dashboard</strong> &mdash; See daily profit after electricity costs</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">&#10003;</span>
                  <div><strong className="text-dark-text">Multi-Wallet Support</strong> &mdash; Track unlimited mining wallets (1 for free, unlimited for Pro)</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">&#10003;</span>
                  <div><strong className="text-dark-text">Worker Status</strong> &mdash; See which rigs are online/offline</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">&#10003;</span>
                  <div><strong className="text-dark-text">Hashrate Tracking</strong> &mdash; Current, 5-min, and 24hr averages</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">&#10003;</span>
                  <div><strong className="text-dark-text">Earnings Display</strong> &mdash; Unpaid balance, 24hr earnings in USD</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">&#10003;</span>
                  <div><strong className="text-dark-text">Auto-Refresh</strong> &mdash; Configurable refresh interval (15m-3hr)</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">&#10003;</span>
                  <div><strong className="text-dark-text">Minable Coins Discovery</strong> &mdash; See trending and profitable coins</div>
                </li>
              </ul>
            </div>

            <div className="glass-card rounded-xl p-6 border border-dark-border">
              <h3 className="font-semibold text-dark-text mb-4 flex items-center gap-2">
                Pro Features
                <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full">PRO</span>
              </h3>
              <ul className="space-y-3 text-dark-text-muted">
                <li className="flex items-start gap-3">
                  <span className="text-primary">&#10003;</span>
                  <div><strong className="text-dark-text">Unlimited Wallets</strong> &mdash; Track all your mining rigs</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">&#10003;</span>
                  <div><strong className="text-dark-text">Browser Alerts</strong> &mdash; Worker offline, profit drop notifications</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">&#10003;</span>
                  <div><strong className="text-dark-text">Email Alerts</strong> &mdash; Get notified even when browser is closed</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">&#10003;</span>
                  <div><strong className="text-dark-text">Better Coin Alerts</strong> &mdash; Know when to switch coins</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">&#10003;</span>
                  <div><strong className="text-dark-text">User Dashboard</strong> &mdash; Manage license, devices, alerts online</div>
                </li>
              </ul>
            </div>

            <div className="glass-card rounded-xl p-6 border border-primary/30">
              <h3 className="font-semibold text-dark-text mb-4 flex items-center gap-2">
                Cloud Sync Features
                <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full">PRO</span>
              </h3>
              <ul className="space-y-3 text-dark-text-muted">
                <li className="flex items-start gap-3">
                  <span className="text-primary">&#10003;</span>
                  <div><strong className="text-dark-text">Cloud Sync</strong> &mdash; Wallets sync automatically across all your browsers</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">&#10003;</span>
                  <div><strong className="text-dark-text">Cross-Device Access</strong> &mdash; Access your mining dashboard from any computer</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">&#10003;</span>
                  <div><strong className="text-dark-text">Browser Notifications</strong> &mdash; Desktop alerts for offline workers</div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Pro vs Free */}
      <div id="pro-vs-free" className="py-12 border-t border-dark-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gradient mb-6">Pro vs Free Comparison</h2>

          <div className="glass-card rounded-xl border border-dark-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-dark-card-hover">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-dark-text">Feature</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-dark-text">Free</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-dark-text">Pro ($59/year)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                <tr>
                  <td className="px-6 py-3 text-sm text-dark-text">Wallets</td>
                  <td className="px-6 py-3 text-center text-sm text-dark-text-muted">1</td>
                  <td className="px-6 py-3 text-center text-sm text-primary font-medium">Unlimited</td>
                </tr>
                <tr className="bg-dark-card-hover/50">
                  <td className="px-6 py-3 text-sm text-dark-text">Auto-Refresh</td>
                  <td className="px-6 py-3 text-center text-sm text-primary">&#10003;</td>
                  <td className="px-6 py-3 text-center text-sm text-primary">&#10003;</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-dark-text">Worker Status</td>
                  <td className="px-6 py-3 text-center text-sm text-primary">&#10003;</td>
                  <td className="px-6 py-3 text-center text-sm text-primary">&#10003;</td>
                </tr>
                <tr className="bg-dark-card-hover/50">
                  <td className="px-6 py-3 text-sm text-dark-text">Profit Calculation</td>
                  <td className="px-6 py-3 text-center text-sm text-primary">&#10003;</td>
                  <td className="px-6 py-3 text-center text-sm text-primary">&#10003;</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-dark-text">Browser Alerts</td>
                  <td className="px-6 py-3 text-center text-sm text-dark-text-dim">&mdash;</td>
                  <td className="px-6 py-3 text-center text-sm text-primary">&#10003;</td>
                </tr>
                <tr className="bg-dark-card-hover/50">
                  <td className="px-6 py-3 text-sm text-dark-text">Email Alerts</td>
                  <td className="px-6 py-3 text-center text-sm text-dark-text-dim">&mdash;</td>
                  <td className="px-6 py-3 text-center text-sm text-primary">&#10003;</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-dark-text">User Dashboard</td>
                  <td className="px-6 py-3 text-center text-sm text-dark-text-dim">&mdash;</td>
                  <td className="px-6 py-3 text-center text-sm text-primary">&#10003;</td>
                </tr>
                <tr className="bg-dark-card-hover/50">
                  <td className="px-6 py-3 text-sm text-dark-text">Cloud Sync</td>
                  <td className="px-6 py-3 text-center text-sm text-dark-text-dim">&mdash;</td>
                  <td className="px-6 py-3 text-center text-sm text-primary">&#10003;</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-dark-text">License Type</td>
                  <td className="px-6 py-3 text-center text-sm text-dark-text-muted">&mdash;</td>
                  <td className="px-6 py-3 text-center text-sm text-dark-text-muted">Annual</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Supported Pools */}
      <div id="pools" className="py-12 border-t border-dark-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gradient mb-6">Supported Mining Pools</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card rounded-xl p-6 border border-dark-border">
              <h3 className="font-semibold text-dark-text mb-3">Regular Pools</h3>
              <ul className="space-y-2 text-dark-text-muted text-sm">
                <li><strong className="text-primary">2Miners</strong> &mdash; ETC, RVN, ERG, FLUX, KAS, FIRO, and more</li>
                <li><strong className="text-primary">F2Pool</strong> &mdash; BTC, LTC, and major coins</li>
                <li><strong className="text-primary">Ethermine</strong> &mdash; ETC mining</li>
                <li><strong className="text-primary">Hiveon</strong> &mdash; ETC, RVN</li>
                <li><strong className="text-primary">Nanopool</strong> &mdash; ETC, XMR, ERG, RVN, ZEC, CFX</li>
                <li><strong className="text-primary">HeroMiners</strong> &mdash; Multiple GPU coins</li>
                <li><strong className="text-primary">WoolyPooly</strong> &mdash; ERG, CFX, RVN, KAS, and more</li>
                <li><strong className="text-primary">Cedric Crispin</strong> &mdash; FIRO solo/pool mining</li>
              </ul>
            </div>
            <div className="glass-card rounded-xl p-6 border border-primary/30">
              <h3 className="font-semibold text-dark-text mb-3">Solo Mining Pools</h3>
              <ul className="space-y-2 text-dark-text-muted text-sm">
                <li><strong className="text-primary">CKPool Solo</strong> &mdash; BTC solo mining (US)</li>
                <li><strong className="text-primary">CKPool EU Solo</strong> &mdash; BTC solo mining (EU)</li>
                <li><strong className="text-primary">Public Pool</strong> &mdash; BTC solo (Bitaxe friendly, low difficulty)</li>
                <li><strong className="text-primary">OCEAN</strong> &mdash; BTC solo with transparent payouts</li>
              </ul>
              <p className="text-sm text-dark-text-dim mt-4">
                Solo mining pools have a 4-hour stale threshold to reduce false offline alerts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Supported Coins */}
      <div id="coins" className="py-12 border-t border-dark-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gradient mb-6">Supported Coins</h2>

          <div className="glass-card rounded-xl p-6 border border-dark-border">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {['BTC', 'ETC', 'RVN', 'ERG', 'FLUX', 'KAS', 'ALPH', 'NEXA', 'XMR', 'ZEC', 'LTC', 'FIRO', 'CFX', 'BEAM', 'RTM', 'NEOXA'].map((coin) => (
                <div key={coin} className="flex items-center gap-2 px-3 py-2 bg-dark-card-hover rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  <span className="font-mono text-sm text-dark-text">{coin}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-dark-text-muted mt-4">
              Coin availability depends on pool support. Use the Minable Coins Discovery feature to find profitable alternatives.
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Sync */}
      <div id="cloud-sync" className="py-12 border-t border-dark-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gradient mb-6">
            Cloud Sync
            <span className="ml-2 px-2 py-0.5 bg-primary text-white text-xs rounded-full align-middle">PRO</span>
          </h2>

          <div className="space-y-6">
            <div className="glass-card rounded-xl p-6 border border-dark-border">
              <h3 className="font-semibold text-dark-text mb-4">Setting Up Cloud Sync</h3>
              <ol className="list-decimal pl-6 space-y-3 text-dark-text-muted">
                <li>Purchase a Pro license and enter your license key in the extension</li>
                <li>Your wallets and settings will automatically sync to the cloud</li>
                <li>Install MineGlance on any other browser (Chrome, Edge, Brave, Opera)</li>
                <li>Enter the same license key to sync your wallets instantly</li>
              </ol>
            </div>

            <div className="glass-card rounded-xl p-6 border border-dark-border">
              <h3 className="font-semibold text-dark-text mb-4">Cloud Sync Features</h3>
              <ul className="space-y-2 text-dark-text-muted">
                <li className="flex items-center gap-2"><span className="text-primary">&#10003;</span> Automatic sync across all browsers</li>
                <li className="flex items-center gap-2"><span className="text-primary">&#10003;</span> Wallets, settings, and preferences all sync</li>
                <li className="flex items-center gap-2"><span className="text-primary">&#10003;</span> Access your mining dashboard from any computer</li>
                <li className="flex items-center gap-2"><span className="text-primary">&#10003;</span> Real-time updates when you make changes</li>
                <li className="flex items-center gap-2"><span className="text-primary">&#10003;</span> Secure AES-256 encryption for all synced data</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* User Dashboard */}
      <div id="dashboard" className="py-12 border-t border-dark-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gradient mb-6">
            User Dashboard
            <span className="ml-2 px-2 py-0.5 bg-primary text-white text-xs rounded-full align-middle">PRO</span>
          </h2>

          <div className="space-y-6">
            <div className="glass-card rounded-xl p-6 border border-dark-border">
              <h3 className="font-semibold text-dark-text mb-4">Accessing the Dashboard</h3>
              <ol className="list-decimal pl-6 space-y-3 text-dark-text-muted">
                <li>Go to <a href="https://www.mineglance.com/dashboard" className="text-primary hover:underline">mineglance.com/dashboard</a></li>
                <li>Enter your license key and email</li>
                <li>Set a password (first time) or sign in</li>
                <li>Manage your devices, alerts, and profile settings</li>
              </ol>
            </div>

            <div className="glass-card rounded-xl p-6 border border-dark-border">
              <h3 className="font-semibold text-dark-text mb-4">Dashboard Sections</h3>
              <ul className="space-y-3 text-dark-text-muted">
                <li><strong className="text-dark-text">Overview</strong> &mdash; License info, quick stats, device count</li>
                <li><strong className="text-dark-text">Profile</strong> &mdash; Update name, email, phone, address, photo</li>
                <li><strong className="text-dark-text">Devices</strong> &mdash; See active devices, deactivate, buy more activations</li>
                <li><strong className="text-dark-text">Alerts</strong> &mdash; Configure browser & email notifications</li>
                <li><strong className="text-dark-text">Roadmap</strong> &mdash; Submit feature requests, see upcoming features</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div id="troubleshooting" className="py-12 border-t border-dark-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gradient mb-6">Troubleshooting</h2>

          <div className="space-y-6">
            <div className="glass-card rounded-xl p-6 border border-dark-border">
              <h3 className="font-semibold text-dark-text mb-2">&quot;No data found&quot; or &quot;Wallet not found&quot;</h3>
              <ul className="list-disc pl-6 space-y-2 text-dark-text-muted">
                <li>Check wallet address for typos (copy/paste recommended)</li>
                <li>Ensure you&apos;ve mined to this pool before &mdash; new addresses have no history</li>
                <li>Verify the correct pool is selected</li>
                <li>Some pools take 10-15 minutes to show new miners</li>
              </ul>
            </div>

            <div className="glass-card rounded-xl p-6 border border-dark-border">
              <h3 className="font-semibold text-dark-text mb-2">Data not updating</h3>
              <ul className="list-disc pl-6 space-y-2 text-dark-text-muted">
                <li>Click the refresh button to force a manual refresh</li>
                <li>Check your refresh interval in Settings (15m to 3hr)</li>
                <li>Pool APIs sometimes have delays &mdash; wait a few minutes</li>
                <li>Try removing and re-adding the wallet</li>
              </ul>
            </div>

            <div className="glass-card rounded-xl p-6 border border-amber-500/30">
              <h3 className="font-semibold text-dark-text mb-2">False offline alerts (especially solo mining)</h3>
              <ul className="list-disc pl-6 space-y-2 text-dark-text-muted">
                <li>Solo mining pools (CKPool, Public Pool, OCEAN) have infrequent shares</li>
                <li>We use a 4-hour stale threshold for solo pools to reduce false alerts</li>
                <li>Alerts require 3 consecutive offline checks before triggering</li>
                <li>If you still get false alerts, contact support</li>
              </ul>
            </div>

            <div className="glass-card rounded-xl p-6 border border-dark-border">
              <h3 className="font-semibold text-dark-text mb-2">Pro license not activating</h3>
              <ul className="list-disc pl-6 space-y-2 text-dark-text-muted">
                <li>Use the license key from your purchase confirmation email</li>
                <li>Format: XXXX-XXXX-XXXX-XXXX (16 characters with dashes)</li>
                <li>Legacy format MG-XXXX-XXXX-XXXX also works</li>
                <li>Check spam folder for the confirmation email</li>
                <li>Each license allows 3 device activations</li>
                <li>Need more devices? Buy license packs in Dashboard &rarr; Devices</li>
              </ul>
            </div>

            <div className="glass-card rounded-xl p-6 border border-dark-border">
              <h3 className="font-semibold text-dark-text mb-2">Email alerts not working</h3>
              <ul className="list-disc pl-6 space-y-2 text-dark-text-muted">
                <li>Email alerts require an active Pro license</li>
                <li>Enable in Settings &rarr; Notifications &rarr; Send alerts to email</li>
                <li>Or configure in Dashboard &rarr; Alerts (syncs to all devices)</li>
                <li>Check spam folder for emails from alerts@mineglance.com</li>
                <li>Use &quot;Send Test Email&quot; to verify it&apos;s working</li>
              </ul>
            </div>

            <div className="glass-card rounded-xl p-6 border border-dark-border">
              <h3 className="font-semibold text-dark-text mb-2">Cloud sync not working</h3>
              <ul className="list-disc pl-6 space-y-2 text-dark-text-muted">
                <li>Cloud sync requires Pro license ($59/year)</li>
                <li>Make sure you&apos;re using the same license key on all browsers</li>
                <li>Try refreshing the extension by clicking the refresh button</li>
                <li>Check your internet connection</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <FAQ />

      {/* Contact */}
      <div className="py-12 border-t border-dark-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gradient mb-6">Still Need Help?</h2>

          <div className="glass-card rounded-xl p-8 border border-dark-border text-center">
            <p className="text-lg text-dark-text-muted mb-6">
              Can&apos;t find what you&apos;re looking for? We typically respond within 24 hours.
            </p>
            <a
              href="mailto:control@mineglance.com"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-light transition-colors shadow-glow hover:shadow-glow-lg"
            >
              Email Support
            </a>
            <p className="mt-4 text-sm text-dark-text-dim">
              control@mineglance.com
            </p>
          </div>
        </div>
      </div>

      <Footer />

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-primary hover:bg-primary-light text-white rounded-full shadow-glow hover:shadow-glow-lg transition-all flex items-center justify-center group"
          title="Back to top"
        >
          {/* BTC/Mining pickaxe icon with arrow */}
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* Arrow up */}
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
            {/* Small pickaxe accent */}
            <circle cx="18" cy="18" r="3" className="fill-primary stroke-white opacity-60" />
            <path d="M18 16v4" className="opacity-60" />
            <path d="M16 18h4" className="opacity-60" />
          </svg>
        </button>
      )}
    </main>
  )
}
