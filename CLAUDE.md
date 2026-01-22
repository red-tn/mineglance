# Claude Code Instructions for MineGlance

## Current Versions
- **Website**: 0.1.0
- **Chrome Extension**: 1.3.5
- **Desktop App (Windows)**: 1.3.5
- **Desktop App (macOS)**: Not yet released

## CRITICAL: Backward Compatibility Requirements

**All updates to Windows app and Chrome extension MUST maintain backward compatibility:**

1. **API Changes**: Never remove or rename existing API endpoints. Add new endpoints instead.
2. **Database Schema**: Only ADD columns, never remove or rename. Use defaults for new columns.
3. **Local Storage**: Keep existing keys. Add new keys with fallback defaults.
4. **Settings Sync**: New settings must have sensible defaults so older clients work.
5. **Feature Flags**: Use feature detection, not version checks where possible.
6. **Graceful Degradation**: New features should fail silently on older clients.

**Example Pattern:**
```javascript
// Good: Check if feature exists
const showPayout = wallet.payoutPredictionEnabled !== false; // Default to true

// Bad: Assume feature exists
const showPayout = wallet.payoutPredictionEnabled; // Breaks on old data
```

## Workflow Rules

1. **Git operations allowed** - You CAN run git commands to deploy website changes to Vercel:
   - Use `git add -A && git commit -m "message" && git push origin main` for website deployments
   - For extension/desktop releases, use the publish script: `python roadmap/publish_releases.py`
   - User handles SQL migrations manually in Supabase SQL Editor

2. **User runs SQL migrations** - When database schema changes are needed:
   - Tell user the SQL to run in Supabase SQL Editor
   - Do NOT attempt to run SQL yourself

3. **Use www subdomain for all API calls** - Always use `https://www.mineglance.com` NOT `https://mineglance.com` to avoid redirect issues that strip headers.

4. **Version Bump Workflow** - When user asks to bump version or release a new version:

   **For Chrome Extension:**
   1. Update version in `F:\MINEGLANCE\extension\manifest.json`
   2. Update `PENDING_RELEASES` in `F:\MINEGLANCE\roadmap\publish_releases.py`
   3. Tell user to run: `python roadmap/publish_releases.py`

   **For Desktop App (Windows):**
   1. Update version in `F:\MINEGLANCE\desktop\src-tauri\tauri.conf.json`
   2. Update `APP_VERSION` in `F:\MINEGLANCE\desktop\src\stores\authStore.ts`
   3. Update version display in `F:\MINEGLANCE\desktop\src\components\Layout.tsx`
   4. Run `npm run tauri build` in the desktop folder
   5. Update `PENDING_RELEASES` in `F:\MINEGLANCE\roadmap\publish_releases.py`
   6. Tell user to run: `python roadmap/publish_releases.py`

   **For Desktop App (macOS):**
   1. Same version updates as Windows
   2. Build on macOS machine: `npm run tauri build`
   3. Output: `desktop/src-tauri/target/release/bundle/dmg/MineGlance_X.X.X_x64.dmg`
   4. Update `PENDING_RELEASES` with platform: `desktop_macos`

   **The publish script (run by USER) automatically:**
   - Creates ZIP from `extension/` folder for extension releases
   - Finds exe/dmg from `desktop/src-tauri/target/release/bundle/` for desktop releases
   - Uploads to Supabase Storage
   - Publishes release info to `software_releases` table
   - Commits and pushes all changes
   - Marks new release as "latest" and unmarks old ones

   **Release script location:** `F:\MINEGLANCE\roadmap\publish_releases.py`
   **Storage bucket:** `https://supabase.com/dashboard/project/zbytbrcumxgfeqvhmzsf/storage/files/buckets/software`

5. **Subscription Model** - MineGlance offers three Pro billing options:
   - Free tier: 1 wallet, ALL pools supported, ALL coins supported
   - Pro Monthly: $6.99/month
   - Pro Annual: $59/year (best value)
   - Pro Lifetime: $99 one-time (never expires)
   - All Pro tiers include: Unlimited wallets, email alerts, cloud sync, desktop app, price alerts, payout prediction, performance charts

