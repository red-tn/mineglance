-- MineGlance Schema Part 2 - Indexes, RLS, and Views
-- Run this AFTER simple_schema.sql

-- ============================================
-- INDEXES for better query performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_created ON licenses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON admin_audit_log(admin_email);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON admin_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_log_type ON email_alerts_log(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_log_created ON email_alerts_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_installations_instance ON installations(instance_id);
CREATE INDEX IF NOT EXISTS idx_installations_first_seen ON installations(first_seen);
CREATE INDEX IF NOT EXISTS idx_installations_last_seen ON installations(last_seen);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_alerts_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;

-- Policies (allow all - we use service_role key)
CREATE POLICY "Allow all" ON licenses FOR ALL USING (true);
CREATE POLICY "Allow all" ON admin_users FOR ALL USING (true);
CREATE POLICY "Allow all" ON admin_sessions FOR ALL USING (true);
CREATE POLICY "Allow all" ON admin_audit_log FOR ALL USING (true);
CREATE POLICY "Allow all" ON email_alerts_log FOR ALL USING (true);
CREATE POLICY "Allow all" ON installations FOR ALL USING (true);

-- ============================================
-- VIEWS for dashboard queries
-- ============================================

CREATE OR REPLACE VIEW license_summary AS
SELECT
  COUNT(*) as total_licenses,
  COUNT(*) FILTER (WHERE status = 'active') as active_licenses,
  COUNT(*) FILTER (WHERE plan = 'pro') as pro_licenses,
  COUNT(*) FILTER (WHERE plan = 'bundle') as bundle_licenses,
  SUM(CASE WHEN plan = 'pro' THEN 2900 WHEN plan = 'bundle' THEN 5900 ELSE 0 END) as total_revenue_cents
FROM licenses;

CREATE OR REPLACE VIEW recent_activity AS
(
  SELECT
    'license_activated' as type,
    key as identifier,
    email as detail,
    created_at
  FROM licenses
  ORDER BY created_at DESC
  LIMIT 10
)
UNION ALL
(
  SELECT
    'alert_sent' as type,
    alert_type as identifier,
    email as detail,
    created_at
  FROM email_alerts_log
  ORDER BY created_at DESC
  LIMIT 10
)
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- FUNCTION to update daily metrics
-- ============================================

CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL,
  total_installs INTEGER DEFAULT 0,
  new_installs INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  pro_users INTEGER DEFAULT 0,
  revenue_cents INTEGER DEFAULT 0,
  alerts_sent INTEGER DEFAULT 0,
  api_errors INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_daily_metrics()
RETURNS void AS $$
DECLARE
  today DATE := CURRENT_DATE;
BEGIN
  INSERT INTO daily_metrics (date, total_installs, new_installs, pro_users, alerts_sent)
  SELECT
    today,
    (SELECT COUNT(*) FROM installations),
    (SELECT COUNT(*) FROM installations WHERE DATE(first_seen) = today),
    (SELECT COUNT(*) FROM licenses WHERE status = 'active'),
    (SELECT COUNT(*) FROM email_alerts_log WHERE DATE(created_at) = today)
  ON CONFLICT (date) DO UPDATE SET
    total_installs = EXCLUDED.total_installs,
    new_installs = EXCLUDED.new_installs,
    pro_users = EXCLUDED.pro_users,
    alerts_sent = EXCLUDED.alerts_sent;
END;
$$ LANGUAGE plpgsql;

SELECT 'Part 2 complete - Indexes, RLS, and Views added!' as result;
