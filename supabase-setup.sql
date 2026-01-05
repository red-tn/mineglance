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
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow service role full access to paid_users" ON paid_users;
DROP POLICY IF EXISTS "Allow service role full access to license_activations" ON license_activations;
DROP POLICY IF EXISTS "Allow service role full access to extension_installs" ON extension_installs;

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

-- Add notification preferences to paid_users
ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS notify_worker_offline BOOLEAN DEFAULT TRUE;
ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS notify_profit_drop BOOLEAN DEFAULT TRUE;
ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS profit_drop_threshold INTEGER DEFAULT 20;
ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS email_alerts_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS email_alerts_address TEXT;
ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS email_frequency TEXT DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'hourly', 'daily', 'weekly'));

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
DROP POLICY IF EXISTS "Allow service role full access to user_sessions" ON user_sessions;
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
DROP POLICY IF EXISTS "Allow service role full access to email_alerts_log" ON email_alerts_log;
CREATE POLICY "Allow service role full access to email_alerts_log" ON email_alerts_log FOR ALL USING (true);

-- Migration: Add new columns if table exists
ALTER TABLE email_alerts_log ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE email_alerts_log ADD COLUMN IF NOT EXISTS sendgrid_message_id TEXT;
ALTER TABLE email_alerts_log ADD COLUMN IF NOT EXISTS sendgrid_status TEXT DEFAULT 'accepted';
ALTER TABLE email_alerts_log ADD COLUMN IF NOT EXISTS sendgrid_response TEXT;

-- =====================================================
-- Roadmap Items (user feature requests and internal roadmap)
-- =====================================================

CREATE TABLE IF NOT EXISTS roadmap_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Submission info
  category TEXT NOT NULL CHECK (category IN ('new_pool', 'new_coin', 'feature', 'ui_ux', 'integration', 'bug_report', 'other')),
  priority TEXT NOT NULL CHECK (priority IN ('nice_to_have', 'would_help', 'really_need')),
  platforms TEXT[] DEFAULT '{}',
  title TEXT NOT NULL,
  description TEXT,
  submitter_email TEXT,
  submitter_license TEXT,
  -- Admin management
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'planned', 'in_progress', 'completed', 'declined')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  admin_response TEXT,
  target_version TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  -- Internal flag (admin-created vs user-submitted)
  is_internal BOOLEAN DEFAULT FALSE,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roadmap_items_status ON roadmap_items(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_category ON roadmap_items(category);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_created ON roadmap_items(created_at DESC);

ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service role full access to roadmap_items" ON roadmap_items;
CREATE POLICY "Allow service role full access to roadmap_items" ON roadmap_items FOR ALL USING (true);

-- =====================================================
-- Software Releases (version tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS software_releases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('extension', 'mobile_ios', 'mobile_android', 'website')),
  released_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  download_url TEXT,
  release_notes TEXT,
  is_latest BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_software_releases_version ON software_releases(version);
CREATE INDEX IF NOT EXISTS idx_software_releases_platform ON software_releases(platform);
CREATE INDEX IF NOT EXISTS idx_software_releases_latest ON software_releases(is_latest) WHERE is_latest = TRUE;

ALTER TABLE software_releases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service role full access to software_releases" ON software_releases;
CREATE POLICY "Allow service role full access to software_releases" ON software_releases FOR ALL USING (true);

-- =====================================================
-- Bug Fixes Log (track all bugs and fixes per version)
-- =====================================================

CREATE TABLE IF NOT EXISTS bug_fixes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('extension', 'mobile_ios', 'mobile_android', 'website', 'api')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  fixed_in_version TEXT,
  reported_by TEXT,
  fixed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bug_fixes_version ON bug_fixes(fixed_in_version);
CREATE INDEX IF NOT EXISTS idx_bug_fixes_platform ON bug_fixes(platform);
CREATE INDEX IF NOT EXISTS idx_bug_fixes_fixed_at ON bug_fixes(fixed_at DESC);

ALTER TABLE bug_fixes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service role full access to bug_fixes" ON bug_fixes;
CREATE POLICY "Allow service role full access to bug_fixes" ON bug_fixes FOR ALL USING (true);

-- =====================================================
-- v1.1.0 Schema Updates - Email-First Auth + Cloud Sync
-- =====================================================

-- For existing installs: Rename paid_users to users
-- ALTER TABLE paid_users RENAME TO users;
-- ALTER TABLE paid_users DROP CONSTRAINT IF EXISTS paid_users_plan_check;
-- UPDATE users SET plan = 'pro' WHERE plan = 'bundle';

-- For fresh installs: Create users table
-- Note: If migrating from paid_users, run the rename commands above instead
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  license_key TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_payment_id TEXT,
  amount_paid INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  is_revoked BOOLEAN DEFAULT FALSE,
  -- Profile fields
  full_name TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT,
  profile_photo_url TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  -- Notification preferences
  notify_worker_offline BOOLEAN DEFAULT TRUE,
  notify_profit_drop BOOLEAN DEFAULT TRUE,
  profit_drop_threshold INTEGER DEFAULT 20,
  email_alerts_enabled BOOLEAN DEFAULT FALSE,
  email_alerts_address TEXT,
  email_frequency TEXT DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_license_key ON users(license_key);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service role full access to users" ON users;
CREATE POLICY "Allow service role full access to users" ON users FOR ALL USING (true);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);

ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service role full access to password_resets" ON password_resets;
CREATE POLICY "Allow service role full access to password_resets" ON password_resets FOR ALL USING (true);

