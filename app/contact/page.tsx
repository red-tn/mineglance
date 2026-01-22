'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'general',
    message: ''
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')

    // Create mailto link with form data
    const subject = encodeURIComponent(`[MineGlance ${formData.subject}] ${formData.name}`)
    const body = encodeURIComponent(
      `From: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`
    )

    window.location.href = `mailto:support@mineglance.com?subject=${subject}&body=${body}`

    setStatus('sent')
    setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <main className="min-h-screen">
      <Header />

      {/* Contact Hero */}
      <div className="py-12 sm:py-16 bg-primary text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Contact Us</h1>
          <p className="text-lg sm:text-xl text-white/80">
            Have a question or feedback? We would love to hear from you.
          </p>
        </div>
      </div>

      {/* Contact Form */}
      <div className="py-12 sm:py-16 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-background rounded-2xl p-6 sm:p-8 border border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-accent focus:border-accent transition-colors text-base"
                  placeholder="John Doe"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-accent focus:border-accent transition-colors text-base"
                  placeholder="you@example.com"
                />
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                  What can we help with?
                </label>
                <select
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-accent focus:border-accent transition-colors text-base bg-white"
                >
                  <option value="general">General Question</option>
                  <option value="support">Technical Support</option>
                  <option value="billing">Billing / Refund</option>
                  <option value="feature">Feature Request</option>
                  <option value="bug">Bug Report</option>
                  <option value="partnership">Partnership / Business</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-accent focus:border-accent transition-colors resize-none text-base"
                  placeholder="Tell us how we can help..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full bg-accent hover:bg-green-600 text-white font-semibold py-3 sm:py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {status === 'sending' ? 'Opening Email...' : status === 'sent' ? 'Email Client Opened!' : 'Send Message'}
              </button>

              {status === 'sent' && (
                <p className="text-center text-accent text-sm">
                  Your email client should have opened. If not, email us directly at support@mineglance.com
                </p>
              )}
            </form>
          </div>

          {/* Alternative Contact Methods */}
          <div className="mt-8 sm:mt-12 text-center">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">Other Ways to Reach Us</h2>
            <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8">
              <a
                href="mailto:support@mineglance.com"
                className="flex items-center justify-center gap-2 text-foreground/70 hover:text-accent transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>support@mineglance.com</span>
              </a>
            </div>
            <p className="mt-4 sm:mt-6 text-foreground/50 text-sm">
              We typically respond within 24 hours.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="py-12 sm:py-16 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold text-primary mb-6 sm:mb-8 text-center">Before You Reach Out</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <a
              href="/support"
              className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 hover:border-accent/50 hover:shadow-md transition-all group"
            >
              <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors mb-2">
                Support Center
              </h3>
              <p className="text-sm text-foreground/60">
                Troubleshooting guides and getting started help.
              </p>
            </a>
            <a
              href="/#faq"
              className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 hover:border-accent/50 hover:shadow-md transition-all group"
            >
              <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors mb-2">
                FAQ
              </h3>
              <p className="text-sm text-foreground/60">
                Answers to commonly asked questions.
              </p>
            </a>
            <a
              href="/#pricing"
              className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 hover:border-accent/50 hover:shadow-md transition-all group sm:col-span-2 lg:col-span-1"
            >
              <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors mb-2">
                Pricing
              </h3>
              <p className="text-sm text-foreground/60">
                Compare plans and features.
              </p>
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
