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
