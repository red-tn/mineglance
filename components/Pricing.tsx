'use client'

import CTAButton from './CTAButton'

export default function Pricing() {
  const STRIPE_CHECKOUT_URL = process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_URL || '#'

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        '1 pool connection',
        '1 coin tracking',
        'Manual refresh',
        'Basic profit view',
        'Net profit calculation'
      ],
      cta: 'Install Free',
      href: 'https://chrome.google.com/webstore/detail/mineglance',
      popular: false
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'lifetime',
      description: 'For serious hobbyist miners',
      features: [
        'Unlimited pools',
        'Unlimited coins',
        'Auto-refresh every 5 min',
        'Desktop notifications',
        'Coin comparison tool',
        'Historical charts',
        'Priority support'
      ],
      cta: 'Get Pro Now',
      href: STRIPE_CHECKOUT_URL,
      popular: true
    }
  ]

  return (
    <section id="pricing" className="py-16 sm:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">
            Simple Pricing, No Subscriptions
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-foreground/70 max-w-2xl mx-auto px-4">
            Pay once, use forever. Like buying a tool, not renting one.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 sm:p-8 ${
                plan.popular
                  ? 'bg-primary text-white ring-4 ring-accent shadow-xl'
                  : 'bg-background border-2 border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-accent text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1 rounded-full whitespace-nowrap">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6 sm:mb-8 pt-2">
                <h3 className={`text-lg sm:text-xl font-semibold ${plan.popular ? 'text-white' : 'text-foreground'}`}>
                  {plan.name}
                </h3>
                <div className="mt-3 sm:mt-4">
                  <span className={`text-4xl sm:text-5xl font-bold ${plan.popular ? 'text-white' : 'text-primary'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-base sm:text-lg ${plan.popular ? 'text-white/70' : 'text-foreground/60'}`}>
                    {' '}{plan.period}
                  </span>
                </div>
                <p className={`mt-2 text-sm sm:text-base ${plan.popular ? 'text-white/70' : 'text-foreground/60'}`}>
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 sm:gap-3">
                    <svg
                      className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.popular ? 'text-accent' : 'text-accent'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={`text-sm sm:text-base ${plan.popular ? 'text-white/90' : 'text-foreground/80'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <CTAButton
                href={plan.href}
                variant={plan.popular ? 'primary' : 'secondary'}
                className={`w-full text-center justify-center ${plan.popular ? 'bg-accent hover:bg-green-600 border-accent' : ''}`}
              >
                {plan.cta}
              </CTAButton>
            </div>
          ))}
        </div>

        <div className="text-center mt-6 sm:mt-8 space-y-2">
          <p className="text-foreground/60 text-sm">
            30-day money-back guarantee. No questions asked.
          </p>
          <p className="text-foreground/40 text-xs">
            Secure payment powered by Stripe
          </p>
        </div>
      </div>
    </section>
  )
}
