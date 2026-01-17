'use client'

import { useState } from 'react'
import CTAButton from './CTAButton'
import CheckoutModal from './CheckoutModal'

type PlanType = 'monthly' | 'annual' | 'lifetime' | null

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(null)

  const freeFeatures = [
    '1 wallet',
    'All 12+ pools supported',
    'All coins supported',
    'Net profit calculation',
    'Browser extension (Chrome, Edge, Brave)'
  ]

  const proFeatures = [
    'Unlimited wallets',
    'All 12+ pools supported',
    'All coins supported',
    'Cloud sync across devices',
    'Desktop + Email alerts',
    'Real-time coin comparison',
    'User dashboard',
    'Priority support'
  ]

  const paidPlans = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: '$6.99',
      period: '/month',
      description: 'Flexible month-to-month',
      popular: false
    },
    {
      id: 'annual',
      name: 'Annual',
      price: '$59',
      period: '/year',
      originalPrice: '$83.88',
      savings: 'Save 30%',
      description: 'Best value for serious miners',
      popular: true
    },
    {
      id: 'lifetime',
      name: 'Lifetime',
      price: '$99',
      period: 'once',
      description: 'Pay once, use forever',
      popular: false
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
              Start free, upgrade when you need more. Cancel anytime.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="glass-card rounded-2xl p-6 sm:p-8">
              <div className="text-center mb-6 sm:mb-8">
                <h3 className="text-lg sm:text-xl font-semibold text-dark-text">Free</h3>
                <div className="mt-3 sm:mt-4">
                  <span className="text-4xl sm:text-5xl font-bold text-dark-text">$0</span>
                  <span className="text-base sm:text-lg text-dark-text-muted"> forever</span>
                </div>
                <p className="mt-2 text-sm sm:text-base text-dark-text-muted">
                  Perfect for getting started
                </p>
              </div>

              <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                {freeFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 sm:gap-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm sm:text-base text-dark-text-muted">{feature}</span>
                  </li>
                ))}
              </ul>

              <CTAButton
                href="https://chromewebstore.google.com/detail/mineglance-mining-profit/fohkkkgboehiaeoakpjbipiakokdgajl"
                variant="secondary"
                className="w-full text-center justify-center"
              >
                Install Free
              </CTAButton>
            </div>

            {/* Pro Plans */}
            <div className="relative bg-gradient-to-b from-primary/20 to-dark-card border-2 border-primary shadow-glow rounded-2xl p-6 sm:p-8">
              <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1 rounded-full whitespace-nowrap shadow-glow">
                  Pro Features
                </span>
              </div>

              <div className="text-center mb-6 pt-2">
                <h3 className="text-lg sm:text-xl font-semibold text-dark-text">MineGlance Pro</h3>
                <p className="mt-2 text-sm text-dark-text-muted">
                  Unlimited mining monitoring
                </p>
              </div>

              {/* Plan Options */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {paidPlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id as PlanType)}
                    className={`relative p-3 rounded-lg border-2 transition-all text-center ${
                      plan.popular
                        ? 'border-primary bg-primary/10'
                        : 'border-dark-border hover:border-primary/50 bg-dark-card/50'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">
                        Best Value
                      </span>
                    )}
                    <div className="text-xs text-dark-text-muted mb-1">{plan.name}</div>
                    <div className="text-lg font-bold text-primary">{plan.price}</div>
                    <div className="text-xs text-dark-text-dim">
                      {plan.period === 'once' ? 'one-time' : plan.period}
                    </div>
                    {plan.savings && (
                      <div className="text-[10px] text-green-400 mt-1">{plan.savings}</div>
                    )}
                  </button>
                ))}
              </div>

              <ul className="space-y-3 mb-6">
                {proFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 sm:gap-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm sm:text-base text-dark-text-muted">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setSelectedPlan('annual')}
                className="w-full font-semibold py-3 px-6 rounded-lg bg-primary hover:bg-primary-light text-white shadow-glow hover:shadow-glow-lg transition-all"
              >
                Get Pro Now
              </button>
            </div>
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
              Works With All Major Browsers
            </h3>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {/* Chrome */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl glass-card">
                <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-3.952 6.848a12.014 12.014 0 0 0 9.26-5.382H17.31a5.458 5.458 0 0 1-2.037-8.557zm-2.818 2.817a3.272 3.272 0 1 0 0 6.545 3.272 3.272 0 0 0 0-6.545z"/>
                </svg>
                <span className="font-semibold text-dark-text">Chrome</span>
              </div>

              {/* Edge */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl glass-card">
                <svg className="w-8 h-8 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.86 17.86q.14 0 .25.12.1.13.1.25t-.11.33l-.32.46-.43.53-.44.5q-.21.25-.38.42l-.22.23q-.58.53-1.34 1.04-.76.51-1.6.91-.86.4-1.74.64t-1.67.24q-.9 0-1.69-.28-.8-.28-1.48-.78-.68-.5-1.22-1.17-.53-.66-.92-1.44-.38-.77-.58-1.6-.2-.83-.2-1.67 0-1 .32-1.96.33-.97.87-1.8.14.95.55 1.77.41.81 1.02 1.49.6.68 1.38 1.21.78.54 1.64.9.86.35 1.79.54.92.18 1.85.18h.22q.22 0 .43-.02zM9.8 7.28q.15-.94.58-1.8.44-.85 1.1-1.55.66-.7 1.49-1.22.84-.52 1.76-.8.93-.28 1.89-.28 1.24 0 2.31.47 1.07.48 1.85 1.33.79.85 1.24 2.01.44 1.17.44 2.53 0 .27-.02.53-.01.27-.05.53-.18 1.43-.77 2.64-.6 1.21-1.53 2.12-.94.9-2.15 1.46-1.22.55-2.62.63-.23 0-.44.02-.22.01-.43.01-.97 0-1.93-.22-.95-.21-1.83-.64-.87-.43-1.61-1.08-.74-.64-1.25-1.51-.5-.87-.74-1.94-.24-1.06-.24-2.33 0-.66.08-1.28.08-.63.22-1.24-.88.69-1.58 1.62-.7.94-1.14 2.02-.45 1.09-.6 2.24-.16 1.15-.16 2.28 0 .9.14 1.75.15.85.43 1.65.27.8.67 1.52.4.73.9 1.36.51.64 1.1 1.16.59.51 1.26.9.68.39 1.4.63.72.24 1.49.34-.87.14-1.73.04-.86-.09-1.67-.38-.82-.28-1.56-.73-.74-.44-1.37-1.03-.63-.6-1.13-1.33-.5-.73-.83-1.57-.34-.84-.5-1.75-.17-.91-.17-1.85 0-1.72.53-3.25.53-1.52 1.48-2.76.95-1.23 2.25-2.11 1.3-.87 2.82-1.26z"/>
                </svg>
                <span className="font-semibold text-dark-text">Edge</span>
              </div>

              {/* Brave */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl glass-card">
                <svg className="w-8 h-8 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0L3 4.5v6.75c0 5.32 3.83 10.29 9 11.25 5.17-.96 9-5.93 9-11.25V4.5L12 0zm0 2.18l7.5 3.75v6.32c0 4.45-3.21 8.61-7.5 9.57-4.29-.96-7.5-5.12-7.5-9.57V5.93L12 2.18zm3.22 5.03l-1.06.53-.53-.27-.53.27-1.06-.53-2.13 1.06v1.6l1.07.53v1.6l1.06.53 1.06-.53v-1.07l.53-.26.53.26v1.07l1.06.53 1.07-.53v-1.6l1.06-.53v-1.6l-2.13-1.06z"/>
                </svg>
                <span className="font-semibold text-dark-text">Brave</span>
              </div>

              {/* Opera */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl glass-card">
                <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.14 4.18c-1.32 1.56-2.16 3.9-2.2 6.52v2.6c.04 2.62.88 4.96 2.2 6.52 1.56 1.84 3.54 2.82 5.66 2.82 1.34 0 2.6-.4 3.7-1.14-2.02 1.3-4.32 2-6.74 2-6.76 0-12.24-5.38-12.24-12S4 .5 10.76.5c2.42 0 4.72.7 6.74 2-1.1-.74-2.36-1.14-3.7-1.14-2.12 0-4.1.98-5.66 2.82zm7.72 0C17.18 5.74 18 8.08 18 10.7v2.6c0 2.62-.82 4.96-2.14 6.52-1.56 1.84-3.54 2.82-5.66 2.82-2.12 0-4.1-.98-5.66-2.82 1.78 2.1 4.02 3.26 6.46 3.26 4.76 0 8.62-4.56 8.62-10.18S15.76 2.72 11 2.72c-2.44 0-4.68 1.16-6.46 3.26 1.56-1.84 3.54-2.82 5.66-2.82 2.12 0 4.1.98 5.66 2.82z"/>
                </svg>
                <span className="font-semibold text-dark-text">Opera</span>
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
