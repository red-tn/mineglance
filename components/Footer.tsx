'use client'

import Link from 'next/link'
import Image from 'next/image'
import ExtensionDownloadModal, { useExtensionDownloadModal } from './ExtensionDownloadModal'

export default function Footer() {
  const { isOpen, openModal, closeModal } = useExtensionDownloadModal()

  return (
    <>
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
                <Link href="/#calculator" className="text-dark-text-muted hover:text-primary transition-colors">
                  Profit Calculator
                </Link>
              </li>
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
                <button
                  onClick={openModal}
                  className="text-dark-text-muted hover:text-primary transition-colors"
                >
                  Browser Extension
                </button>
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
                <Link href="/blog" className="text-dark-text-muted hover:text-primary transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <a href="https://discord.gg/CVsrdRTUTc" target="_blank" rel="noopener noreferrer" className="text-dark-text-muted hover:text-primary transition-colors">
                  Discord Community
                </a>
              </li>
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
          <div className="flex items-center gap-4">
            <a
              href="https://discord.gg/CVsrdRTUTc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-dark-text-muted hover:text-primary transition-colors"
              aria-label="Join our Discord"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </a>
            <a
              href="https://www.tiktok.com/@mineglance"
              target="_blank"
              rel="noopener noreferrer"
              className="text-dark-text-muted hover:text-primary transition-colors"
              aria-label="Follow us on TikTok"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
            </a>
            <span className="text-sm text-dark-text-dim">Built by miners, for miners.</span>
          </div>
        </div>
      </div>
    </footer>

    <ExtensionDownloadModal isOpen={isOpen} onClose={closeModal} />
    </>
  )
}
