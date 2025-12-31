import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Terms of Service - MineGlance',
  description: 'MineGlance terms of service and usage agreement.',
}

export default function TermsOfService() {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-primary mb-8">Terms of Service</h1>
          <p className="text-foreground/60 mb-8">Last updated: January 2025</p>

          <div className="prose prose-lg max-w-none text-foreground/80 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Agreement to Terms</h2>
              <p>
                By installing or using MineGlance (&quot;the Extension&quot;), you agree to be bound by these
                Terms of Service. If you disagree with any part of these terms, you may not use the Extension.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Description of Service</h2>
              <p>
                MineGlance is a Chrome browser extension that helps cryptocurrency miners monitor their
                mining operations by:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fetching mining statistics from public pool APIs</li>
                <li>Displaying net profit calculations based on user-provided electricity costs</li>
                <li>Comparing profitability across different cryptocurrencies</li>
                <li>Providing notifications about mining status changes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Free and Pro Versions</h2>
              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Free Version</h3>
              <p>
                The free version of MineGlance provides limited functionality at no cost. There is no
                time limit on the free version.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Pro Version</h3>
              <p>
                The Pro version is a one-time purchase that unlocks additional features. Your Pro license
                is valid for the lifetime of the product and can be used on multiple devices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Refund Policy</h2>
              <p>
                We offer a <strong>30-day money-back guarantee</strong> on all Pro purchases. If you&apos;re
                not satisfied with MineGlance Pro, contact us at support@mineglance.com within 30 days
                of purchase for a full refund. No questions asked.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Reverse engineer, decompile, or disassemble the Extension</li>
                <li>Use the Extension for any illegal purpose</li>
                <li>Share your Pro license with others outside your household</li>
                <li>Attempt to circumvent any licensing restrictions</li>
                <li>Use the Extension to harm mining pool infrastructure</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Disclaimer of Warranties</h2>
              <p>
                MineGlance is provided &quot;as is&quot; without warranty of any kind. We do not guarantee:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The accuracy of profit calculations (these depend on your inputs)</li>
                <li>The availability of third-party APIs (mining pools, price feeds)</li>
                <li>Uninterrupted or error-free operation</li>
                <li>Compatibility with all mining pools or cryptocurrencies</li>
              </ul>
              <p className="mt-4">
                <strong>Important:</strong> MineGlance is a monitoring tool, not financial advice.
                Cryptocurrency mining involves risk. Always do your own research before making
                mining or investment decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, MineGlance and its creators shall not be liable
                for any indirect, incidental, special, consequential, or punitive damages, including
                but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Lost profits or mining revenue</li>
                <li>Decisions made based on Extension data</li>
                <li>Interruption of mining operations</li>
                <li>Data loss</li>
              </ul>
              <p className="mt-4">
                Our total liability shall not exceed the amount you paid for MineGlance Pro (if any).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Third-Party Services</h2>
              <p>
                MineGlance relies on third-party services (mining pools, price APIs) that have their own
                terms of service. We are not responsible for the availability, accuracy, or policies of
                these services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Continued use of the Extension
                after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Termination</h2>
              <p>
                We may terminate or suspend your access to MineGlance at any time for violation of these
                terms. You may stop using the Extension at any time by uninstalling it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Contact</h2>
              <p>
                Questions about these terms? Email us at{' '}
                <a href="mailto:legal@mineglance.com" className="text-accent hover:underline">
                  legal@mineglance.com
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
