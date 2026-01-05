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
        '1 wallet connection',
        'Manual refresh only',
        'Chrome extension only',
        'Net profit calculation',
        'Basic pool support'
      ],
      cta: 'Install Free',
      href: 'https://chrome.google.com/webstore/detail/mineglance',
      popular: false,
      isPaid: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$59',
      period: 'lifetime',
      description: 'Unlimited mining monitoring',
      features: [
        'Unlimited wallets',
        'Auto-refresh (15-180 min)',
        'Mobile app (iOS + Android)',
        'Cloud sync across devices',
        'Desktop + Email alerts',
        'Real-time coin comparison',
        'All pools supported',
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
              <span className="text-gradient">Simple Pricing, No Subscriptions</span>
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-dark-text-muted max-w-2xl mx-auto px-4">
              Pay once, use forever. Like buying a tool, not renting one.
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
