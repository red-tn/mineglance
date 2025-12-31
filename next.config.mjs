/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent 307 redirects for API routes (fixes Stripe webhook)
  skipTrailingSlashRedirect: true,

  // CORS headers for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, stripe-signature' },
        ],
      },
    ]
  },
}

export default nextConfig
