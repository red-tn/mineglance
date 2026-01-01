import Image from 'next/image'
import CTAButton from './CTAButton'

export default function Hero() {
  return (
    <section className="bg-gradient-to-b from-white to-background py-20 lg:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Copy */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary leading-tight">
              Are You Actually Making Money Mining?
            </h1>
            <p className="mt-6 text-xl text-foreground/80 max-w-xl mx-auto lg:mx-0">
              Find out in 2 clicks. Net profit dashboard for hobbyist miners—no monthly fees, no OS replacement.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <CTAButton href="#" variant="primary" className="text-lg px-8 py-4">
                Add to Chrome — It&apos;s Free
              </CTAButton>
            </div>
            <p className="mt-4 text-sm text-foreground/60">
              Works with 2Miners, Nanopool, F2Pool, and more
            </p>
          </div>

          {/* Right side - Extension mockup placeholder */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-auto border border-gray-200">
              {/* Fake browser extension popup */}
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
                <span className="text-xs text-foreground/50">v1.0</span>
              </div>

              {/* Net Profit */}
              <div className="text-center mb-6">
                <p className="text-sm text-foreground/60 uppercase tracking-wide">Today&apos;s Net Profit</p>
                <p className="text-4xl font-bold text-accent font-mono">+$2.47</p>
                <p className="text-sm text-foreground/50 mt-1">After electricity</p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-background rounded-lg p-3 text-center">
                  <p className="text-xs text-foreground/60">Hashrate</p>
                  <p className="font-semibold font-mono">52.3 MH/s</p>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <p className="text-xs text-foreground/60">Workers</p>
                  <p className="font-semibold font-mono text-accent">2/2 Online</p>
                </div>
              </div>

              {/* Coin switch indicator */}
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-center">
                <p className="text-sm text-accent font-medium">
                  ✓ RVN is your best option right now
                </p>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -z-10 top-8 -right-8 w-64 h-64 bg-accent/10 rounded-full blur-3xl"></div>
            <div className="absolute -z-10 -bottom-8 -left-8 w-48 h-48 bg-primary/10 rounded-full blur-3xl"></div>
          </div>
        </div>

        {/* Demo Video */}
        <div className="mt-12 mb-[-40px] max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-primary text-center mb-4">See MineGlance in Action</h2>
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <video
              className="w-full"
              controls
              playsInline
              preload="metadata"
              poster="/demo-video-poster.jpg"
            >
              <source src="/demo-video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    </section>
  )
}
