import Image from 'next/image'

export default function SolutionSection() {
  return (
    <section className="py-20 bg-primary text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Extension screenshot */}
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-auto">
              {/* Extension header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
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
              </div>

              {/* Net Profit Display */}
              <div className="text-center mb-4">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Net Profit Today</p>
                <p className="text-5xl font-bold text-accent font-mono">+$2.47</p>
              </div>

              {/* Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Gross Revenue</span>
                  <span className="font-mono">$4.12</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Electricity Cost</span>
                  <span className="font-mono text-warning">-$1.65</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                  <span className="text-gray-800">Net Profit</span>
                  <span className="font-mono text-accent">$2.47</span>
                </div>
              </div>

              {/* Status indicators */}
              <div className="flex gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent">
                  ● 2 Workers Online
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  52.3 MH/s
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Copy */}
          <div className="order-1 lg:order-2 text-center lg:text-left">
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
              One Click. Real Answers.
            </h2>
            <p className="mt-6 text-xl text-white/80 max-w-lg mx-auto lg:mx-0">
              MineGlance shows you the number that matters: net profit after electricity. Green means you&apos;re making money. Red means you&apos;re not.
            </p>
            <ul className="mt-8 space-y-4 text-left max-w-lg mx-auto lg:mx-0">
              <li className="flex items-start gap-3">
                <span className="text-accent text-xl">✓</span>
                <span className="text-white/90">Net profit calculated automatically</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent text-xl">✓</span>
                <span className="text-white/90">Live hashrate and worker status</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent text-xl">✓</span>
                <span className="text-white/90">&quot;Should I switch coins?&quot; indicator</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
