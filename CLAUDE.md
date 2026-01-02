# Claude Code Instructions for MineGlance

## Workflow Rules

1. **Always commit and push after ANY code changes** - After making code changes, IMMEDIATELY stage, commit, and push to the repository. Do NOT wait for the user to ask. This is automatic behavior - every completed change gets pushed.

2. **Run SQL migrations in Supabase** - When database schema changes are made to `supabase-setup.sql`, remind user to run the new migrations in Supabase SQL Editor.

3. **Use www subdomain for all API calls** - Always use `https://www.mineglance.com` NOT `https://mineglance.com` to avoid redirect issues that strip headers.

4. **Git commit format** - Use descriptive commit messages with HEREDOC format. Include the robot emoji footer.

## Project Structure

- **Next.js 14 App Router** with TypeScript
- **Tailwind CSS** for styling
- **Supabase** for database (PostgreSQL)
- **Stripe** for payments (Embedded Checkout + Payment Links)
- **SendGrid** for email alerts
- **Chrome Extension** (Manifest V3) in `/extension` folder
- **React Native Mobile App** (Expo) in `/mobile` folder

## Plan Types and Display Names

**IMPORTANT:** Consistent naming across all UI:
- `pro` plan = Display as **"PRO"**
- `bundle` plan = Display as **"PRO PLUS"**
- Never display "Bundle" or "bundle" to users
- Legacy plan names (`lifetime_pro`, `lifetime_bundle`) should be normalized to `pro`/`bundle`

## Database Tables

### Core Tables
- `paid_users` - License/customer data with profile fields:
  - email, license_key, plan (`pro` or `bundle`), stripe_payment_id
  - password_hash (for dashboard login)
  - full_name, phone, address_line1, address_line2, city, state, zip, country
  - profile_photo_url, last_login
  - max_activations (3 for pro, 5 for bundle)
  - is_revoked (boolean for license revocation)
- `license_activations` - Device activations (license_key, install_id, device_name, activated_at, last_seen, is_active)
- `extension_installs` - All extension installs (install_id, email, browser, version, created_at)

### Admin Tables
- `admin_users` - Admin login accounts
- `admin_sessions` - Admin session tokens
- `admin_audit_log` - Admin action history

### User Dashboard Tables
- `user_sessions` - Pro subscriber dashboard session tokens (user_id, token, expires_at)

### Other Tables
- `email_alerts_log` - Alert notification history

## Key API Routes

### Payment & License
- `/api/create-checkout-session` - Stripe embedded checkout for Pro/Bundle
- `/api/create-license-checkout` - Stripe checkout for additional license packs ($5 per 5 activations)
- `/api/webhook` - Stripe webhook handler (handles Checkout Sessions, Payment Links, and license purchases)
- `/api/activate-license` - License activation for extension (POST) and status check (GET)
- `/api/check-pro` - Verify Pro status
- `/api/send-alert` - Send email alerts via SendGrid

### Admin Dashboard (`/admin`)
- `/api/admin/auth/*` - Admin login/logout/verify
- `/api/admin/users` - User management
- `/api/admin/stats` - Dashboard statistics
- `/api/admin/installs` - Extension installs (includes orphan detection)
- `/api/admin/revenue` - Revenue data
- `/api/admin/health` - System health
- `/api/admin/logs` - System logs
- `/api/admin/alerts` - Alert management

### Pro Subscriber Dashboard (`/dashboard`)
- `/api/dashboard/auth/login` - Login with license key + email
- `/api/dashboard/auth/verify` - Verify session token
- `/api/dashboard/auth/logout` - Logout
- `/api/dashboard/auth/set-password` - First-time password setup
- `/api/dashboard/profile` - GET/PUT profile data
- `/api/dashboard/profile/photo` - POST/DELETE profile photo (base64)
- `/api/dashboard/devices` - GET devices, DELETE to deactivate
- `/api/dashboard/qr` - POST generate QR code, PUT verify QR code (for mobile app sync)

## Dashboard Pages

### Admin (`/admin`)
- `/admin/login` - Admin login
- `/admin` - Dashboard overview
- `/admin/users` - User management (shows PRO/PRO PLUS badges)
- `/admin/installs` - Extension installs (with orphan detection)
- `/admin/revenue` - Revenue analytics (shows PRO/PRO PLUS breakdown)
- `/admin/health` - System health
- `/admin/logs` - System logs
- `/admin/alerts` - Alert management

### Pro Subscriber (`/dashboard`)
- `/dashboard/login` - Login with license key + email
- `/dashboard/set-password` - First-time password creation
- `/dashboard` - Overview with stats cards, shows upgrade ad for PRO users
- `/dashboard/profile` - Photo upload, personal info, address
- `/dashboard/devices` - View/deactivate activated devices

## Extension Features

### Free Features
- Basic mining stats (hashrate, workers, balance)
- Auto-refresh interval setting
- First wallet only (additional wallets locked)
- Electricity cost calculation

### Pro Features
- Unlimited wallets
- Worker offline notifications
- Profit drop alerts
- Better coin suggestions
- Email alerts via SendGrid
- QR code generation for mobile app sync (400x400 pixels)

