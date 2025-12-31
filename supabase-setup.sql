-- MineGlance Supabase Setup
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/zbytbrcumxgfeqvhmzsf/sql

-- ============================================
-- Table: Extension installs (all users)
-- ============================================
CREATE TABLE IF NOT EXISTS extension_installs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  install_id TEXT UNIQUE NOT NULL,  -- Generated on first install
  email TEXT,                        -- Optional, if user provides
  browser TEXT,                      -- chrome, edge, etc
  version TEXT,                      -- Extension version
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_installs_created ON extension_installs(created_at);
CREATE INDEX IF NOT EXISTS idx_installs_email ON extension_installs(email);

ALTER TABLE extension_installs ENABLE ROW LEVEL SECURITY;

-- Allow extension to insert/update
CREATE POLICY "Allow extension tracking" ON extension_installs
  FOR ALL USING (true);

-- ============================================
-- Table: Paid users (Pro license holders)
-- ============================================
CREATE TABLE IF NOT EXISTS paid_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_payment_id TEXT,
  amount_paid INTEGER DEFAULT 2900, -- cents
  currency TEXT DEFAULT 'usd',
  plan TEXT DEFAULT 'lifetime_pro',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_paid_users_email ON paid_users(email);

-- Enable Row Level Security
ALTER TABLE paid_users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read to check if email is paid (for extension)
CREATE POLICY "Allow public email check" ON paid_users
  FOR SELECT USING (true);

-- Policy: Only service role can insert (from webhook)
CREATE POLICY "Service role insert only" ON paid_users
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_paid_users_updated_at
  BEFORE UPDATE ON paid_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
