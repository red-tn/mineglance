'use client'

import { useState } from 'react'
import ExtensionDownloadModal from './ExtensionDownloadModal'

export default function FinalCTA() {
  const [showDownloadModal, setShowDownloadModal] = useState(false)

  return (
    <>
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass-card rounded-3xl p-12 border border-primary/30">
            <h2 className="text-3xl sm:text-4xl font-bold">
              <span className="text-gradient">Stop Guessing. Start Knowing.</span>
            </h2>
            <p className="mt-4 text-xl text-dark-text-muted max-w-2xl mx-auto">
              Join thousands of miners who finally know if they&apos;re actually making money.
            </p>
            <div className="mt-8">
              <button
                onClick={() => setShowDownloadModal(true)}
                className="inline-flex items-center gap-2 text-lg px-8 py-4 bg-primary hover:bg-primary-light text-white font-semibold rounded-lg shadow-glow hover:shadow-glow-lg transition-all"
              >
                Add to Chrome — It&apos;s Free
              </button>
            </div>
            <p className="mt-4 text-sm text-dark-text-dim">
              Free forever. Pro upgrade available for power users.
            </p>
          </div>
        </div>
      </section>

      <ExtensionDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />
    </>
  )
}
