import CTAButton from './CTAButton'

export default function FinalCTA() {
  return (
    <section className="py-20 bg-primary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          Stop Guessing. Start Knowing.
        </h2>
        <p className="mt-4 text-xl text-white/80 max-w-2xl mx-auto">
          Join thousands of hobbyist miners who finally know if they&apos;re actually making money.
        </p>
        <div className="mt-8">
          <CTAButton href="#" variant="primary" className="text-lg px-8 py-4 bg-accent hover:bg-green-600">
            Add to Chrome — It&apos;s Free
          </CTAButton>
        </div>
        <p className="mt-4 text-sm text-white/60">
          Free forever. Pro upgrade available for power users.
        </p>
      </div>
    </section>
  )
}