-- User wallets (cloud-synced)
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pool TEXT NOT NULL,
  coin TEXT NOT NULL,
  address TEXT NOT NULL,
  power INTEGER DEFAULT 200,
  enabled BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_order ON user_wallets(display_order);

ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service role full access to user_wallets" ON user_wallets;
CREATE POLICY "Allow service role full access to user_wallets" ON user_wallets FOR ALL USING (true);

-- User settings (cloud-synced)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  refresh_interval INTEGER DEFAULT 30,
  electricity_rate DECIMAL(10,4) DEFAULT 0.12,
  electricity_currency TEXT DEFAULT 'USD',
  power_consumption INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  notify_worker_offline BOOLEAN DEFAULT TRUE,
  notify_profit_drop BOOLEAN DEFAULT TRUE,
  profit_drop_threshold INTEGER DEFAULT 20,
  notify_better_coin BOOLEAN DEFAULT FALSE,
  show_discovery_coins BOOLEAN DEFAULT TRUE,
  lite_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service role full access to user_settings" ON user_settings;
CREATE POLICY "Allow service role full access to user_settings" ON user_settings FOR ALL USING (true);

-- User instances/devices (track connected devices)
-- user_id is NULL for anonymous installs (before user login)
CREATE TABLE IF NOT EXISTS user_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  instance_id TEXT NOT NULL UNIQUE,
  device_type TEXT NOT NULL CHECK (device_type IN ('extension', 'mobile_ios', 'mobile_android')),
  device_name TEXT,
  browser TEXT,
  version TEXT,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration for existing databases:
-- ALTER TABLE user_instances ALTER COLUMN user_id DROP NOT NULL;
-- ALTER TABLE user_instances DROP CONSTRAINT IF EXISTS user_instances_user_id_instance_id_key;
-- ALTER TABLE user_instances ADD CONSTRAINT user_instances_instance_id_key UNIQUE (instance_id);

CREATE INDEX IF NOT EXISTS idx_user_instances_user_id ON user_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_instances_instance ON user_instances(instance_id);
CREATE INDEX IF NOT EXISTS idx_user_instances_last_seen ON user_instances(last_seen);

ALTER TABLE user_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service role full access to user_instances" ON user_instances;
CREATE POLICY "Allow service role full access to user_instances" ON user_instances FOR ALL USING (true);