### Supported Mining Pools
- 2Miners (ETC, RVN, ERGO, etc.)
- Nanopool (ETC, RVN, ERGO, etc.)
- F2Pool (multiple coins)
- Ethermine (ETC only - ETH moved to PoS)
- Hiveon Pool (ETC, RVN - ETH removed)
- HeroMiners (multiple coins)
- WoolyPooly (multiple coins)
- Cedric Crispin (FIRO only) - **Note:** Check for stale data (>2 hours old)
- CKPool Solo (BTC) - solo.ckpool.org
- CKPool Solo EU (BTC) - eusolo.ckpool.org
- OCEAN (BTC) - Uses /v1/statsnap/{address} endpoint
- Public Pool (BTC) - public-pool.io

## Mobile App (React Native + Expo)

### Location
`/mobile` folder

### Tech Stack
- Expo SDK 54+
- TypeScript
- Expo Router (file-based navigation)
- Zustand (state management)
- expo-camera (QR scanning)
- expo-secure-store (license key storage)
- expo-notifications (push notifications - future)

### Key Files
- `mobile/app.json` - Expo configuration (includes iOS bundle ID, build number)
- `mobile/eas.json` - EAS Build configuration
- `mobile/app/(tabs)/*` - Tab screens (dashboard, wallets, settings)
- `mobile/app/scan.tsx` - QR code scanner (300px scanner frame)
- `mobile/app/onboarding.tsx` - First-time setup
- `mobile/stores/*` - Zustand stores for wallets, settings, auth

### Build & Deploy
```bash
cd mobile
npx eas build --platform ios --profile production
npx eas submit --platform ios
```

### Mobile App Access
- Only **Pro Plus (bundle)** users can use the mobile app
- Pro-only users see an upgrade prompt when scanning QR code
- Upgrade price for existing Pro users: **$27** (10% loyalty discount)

## Additional License Purchases

Users can buy additional device activations from `/dashboard/devices`:
- **Price:** $5 per license pack (5 activations each)
- **Stripe Product ID:** `prod_Tib34OtCif3xEs`
- **Flow:** Dashboard modal → Stripe Embedded Checkout → Webhook updates `max_activations`
- **Webhook type:** `license_purchase` (detected via `session.metadata.type`)

## Webhook Handling (Stripe)

The webhook at `/api/webhook` handles:
1. **Embedded Checkout Sessions** - Has metadata with plan info
2. **Payment Links** - No metadata, must infer plan from amount
3. **License Purchases** - Has `type: 'license_purchase'` in metadata

### Key Logic
```typescript
// Get email from customer_email OR customer_details.email (Payment Links use the latter)
const customerEmail = session.customer_email || session.customer_details?.email

// Infer plan from amount if no metadata (Payment Links)
if (!session.metadata?.plan) {
  if (amount >= 5500) {
    plan = 'bundle' // $55+ is bundle
  } else if (amount >= 2500 && amount <= 3100) {
    // Check if existing Pro user - if so, this is an upgrade
    // $25-$31 could be Pro ($29) or upgrade ($27-$30)
  }
}
```

### Webhook URL
Must be set to `https://www.mineglance.com/api/webhook` (with www) in Stripe Dashboard to avoid 307 redirects that strip headers.

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
- `ADMIN_DEFAULT_PASSWORD`
- `ADMIN_SALT`
- `USER_SALT` (for dashboard password hashing)
- `QR_SECRET` (for QR code signing)
- `INTERNAL_API_SECRET` (for internal API calls like welcome emails)

## License Key Formats

- New format: `XXXX-XXXX-XXXX-XXXX` (alphanumeric, no confusing chars like 0/O/1/I)
- Legacy format: `MG-XXXX-XXXX-XXXX` (still supported for backwards compatibility)

## Common Issues & Fixes

### Extension not showing PRO PLUS badge
- User needs to reload the extension after upgrade
- Extension stores `plan` in chrome.storage.local
- `checkLicenseStatus()` updates the plan from server

### Mobile app says "not on Pro Plus plan"
- The `/api/activate-license` GET endpoint must return plan even without `installId`
- Mobile app checks plan before allowing import

### Stale data from Cedric Crispin pool
- Pool returns old performance samples even when miner is offline
- Check if `performanceSamples.created` is older than 2 hours
- If stale, show 0 hashrate and workers as offline

### Upgrade not applying $27 discount
- `CheckoutModal` should always apply $27 for existing Pro users upgrading to bundle
- Check `existingPlan === 'pro'` condition

### QR code too small to scan
- Canvas size set to 400x400 pixels
- QR Server API called with size=400x400
- Mobile scanner frame is 300px

## Build Configuration

### Next.js (tsconfig.json)
```json
{
  "exclude": ["node_modules", "mobile", "extension"]
}
```
This prevents the mobile folder from being included in Next.js builds.

### Chrome Extension Manifest
- Uses Manifest V3
- `host_permissions` includes all pool APIs (may trigger Chrome Web Store in-depth review)
- This is expected and normal for extensions that fetch from multiple external APIs

## Supabase Access

For direct database queries:
- URL: `https://zbytbrcumxgfeqvhmzsf.supabase.co`
- Use Supabase REST API with service role key for admin operations
