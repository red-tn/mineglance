# MineGlance

Mining profitability dashboard for cryptocurrency miners. Monitor your hashrate, earnings, and net profit across multiple pools in one place.

## Features

- Real-time mining stats from 12+ popular pools
- Multi-coin support (BTC, ETC, RVN, ERGO, KAS, FIRO, and more)
- Net profit calculations with electricity costs
- Chrome extension for quick popup monitoring
- iOS/Android mobile app
- User dashboard for Pro subscribers
- Blog with mining news and guides
- Email alerts for offline miners
- Blog newsletter with opt-in/opt-out preferences
- Flexible billing options (monthly, annual, lifetime)

## Supported Pools

- 2Miners
- Nanopool
- HeroMiners
- F2Pool
- Ethermine
- Hiveon
- WoolyPooly
- CKPool Solo
- Public Pool
- OCEAN
- Cedric Crispin

## Pricing

- **Free** - 1 wallet, all pools, all coins, basic features
- **Pro** - Unlimited wallets, email alerts, cloud sync, mobile app
  - Monthly: $6.99/month
  - Annual: $59/year (save 30%)
  - Lifetime: $99 one-time

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL, Auth, Storage)
- Stripe (Payments)
- SendGrid (Email)
- Chrome Extension (Manifest V3)
- React Native / Expo (Mobile)

## Recent Updates

### January 2025
- Blog newsletter system with email preferences
- Flexible billing tiers (monthly/annual/lifetime)
- Security hardening (bcrypt password hashing, rate limiting)
- One-click unsubscribe from blog emails

## Development

```bash
npm install
npm run dev
```

## Deployment

Website and API deployed on Vercel. Extension published on Chrome Web Store. Mobile app on App Store.

## Security

- bcrypt password hashing with silent migration
- Rate limiting on sensitive endpoints
- Admin session token verification
- Webhook idempotency checks
- HTML escaping for email content
