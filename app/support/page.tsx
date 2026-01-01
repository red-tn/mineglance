import Header from '@/components/Header'
import Footer from '@/components/Footer'
import FAQ from '@/components/FAQ'

export const metadata = {
  title: 'Support - MineGlance',
  description: 'Get help with MineGlance. FAQs, troubleshooting, and contact information.',
}

export default function Support() {
  return (
    <main className="min-h-screen">
      <Header />

      {/* Support Hero */}
      <div className="py-16 bg-primary text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Support</h1>
          <p className="text-xl text-white/80">
            Need help? We&apos;ve got you covered.
          </p>
        </div>
      </div>

      {/* Quick Help */}
      <div className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-primary mb-6">Quick Help</h2>

          <div className="grid gap-6">
            <div className="bg-background rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-2">Getting Started</h3>
              <ol className="list-decimal pl-6 space-y-2 text-foreground/70">
                <li>Install MineGlance from the Chrome Web Store</li>
                <li>Click the MineGlance icon in your browser toolbar</li>
                <li>Enter your wallet address for the pool you use</li>
                <li>Enter your electricity rate ($/kWh) and GPU power consumption</li>
                <li>See your net profit instantly</li>
              </ol>
            </div>

            <div className="bg-background rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-2">Finding Your Wallet Address</h3>
              <p className="text-foreground/70 mb-3">
                Your wallet address is the same address you use when configuring your mining software.
                Here are the formats for each supported coin:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-foreground/70 font-mono text-sm">
                <div className="space-y-1">
                  <p><strong className="text-foreground">ETC:</strong> 0x... (42 chars)</p>
                  <p><strong className="text-foreground">RVN:</strong> R... (34 chars)</p>
                  <p><strong className="text-foreground">ERG:</strong> 9... (51 chars)</p>
                  <p><strong className="text-foreground">FLUX:</strong> t1... (35 chars)</p>
                  <p><strong className="text-foreground">KAS:</strong> kaspa:...</p>
                  <p><strong className="text-foreground">ALPH:</strong> 1... (46 chars)</p>
                  <p><strong className="text-foreground">NEXA:</strong> nexa:...</p>
                  <p><strong className="text-foreground">XNA:</strong> X... (34 chars)</p>
                </div>
                <div className="space-y-1">
                  <p><strong className="text-foreground">XMR:</strong> 4... or 8... (95 chars)</p>
                  <p><strong className="text-foreground">ZEC:</strong> t1... or t3...</p>
                  <p><strong className="text-foreground">BTC:</strong> bc1... or 1... or 3...</p>
                  <p><strong className="text-foreground">LTC:</strong> L... or ltc1...</p>
                  <p><strong className="text-foreground">DASH:</strong> X... (34 chars)</p>
                  <p><strong className="text-foreground">CFX:</strong> cfx:...</p>
                  <p><strong className="text-foreground">FIRO:</strong> a... (34 chars)</p>
                  <p><strong className="text-foreground">BEAM:</strong> starts with digits</p>
                </div>
              </div>
              <p className="text-foreground/70 mt-3">
                You can also find your address on your pool dashboard under &quot;Wallet&quot; or &quot;Miner Address&quot;.
              </p>
            </div>

            <div className="bg-background rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-2">Electricity Cost Tips</h3>
              <p className="text-foreground/70 mb-3">
                For accurate profit calculations, you need two values:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground/70">
                <li>
                  <strong>Electricity rate:</strong> Find this on your power bill. Look for &quot;$/kWh&quot; or
                  &quot;cents per kilowatt-hour&quot;. US average is ~$0.12/kWh.
                </li>
                <li>
                  <strong>GPU power consumption:</strong> Check your mining software or use GPU-Z while mining.
                  A 3060 Ti typically uses ~120W, a 3080 uses ~220W.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="py-12 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-primary mb-6">Troubleshooting</h2>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-2">&quot;No data found&quot; error</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/70">
                <li>Double-check your wallet address for typos</li>
                <li>Make sure you&apos;ve mined to this pool before (new addresses have no data)</li>
                <li>Verify you selected the correct pool</li>
                <li>Some pools take 10-15 minutes to show new miners</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-2">Data not updating</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/70">
                <li>Free version requires manual refresh — click the refresh button</li>
                <li>Pro version auto-refreshes every 5 minutes</li>
                <li>Pool APIs sometimes have delays — wait a few minutes</li>
                <li>Try removing and re-adding your wallet</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-2">Extension not showing in toolbar</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/70">
                <li>Click the puzzle piece icon in Chrome&apos;s toolbar</li>
                <li>Find MineGlance and click the pin icon</li>
                <li>The MineGlance icon should now appear in your toolbar</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-2">Pro license not activating</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/70">
                <li>Make sure you&apos;re using the license key from your purchase email</li>
                <li>Check your spam folder for the confirmation email</li>
                <li>License format: MG-XXXX-XXXX-XXXX</li>
                <li>Contact control@mineglance.com with your purchase email</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-2">Email alerts not working</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/70">
                <li>Email alerts are a Pro feature — make sure your license is activated</li>
                <li>Go to Settings &rarr; Notifications &rarr; Enable &quot;Send alerts to email&quot;</li>
                <li>Enter a valid email address in the email field</li>
                <li>Make sure at least one alert type is enabled (Worker Offline, Profit Drop, Better Coin)</li>
                <li>Check your spam folder for emails from alerts@mineglance.com</li>
                <li>Alert rate limit: max 10 emails per hour to prevent spam</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Email Alerts */}
      <div className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-primary mb-6">Email Alerts (Pro Feature)</h2>

          <div className="space-y-6">
            <div className="bg-background rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-2">Setting Up Email Alerts</h3>
              <ol className="list-decimal pl-6 space-y-2 text-foreground/70">
                <li>Open the MineGlance extension and click the gear icon</li>
                <li>Scroll to the &quot;Notifications&quot; section</li>
                <li>Enable the alert types you want (Worker Offline, Profit Drop, Better Coin)</li>
                <li>Toggle &quot;Send alerts to email&quot; to ON</li>
                <li>Enter your email address</li>
                <li>Click &quot;Save Settings&quot;</li>
              </ol>
            </div>

            <div className="bg-background rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-foreground mb-2">Alert Types</h3>
              <div className="space-y-4 text-foreground/70">
                <div>
                  <p className="font-medium text-foreground">Worker Offline</p>
                  <p>Sent when one or more of your mining workers stops responding to the pool. Helps you catch rig crashes, power outages, or network issues quickly.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Profit Drop</p>
                  <p>Sent when your profit drops by more than your configured threshold (10%, 20%, 30%, or 50%). Alerts you to difficulty spikes, price crashes, or hashrate issues.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Better Coin Available</p>
                  <p>Sent when a coin using the same algorithm becomes significantly more profitable (&gt;10% better). Only compares same-algorithm coins you can switch to without hardware changes.</p>
                </div>
              </div>
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
