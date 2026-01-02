import Header from '@/components/Header'
import Footer from '@/components/Footer'
import FAQ from '@/components/FAQ'

export const metadata = {
  title: 'Support & FAQ - MineGlance',
  description: 'Complete guide to MineGlance features, troubleshooting, and FAQs for your mining profit tracker.',
}

export default function Support() {
  return (
    <main className="min-h-screen">
      <Header />

      {/* Support Hero */}
      <div className="py-16 bg-primary text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Support & Documentation</h1>
          <p className="text-xl text-white/80">
            Everything you need to get the most out of MineGlance
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="py-8 bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3">
            <a href="#getting-started" className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition">Getting Started</a>
            <a href="#features" className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition">Features</a>
            <a href="#pro-vs-free" className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition">Pro vs Free</a>
            <a href="#pools" className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition">Supported Pools</a>
            <a href="#mobile-app" className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition">Mobile App</a>
            <a href="#dashboard" className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition">Dashboard</a>
            <a href="#troubleshooting" className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition">Troubleshooting</a>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div id="getting-started" className="py-12 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-primary mb-6">Getting Started</h2>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-4">Quick Setup (5 minutes)</h3>
              <ol className="list-decimal pl-6 space-y-3 text-foreground/70">
                <li><strong>Install the extension</strong> from the Chrome Web Store</li>
                <li><strong>Click the MineGlance icon</strong> in your browser toolbar (puzzle piece → pin MineGlance)</li>
                <li><strong>Add your wallet</strong> — enter the address you use for mining</li>
                <li><strong>Select your pool</strong> — choose from 10+ supported mining pools</li>
                <li><strong>Enter electricity costs</strong> — your $/kWh rate and GPU power consumption</li>
                <li><strong>See your net profit!</strong> — revenue minus electricity in real-time</li>
              </ol>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-4">Finding Your Wallet Address</h3>
              <p className="text-foreground/70 mb-4">
                Use the same address from your mining software config. Common formats:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2 font-mono">
                  <p><span className="font-bold text-foreground">BTC:</span> bc1... or 1... or 3...</p>
                  <p><span className="font-bold text-foreground">ETC:</span> 0x... (42 chars)</p>
                  <p><span className="font-bold text-foreground">RVN:</span> R... (34 chars)</p>
                  <p><span className="font-bold text-foreground">FIRO:</span> a... (34 chars)</p>
                  <p><span className="font-bold text-foreground">KAS:</span> kaspa:...</p>
                </div>
                <div className="space-y-2 font-mono">
                  <p><span className="font-bold text-foreground">XMR:</span> 4... or 8...</p>
                  <p><span className="font-bold text-foreground">ERG:</span> 9... (51 chars)</p>
                  <p><span className="font-bold text-foreground">FLUX:</span> t1...</p>
                  <p><span className="font-bold text-foreground">ALPH:</span> 1...</p>
                  <p><span className="font-bold text-foreground">ZEC:</span> t1... or t3...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div id="features" className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-primary mb-6">Features Overview</h2>

          <div className="space-y-6">
            <div className="bg-background rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-4">Core Features (All Users)</h3>
              <ul className="space-y-3 text-foreground/70">
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <div><strong>Net Profit Dashboard</strong> — See daily profit after electricity costs</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <div><strong>Multi-Wallet Support</strong> — Track unlimited mining wallets (1 for free, unlimited for Pro)</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <div><strong>Worker Status</strong> — See which rigs are online/offline</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <div><strong>Hashrate Tracking</strong> — Current, 5-min, and 24hr averages</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <div><strong>Earnings Display</strong> — Unpaid balance, 24hr earnings in USD</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <div><strong>Auto-Refresh</strong> — Configurable refresh interval (15m-3hr)</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <div><strong>Minable Coins Discovery</strong> — See trending and profitable coins</div>
                </li>
              </ul>
            </div>

            <div className="bg-background rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                Pro Features
                <span className="px-2 py-0.5 bg-accent text-white text-xs rounded-full">PRO</span>
              </h3>
              <ul className="space-y-3 text-foreground/70">
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <div><strong>Unlimited Wallets</strong> — Track all your mining rigs</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <div><strong>Browser Alerts</strong> — Worker offline, profit drop notifications</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <div><strong>Email Alerts</strong> — Get notified even when browser is closed</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <div><strong>Better Coin Alerts</strong> — Know when to switch coins</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <div><strong>User Dashboard</strong> — Manage license, devices, alerts online</div>
                </li>
              </ul>
            </div>

            <div className="bg-background rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                Pro+ Bundle Features
                <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">PRO+</span>
              </h3>
              <ul className="space-y-3 text-foreground/70">
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <div><strong>Everything in Pro</strong></div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <div><strong>iOS Mobile App</strong> — Check mining stats on the go</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <div><strong>QR Code Sync</strong> — Instantly transfer settings to mobile</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <div><strong>Push Notifications</strong> — Mobile alerts for offline workers</div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Pro vs Free */}
      <div id="pro-vs-free" className="py-12 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-primary mb-6">Pro vs Free Comparison</h2>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Feature</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Free</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Pro ($29)</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Pro+ ($59)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-6 py-3 text-sm text-foreground">Wallets</td>
                  <td className="px-6 py-3 text-center text-sm">1</td>
                  <td className="px-6 py-3 text-center text-sm text-accent font-medium">Unlimited</td>
                  <td className="px-6 py-3 text-center text-sm text-accent font-medium">Unlimited</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-6 py-3 text-sm text-foreground">Auto-Refresh</td>
                  <td className="px-6 py-3 text-center text-sm text-accent">✓</td>
                  <td className="px-6 py-3 text-center text-sm text-accent">✓</td>
                  <td className="px-6 py-3 text-center text-sm text-accent">✓</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-foreground">Worker Status</td>
                  <td className="px-6 py-3 text-center text-sm text-accent">✓</td>
                  <td className="px-6 py-3 text-center text-sm text-accent">✓</td>
                  <td className="px-6 py-3 text-center text-sm text-accent">✓</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-6 py-3 text-sm text-foreground">Profit Calculation</td>
                  <td className="px-6 py-3 text-center text-sm text-accent">✓</td>
                  <td className="px-6 py-3 text-center text-sm text-accent">✓</td>
                  <td className="px-6 py-3 text-center text-sm text-accent">✓</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-foreground">Browser Alerts</td>
                  <td className="px-6 py-3 text-center text-sm text-gray-400">—</td>
                  <td className="px-6 py-3 text-center text-sm text-accent">✓</td>
                  <td className="px-6 py-3 text-center text-sm text-accent">✓</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-6 py-3 text-sm text-foreground">Email Alerts</td>
                  <td className="px-6 py-3 text-center text-sm text-gray-400">—</td>
                  <td className="px-6 py-3 text-center text-sm text-accent">✓</td>
                  <td className="px-6 py-3 text-center text-sm text-accent">✓</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-foreground">User Dashboard</td>
                  <td className="px-6 py-3 text-center text-sm text-gray-400">—</td>
                  <td className="px-6 py-3 text-center text-sm text-accent">✓</td>
                  <td className="px-6 py-3 text-center text-sm text-accent">✓</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-6 py-3 text-sm text-foreground">Mobile App (iOS)</td>
                  <td className="px-6 py-3 text-center text-sm text-gray-400">—</td>
                  <td className="px-6 py-3 text-center text-sm text-gray-400">—</td>
                  <td className="px-6 py-3 text-center text-sm text-accent">✓</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-foreground">Push Notifications</td>
                  <td className="px-6 py-3 text-center text-sm text-gray-400">—</td>
                  <td className="px-6 py-3 text-center text-sm text-gray-400">—</td>
                  <td className="px-6 py-3 text-center text-sm text-accent">✓</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-6 py-3 text-sm text-foreground">Device Activations</td>
                  <td className="px-6 py-3 text-center text-sm">—</td>
                  <td className="px-6 py-3 text-center text-sm">3</td>
                  <td className="px-6 py-3 text-center text-sm">3</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-foreground">License Type</td>
                  <td className="px-6 py-3 text-center text-sm">—</td>
                  <td className="px-6 py-3 text-center text-sm">Lifetime</td>
                  <td className="px-6 py-3 text-center text-sm">Lifetime</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Supported Pools */}
      <div id="pools" className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-primary mb-6">Supported Mining Pools</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-background rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-3">Regular Pools</h3>
              <ul className="space-y-2 text-foreground/70">
                <li><strong>2Miners</strong> — ETC, RVN, ERG, FLUX, KAS, FIRO, and more</li>
                <li><strong>F2Pool</strong> — BTC, LTC, and major coins</li>
                <li><strong>Ethermine</strong> — ETC mining</li>
                <li><strong>Hiveon</strong> — ETC, RVN</li>
                <li><strong>Nanopool</strong> — ETC, XMR, ERG, RVN, ZEC, CFX</li>
                <li><strong>HeroMiners</strong> — Multiple GPU coins</li>
                <li><strong>WoolyPooly</strong> — ERG, CFX, and more</li>
                <li><strong>Cedric Crispin</strong> — FIRO solo/pool mining</li>
              </ul>
            </div>
            <div className="bg-background rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-3">Solo Mining Pools</h3>
              <ul className="space-y-2 text-foreground/70">
                <li><strong>CKPool Solo</strong> — BTC solo mining (US)</li>
                <li><strong>CKPool EU Solo</strong> — BTC solo mining (EU)</li>
                <li><strong>Public Pool</strong> — BTC solo (Bitaxe friendly)</li>
                <li><strong>OCEAN</strong> — BTC solo with transparent payouts</li>
              </ul>
              <p className="text-sm text-foreground/50 mt-4">
                Solo mining pools have a 4-hour stale threshold to reduce false offline alerts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile App */}
      <div id="mobile-app" className="py-12 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-primary mb-6">
            Mobile App
            <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full align-middle">PRO+</span>
          </h2>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-4">Setting Up the Mobile App</h3>
              <ol className="list-decimal pl-6 space-y-3 text-foreground/70">
                <li>Download &quot;MineGlance&quot; from the App Store (iOS)</li>
                <li>In the Chrome extension, go to <strong>Settings → Display QR Code</strong></li>
                <li>Open the mobile app and tap <strong>Scan QR Code</strong></li>
                <li>Point your camera at the QR code on screen</li>
                <li>All your wallets and settings will sync instantly</li>
              </ol>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-4">Mobile App Features</h3>
              <ul className="space-y-2 text-foreground/70">
                <li>✓ All wallets synced from extension</li>
                <li>✓ Real-time hashrate and worker status</li>
                <li>✓ Net profit calculation with your electricity settings</li>
                <li>✓ Pull-to-refresh for latest stats</li>
                <li>✓ Push notifications for offline workers (coming soon)</li>
                <li>✓ Wallet reordering via drag-and-drop</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* User Dashboard */}
      <div id="dashboard" className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-primary mb-6">
            User Dashboard
            <span className="ml-2 px-2 py-0.5 bg-accent text-white text-xs rounded-full align-middle">PRO</span>
          </h2>

          <div className="space-y-6">
            <div className="bg-background rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-4">Accessing the Dashboard</h3>
              <ol className="list-decimal pl-6 space-y-3 text-foreground/70">
                <li>Go to <a href="https://www.mineglance.com/dashboard" className="text-primary hover:underline">mineglance.com/dashboard</a></li>
                <li>Enter your email and set a password (first time)</li>
                <li>Manage your devices, alerts, and profile settings</li>
              </ol>
            </div>

            <div className="bg-background rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-4">Dashboard Sections</h3>
              <ul className="space-y-3 text-foreground/70">
                <li><strong>Overview</strong> — License info, quick stats</li>
                <li><strong>Profile</strong> — Update name, email, phone, address</li>
                <li><strong>Devices</strong> — See active devices, buy more activations</li>
                <li><strong>Alerts</strong> — Configure browser & email notifications</li>
                <li><strong>Roadmap</strong> — Submit feature requests, see upcoming features</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div id="troubleshooting" className="py-12 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-primary mb-6">Troubleshooting</h2>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-2">&quot;No data found&quot; or &quot;Wallet not found&quot;</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/70">
                <li>Check wallet address for typos (copy/paste recommended)</li>
                <li>Ensure you&apos;ve mined to this pool before — new addresses have no history</li>
                <li>Verify the correct pool is selected</li>
                <li>Some pools take 10-15 minutes to show new miners</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-2">Data not updating</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/70">
                <li>Click the refresh button to force a manual refresh</li>
                <li>Check your refresh interval in Settings (15m to 3hr)</li>
                <li>Pool APIs sometimes have delays — wait a few minutes</li>
                <li>Try removing and re-adding the wallet</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-2">False offline alerts (especially solo mining)</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/70">
                <li>Solo mining pools (CKPool, Public Pool, OCEAN) have infrequent shares</li>
                <li>We use a 4-hour stale threshold for solo pools to reduce false alerts</li>
                <li>Alerts require 3 consecutive offline checks before triggering</li>
                <li>If you still get false alerts, contact support</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-2">Pro license not activating</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/70">
                <li>Use the license key from your purchase confirmation email</li>
                <li>Format: XXXX-XXXX-XXXX-XXXX (16 characters with dashes)</li>
                <li>Legacy format MG-XXXX-XXXX-XXXX also works</li>
                <li>Check spam folder for the confirmation email</li>
                <li>Each license allows 3 device activations</li>
                <li>Need more devices? Buy license packs in Dashboard → Devices</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-2">Email alerts not working</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/70">
                <li>Email alerts require an active Pro license</li>
                <li>Enable in Settings → Notifications → Send alerts to email</li>
                <li>Or configure in Dashboard → Alerts (syncs to all devices)</li>
                <li>Check spam folder for emails from alerts@mineglance.com</li>
                <li>Use &quot;Send Test Email&quot; to verify it&apos;s working</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-2">Mobile app not syncing</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/70">
                <li>Mobile app requires Pro+ Bundle license</li>
                <li>Re-scan the QR code from extension settings</li>
                <li>Make sure the extension is up to date</li>
                <li>Check that camera permissions are enabled for the app</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <FAQ />

      {/* Contact */}
      <div className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-primary mb-6">Still Need Help?</h2>

          <div className="bg-background rounded-xl p-8 border border-gray-200 text-center">
            <p className="text-lg text-foreground/80 mb-6">
              Can&apos;t find what you&apos;re looking for? We typically respond within 24 hours.
            </p>
            <a
              href="mailto:control@mineglance.com"
              className="inline-flex items-center justify-center px-6 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
            >
              Email Support
            </a>
            <p className="mt-4 text-sm text-foreground/60">
              control@mineglance.com
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
