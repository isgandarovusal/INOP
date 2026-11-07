-- One conservative Workers AI attempt per tenant per UTC day on Free.
-- The AI service is still disabled until exact-byte malware scan and consent are verified.
CREATE TABLE IF NOT EXISTS ai_daily_quota (
 tenant_id TEXT NOT NULL,
 utc_date TEXT NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 1),
 PRIMARY KEY(tenant_id,utc_date)
);
ALTER TABLE ai_proposals ADD COLUMN proposal_json TEXT
 CHECK(proposal_json IS NULL OR length(proposal_json) <= 2048);
CREATE INDEX IF NOT EXISTS idx_ai_proposals_state ON ai_proposals(tenant_id,review_status,created_at);
INSERT INTO schema_migrations(version) VALUES (3);
