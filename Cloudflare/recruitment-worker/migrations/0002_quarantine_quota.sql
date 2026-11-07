-- D1 additive migration: bound possible R2 writes on Workers Free and preserve upload receipts.
-- Only a trusted server may activate intake; no scanner or AI processing is enabled by this migration.
CREATE TABLE IF NOT EXISTS intake_daily_quota (
 tenant_id TEXT NOT NULL,
 utc_date TEXT NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 20),
 PRIMARY KEY(tenant_id,utc_date)
);
ALTER TABLE cv_sources ADD COLUMN storage_status TEXT NOT NULL DEFAULT 'pending'
 CHECK(storage_status IN ('pending','stored','error'));
CREATE INDEX IF NOT EXISTS idx_cv_storage_recovery ON cv_sources(storage_status,created_at);
INSERT INTO schema_migrations(version) VALUES (2);
