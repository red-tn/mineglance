# Claude Code Instructions for MineGlance

## Workflow Rules

1. **Always commit and push after updates and task completions** - After making code changes, immediately stage, commit, and push to the repository. Do not wait for the user to ask.

## Project Structure

- **Next.js 14 App Router** with TypeScript
- **Tailwind CSS** for styling
- **Supabase** for database (PostgreSQL)
- **Stripe** for payments (Embedded Checkout)
- **SendGrid** for email alerts
- **Chrome Extension** (Manifest V3) in `/extension` folder

## Database Tables

- `paid_users` - License/customer data (email, license_key, plan, stripe_payment_id)
- `license_activations` - Device activations (license_key, install_id, activated_at, last_seen)
- `admin_users` - Admin login accounts
- `admin_sessions` - Admin session tokens
- `email_alerts_log` - Alert notification history

## Key API Routes

- `/api/create-checkout-session` - Stripe checkout
- `/api/webhook` - Stripe webhook handler
- `/api/verify-license` - License verification for extension
- `/api/admin/*` - Admin dashboard APIs

## Environment Variables

Required in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SENDGRID_API_KEY`
