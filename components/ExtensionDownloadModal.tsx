'use client'

import { useState, useEffect } from 'react'

interface ExtensionDownloadModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ExtensionDownloadModal({ isOpen, onClose }: ExtensionDownloadModalProps) {
  const [copied, setCopied] = useState(false)

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleCopyUrl = () => {
    navigator.clipboard.writeText('chrome://extensions')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-dark-card border border-dark-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-dark-text-muted hover:text-dark-text transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-dark-text">Install MineGlance Extension</h2>
              <p className="text-sm text-dark-text-muted">Manual installation required</p>
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="mx-6 mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-yellow-200 font-medium">Why manual installation?</p>
              <p className="text-xs text-yellow-200/70 mt-1">
                Google&apos;s Chrome Web Store has a blanket policy against crypto-related extensions.
                MineGlance is a <strong>monitoring dashboard</strong> that only displays your mining stats -
                it does NOT mine cryptocurrency or use your computer&apos;s resources. We&apos;re appealing this decision.
              </p>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <div className="p-6">
          <a
            href="/downloads/mineglance-extension.zip"
            download
            className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary-light text-white font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download MineGlance Extension
            <span className="text-sm opacity-75">(.zip)</span>
          </a>
        </div>

        {/* Installation Steps */}
        <div className="px-6 pb-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">Installation Instructions</h3>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-sm">1</span>
              </div>
              <div>
                <p className="font-medium text-dark-text">Download and extract the ZIP file</p>
                <p className="text-sm text-dark-text-muted mt-1">
                  Click the download button above, then extract the ZIP to a folder on your computer
                  (e.g., <code className="bg-dark-card-hover px-1.5 py-0.5 rounded text-xs">C:\MineGlance</code>)
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-sm">2</span>
              </div>
              <div>
                <p className="font-medium text-dark-text">Open the Extensions page</p>
                <p className="text-sm text-dark-text-muted mt-1">
                  In Chrome, Edge, or Brave, go to:
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <code className="bg-dark-card-hover px-3 py-1.5 rounded text-sm text-primary flex-1">
                    chrome://extensions
                  </code>
                  <button
                    onClick={handleCopyUrl}
                    className="px-3 py-1.5 bg-dark-card-hover hover:bg-dark-border rounded text-sm text-dark-text-muted transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-sm">3</span>
              </div>
              <div>
                <p className="font-medium text-dark-text">Enable Developer Mode</p>
                <p className="text-sm text-dark-text-muted mt-1">
                  Toggle the <strong>&quot;Developer mode&quot;</strong> switch in the top-right corner of the extensions page.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-sm">4</span>
              </div>
              <div>
                <p className="font-medium text-dark-text">Load the extension</p>
                <p className="text-sm text-dark-text-muted mt-1">
                  Click <strong>&quot;Load unpacked&quot;</strong> and select the folder where you extracted the ZIP file.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-dark-text">Done! Pin the extension</p>
                <p className="text-sm text-dark-text-muted mt-1">
                  Click the puzzle icon in your toolbar and pin MineGlance for easy access.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="px-6 pb-6">
          <div className="p-4 bg-dark-card-hover rounded-lg">
            <p className="text-xs text-dark-text-dim">
              <strong className="text-dark-text-muted">Works with:</strong> Chrome, Microsoft Edge, Brave, Opera, Vivaldi, and other Chromium-based browsers.
              The extension is open source and safe to use - it only reads data from mining pool APIs.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook for using the modal
export function useExtensionDownloadModal() {
  const [isOpen, setIsOpen] = useState(false)

  const openModal = () => setIsOpen(true)
  const closeModal = () => setIsOpen(false)

  return { isOpen, openModal, closeModal }
}
