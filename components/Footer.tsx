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