6. **Blog System** - Blog posts managed via admin dashboard at `/admin/blog`:
   - Homepage shows "Mining In the News" section with pinned posts
   - Comments require authenticated users (free or pro)
   - Blog feeds appear in user dashboard and extension

## Project Structure

```
/MINEGLANCE/
├── app/                    # Next.js 14 App Router
│   ├── api/               # 100+ API endpoints
│   ├── admin/             # Admin dashboard (17 pages)
│   ├── dashboard/         # User dashboard (9 pages)
│   └── [public pages]/    # Landing, blog, download, etc.
├── extension/             # Chrome Extension (Manifest V3) v1.3.5
├── desktop/               # Tauri Desktop App v1.3.5
├── mobile/                # React Native/Expo app
├── components/            # Shared React components
├── lib/                   # Shared utilities
├── public/                # Static assets
├── docs/                  # Documentation
└── roadmap/               # Release publishing scripts
```

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Desktop**: Tauri 2, React 18, Zustand
- **Mobile**: React Native/Expo
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe (Embedded Checkout only, no Payment Links)
- **Email**: SendGrid
- **Storage**: Supabase Storage (S3 compatible)

## Plan Types

**Only two plans exist:**
- `free` - Free tier (1 wallet, basic features)
- `pro` - Pro tier (paid, unlimited wallets, all features)

**Pro Billing Types** (stored in `billing_type` column):
- `monthly` - $6.99/month
- `annual` - $59/year (default)
- `lifetime` - $99 one-time (never expires, `subscription_end_date` is NULL)

**Retention Promo Codes** (Stripe):
- `STAY10` - 10% off annual ($53.10)
- `STAY25` - 25% off lifetime ($74.25)

## Database Tables

### Core Tables
- `users` - User accounts with subscription info, `retention_offer_used` flag
- `user_sessions` - Session tokens for dashboard login
- `user_instances` - Device/extension instances (instanceId, deviceType, deviceName, lastSeen, isOnline)
- `user_wallets` - Wallet configurations with price alerts, payout prediction, chart settings
- `user_settings` - User preferences (refresh interval, theme, electricity cost)
- `user_rigs` - Rig/device tracking with hardware specs

### Admin Tables
- `admin_users` - Admin login accounts (password hashed with bcrypt)
- `admin_sessions` - Admin session tokens
- `admin_audit_log` - Admin action history

### Analytics Tables
- `analytics_sessions` - Visitor session tracking
- `page_views` - Page view events with hourly data for 24h view

### Content Tables
- `blog_posts` - Blog post content with email notification settings
- `blog_comments` - User comments on posts
- `email_templates` - Customizable email templates

### Performance & Payment Tables
- `wallet_performance_history` - Historical wallet stats for charts (90 day retention)
- `payment_history` - Payment records (subscription, renewal, refund, upgrade)
- `software_releases` - Published versions (platform: extension, desktop_windows, desktop_macos)
- `roadmap_items` - Feature requests (priority: really_need, would_help, nice_to_have)

### Cron Tables
- `cron_jobs` - Scheduled job definitions
- `cron_executions` - Execution history and logs

## Key API Routes

### Payment & Subscription
- `/api/webhook` - Stripe webhook handler (checkout.session.completed, etc.)
- `/api/check-pro` - Verify Pro status
- `/api/create-checkout-session` - Create Stripe Embedded Checkout session (supports monthly, annual, lifetime plans with `allow_promotion_codes: true`)
- `/api/dashboard/subscription` - GET info, POST accept retention offer or request refund

### User Dashboard (`/dashboard`)
- `/api/dashboard/auth/*` - Login, logout, verify, 2FA
- `/api/dashboard/profile` - GET/PUT profile data
- `/api/dashboard/devices` - GET devices, DELETE to deactivate
- `/api/dashboard/subscription` - Subscription management with retention offers

### Instance & Wallet Management
- `/api/instances` - POST register, PUT heartbeat
- `/api/wallets/sync` - POST/PUT wallet sync with cloud
- `/api/wallet-history` - GET historical wallet data
- `/api/rigs/sync` - PUT sync rig/device data

