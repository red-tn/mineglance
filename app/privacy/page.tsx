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
                MineGlance is a Chrome extension that helps cryptocurrency miners monitor their mining operations.
                We are committed to protecting your privacy and being transparent about our data practices.
              </p>
              <p className="font-semibold text-primary">
                TL;DR: We collect minimal data, store it locally in your browser, and never sell your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Information We Collect</h2>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Data You Provide</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Wallet addresses:</strong> Public cryptocurrency wallet addresses you enter to connect to mining pools</li>
                <li><strong>Configuration settings:</strong> Your electricity rate, GPU power consumption, and display preferences</li>
                <li><strong>Email address:</strong> Only if you purchase Pro (used for license management and support)</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Data We Fetch</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Mining pool statistics:</strong> Hashrate, worker status, and earnings from public pool APIs using your wallet address</li>
                <li><strong>Cryptocurrency prices:</strong> Current coin prices from public APIs (CoinGecko, etc.)</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Data We Do NOT Collect</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Private keys or seed phrases</li>
                <li>Browsing history</li>
                <li>Personal identification information (unless you purchase Pro)</li>
                <li>Data from other browser extensions or tabs</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">How We Store Your Data</h2>
              <p>
                All your configuration and wallet addresses are stored <strong>locally in your browser</strong> using
                Chrome&apos;s storage API. This data never leaves your device unless you opt into cloud sync features.
              </p>
              <p>
                For Pro users, we store your email and license information on our servers (hosted on Supabase)
                to manage your subscription.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Third-Party Services</h2>
              <p>MineGlance interacts with the following third-party services:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Mining pools</strong> (2Miners, Nanopool, etc.) — to fetch your mining statistics</li>
                <li><strong>Price APIs</strong> (CoinGecko) — to get current cryptocurrency prices</li>
                <li><strong>ExtensionPay/Stripe</strong> — to process Pro purchases (only if you upgrade)</li>
                <li><strong>Supabase</strong> — to store Pro license information</li>
              </ul>
              <p>
                We only send the minimum data required to each service (e.g., your wallet address to the pool API).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access your data:</strong> All your data is visible in the extension settings</li>
                <li><strong>Delete your data:</strong> Uninstall the extension or clear extension data in Chrome settings</li>
                <li><strong>Request Pro account deletion:</strong> Email control@mineglance.com</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Security</h2>
              <p>
                We take security seriously. Your wallet addresses are public information (anyone can look them up
                on the blockchain), but we still treat them as sensitive. We use HTTPS for all API communications
                and follow Chrome extension security best practices.
              </p>
              <p>
                <strong>Important:</strong> MineGlance never has access to your private keys or the ability to
                move your funds. We only use public wallet addresses to fetch pool statistics.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Changes to This Policy</h2>
              <p>
                We may update this policy from time to time. We&apos;ll notify users of significant changes through
                the extension or via email (for Pro users).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Contact Us</h2>
              <p>
                Questions about this policy? Email us at{' '}
                <a href="mailto:control@mineglance.com" className="text-accent hover:underline">
                  control@mineglance.com
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
