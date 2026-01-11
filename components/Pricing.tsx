'use client'

import { useState } from 'react'
import CTAButton from './CTAButton'
import CheckoutModal from './CheckoutModal'

type PlanType = 'pro' | null

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(null)

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        '1 wallet',
        'All 12+ pools supported',
        'All coins supported',
        'Net profit calculation',
        'Chrome extension + Mobile app (coming soon)'
      ],
      cta: 'Install Free',
      href: 'https://chromewebstore.google.com/detail/mineglance-mining-profit/fohkkkgboehiaeoakpjbipiakokdgajl',
      popular: false,
      isPaid: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$59',
      period: '/year',
      description: 'Unlimited mining monitoring',
      features: [
        'Unlimited wallets',
        'All 12+ pools supported',
        'All coins supported',
        'Cloud sync across devices',
        'Desktop + Email alerts',
        'Real-time coin comparison',
        'User dashboard',
        'Priority support'
      ],
      cta: 'Get Pro Now',
      href: '#',
      popular: true,
      isPaid: true
    }
  ]

  return (
    <>
      <section id="pricing" className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
              <span className="text-gradient">Simple, Transparent Pricing</span>
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-dark-text-muted max-w-2xl mx-auto px-4">
              One low annual fee. Cancel anytime.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 max-w-3xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 sm:p-8 ${
                  plan.popular
                    ? 'bg-gradient-to-b from-primary/20 to-dark-card border-2 border-primary shadow-glow'
                    : 'glass-card'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1 rounded-full whitespace-nowrap shadow-glow">
                      Recommended
                    </span>
                  </div>
                )}

                <div className="text-center mb-6 sm:mb-8 pt-2">
                  <h3 className="text-lg sm:text-xl font-semibold text-dark-text">
                    {plan.name}
                  </h3>
                  <div className="mt-3 sm:mt-4">
                    <span className={`text-4xl sm:text-5xl font-bold ${
                      plan.popular ? 'text-primary' : 'text-dark-text'
                    }`}>
                      {plan.price}
                    </span>
                    <span className="text-base sm:text-lg text-dark-text-muted">
                      {' '}{plan.period}
                    </span>
                  </div>
                  <p className="mt-2 text-sm sm:text-base text-dark-text-muted">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 sm:gap-3">
                      <svg
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          plan.popular ? 'text-primary' : 'text-primary'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm sm:text-base text-dark-text-muted">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {plan.isPaid ? (
                  <button
                    onClick={() => setSelectedPlan('pro')}
                    className={`w-full font-semibold py-3 px-6 rounded-lg transition-all ${
                      plan.popular
                        ? 'bg-primary hover:bg-primary-light text-white shadow-glow hover:shadow-glow-lg'
                        : 'bg-dark-border hover:bg-dark-border-light text-dark-text'
                    }`}
                  >
                    {plan.cta}
                  </button>
                ) : (
                  <CTAButton
                    href={plan.href}
                    variant="secondary"
                    className="w-full text-center justify-center"
                  >
                    {plan.cta}
                  </CTAButton>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-6 sm:mt-8 space-y-2">
            <p className="text-dark-text-muted text-sm">
              30-day money-back guarantee. No questions asked.
            </p>
            <p className="text-dark-text-dim text-xs">
              Secure payment powered by Stripe
            </p>
          </div>

          {/* Download Section */}
          <div className="mt-12 sm:mt-16">
            <h3 className="text-center text-lg sm:text-xl font-semibold text-dark-text mb-6">
              Available On
            </h3>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {/* Chrome Extension */}
              <a
                href="https://chromewebstore.google.com/detail/mineglance-mining-profit/fohkkkgboehiaeoakpjbipiakokdgajl"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-5 py-3 rounded-xl glass-card hover:border-primary transition-all group"
              >
                <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-3.952 6.848a12.014 12.014 0 0 0 9.26-5.382H17.31a5.458 5.458 0 0 1-2.037-8.557zm-2.818 2.817a3.272 3.272 0 1 0 0 6.545 3.272 3.272 0 0 0 0-6.545z"/>
                </svg>
                <div className="text-left">
                  <p className="text-xs text-dark-text-muted">Get it on</p>
                  <p className="font-semibold text-dark-text group-hover:text-primary transition-colors">Chrome Web Store</p>
                </div>
              </a>

              {/* iOS App Store - Coming Soon */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl glass-card opacity-60 cursor-not-allowed">
                <svg className="w-8 h-8 text-dark-text-muted" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <p className="text-xs text-dark-text-dim">Coming Soon</p>
                  <p className="font-semibold text-dark-text-muted">App Store</p>
                </div>
              </div>

              {/* Android - Coming Soon */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl glass-card opacity-60 cursor-not-allowed">
                <svg className="w-8 h-8 text-dark-text-muted" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 15.341a.5.5 0 0 0 0-.682l-.932-.937a.497.497 0 0 0-.34-.141.503.503 0 0 0-.34.141l-.93.937a.5.5 0 0 0 0 .682l.93.937a.5.5 0 0 0 .68 0zM6.75 15.341a.5.5 0 0 1 0-.682l.932-.937a.5.5 0 0 1 .68 0l.93.937a.5.5 0 0 1 0 .682l-.93.937a.5.5 0 0 1-.68 0zM3.016 10.73l1.89-3.31a.75.75 0 0 1 1.3.74l-1.5 2.64h14.588l-1.5-2.64a.75.75 0 0 1 1.3-.74l1.89 3.31a5.25 5.25 0 0 1-2.984 7.52v2.5a.75.75 0 0 1-1.5 0v-2.08a5.234 5.234 0 0 1-1.25.15h-6.5c-.43 0-.85-.05-1.25-.15v2.08a.75.75 0 0 1-1.5 0v-2.5a5.25 5.25 0 0 1-2.984-7.52zM12 3.75a.75.75 0 0 1 .75.75v1.75a.75.75 0 0 1-1.5 0V4.5a.75.75 0 0 1 .75-.75z"/>
                </svg>
                <div className="text-left">
                  <p className="text-xs text-dark-text-dim">Coming Soon</p>
                  <p className="font-semibold text-dark-text-muted">Google Play</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <CheckoutModal
        isOpen={selectedPlan !== null}
        onClose={() => setSelectedPlan(null)}
        plan={selectedPlan}
      />
    </>
  )
}