### Admin Dashboard (`/admin`)
- `/api/admin/auth/*` - Admin login/logout/verify (bcrypt + rate limiting + 2FA)
- `/api/admin/users` - User management
- `/api/admin/stats` - Dashboard statistics (uses payment_history for accurate revenue)
- `/api/admin/revenue` - Revenue analytics
- `/api/admin/cron` - Cron job management
- `/api/admin/blog` - Blog post management
- `/api/admin/software/*` - Software release management

### Analytics
- `/api/analytics/track` - POST track page views, GET analytics data
  - 24h period returns hourly buckets
  - 7d/30d/90d returns daily aggregates

### Cron Endpoints
- `/api/cron/purge-instances` - Purge stale instances (30d) AND unverified users (30d)
- `/api/cron/capture-performance` - Record wallet performance snapshots
- `/api/cron/check-price-alerts` - Check and send price alerts (24hr cooldown)
- `/api/cron/cleanup-sessions` - Remove expired sessions
- `/api/cron/renewal-reminders` - Send renewal emails (7 days before expiry)

## v1.3.5 Features (Latest Release)

### Price Alerts (Pro)
- Set target price for coins
- Condition: above/below threshold
- Email notifications via SendGrid
- 24hr cooldown per wallet to prevent spam

### Payout Prediction (Pro)
- Track progress toward pool payout thresholds
- Display estimated time until payout
- Pool-specific thresholds configured

### Performance Charts (Pro)
- Historical data collection (hourly snapshots)
- 7/30/90 day chart periods
- Hashrate, earnings, workers tracking
- 90-day data retention

### Rig Management
- Device types: GPU, ASIC, CPU
- Hardware specs tracking
- Per-rig profitability

### Plan Management Modals

**ManagePlanModal** (`components/ManagePlanModal.tsx`):
- Accessed via "Manage Plan" button on subscription page
- Monthly users: upgrade to Annual ($53.10 with STAY10) or Lifetime ($74.25 with STAY25)
- Annual users: upgrade to Lifetime or switch to Monthly at renewal
- Lifetime users: shows "best plan" message
- Uses Stripe Embedded Checkout with `allow_promotion_codes: true`

**RetentionOfferModal** (`components/RetentionOfferModal.tsx`):
- Shows when user clicks "Cancel Plan" button
- Three retention offers:
  - Free month extension (one-time, tracked in `retention_offer_used`)
  - 10% off annual - opens embedded checkout (user enters STAY10)
  - 25% off lifetime - opens embedded checkout (user enters STAY25)
- Free month is one-time per account; discount offers via Stripe promo codes

## Extension Features

### Free Features
- Basic mining stats (hashrate, workers, balance)
- Auto-refresh interval setting
- First wallet only (additional wallets locked)
- Electricity cost calculation
- Minable coins discovery

### Pro Features
- Unlimited wallets
- Worker offline notifications
- Profit drop alerts
- Email alerts via SendGrid
- Cloud sync across devices
- Price alerts
- Payout prediction
- Performance charts

### Supported Mining Pools (11 pools)
- 2Miners (ETC, RVN, ERGO, FLUX, KAS, etc.)
- Nanopool (ETC, RVN, ERGO, etc.)
- F2Pool (multiple coins)
- Ethermine (ETC only)
- Hiveon Pool (ETC, RVN)
- HeroMiners (multiple coins)
- WoolyPooly (multiple coins)
- Cedric Crispin (FIRO only) - Check for stale data (>2 hours old)
- CKPool Solo (BTC) - solo.ckpool.org
- CKPool Solo EU (BTC) - eusolo.ckpool.org
- OCEAN (BTC) - /v1/statsnap/{address} endpoint
- Public Pool (BTC) - public-pool.io

## Desktop App (Tauri)

### Location
`/desktop` folder

### Tech Stack
- Tauri v2 with plugins: single-instance, autostart, notification, updater, store
- React 18 + TypeScript
- Zustand (state management)
- Tailwind CSS

