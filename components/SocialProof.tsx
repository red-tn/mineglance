export default function SocialProof() {
  return (
    <section className="py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-2xl p-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-center">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-primary font-mono">12+</span>
              <span className="text-dark-text-muted text-left">Mining<br/>Pools</span>
            </div>
            <div className="hidden sm:block w-px h-12 bg-dark-border"></div>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-primary font-mono">10+</span>
              <span className="text-dark-text-muted text-left">Supported<br/>Coins</span>
            </div>
            <div className="hidden sm:block w-px h-12 bg-dark-border"></div>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-primary font-mono">$0</span>
              <span className="text-dark-text-muted text-left">Monthly<br/>Fees</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
