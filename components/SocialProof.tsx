export default function SocialProof() {
  return (
    <section className="py-12 bg-white border-y border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-center">
          {/* Placeholder stats - update with real data when available */}
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-primary font-mono">500+</span>
            <span className="text-foreground/60">Active Miners</span>
          </div>
          <div className="hidden sm:block w-px h-8 bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <div className="flex text-yellow-400">
              {'★'.repeat(5)}
            </div>
            <span className="text-foreground/60">Chrome Web Store</span>
          </div>
          <div className="hidden sm:block w-px h-8 bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-accent font-mono">$0</span>
            <span className="text-foreground/60">Monthly Fees</span>
          </div>
        </div>
      </div>
    </section>
  )
}
