# HR development continuation — final verification

## Scope and release boundary

Original release `c74c49f41bb3a8a54566324c8902576a48a88e8f` and all prior66 HR commits through `f735acb47d27e4a93f0eeb3336af79d4209fbdd2` are preserved. Work is committed on `work` and pushed exclusively with `HEAD:refs/heads/inop-hr-development`, without force. No production branch push/merge/deploy, real DB migration, seed/reset, user-role rewrite, secret change or hosting resource creation. Real CV intake and production activation remain **NO-GO**.

All original13 packages,368 acceptance IDs and131 finding IDs were retained and reconciled; the extension adds9 acceptance IDs and4 findings. [Disposition](HR_AUDIT_FINDING_DISPOSITION.md):135 findings =126 locally TESTED,7 BLOCKED_EXTERNAL,2 OPEN. Historical named runs remain historical rather than current verification. [Tracker](HR_IMPLEMENTATION_TRACKER.md) retains every increment and incomplete run.

## Commits in this continuation

| Increment | Full SHA | Result |
|---|---|---|
|14A HR department boundary|`65e64daba6dcb112fb384efcd69650d4d8aad73e`|21paths, current server-loaded canonical department AND independent resource grants, frontend context/menu/private byte/background checks|
|14B activity parent privacy|`feacace3f59bda485addc8f17f124236b47575b8`|4paths, independently scoped parent visibility before activity cap; unrelated Audit logs retained|
|14C Candidate archive/restore|`7110d2e63c58b1e23c00d2be7783e30ed477c9be`|26paths, reversible CAS/archive history and active-list exclusion; Candidate/CV/Application preserved|
|14D premium workspace|`02fdfa3dd3ae0cc3b89814aa5f7941926a48997f`|19paths, scoped neutral HR design, actual-shell responsive/mobile/menu/data-bound KPI verification|
|14E action regression alignment|`ebaf0859898efa3e177ff79de3342a10233817e0`|2paths, real archive dialog and bounded stale-action tests, no source authorization change|
|14F current activity fixture|`fcceff65fdeb908a4eb41d92853b5e8e82356a7f`|2paths, positive readable parent and negative parentless/foreign descriptions; independent scopes preserved|

[Ledger](HR_LOCAL_COMMIT_LEDGER.md) contains every full SHA and actual changed path through the final tested source commit. The final report-only commit is identified in Git/final user report; a document cannot contain its own future SHA.

## Behavioral contracts

- **HR membership:** Admin is exempt from the department constraint and keeps existing grants. Every other user requires exact current `departmentId=dep_hr` plus the independently applicable Candidate/Application/Recruitment action/scope. Role/name, stale JWT/profile metadata, wildcard grants and client privilege fields do not confer membership. No additional ObjectId was admitted. Current department is rechecked before private bytes and background work. Frontend hides routes/menu/stale records; backend remains authoritative.
- **Activity:** non-HR users never receive server-generated Candidate/Job/Application descriptions; HR users need current independent parent read scope. Missing/deleted/foreign parents are redacted; Admin retains historical/orphan logs. Bounded aggregate filters before500cap; no per-row HTTP or PII lookup response.
- **Archive:** POST `/candidates/:id/archive` uses independent read/delete grants; POST `/candidates/:id/restore` read/update; both require current HR membership and `expectedRevision`. Atomic Candidate mutation increments revision and appends actor/time/reason history; concurrent/stale409. Legacy DELETE is idempotent reversible archive. Active lists/summary/export/search exclude archived records, `archived=true` explicitly retrieves scoped archive pages. Authorized historical Applications/CV/detail/history remain available. Archived ordinary edit/status/new Application/processing/approval is blocked. No permanent erasure route, original/history TTL or backfill.
- **UI:** HR-only neutral white/slate/navy product layer, system type, clear headings/controls, keyboard focus/dialog trap/recovery, reduced motion, mobile forms/cards and contained table/board overflow. Candidate primary contact precedes secondary panels. Shared Audit/Execution styling and permission architecture remain intact. No static invented metrics or real-provider labels.

Existing mathematical all/own/department/assigned tests deliberately simulate membership in two synthetic departments inside owned loopback fixtures, and restore their predicate afterward. The separate strict canonical boundary suite uses the unmodified production predicate. Synthetic dep_A/dep_B/dep_HR are not production access policy. No real account departments/roles were changed.

## Test evidence

Frozen source/test/build JSON/CSS paths:504. Frontend439 is bound to `ebaf0859898efa3e177ff79de3342a10233817e0` (`inop-hr14e-final-source-sha256.json`).14F changes only Backend/tests/applicationLifecycle.test.cjs and tracker: all frontend/production/shared fixture inputs remain byte-identical, so frontend validation is reused rather than needlessly repeated. Current complete backend binding is `fcceff65fdeb908a4eb41d92853b5e8e82356a7f` in `/workspace/inop-hr14f-final-source-sha256.json`; its504 hashes include the corrected backend-only test. Only documents change after this freeze. Frontend runners retain concurrency2, including parallel download tests; complete backend runs after frontend, concurrency1, avoiding the previously identified cross-runner whole-upload-directory snapshot collision.

