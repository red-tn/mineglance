import CTAButton from './CTAButton'

export default function FinalCTA() {
  return (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="glass-card rounded-3xl p-12 border border-primary/30">
          <h2 className="text-3xl sm:text-4xl font-bold">
            <span className="text-gradient">Stop Guessing. Start Knowing.</span>
          </h2>
          <p className="mt-4 text-xl text-dark-text-muted max-w-2xl mx-auto">
            Join thousands of hobbyist miners who finally know if they&apos;re actually making money.
          </p>
          <div className="mt-8">
            <CTAButton href="#" variant="primary" className="text-lg px-8 py-4">
              Add to Chrome — It&apos;s Free
            </CTAButton>
          </div>
          <p className="mt-4 text-sm text-dark-text-dim">
            Free forever. Pro upgrade available for power users.
          </p>
        </div>
      </div>
    </section>
  )
}
