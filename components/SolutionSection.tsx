import Image from 'next/image'

export default function SolutionSection() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Extension screenshot */}
          <div className="order-2 lg:order-1">
            <div className="glass-card rounded-2xl p-6 max-w-sm mx-auto border border-primary/30">
              {/* Extension header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-dark-border">
                <div className="flex items-center space-x-2">
                  <Image
                    src="/logo-icon.svg"
                    alt="MineGlance"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <span className="font-semibold text-primary">MineGlance</span>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary font-medium">PRO</span>
              </div>

              {/* Net Profit Display */}
              <div className="text-center mb-4">
                <p className="text-sm text-dark-text-muted uppercase tracking-wide">Net Profit Today</p>
                <p className="text-5xl font-bold text-primary font-mono">+$2.47</p>
              </div>

              {/* Breakdown */}
              <div className="bg-dark-card-hover rounded-lg p-4 mb-4">
                <div className="flex justify-between text-sm text-dark-text-muted mb-2">
                  <span>Gross Revenue</span>
                  <span className="font-mono text-dark-text">$4.12</span>
                </div>
                <div className="flex justify-between text-sm text-dark-text-muted mb-2">
                  <span>Electricity Cost</span>
                  <span className="font-mono text-red-400">-$1.65</span>
                </div>
                <div className="border-t border-dark-border pt-2 flex justify-between font-semibold">
                  <span className="text-dark-text">Net Profit</span>
                  <span className="font-mono text-primary">$2.47</span>
                </div>
              </div>

              {/* Status indicators */}
              <div className="flex gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                  <span className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></span>
                  2 Workers Online
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-dark-border text-dark-text-muted">
                  52.3 MH/s
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Copy */}
          <div className="order-1 lg:order-2 text-center lg:text-left">
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
              <span className="text-gradient">One Click. Real Answers.</span>
            </h2>
            <p className="mt-6 text-xl text-dark-text-muted max-w-lg mx-auto lg:mx-0">
              MineGlance shows you the number that matters: net profit after electricity. Green means you&apos;re making money. Red means you&apos;re not.
            </p>
            <ul className="mt-8 space-y-4 text-left max-w-lg mx-auto lg:mx-0">
              <li className="flex items-start gap-3">
                <span className="text-primary text-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-dark-text">Net profit calculated automatically</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary text-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-dark-text">Live hashrate and worker status</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary text-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-dark-text">&quot;Should I switch coins?&quot; indicator</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
