'use client'

import { useState } from 'react'

const faqs = [
  {
    question: 'What pools are supported?',
    answer: 'We support 11+ major pools: 2Miners, Nanopool, F2Pool, Ethermine, Hiveon, HeroMiners, WoolyPooly, CKPool Solo, Public Pool, OCEAN, and Cedric Crispin. Just need your wallet address to connect—no API keys required.'
  },
  {
    question: 'What coins are supported?',
    answer: 'We support 17+ coins including BTC, ETC, RVN, ERG, FLUX, KAS, ALPH, NEXA, XNA, XMR, ZEC, LTC, FIRO, CFX, BEAM, and more. The coin comparison feature uses WhatToMine data to show real-time profitability.'
  },
  {
    question: 'How does the free version work?',
    answer: 'The free version lets you track 2 wallets on any supported pool and coin. You get full access to all 12+ pools and all coins. No credit card required, no time limit. Upgrade to Pro for unlimited wallets.'
  },
  {
    question: 'How does coin comparison work?',
    answer: 'We fetch real-time profitability data from WhatToMine and compare it against your current coin. Coins using the same algorithm (like RVN and XNA) can be switched instantly. Different algorithms show estimated comparisons based on typical hashrates.'
  },
  {
    question: 'Is my wallet address safe?',
    answer: 'Absolutely. Your wallet address is stored locally in your browser extension and encrypted with AES-256 when synced to our servers. We only use it to fetch public pool data—the same data anyone can see on the pool website. We never have access to your private keys or funds, and all wallet data is encrypted at rest.'
  },
  {
    question: 'How accurate is the electricity cost calculation?',
    answer: 'You input your electricity rate ($/kWh) and your GPU power consumption. MineGlance calculates running cost based on 24/7 operation. You can also look up average rates by ZIP code. It\'s as accurate as your inputs.'
  },
  {
    question: 'How do refunds work?',
    answer: 'We offer a 30-day money-back guarantee on Pro purchases. If MineGlance isn\'t working for you, just email support@mineglance.com with your purchase email and we\'ll refund you. No questions asked.'
  },
  {
    question: 'Do I need to install anything on my mining rig?',
    answer: 'No. MineGlance is a browser extension that runs on your regular computer—not your mining rig. It fetches data from pool APIs using your public wallet address. Zero impact on your hashrate.'
  },
  {
    question: 'Can I use MineGlance on multiple computers?',
    answer: 'Yes! Pro licenses can be activated on up to 3 devices, and Bundle licenses on up to 5 devices. You\'ll receive a license key via email after purchase—just enter it in the extension settings to activate.'
  },
  {
    question: 'How do email alerts work?',
    answer: 'Pro users can enable email alerts in Settings. When your rig goes offline, profit drops significantly, or a more profitable coin is available, we\'ll send you an email immediately. You can customize which alerts you receive and set your preferred email address.'
  },
  {
    question: 'What alerts can I receive?',
    answer: 'MineGlance Pro offers three alert types: (1) Worker Offline - when your mining workers stop responding, (2) Profit Drop - when your profit drops by a configurable percentage (10-50%), and (3) Better Coin - when a coin using the same algorithm becomes more profitable. All alerts are available as desktop notifications and optional emails.'
  }
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">
            <span className="text-gradient">Frequently Asked Questions</span>
          </h2>
          <p className="mt-4 text-lg text-dark-text-muted">
            Got questions? We&apos;ve got answers.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="glass-card rounded-xl overflow-hidden"
            >
              <button
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-dark-card-hover transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-semibold text-dark-text pr-4">{faq.question}</span>
                <svg
                  className={`w-5 h-5 flex-shrink-0 text-dark-text-muted transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4 text-dark-text-muted">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
