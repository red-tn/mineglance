-- MineGlance Supabase Schema
-- Run this in the Supabase SQL editor

-- Paid users table with license key support
CREATE TABLE IF NOT EXISTS paid_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  license_key TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_payment_id TEXT,
  amount_paid INTEGER DEFAULT 2900,
  currency TEXT DEFAULT 'usd',
  plan TEXT DEFAULT 'pro' CHECK (plan IN ('pro', 'bundle')),
  max_activations INTEGER DEFAULT 3,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- License activations (track which devices are using each license)
CREATE TABLE IF NOT EXISTS license_activations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_key TEXT NOT NULL REFERENCES paid_users(license_key) ON DELETE CASCADE,
  install_id TEXT NOT NULL,
  device_name TEXT,
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(license_key, install_id)
);

-- Extension installs tracking
CREATE TABLE IF NOT EXISTS extension_installs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  install_id TEXT UNIQUE NOT NULL,
  email TEXT,
  browser TEXT,
  version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_paid_users_email ON paid_users(email);
CREATE INDEX IF NOT EXISTS idx_paid_users_license_key ON paid_users(license_key);
CREATE INDEX IF NOT EXISTS idx_license_activations_key ON license_activations(license_key);
CREATE INDEX IF NOT EXISTS idx_license_activations_install ON license_activations(install_id);
CREATE INDEX IF NOT EXISTS idx_extension_installs_email ON extension_installs(email);

-- Enable Row Level Security
ALTER TABLE paid_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_installs ENABLE ROW LEVEL SECURITY;

-- Policies for API access (service role bypasses RLS)
CREATE POLICY "Allow service role full access to paid_users" ON paid_users FOR ALL USING (true);
CREATE POLICY "Allow service role full access to license_activations" ON license_activations FOR ALL USING (true);
CREATE POLICY "Allow service role full access to extension_installs" ON extension_installs FOR ALL USING (true);

-- Migration: If you have existing paid_users table, run these:
-- ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS license_key TEXT UNIQUE;
-- ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS max_activations INTEGER DEFAULT 3;
-- ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT FALSE;
-- UPDATE paid_users SET license_key = 'MG-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 4)) || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 4)) || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 4)) WHERE license_key IS NULL;

-- =====================================================
-- User Dashboard Schema (Pro Subscriber Portal)
-- =====================================================

-- Add profile fields to paid_users
ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- User sessions table (for dashboard login)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES paid_users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Enable RLS on user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access to user_sessions" ON user_sessions FOR ALL USING (true);

-- Clean up expired sessions (optional - run periodically)
-- DELETE FROM user_sessions WHERE expires_at < NOW();

-- =====================================================
-- Email Alerts Log (for admin dashboard stats)
-- =====================================================

CREATE TABLE IF NOT EXISTS email_alerts_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_key TEXT NOT NULL,
  email TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  wallet_name TEXT,
  subject TEXT,
  message TEXT,
  sendgrid_message_id TEXT,
  sendgrid_status TEXT DEFAULT 'accepted',
  sendgrid_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_alerts_log_created ON email_alerts_log(created_at);
CREATE INDEX IF NOT EXISTS idx_email_alerts_log_license ON email_alerts_log(license_key);
CREATE INDEX IF NOT EXISTS idx_email_alerts_log_message_id ON email_alerts_log(sendgrid_message_id);

-- Enable RLS
ALTER TABLE email_alerts_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access to email_alerts_log" ON email_alerts_log FOR ALL USING (true);

-- Migration: Add new columns if table exists
ALTER TABLE email_alerts_log ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE email_alerts_log ADD COLUMN IF NOT EXISTS sendgrid_message_id TEXT;
ALTER TABLE email_alerts_log ADD COLUMN IF NOT EXISTS sendgrid_status TEXT DEFAULT 'accepted';
ALTER TABLE email_alerts_log ADD COLUMN IF NOT EXISTS sendgrid_response TEXT;
