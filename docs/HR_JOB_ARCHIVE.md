# Job archive/restore contract

Approved policy: retain Job, linked Applications/events/score context and audit history; never permanently delete. Job status (Open/Closed/Draft) is preserved separately from archivedAt and restored unchanged. No data migration, seed, index or TTL is added.

POST /jobs/:id/archive requires current canonical HR membership (Admin exemption), independent recruitment.read AND recruitment.delete and expectedRevision. POST restore requires read AND update and expectedRevision. Actor/time/reason/revision are server-generated; client privilege fields rejected. Current grants are rechecked and Job-local CAS/archiveHistory update is atomic. Stale/concurrent409; unavailable/foreign404; unauthenticated401/non-HR403; invalid400. Existing DELETE becomes idempotent reversible archive, optionally accepts revision, never erases a Job.

GET /jobs and /hr/v2/jobs/default summary omit archived records, archived=true explicitly lists scoped archives. Authorized detail/Application/ranking/history remains readable. GET archive-history returns latest50 events while retaining full history. Archived ordinary edit/AI suggestion/new Application/CV approval and external Job hints are blocked, and analytics active/options exclude archived Jobs while historical Application cohorts remain intact.

UI: archive dialog/filter/restore controls, archived detail read-only notice, retained Application ranking and lazy history, direct edit read-only; AZ/EN/RU. Context checks suppress late restore results. Permanent deletion remains unavailable pending lawful retention policy. No existing account/role or hosted DB is rewritten.

Evidence: hrJobArchive + existing Candidate/parent/intake targets120; new actual browser4, broader current lifecycle/product regression recorded in tracker. All final full-suite evidence belongs to HR_MAIN_RELEASE_REPORT. Prior DELETE200 orphan reproduction is retained in /workspace/inop-hr14-linked-job-delete-baseline.json.