| Gate | Result / evidence |
|---|---|
|Full frontend|439/439, exit0, fail/cancel/skip/todo0; `/workspace/inop-hr14e-final-frontend.log`,218153.528336ms|
|Full backend|1845/1845, exit0, fail/cancel/skip/todo0; `/workspace/inop-hr14f-final-backend.log`,174748.725741ms|
|TypeScript app/node + production build|PASS, `/workspace/inop-hr-gates/inop-packagehr14f-validation.json`|
|Lint|0errors /9 existing warnings, same validation|
|Existing smoke|13/13, fresh owned DB only|
|Authorization matrix|632/632, same validation|
|Canonical HR/mixed scopes/private bytes/background|138 targeted +28 browser; full suites revalidate|
|Activity visibility|104 targeted; full suites revalidate|
|Archive/restore/CAS/history|7archive +162previous scope/CV/privacy target +42browser; suites overlap, not additive unique counts|
|Actual AppShell premium UI|20new product tests +62prior responsive/accessibility/analytics target; 320/390/768/1280 coverage across named suites|
|Archive stale-actions alignment|13/13 actual browser targets|
|Current activity lifecycle|35/35 positive parent/snapshot and negative parentless/foreign regressions|
|Joined recruitment E2E and DDL rehearsal|Actual HTTP/Mongo/parser/HR approval/ATS/workflow/analytics with synthetic Graph/storage/scan/SMTP; no external E2E assertion|

The first renewed full frontend run was **incomplete**, stopped after the old native-confirm harness waited for DELETE.14E now opens/confirms the actual accessible archive dialog, bounds intercepted request-start waits to15seconds, preserves delayed-response/no-download/no-navigation assertions and checks retained original/history instead of permanent removal. That incomplete log is retained, never counted as PASS. The first complete backend run1843/1845 (exit1) identified a parentless activity fixture plus its containing failed test.14F supplies a readable Application parent and explicitly rejects parentless/foreign logs even with own snapshots; server privacy checks remain unchanged. The failed run is retained, not included in passing counts. Prior failed baselines for canonical membership/activity/mobile overflow remain documented rather than hidden.

Screenshots `/workspace/inop-hr14d-visual/` cover8actual-shell surfaces at390/1280 using owned synthetic records. They are local UI evidence, not hosted performance or WCAG certification. Native Mongoose deprecation warnings remain upstream baseline diagnostics, distinct from ESLint warnings.

## Performance

Current owned0/5k/50k API measurement passed:24HTTP200 calls and15scope comparisons, exit0, `/workspace/inop-hr14f-final-atsv2-benchmark.json`. At50k, legacy Applications8156.3ms/162222693bytes versus bounded43.4ms/23744bytes/30rows; Candidates1221.2ms/35698891bytes versus bounded59.5ms/14209bytes/30rows. Board260.7ms/66689bytes/80cards; analytics4771.9ms/2871bytes, ranking1149.6ms. Cohort analytics/ranking remain the main measured latency risk; archive-heavy index selectivity is not measured by all-active samples. These are single local samples, not hosted p95 or controlled regression proof. All four sampled31row indexed plans examine31keys/docs. Earlier13K timing and current24rows/limits are in [benchmark report](HR_FINAL_API_BENCHMARK.md). No current isolated React CPU/production p95/hosting claim follows from prior production-build browser samples. Actual current browser tests verify bounded rendering, responsive layout, context cancellation and zero Dashboard language-refetch.

## External/open gates and setup

- P10-018/019 and AUD-050: approved private object provider, private policy/encryption, redeploy persistence, backup/restore/recovery. Native legacy uploads remain ephemeral and transitional; mocks do not prove durability.
- EXT-AV-001/AUD-048: real ClamAV or approved scanner, current definitions, clean/harmless-infected quarantine/recovery tests. Actual scanner absent; real CV intake stays disabled.
- EXT-OCR-001: actual local Tesseract/model tests exist, but deployed executable/models/resources are not verified.
- P09-023: approved AI provider/key/model/pricing, consent and real schema/timeout/cost/live E2E; no real AI result claimed.
- P11-003/020: company-approved tenant/mailbox/app registration/admin consent and least-privilege Exchange mailbox restriction plus live sync/attachment/retry E2E. Tokens never committed/logged.
- P12 external: company-approved website/form/mailbox/export/API metadata for KFC/Pizza Hut/JobSearch. Current public GET attempts remain proxy-blocked (CONNECT403/HTTP000); APIs/form destinations are UNKNOWN, no scraping/personal CV collection.
- EXT-SMTP-001: approved actual receipt/bounce verification; synthetic SMTP outage never undoes Application status.
- AUD-010: hosted per-account HR/legacy role inventory and separately approved repair; no role rewrite inferred.
- **AUD-135 OPEN:** newly reproduced authorized linked Job DELETE200 retains Application with missing Job. Separate dependency409/Closed versus Job archive/restore policy question is pending; no policy inferred.
- **AUD-051 OPEN:** lawful retention duration/basis and permanent-erasure authority. Archive/restore is already approved/tested; permanent deletion remains disabled.

Local core review and development testing are ready within the documented local scope. Hosted staging is not created/verified. **Real CV acceptance / production release: NO-GO.** Roll forward or disable gated integrations while preserving current private reads and authorization; never automatically roll back security fixes or erase originals.

## Git verification

Latest source/test development push `fcceff65fdeb908a4eb41d92853b5e8e82356a7f` succeeded without force. The report-only commit and final remote SHA are verified after creation and reported in the final user result; its own future SHA cannot be embedded here. Production `inop-main` must remain `c74c49f41bb3a8a54566324c8902576a48a88e8f`; only development is updated. Hosting/deploy status is not asserted or modified.