### Key Files
- `desktop/src-tauri/tauri.conf.json` - Tauri configuration (version, window settings)
- `desktop/src-tauri/src/lib.rs` - Rust backend with single-instance enforcement
- `desktop/src-tauri/Cargo.toml` - Rust dependencies
- `desktop/src/stores/authStore.ts` - Auth state + heartbeat + subscription refresh
- `desktop/src/stores/walletStore.ts` - Wallet state + cloud sync
- `desktop/src/stores/settingsStore.ts` - Settings state (theme, refresh interval)
- `desktop/src/components/Layout.tsx` - Main layout with sidebar navigation
- `desktop/src/pages/*.tsx` - Dashboard, Wallets, Devices, Profile, Settings

### Build Commands
```bash
cd desktop
npm run tauri build
```

**Windows Output:** `desktop/src-tauri/target/release/bundle/nsis/MineGlance_X.X.X_x64-setup.exe`
**macOS Output:** `desktop/src-tauri/target/release/bundle/dmg/MineGlance_X.X.X_x64.dmg`

### Single Instance
- Uses `tauri-plugin-single-instance` to prevent multiple processes
- Focuses existing window when app is re-launched

### Heartbeat System
- Desktop app sends heartbeat every 5 minutes via `/api/instances` PUT
- Refreshes subscription status every 15 minutes
- Shows online/offline status in Devices page

## Webhook Handling (Stripe)

The webhook at `/api/webhook` handles subscription events.

### Webhook URL
Must be set to `https://www.mineglance.com/api/webhook` (with www) in Stripe Dashboard to avoid 307 redirects that strip headers.

## Security Features

### Password Hashing
- **bcrypt** with cost factor 12
- Implementation: `lib/password.ts`

### Rate Limiting
- 5 login attempts per 15 minutes per IP
- Auto-cleanup of expired records
- Implementation: `lib/rateLimit.ts`

### Two-Factor Authentication (2FA)
- TOTP-based (Time-based One-Time Password)
- Backup codes for recovery
- Available for both admin and user dashboards

### Row Level Security (RLS)
All sensitive tables have RLS enabled with service-role-only policies.

## Environment Variables

Required in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `ADMIN_EMAILS` (comma-separated admin emails)
- `CRON_SECRET` (for authenticating Vercel cron requests)

## Cron Jobs (5 Active)

| Job | Schedule | Purpose |
|-----|----------|---------|
| Purge Stale Data | Daily midnight | Remove instances (30d) and unverified users (30d) |
| Capture Performance | Hourly | Record wallet stats for charts |
| Check Price Alerts | Every 15 min | Send price alert emails |
| Cleanup Sessions | Daily | Remove expired sessions |
| Renewal Reminders | Daily | Email users 7 days before expiry |

Managed via `/admin/cron` dashboard.

## Common Issues & Fixes

### Extension not showing PRO badge
- User needs to reload the extension after upgrade
- Extension stores `plan` in chrome.storage.local
- `checkSubscriptionStatus()` updates the plan from server

### Stale data from Cedric Crispin pool
- Pool returns old performance samples even when miner is offline
- Check if `performanceSamples.created` is older than 2 hours
- If stale, show 0 hashrate and workers as offline

### Desktop app multiple instances
- Fixed in v1.3.5 with `tauri-plugin-single-instance`
- App now focuses existing window instead of creating duplicates

### Revenue not showing correctly
- Fixed to use `payment_history` table for accurate revenue
- Counts succeeded payments of type: subscription, renewal, upgrade

## Build Configuration

### Next.js (tsconfig.json)
```json
{
  "exclude": ["node_modules", "desktop", "extension"]
}
```
This prevents the desktop/extension folders from being included in Next.js builds.

### Chrome Extension Manifest
- Uses Manifest V3
- `host_permissions` includes all pool APIs

### Tauri Configuration
- Minimum window: 800x600
- Auto-update endpoint: `/api/desktop/update`
- Windows: NSIS installer
- macOS: DMG bundle (minimum OS 10.13)

## Supabase Access

For direct database queries:
- URL: `https://zbytbrcumxgfeqvhmzsf.supabase.co`
- Use Supabase REST API with service role key for admin operations
- Storage bucket for releases: `software`
