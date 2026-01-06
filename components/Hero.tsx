import Image from 'next/image'
import CTAButton from './CTAButton'

export default function Hero() {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Copy */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              <span className="text-gradient">Are You Actually Making Money Mining?</span>
            </h1>
            <p className="mt-6 text-xl text-dark-text-muted max-w-xl mx-auto lg:mx-0">
              Find out in 2 clicks. Net profit dashboard for GPU miners—no monthly fees, no OS replacement.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <CTAButton href="#" variant="primary" className="text-lg px-8 py-4">
                Add to Chrome — It&apos;s Free
              </CTAButton>
            </div>
            <p className="mt-4 text-sm text-dark-text-dim">
              Works with 2Miners, Nanopool, F2Pool, OCEAN, and more
            </p>
          </div>

          {/* Right side - Extension mockup */}
          <div className="relative">
            <div className="glass-card rounded-2xl p-6 max-w-sm mx-auto card-hover">
              {/* Header */}
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
                <span className="pro-badge">PRO</span>
              </div>

              {/* Net Profit */}
              <div className="text-center mb-6">
                <p className="text-sm text-dark-text-muted uppercase tracking-wide">Today&apos;s Net Profit</p>
                <p className="text-4xl font-bold text-primary font-mono">+$47.82</p>
                <p className="text-sm text-dark-text-dim mt-1">After electricity</p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-dark-card rounded-lg p-3 text-center border border-dark-border">
                  <p className="text-xs text-dark-text-muted">Hashrate</p>
                  <p className="font-semibold font-mono text-dark-text">842 TH/s</p>
                </div>
                <div className="bg-dark-card rounded-lg p-3 text-center border border-dark-border">
                  <p className="text-xs text-dark-text-muted">Workers</p>
                  <p className="font-semibold font-mono text-primary">4/4 Online</p>
                </div>
              </div>

              {/* Coin status */}
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center">
                <p className="text-sm text-primary font-medium">
                  ✓ BTC is your best option right now
                </p>
              </div>
            </div>

            {/* Decorative glow */}
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/20 rounded-full blur-3xl"></div>
          </div>
        </div>

      </div>
    </section>
  )
}
