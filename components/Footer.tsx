import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-primary text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Logo */}
          <Link href="/" className="mb-6 md:mb-0">
            <Image
              src="/logo-white.svg"
              alt="MineGlance"
              width={160}
              height={40}
              className="h-8 w-auto"
            />
          </Link>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/privacy" className="hover:text-accent transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-accent transition-colors">
              Terms of Service
            </Link>
            <Link href="/support" className="hover:text-accent transition-colors">
              Support
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/20 text-center text-sm text-white/70">
          <p>&copy; {new Date().getFullYear()} MineGlance. All rights reserved.</p>
          <p className="mt-2">Built by miners, for miners.</p>
        </div>
      </div>
    </footer>
  )
}
