'use client'

import { useState } from 'react'
import CTAButton from './CTAButton'
import CheckoutModal from './CheckoutModal'

type PlanType = 'pro' | 'bundle' | null

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
        '1 pool connection',
        '1 coin tracking',
        'Manual refresh',
        'Net profit calculation',
        'Coin comparison preview'
      ],
      cta: 'Install Free',
      href: 'https://chrome.google.com/webstore/detail/mineglance',
      popular: false,
      isPaid: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$29',
      period: 'lifetime',
      description: 'For serious hobbyist miners',
      features: [
        'Unlimited pools & coins',
        'Auto-refresh every 5 min',
        'Desktop + Email alerts',
        'Real-time coin comparison',
        'WhatToMine integration',
        'Historical charts',
        'Priority support'
      ],
      cta: 'Get Pro Now',
      href: '#',
      popular: true,
      isPaid: true
    },
    {
      id: 'bundle',
      name: 'Pro + Mobile',
      price: '$59',
      period: 'lifetime',
      description: 'Extension + iOS/Android app',
      features: [
        'Everything in Pro',
        'Mobile app (iOS & Android)',
        'Push notifications',
        'Widget support',
        'Sync across devices',
        'Early access to new features',
        'Founding member status'
      ],
      cta: 'Get Bundle',
      href: '#',
      popular: false,
      isPaid: true,
      badge: 'Best Value'
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

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 sm:p-8 ${
                  plan.popular
                    ? 'bg-gradient-to-b from-primary/20 to-dark-card border-2 border-primary shadow-glow'
                    : plan.id === 'bundle'
                    ? 'bg-gradient-to-b from-amber-500/10 to-dark-card border-2 border-amber-500/50'
                    : 'glass-card'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1 rounded-full whitespace-nowrap shadow-glow">
                      Most Popular
                    </span>
                  </div>
                )}
                {plan.badge && !plan.popular && (
                  <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-amber-500 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="text-center mb-6 sm:mb-8 pt-2">
                  <h3 className="text-lg sm:text-xl font-semibold text-dark-text">
                    {plan.name}
                  </h3>
                  <div className="mt-3 sm:mt-4">
                    <span className={`text-4xl sm:text-5xl font-bold ${
                      plan.popular ? 'text-primary' : plan.id === 'bundle' ? 'text-amber-400' : 'text-dark-text'
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
                          plan.popular ? 'text-primary' : plan.id === 'bundle' ? 'text-amber-400' : 'text-primary'
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
                    onClick={() => setSelectedPlan(plan.id as PlanType)}
                    className={`w-full font-semibold py-3 px-6 rounded-lg transition-all ${
                      plan.popular
                        ? 'bg-primary hover:bg-primary-light text-white shadow-glow hover:shadow-glow-lg'
                        : plan.id === 'bundle'
                        ? 'bg-amber-500 hover:bg-amber-400 text-white'
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

          {/* Additional Licenses Note */}
          <div className="mt-10 sm:mt-12 max-w-2xl mx-auto">
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-dark-text mb-1">Need more device activations?</h4>
                  <p className="text-sm text-dark-text-muted">
                    Pro licenses include 3 device activations. Need more? Purchase additional license packs
                    from your <a href="/dashboard/devices" className="text-primary hover:underline font-medium">dashboard</a> for
                    just <strong className="text-dark-text">$5 per 5 lifetime activations</strong> (one-time, no subscription).
                  </p>
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
