import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Privacy Policy - MineGlance',
  description: 'MineGlance privacy policy. Learn how we handle your data.',
}

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-primary mb-8">Privacy Policy</h1>
          <p className="text-foreground/60 mb-8">Last updated: January 2025</p>

          <div className="prose prose-lg max-w-none text-foreground/80 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Overview</h2>
              <p>
                MineGlance is a browser extension that helps cryptocurrency miners monitor their mining operations
                and calculate real-time profitability by showing earnings minus electricity costs.
              </p>
              <p className="font-semibold text-primary">
                TL;DR: We collect minimal data, store it locally in your browser, and never sell your information.
                No remote code is executed. All processing happens locally in your browser.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Single Purpose</h2>
              <p>
                MineGlance has a single purpose: to provide cryptocurrency miners with a dashboard showing their
                real-time mining statistics, earnings, and net profitability after electricity costs. The extension
                fetches data from mining pools and price APIs to calculate and display this information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Extension Permissions</h2>
              <p>MineGlance requests the following Chrome permissions, each for a specific purpose:</p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Storage Permission</h3>
              <p>
                Used to save your settings locally on your device, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Wallet addresses and pool configurations you enter</li>
                <li>Electricity rate and currency preferences</li>
                <li>Notification settings and display preferences</li>
                <li>License activation status (for Pro users)</li>
              </ul>
              <p>
                All data is stored locally using Chrome&apos;s storage API. Your wallet addresses and settings
                are never transmitted to our servers except when using optional Pro features like email alerts.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Alarms Permission</h3>
              <p>
                Used to automatically refresh your mining statistics at configurable intervals (15 minutes to 3 hours).
                This ensures you see up-to-date hashrate, earnings, and worker status without manually refreshing.
                No background processes run except for these scheduled data refreshes.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Notifications Permission</h3>
              <p>
                Used to alert you to critical mining events (opt-in feature for Pro users):
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Worker goes offline (your mining rig stopped)</li>
                <li>Significant profit drop detected</li>
                <li>More profitable coin becomes available</li>
              </ul>
              <p>
                These notifications help you respond quickly to issues that could cost you money.
                You can disable notifications at any time in settings.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Host Permissions</h3>
              <p>
                Host permissions allow the extension to fetch data from specific websites. We request access to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Mining pool APIs</strong> (2miners.com, nanopool.org, f2pool.com, ethermine.org, hiveon.net,
                herominers.com, woolypooly.com, ckpool.org, ocean.xyz, public-pool.io, cedric-crispin.com) — to retrieve
                your hashrate, balance, worker status, and earnings using the wallet address you provide</li>
                <li><strong>CoinGecko API</strong> (api.coingecko.com) — to get current cryptocurrency prices for profit calculations</li>
                <li><strong>WhatToMine</strong> (whattomine.com) — to compare profitability of alternative coins</li>
                <li><strong>MineGlance API</strong> (mineglance.com) — for Pro license activation and optional email alerts</li>
              </ul>
              <p>
                <strong>Important:</strong> No browsing data is collected. We only fetch mining statistics and prices
                using the wallet addresses you explicitly provide. We cannot see your browsing history, other tabs,
                or any data outside of these specific API calls.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Remote Code</h2>
              <p>
                <strong>MineGlance does NOT execute any remote code.</strong> All JavaScript code is bundled within
                the extension package and reviewed by the Chrome Web Store. The extension only makes API calls to
                fetch JSON data (mining statistics, cryptocurrency prices) which is parsed and displayed — no code
                is ever downloaded or executed from external sources.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Information We Collect</h2>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Data You Provide</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Wallet addresses:</strong> Public cryptocurrency wallet addresses you enter to connect to mining pools</li>
                <li><strong>Configuration settings:</strong> Your electricity rate, power consumption, and display preferences</li>
                <li><strong>Email address:</strong> Only if you purchase Pro (used for license delivery, email alerts, and support)</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Data We Fetch (Not Stored on Our Servers)</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Mining pool statistics:</strong> Hashrate, worker status, balance, and earnings from pool APIs</li>
                <li><strong>Cryptocurrency prices:</strong> Current coin prices from CoinGecko</li>
                <li><strong>Profitability data:</strong> Mining profitability comparisons from WhatToMine</li>
              </ul>
              <p>This fetched data is processed locally in your browser and is not transmitted to our servers.</p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Data We Do NOT Collect</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Private keys or seed phrases (we never have access to your funds)</li>
                <li>Browsing history or data from other websites</li>
                <li>Personal identification information (unless you purchase Pro)</li>
                <li>Data from other browser extensions or tabs</li>
                <li>Keystrokes, form data, or any input outside of the extension</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">How We Store Your Data</h2>
              <p>
                All your configuration and wallet addresses are stored <strong>locally in your browser</strong> using
                Chrome&apos;s storage API. This data never leaves your device unless:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You activate a Pro license (we verify the license key with our server)</li>
                <li>You enable email alerts (we send alerts through our server)</li>
              </ul>
              <p>
                For Pro users, we store your email, license key, and device identifier on our servers (hosted on Supabase)
                to manage your subscription and deliver email alerts.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Third-Party Services</h2>
              <p>MineGlance interacts with the following third-party services:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Mining pools</strong> (2Miners, Nanopool, F2Pool, Ethermine, Hiveon, HeroMiners, WoolyPooly,
                CKPool, OCEAN, Public Pool, Cedric Crispin) — to fetch your mining statistics using your wallet address</li>
                <li><strong>CoinGecko</strong> — to get current cryptocurrency prices</li>
                <li><strong>WhatToMine</strong> — to compare coin profitability</li>
                <li><strong>Stripe</strong> — to process Pro purchases (only if you upgrade)</li>
                <li><strong>Supabase</strong> — to store Pro license information and send email alerts</li>
              </ul>
              <p>
                We only send the minimum data required to each service (e.g., your public wallet address to the pool API).
                These services have their own privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access your data:</strong> All your data is visible in the extension settings</li>
                <li><strong>Delete your data:</strong> Uninstall the extension or clear extension data in Chrome settings</li>
                <li><strong>Export your data:</strong> Your settings are viewable and can be manually recorded</li>
                <li><strong>Request Pro account deletion:</strong> Email support@mineglance.com</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Security</h2>
              <p>
                We take security seriously:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>All API communications use HTTPS encryption</li>
                <li>No remote code execution — all code is bundled and reviewed</li>
                <li>Minimal permissions — we only request what&apos;s necessary</li>
                <li>Local storage — your data stays on your device</li>
                <li>No tracking or analytics scripts</li>
              </ul>
              <p>
                <strong>Important:</strong> MineGlance never has access to your private keys or the ability to
                move your funds. We only use public wallet addresses to fetch pool statistics. Your wallet
                addresses are public information (anyone can look them up on the blockchain).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Children&apos;s Privacy</h2>
              <p>
                MineGlance is not intended for use by children under 13. We do not knowingly collect
                personal information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Changes to This Policy</h2>
              <p>
                We may update this policy from time to time. We&apos;ll notify users of significant changes through
                the extension update notes or via email (for Pro users). The &quot;Last updated&quot; date at the top
                reflects the most recent revision.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Contact Us</h2>
              <p>
                Questions about this policy? Email us at{' '}
                <a href="mailto:support@mineglance.com" className="text-accent hover:underline">
                  support@mineglance.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
