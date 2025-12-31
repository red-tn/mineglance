'use client'

import { useState } from 'react'

const faqs = [
  {
    question: 'What pools are supported?',
    answer: 'We currently support 2Miners, Nanopool, F2Pool, Ethermine, and Flexpool. More pools are added regularly based on user requests. Just need your wallet address to connect—no API keys required.'
  },
  {
    question: 'How does the free version work?',
    answer: 'The free version lets you connect one pool and track one coin with manual refresh. Perfect for testing out MineGlance before upgrading. No credit card required, no time limit.'
  },
  {
    question: 'Is my wallet address safe?',
    answer: 'Your wallet address is stored locally in your browser extension. We only use it to fetch public pool data—the same data anyone can see on the pool website. We never have access to your private keys or funds.'
  },
  {
    question: 'How accurate is the electricity cost calculation?',
    answer: 'You input your electricity rate ($/kWh) and your GPU power consumption. MineGlance calculates running cost based on actual mining time. It\'s as accurate as your inputs—garbage in, garbage out.'
  },
  {
    question: 'How do refunds work?',
    answer: 'We offer a 30-day money-back guarantee on Pro purchases. If MineGlance isn\'t working for you, just email support@mineglance.com with your purchase email and we\'ll refund you. No questions asked.'
  },
  {
    question: 'Do I need to install anything on my mining rig?',
    answer: 'No. MineGlance is a Chrome extension that runs on your regular computer—not your mining rig. It fetches data from pool APIs using your public wallet address. Zero impact on your hashrate.'
  },
  {
    question: 'What coins are supported?',
    answer: 'We support major GPU-minable coins including RVN (Ravencoin), ETC (Ethereum Classic), FLUX, ERG (Ergo), and more. The coin comparison feature shows real-time profitability for your specific hardware.'
  },
  {
    question: 'Can I use MineGlance on multiple computers?',
    answer: 'Yes. Pro licenses are tied to your email, not a specific device. Install the extension on as many computers as you want and log in with the same account.'
  }
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="py-20 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-foreground/70">
            Got questions? We&apos;ve got answers.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-semibold text-foreground pr-4">{faq.question}</span>
                <svg
                  className={`w-5 h-5 flex-shrink-0 text-foreground/50 transition-transform ${
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
                <div className="px-6 pb-4 text-foreground/70">
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
