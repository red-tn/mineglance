import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-dark-card border-t border-dark-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <Image
                src="/logo-white.svg"
                alt="MineGlance"
                width={140}
                height={35}
                className="h-7 w-auto"
              />
            </Link>
            <p className="text-dark-text-muted text-sm">
              Real-time mining profitability tracking. Know your true earnings after electricity costs.
            </p>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="font-semibold text-dark-text mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#features" className="text-dark-text-muted hover:text-primary transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="text-dark-text-muted hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/#" className="text-dark-text-muted hover:text-primary transition-colors">
                  Chrome Extension
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-dark-text-muted hover:text-primary transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h3 className="font-semibold text-dark-text mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/support" className="text-dark-text-muted hover:text-primary transition-colors">
                  Support & Help
                </Link>
              </li>
              <li>
                <Link href="/support#troubleshooting" className="text-dark-text-muted hover:text-primary transition-colors">
                  Troubleshooting
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-dark-text-muted hover:text-primary transition-colors">
                  User Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="font-semibold text-dark-text mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-dark-text-muted hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-dark-text-muted hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Supported Pools */}
        <div className="border-t border-dark-border pt-8 mb-8">
          <h3 className="font-semibold text-dark-text mb-3 text-sm">Supported Pools</h3>
          <div className="flex flex-wrap gap-3 text-xs text-dark-text-dim">
            <span>2Miners</span>
            <span className="text-dark-border">•</span>
            <span>Nanopool</span>
            <span className="text-dark-border">•</span>
            <span>F2Pool</span>
            <span className="text-dark-border">•</span>
            <span>OCEAN</span>
            <span className="text-dark-border">•</span>
            <span>CKPool Solo</span>
            <span className="text-dark-border">•</span>
            <span>Public Pool</span>
            <span className="text-dark-border">•</span>
            <span>Ethermine</span>
            <span className="text-dark-border">•</span>
            <span>Hiveon</span>
            <span className="text-dark-border">•</span>
            <span>HeroMiners</span>
            <span className="text-dark-border">•</span>
            <span>WoolyPooly</span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-dark-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-dark-text-muted">
            &copy; {new Date().getFullYear()} MineGlance. All rights reserved.
          </p>
          <p className="text-sm text-dark-text-dim">
            Built by miners, for miners.
          </p>
        </div>
      </div>
    </footer>
  )
}
