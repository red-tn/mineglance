# Claude Code Instructions for MineGlance

## Workflow Rules

1. **Always commit and push after updates and task completions** - After making code changes, immediately stage, commit, and push to the repository. Do not wait for the user to ask.

2. **Run SQL migrations in Supabase** - When database schema changes are made to `supabase-setup.sql`, remind user to run the new migrations in Supabase SQL Editor.

## Project Structure

- **Next.js 14 App Router** with TypeScript
- **Tailwind CSS** for styling
- **Supabase** for database (PostgreSQL)
- **Stripe** for payments (Embedded Checkout)
- **SendGrid** for email alerts
- **Chrome Extension** (Manifest V3) in `/extension` folder

## Database Tables

### Core Tables
- `paid_users` - License/customer data with profile fields:
  - email, license_key, plan, stripe_payment_id
  - password_hash (for dashboard login)
  - full_name, phone, address_line1, address_line2, city, state, zip, country
  - profile_photo_url, last_login
- `license_activations` - Device activations (license_key, install_id, activated_at, last_seen)
- `extension_installs` - All extension installs (install_id, email, browser, version)

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
- `/api/create-checkout-session` - Stripe checkout
- `/api/webhook` - Stripe webhook handler
- `/api/activate-license` - License activation for extension
- `/api/check-pro` - Verify Pro status
- `/api/send-alert` - Send email alerts via SendGrid

### Admin Dashboard (`/admin`)
- `/api/admin/auth/*` - Admin login/logout/verify
- `/api/admin/users` - User management
- `/api/admin/stats` - Dashboard statistics
- `/api/admin/installs` - Extension installs
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
- `/api/dashboard/qr` - POST generate QR code, PUT verify QR code

## Dashboard Pages

### Admin (`/admin`)
- `/admin/login` - Admin login
- `/admin` - Dashboard overview
- `/admin/users` - User management
- `/admin/installs` - Extension installs
- `/admin/revenue` - Revenue analytics
- `/admin/health` - System health
- `/admin/logs` - System logs
- `/admin/alerts` - Alert management

### Pro Subscriber (`/dashboard`)
- `/dashboard/login` - Login with license key + email
- `/dashboard/set-password` - First-time password creation
- `/dashboard` - Overview with stats cards
- `/dashboard/profile` - Photo upload, personal info, address
- `/dashboard/devices` - View/deactivate activated devices

## Extension Features

### Free Features
- Basic mining stats (hashrate, workers, balance)
- Auto-refresh interval setting
- Multiple wallet support (first wallet only for free users)
- Electricity cost calculation

### Pro Features
- Unlimited wallets
- Worker offline notifications
- Profit drop alerts
- Better coin suggestions
- Email alerts via SendGrid
- QR code generation for mobile app sync

### Supported Mining Pools
- 2Miners, Nanopool, F2Pool, Ethermine, Hiveon
- HeroMiners, WoolyPooly, Cedric Crispin (FIRO)
- CKPool Solo (BTC), OCEAN (BTC), Public Pool (BTC)

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

## License Key Formats

- New format: `XXXX-XXXX-XXXX-XXXX` (alphanumeric)
- Legacy format: `MG-XXXX-XXXX-XXXX` (still supported)
