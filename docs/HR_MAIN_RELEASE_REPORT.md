# HR main integration — local proof and hosting limits

The user authorized existing `inop-main` integration, push and deletion of
`inop-hr-development` after successful integration and remote SHA confirmation.
This supersedes earlier development-only push instructions. It does not authorize
new infrastructure, live DDL/migration, seed/reset, role rewrites, secret changes,
real CV/provider activation or destructive rollback. No additional branch is needed.

## Implemented increments

| Increment | Full commit SHA | Contract |
|---|---|---|
|15A Job archive/restore|`a95401ad22d364804dea8dfbaed5b8a2fca91bea`|Keep linked Applications, Job context, status and history; current independent scopes and revision CAS; active exclusion; authorized restore|
|15B analytics|`a4d008cf02f6c3498fe8ed5d83884abbd26aa4a1`|Bounded request-local scoped Job cohort, indexed fallback above500 Jobs, score batches1000, unchanged ATS-v2 fingerprints; fresh parent/grant recheck|
|15C Native startup|`777a88f86df189f9cefdf4c2c5983e9eaebe71b5`|No automatic autoCreate/autoIndex or unapproved default notification worker activation|
|15D OCR test synchronization|`7309cb72ca5f1f9d160a23bc3af66c30d4f500e5`|Await initial duplicate-ready state before language-only measurement; preserve exact zero-refetch/provenance assertions|

Actual changed paths for all retained commits are in [HR_LOCAL_COMMIT_LEDGER](HR_LOCAL_COMMIT_LEDGER.md).
Job API/UI and preservation rules are in [HR_JOB_ARCHIVE](HR_JOB_ARCHIVE.md).
The first complete frontend run was441/443, exit1, retained as failed. Its single
failing child plus parent showed the initial duplicate read counted after the
measurement began (wire2 instead of1). Actual duplicate-ready synchronization
passed4/4; no product translation effect, arbitrary delay, assertion removal,
count allowance or serial-only download proof was substituted.

## Verification

Corrected complete frontend:443/443, exit0, zero failures/cancelled/skipped/todo,218405.803702ms. Actual concurrency2/parallel private download/mobile/keyboard/stale-context coverage retained. Log `/workspace/inop-hr15-full-frontend-corrected.log`, source commit7309cb7. Complete backend:1858/1858, exit0, zero failures/cancelled/skipped/todo,174918.753431ms, concurrency1 after frontend. Log `/workspace/inop-hr15-full-backend.log`, same frozen source inputs. Final serialized0/5k/50k benchmark:24 endpoint200 calls/15 expected scoped totals, exit0.50k analytics2928.1ms versus earlier4771.9ms (~38.6% lower),2871B unchanged,68 versus213 Mongoose method observations;5k308.5ms versus563.5ms. Full data and limitations: HR_FINAL_API_BENCHMARK. Main integration and exact remote parity were verified at02890cac3b364060bd53c67b58b4d0000ff4d2e4:78 HR commits beyondc74c49f, normal fast-forward, no force/history rewrite/new branch. Fresh main TSapp/node/buildPASS, lint0errors/9baselinewarnings, smoke13/13, authorization632/632 (`/workspace/inop-hr-gates/inop-packagehr15main-validation.json`). All527 source inputs still match full frontend/backend/benchmark. After these checks and SHA parity, remote development deletion succeeded and absence was independently verified. The final report-only commit is pushed to existing main and its exact final SHA is reported afterward; no code/test/config changes require another redundant full run. Source inputs are frozen in
`/workspace/inop-hr15-final-corrected-source-sha256.json`; reports may change without
changing tested production source. Runners are sequential relative to each other
to avoid unrelated whole-upload-directory snapshot collisions, while frontend
concurrency2 and its actual parallel private-download coverage remain enabled.

## Deployment observations and actions

Read-only requests to the supplied Render service panel, Vercel deployment panel
and supplied frontend URL all failed at the proxy CONNECT boundary with403.
This is a local access restriction, not an observed application HTTP403 or failed
deployment. The public backend URL and current production frontend alias cannot
be derived reliably from repository configuration; no hostname is guessed.
Current Vercel/Render deployment success, logs, served Git SHA and live authenticated
login/dashboard/audit/HR/Execution/CV/Source flows remain **UNVERIFIED**.

User-supplied metadata says Render Native Node auto-deploy and Vercel production
branch use `inop-main`. Repository proof: Node24 engines and `.nvmrc`, backend
`npm start` → `node server.js`, `/health` and authenticated `/api` routes; frontend
`VITE_API_BASE_URL` must target the actual backend `/api`, and Vercel SPA rewrite
preserves deep links. This is not panel confirmation of runtime/env values.
No secret value is read or reported and no hosting configuration is modified.

After push, the operator should check both panels for the final Git SHA, successful
build/start, Node24, backend `/health`200 and the existing API-base configuration.
Then verify current authenticated Admin/HR flows, non-HR403, archive/restore,
retained Application history, private Bearer downloads and Audit/Execution navigation.
Use existing test records; no live destructive test or seed is required.
If an actual deploy error appears, diagnose the corresponding log and roll forward;
do not restore earlier public-file, parent-scope or privilege-escalation holes.

## Gates that remain separate

Real CV ingestion, durable storage/redeploy recovery, scanner/definitions/EICAR,
hosted OCR, real AI, Graph/company website integrations and SMTP delivery are not
certified by synthetic/local tests and remain default-disabled or unactivated.
**Real CV and production operational readiness: NO-GO.** No unverified provider
was enabled by this integration. Native legacy upload storage remains ephemeral.
Lawful retention and permanent erasure remainOPEN; both Candidate and Job permanent
delete remain disabled. The user-authorized test-data update does not resolve these gates.

Startup no longer creates collections/indexes automatically. Existing documents
and indexes are preserved. Separately approved hosted inventory/backup/additive
DDL and per-account legacy HR repair remain in [HR_DB_RELEASE_PREPARATION](HR_DB_RELEASE_PREPARATION.md).
No live DB migration/DDL, DB reset/seed, role rewrite or original-file deletion
was executed here. Never roll back by dropping retained originals/history/indexes.

## Final disposition and exact continuation

All original368 acceptance and131 finding IDs are retained. Current384 acceptance IDs:364TESTED,19BLOCKED_EXTERNAL,1OPEN (lawful retention);136finding IDs:128TESTED,7BLOCKED_EXTERNAL,1OPEN(AUD-051). Storage/scanner/provider/hosted proofs are never relabeled by local PASS. Existing /tmp capacity is constrained; tests use the previously owned workspace scratch root without deleting existing ignored/local caches.

After integration, additional public GET probes to both panels, supplied frontend and GitHub commit-status API again returned curl56/HTTP000 due to proxy CONNECT403. No authenticated/live health test was falsely declared PASS, and no observed deploy error exists to diagnose from this environment. Obtain the actual served SHA and build/start/health logs through accessible panels, then perform the read-only/non-destructive hosted checklist above. Keep unverified ingestion/provider flags off and real CV readiness NO-GO. Prefer a diagnosed roll-forward or disabling gated features; never revert authorization fixes automatically.
