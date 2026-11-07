-- Recruitment-only metadata database. No HR/Candidate master-record migration.
CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE IF NOT EXISTS cv_sources (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, candidate_ref TEXT NOT NULL,
 object_key TEXT NOT NULL UNIQUE, sha256 TEXT NOT NULL CHECK(length(sha256)=64),
 mime_type TEXT NOT NULL CHECK(mime_type IN ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
 byte_size INTEGER NOT NULL CHECK(byte_size BETWEEN 1 AND 5242880),
 scan_status TEXT NOT NULL DEFAULT 'pending' CHECK(scan_status IN ('pending','quarantined','clean','infected','error')),
 source_status TEXT NOT NULL DEFAULT 'quarantined' CHECK(source_status IN ('quarantined','reviewable','revoked')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(tenant_id,candidate_ref,sha256));
CREATE TABLE IF NOT EXISTS processing_jobs (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, source_id TEXT NOT NULL REFERENCES cv_sources(id) ON DELETE RESTRICT,
 kind TEXT NOT NULL CHECK(kind IN ('parse','ocr','ai-review')),
 state TEXT NOT NULL DEFAULT 'blocked' CHECK(state IN ('blocked','queued','running','review-required','completed','failed','cancelled')),
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 error_code TEXT, model_version TEXT, result_digest TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(source_id,kind,model_version));
CREATE TABLE IF NOT EXISTS ai_proposals (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL,
 job_id TEXT NOT NULL UNIQUE REFERENCES processing_jobs(id) ON DELETE RESTRICT,
 model_id TEXT NOT NULL, review_status TEXT NOT NULL DEFAULT 'needs-human-review' CHECK(review_status IN ('needs-human-review','accepted','rejected')),
 evidence_digest TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 reviewed_at TEXT, reviewed_by_ref TEXT);
CREATE TABLE IF NOT EXISTS recruitment_events (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, source_id TEXT REFERENCES cv_sources(id) ON DELETE RESTRICT,
 job_id TEXT REFERENCES processing_jobs(id) ON DELETE RESTRICT,
 event_code TEXT NOT NULL, actor_ref TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX IF NOT EXISTS idx_cv_sources_tenant_candidate ON cv_sources(tenant_id,candidate_ref,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cv_sources_scan ON cv_sources(scan_status,source_status,created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_state ON processing_jobs(tenant_id,state,created_at);
CREATE INDEX IF NOT EXISTS idx_events_tenant_time ON recruitment_events(tenant_id,created_at DESC);
INSERT OR IGNORE INTO schema_migrations(version) VALUES (1);
