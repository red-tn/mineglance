-- MineGlance Supabase Schema
-- Run this in the Supabase SQL editor

-- Paid users table
CREATE TABLE IF NOT EXISTS paid_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_payment_id TEXT,
  amount_paid INTEGER DEFAULT 2900,
  currency TEXT DEFAULT 'usd',
  plan TEXT DEFAULT 'pro' CHECK (plan IN ('pro', 'bundle')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_paid_users_email ON paid_users(email);
CREATE INDEX IF NOT EXISTS idx_extension_installs_email ON extension_installs(email);

-- Enable Row Level Security
ALTER TABLE paid_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_installs ENABLE ROW LEVEL SECURITY;

-- Policies for API access (service role bypasses RLS)
CREATE POLICY "Allow service role full access to paid_users" ON paid_users
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access to extension_installs" ON extension_installs
  FOR ALL USING (true);

-- If you already have the tables, run this to add the plan column:
-- ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'pro' CHECK (plan IN ('pro', 'bundle'));
