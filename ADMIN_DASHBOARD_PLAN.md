# MineGlance Admin Dashboard Plan

## Overview
A secure web-based admin panel for monitoring operations, managing users/subscriptions, viewing metrics, and administering the MineGlance platform.

## URL & Access
- **URL**: `https://mineglance.com/admin`
- **Auth**: Email/password with 2FA (TOTP)
- **Role**: Super admin only (hardcoded admin emails)

---

## Phase 1: Core Dashboard (MVP)

### 1.1 Authentication
- Login page at `/admin/login`
- Supabase Auth with email/password
- 2FA using TOTP (Google Authenticator compatible)
- Session timeout: 24 hours
- Admin whitelist in environment variables

### 1.2 Dashboard Overview (`/admin`)
```
┌─────────────────────────────────────────────────────────┐
│  MineGlance Admin                    [User] [Logout]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Total    │ │ Pro      │ │ Revenue  │ │ Active   │   │
│  │ Installs │ │ Users    │ │ (30d)    │ │ Users    │   │
│  │ 1,234    │ │ 89       │ │ $2,581   │ │ 456      │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                         │
│  [Daily Installs Chart - Last 30 Days]                 │
│  [Revenue Chart - Last 30 Days]                        │
│                                                         │
│  Recent Activity                                        │
│  ─────────────                                          │
│  • License activated: MG-XXXX... (2 min ago)           │
│  • New purchase: Pro - $29 (15 min ago)                │
│  • Email alert sent: worker_offline (1 hr ago)         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 1.3 Users & Licenses (`/admin/users`)
- List all licenses with:
  - License key (masked)
  - Email
  - Plan (Pro/Bundle)
  - Status (Active/Inactive)
  - Activations (e.g., 2/3 devices)
  - Purchase date
  - Stripe payment ID
- Search by email or license key
- Filter by plan, status, date range
- Actions:
  - Revoke license
  - Reset activations
  - Send password reset
  - View activation history

### 1.4 Subscriptions & Revenue (`/admin/revenue`)
- Revenue metrics:
  - Total lifetime revenue
  - Revenue by plan (Pro vs Bundle)
  - Revenue by month
  - Refund rate
- Recent transactions list
- Stripe dashboard link

### 1.5 Installations (`/admin/installs`)
- Total installs
- Installs by day/week/month
- Geographic distribution (if collected)
- Browser version distribution
- Extension version distribution

---

## Phase 2: Enhanced Features

### 2.1 Email Alerts Monitoring (`/admin/alerts`)
- Alerts sent today/this week/this month
- Alert type breakdown (Worker Offline, Profit Drop, Better Coin)
- Alert delivery status (sent, failed)
- Rate limit violations
- Email delivery health (SendGrid stats)

### 2.2 System Health (`/admin/health`)
- API response times
- Error rate tracking
- Pool API status (which pools are responding)
- CoinGecko API status
- WhatToMine API status
- Database health

### 2.3 Audit Logs (`/admin/logs`)
- Admin actions log
- License activation attempts (success/fail)
- Webhook events
- Error logs
- Export to CSV

### 2.4 User Support Tools (`/admin/support`)
- Look up user by email
- View user's wallets and pools (debugging)
- Resend welcome email
- Generate new license key
- Issue refund (with Stripe)

---

## Phase 3: Advanced Features

### 3.1 Analytics Dashboard
- User retention metrics
- Feature usage (which pools/coins are popular)
- Conversion funnel (install → pro)
- Churn analysis

### 3.2 Notification Center
- Send broadcast emails to all Pro users
- Announce new features
- Maintenance notifications

### 3.3 A/B Testing
- Pricing experiments
- Feature flag management

---

## Database Schema Additions

```sql
-- Admin users
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  totp_secret TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Admin audit log
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,  -- 'license', 'user', 'refund', etc.
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email alerts log
CREATE TABLE email_alerts_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_key TEXT NOT NULL,
  email TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  wallet_name TEXT,
  message TEXT,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System metrics (time-series)
CREATE TABLE system_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  tags JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_metrics_name_time ON system_metrics(metric_name, created_at DESC);
```

---

## API Endpoints

```
GET  /api/admin/stats           - Dashboard metrics
GET  /api/admin/users           - List users/licenses
GET  /api/admin/users/:id       - User details
POST /api/admin/users/:id/revoke - Revoke license
POST /api/admin/users/:id/reset  - Reset activations
GET  /api/admin/revenue         - Revenue metrics
GET  /api/admin/installs        - Install metrics
GET  /api/admin/alerts          - Alert metrics
GET  /api/admin/logs            - Audit logs
GET  /api/admin/health          - System health
```

---

## Security Requirements

1. **Authentication**
   - Bcrypt password hashing (cost factor 12+)
   - TOTP 2FA required
   - Session tokens with short TTL
   - IP allowlist (optional)

2. **Authorization**
   - Admin role verification on every request
   - Rate limiting (10 req/sec per admin)
   - No sensitive data in URLs

3. **Logging**
   - All admin actions logged
   - Login attempts logged
   - Sensitive operations require confirmation

4. **Data Protection**
   - License keys partially masked in UI
   - Email addresses partially masked in logs
   - No raw passwords ever displayed

---

## Tech Stack

- **Frontend**: Next.js App Router + React
- **Styling**: Tailwind CSS
- **Auth**: Supabase Auth + custom 2FA
- **Charts**: Recharts or Chart.js
- **Tables**: @tanstack/react-table
- **State**: React Query for data fetching

---

## Implementation Order

### Week 1: Foundation
1. Create `/admin` route group with layout
2. Implement auth (login, session, 2FA)
3. Create admin users table
4. Build basic stats API

### Week 2: Core Features
1. Dashboard with key metrics
2. Users/Licenses list and search
3. License management actions
4. Audit logging

### Week 3: Monitoring
1. Revenue tracking
2. Email alerts monitoring
3. Install metrics
4. System health checks

### Week 4: Polish
1. Export functionality
2. Date range filters
3. Mobile responsiveness
4. Documentation

---

## Environment Variables Needed

```env
# Admin whitelist (comma-separated emails)
ADMIN_EMAILS=ryan@mineglance.com,control@mineglance.com

# 2FA encryption key
TOTP_ENCRYPTION_KEY=your-32-char-key

# Admin session secret
ADMIN_SESSION_SECRET=your-secret-key
```

---

## Mockups

### Login Page
```
┌─────────────────────────────────────┐
│                                     │
│        🔒 Admin Login               │
│                                     │
│   Email:    [________________]      │
│   Password: [________________]      │
│                                     │
│   [        Login        ]           │
│                                     │
└─────────────────────────────────────┘
```

### 2FA Page
```
┌─────────────────────────────────────┐
│                                     │
│        🔐 Two-Factor Auth           │
│                                     │
│   Enter code from authenticator:    │
│                                     │
│        [ _ _ _ _ _ _ ]              │
│                                     │
│   [        Verify        ]          │
│                                     │
└─────────────────────────────────────┘
```

---

## Notes

- Start with read-only operations, add write operations carefully
- All destructive actions require confirmation
- Consider using Vercel Edge Config for admin settings
- Consider Vercel Analytics integration for metrics
