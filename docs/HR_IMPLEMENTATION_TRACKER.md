# GFC HR implementation tracker

Baseline: `c74c49f41bb3a8a54566324c8902576a48a88e8f`, branch `work`. Local implementation and commits only; no production push/deployment. Existing data, secrets and user files must be preserved.

Latest active continuation: **14A HR department boundary / premium UI extension**

User now authorizes push only to `inop-hr-development`; `inop-main`, production, roles, secrets and DB migrations remain untouched. Canonical HR department is exactly `dep_hr`, Admin exempt, no name/role inference. User chose Candidate archive/restore with preserved Applications/history and permanent deletion disabled until retention approval. Original13K completion remains historical below.

Previous continuation: **13K final local matrix/report gate**, following13J `0903b744127165448781d1605f9424b24610b07a`. All independent local implementations completed so far are preserved. Read the final13K section before using historical next/stop notes; external and deletion-policy gates are not inferred from earlier release authorization.

Latest safe-stop checkpoint: [2026-10-11 checkpoint](#safe-stop-checkpoint-2026-10-11). Read that section before resuming; it supersedes older “next” notes without removing their history.

## Resume protocol

Read this file at each session start. Continue the first unfinished independent item. Never remove a finding; append new findings with a new stable ID. `TESTED` requires a named test and passing evidence for the current change. `OPEN` is unimplemented/unverified; `IN_PROGRESS` is active; `BLOCKED_EXTERNAL` requires approved access/provider or hosting configuration. Mock evidence never proves real external readiness. Each package updates this tracker in its commit. Commit SHAs are recorded after creation in the next tracker update and in the package report.

Prior audit findings below are retained as the baseline backlog, not declared independently reverified. Existing working security invariants still require regression evidence.

## Prior audit findings

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-001 | 01 | PDF authorize overwrites candidate.read with application.read | TESTED | `Backend/tests/hrResourceScopes.test.cjs`: 85/85; baseline 75 failing / 78 |
| AUD-002 | 01 | Application list populated Candidate bypasses independent scope | TESTED | `Backend/tests/hrResourceScopes.test.cjs`: 85/85; baseline 75 failing / 78 |
| AUD-003 | 01 | Application detail populated Job bypasses independent scope | TESTED | `Backend/tests/hrResourceScopes.test.cjs`: 85/85; baseline 75 failing / 78 |
| AUD-004 | 01 | Application create reuses application.create scope for parents | TESTED | `Backend/tests/hrResourceScopes.test.cjs`: 85/85; baseline 75 failing / 78 |
| AUD-005 | 01 | CV pipeline reuses final application.create scope for Job | TESTED | `Backend/tests/hrResourceScopes.test.cjs`: 85/85; baseline 75 failing / 78 |
| AUD-006 | 02 | UI broad canManageRecruitment enables unrelated resource actions | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| AUD-007 | 02 | Recruitment-only route guard blocks other legitimate HR resources | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| AUD-008 | 02 | Frontend truthy none scope does not fail closed | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| AUD-009 | 13 | Live JWT and role.update escalation protection must remain intact | TESTED | 13F userPrivileges + authorization632: current DB role/old JWT/self-promotion/credential/admin positive and negative checks |
| AUD-010 | 13 | Legacy hr role migration is not automatic and hosted state unknown | BLOCKED_EXTERNAL | 13F hrSeed current canonical/idempotent tests; separate approved per-account hosted inventory/repair plan, no automatic mass role rewrite |
| AUD-011 | 06 | Assigned creator field lacks explicit reassignment workflow | TESTED | `applicationLifecycle.test.cjs`, `applicationScoreState.test.cjs`, `hrContracts.test.cjs`; backend workflow/history/CAS contract; UI integration remains 06B |
| AUD-012 | 02 | Nested populated _id objects are not normalized to id | TESTED | `Frontend/tests/hrContracts.test.cjs`: 8/8; summary contract 36/36 |
| AUD-013 | 02 | JobDetail compares populated jobId object with string and loses applications | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| AUD-014 | 02 | Applied candidate IDs ignore objects and allow duplicate selection | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| AUD-015 | 02 | Populated links/filter/position mapping uses undefined identifiers | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| AUD-016 | 02 | Candidate new is silently mapped to applied | TESTED | `Frontend/tests/hrContracts.test.cjs`: 8/8; summary contract 36/36 |
| AUD-017 | 02 | Job preferredSkills lost on edit | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| AUD-018 | 02 | Partial Job update defaults overwrite department/location/type | TESTED | `Frontend/tests/hrContracts.test.cjs`: 8/8; summary contract 36/36 |
| AUD-019 | 02 | Zero experience becomes one on edit | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| AUD-020 | 02 | Job normalization drops timestamps and breaks newest sorting | TESTED | `Frontend/tests/hrContracts.test.cjs`: 8/8; summary contract 36/36 |
| AUD-021 | 02 | Candidate update ignores accepted cvFile | TESTED | `Frontend/tests/hrContracts.test.cjs`: 8/8; summary contract 36/36 |
| AUD-022 | 02 | Parsing stale response overwrites newer selected CV/manual fields | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| AUD-023 | 03 | Education/languages/certificates have no full HR review editors | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| AUD-024 | 02 | HR lists and details lack auth-context cancellation/reset | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| AUD-025 | 02 | Language-dependent effects refetch and reset forms | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| AUD-026 | 02 | Auxiliary Promise.all failure hides primary Job/Application data | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| AUD-027 | 02 | Error/notFound states are conflated or leave forms editable | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| AUD-028 | 06 | Activity log lacks scope fields for own/department visibility | TESTED | `applicationLifecycle.test.cjs`, `applicationScoreState.test.cjs`, `hrContracts.test.cjs`; backend workflow/history/CAS contract; UI integration remains 06B |
| AUD-029 | 06 | Best-effort generic activity log is not Application event history | TESTED | `applicationLifecycle.test.cjs`, `applicationScoreState.test.cjs`, `hrContracts.test.cjs`; backend workflow/history/CAS contract; UI integration remains 06B |
| AUD-030 | 10/14C | Hard deletion leaves orphan Applications/CV files | TESTED | 14C explicitly approved archive/restore, no erase; hrCandidateArchive actual HTTP persistence/CAS/history/scopes and hrCandidateArchiveUI. Historical orphan reproduction `/tmp/inop-hr10d-delete-baseline.json` retained; the policy was pending at13K and is now resolved by approved archive/restore. No destructive cleanup/migration. |
| AUD-031 | 06 | Closed/draft Job accepts applications without lifecycle validation | TESTED | `applicationLifecycle.test.cjs`, `applicationScoreState.test.cjs`, `hrContracts.test.cjs`; backend workflow/history/CAS contract; UI integration remains 06B |
| AUD-032 | 02 | Canonical Candidate/CV pipeline unused by frontend job context | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| AUD-033 | 03 | PDF/DOCX extraction is real but scanned OCR unavailable | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| AUD-034 | 08 | Extraction caps text only after potentially expensive extraction | TESTED | `documentProcessing`, `cvReview`, `cvReviewUI`: request worker deadline/input bounds, incremental PDF 50-page/100k limits and explicit partial-review warnings; DOCX still materializes a bounded ZIP inside the worker |
| AUD-035 | 03 | Phone parser loses valid separators/prefixes/international numbers | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| AUD-036 | 03 | Phone has no raw/normalized split or evidence | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| AUD-037 | 03 | Name extraction misidentifies headings and excludes Cyrillic | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| AUD-038 | 03 | First email may be employer/reference without provenance | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| AUD-039 | 03 | Employment dates are not parsed and unknown experience becomes zero | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| AUD-040 | 03 | Education structure/date/institution not extracted | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| AUD-041 | 03 | IT-only skill substring dictionary gives false positives and misses restaurant skills | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| AUD-042 | 03 | AZ/RU language labels and section variants are missing | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| AUD-043 | 03 | Certificate issuer/expiry/evidence not represented | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| AUD-044 | 03 | Parser/source/hash/original-file metadata not persisted | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| AUD-045 | 09 | Rule parser and static suggestions are presented as AI | TESTED | 09B removes static Job suggestions; 09C2 `hrAiCvUI` reproduces and corrects active AZ/EN/RU Candidate copy, distinguishes rules/manual/optional evidence AI and keeps mock identity visible. Earlier narrow evidence tests did not cover outer copy; correction is preserved below. |
| AUD-046 | 03 | UI advertises DOC despite PDF/DOCX-only upload contract | TESTED | 09C2 `hrAiCvUI` has separate AZ/EN/RU negative DOC-copy assertions; current visible format/error text is PDF/DOCX only, matching server validation. Earlier evidence/type tests did not cover the active outer copy. |
| AUD-047 | 02 | Upload/processing/error strings have incomplete localization | TESTED | 13E status-based safe AZ/EN/RU Job/Candidate/Application CRUD/action errors + previous document/OCR/AI/source errors; target73 then final51; raw arbitrary backend strings never rendered |
| AUD-048 | 10 | No malware quarantine/scan for untrusted uploaded documents | BLOCKED_EXTERNAL | 13C native adapter14/14 and hash-bound Source/relay quarantine tests; actual scanner/definitions/EICAR absent, legacy upload activation not certified |
| AUD-049 | 08 | Synchronous decompression/extraction may block requests | TESTED | `documentProcessing`: CPU heartbeat, queue/timeout/cancel/recovery; ZIP validation, PDF/DOCX extraction and structured parsing run off the HTTP thread |
| AUD-050 | 10 | Native Render CV storage is ephemeral without durability/recovery | BLOCKED_EXTERNAL | Local private storage/read/manifest/Source/recovery contracts tested; actual approved durable provider/redeploy persistence/restore not available. Native legacy filesystem remains ephemeral; no real CV readiness. |
| AUD-051 | 10/14C | Privacy retention/deletion lifecycle is absent | OPEN | Archive/restore approved/tested. Only lawful retention durations/basis and permanent-erasure authority remain undecided; permanent deletion disabled. No original/history TTL, automatic cleanup/backfill or inferred policy. |
| AUD-052 | 09 | Job AI suggestion is hardcoded timeout and three/four fixed skills | TESTED | `hrAiUI` / existing `cvReviewUI`: unavailable/manual/rule-based labels and no manufactured skills; provider test-only mode explicit; real AI E2E remains blocked |
| AUD-053 | 05 | Standalone aiMatchService and MatchScoreBadge unused | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| AUD-054 | 05 | Historical global match UI removed; restore only Application context | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| AUD-055 | 05 | Exact-string score ignores skill aliases and deduplication | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| AUD-056 | 05 | Empty Job/Candidate can score 100 and missing data receives credit | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| AUD-057 | 05 | Score only calculated on create and becomes stale | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| AUD-058 | 05 | Breakdown/version/hash/coverage not persisted | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| AUD-059 | 05 | Default zero conflates uncalculated and real zero | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| AUD-060 | 05 | Cross-vacancy global ranking is not meaningful | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| AUD-061 | 13 | Protected traits excluded and no automatic decision must remain invariant | TESTED | 13B ats-v2 fairness/metadata fingerprints + 13F actual Source/HR/Application score/status/interview/explicitdecision E2E; semantic guard limits documented |
| AUD-062 | 06 | Candidate-global statuses conflict with Application stages | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| AUD-063 | 06 | No processing state, revision CAS or transition validation | TESTED | `applicationLifecycle.test.cjs`, `applicationScoreState.test.cjs`, `hrContracts.test.cjs`; backend workflow/history/CAS contract; UI integration remains 06B |
| AUD-064 | 06/08 | DnD order not persisted and status requests can race | TESTED | `applicationOrdering`, `hrBoard`, `hrBoardUI`, existing lifecycle UI: scoped atomic status/order, target/neighbor conflict, actual keyboard drag and refresh persistence, page-two anchors, rollback and stale permission response |
| AUD-065 | 06 | No interview schedule/timezone/interviewer/results/next action | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| AUD-066 | 06 | SMTP awaited per request with no durable retry/idempotency/visible delivery | TESTED | `applicationNotifications.test.cjs` and `applicationLifecycleUI.test.cjs`: 35/35; full 1212/1212; mock/missing SMTP only, no real receipt claim |
| AUD-067 | 10 | CV pipeline manual rollback can leave file/record orphans | BLOCKED_EXTERNAL | 10D1 uncertain-write compensation fixed/tested; 10D2–13G private Source reservation/one PUT/approval/replay/reconciliation tested. Default legacy multipart cannot promise exactly-once; safe retirement awaits actual storage/scan/recovery activation and retention policy. |
| AUD-068 | 13 | HR user.create does not override privileged role.update account administration | TESTED | 13F userPrivileges current server role.update/all denies HR self/foreign privilege or credential promotion; legitimate admin positive |
| AUD-069 | 04 | No HR Brand catalog or Brand/Branch relationships | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |
| AUD-070 | 07 | No dedicated scoped HR funnel/source/brand analytics | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| AUD-071 | 11 | No ingestion source identity or person-level deduplication | TESTED | 11B immutable source receipts/one command replay;11C scoped possible duplicate hints/no auto person merge, real providers blocked |
| AUD-072 | 08 | HR lists unbounded with full populated documents | TESTED | 08B consumers use bounded independent projected pages; legacy array routes deliberately preserved for API compatibility |
| AUD-073 | 08 | CV parse then create double uploads file synchronously | BLOCKED_EXTERNAL | Gated Source browser26 and joined E2E prove one upload/no legacy parse or Candidate multipart. Default legacy double upload retained for compatibility; retiring it requires verified scanner/storage/activation. |
| AUD-074 | 08 | HR service requests lack signal/dedup despite safe main Dashboard implementation | TESTED | `hrPaginationUI`: StrictMode one list request, canceled stale filters, zero language refetch; shared readJson auth fingerprint |
| AUD-075 | 08 | Search/filter/render all records without pagination/virtualization/debounce | TESTED | `hrPaginationUI`: 35-record baseline renders 35; final pages render 30 then 5, debounced single query and server context filters; 50k measurements still 08D |
| AUD-076 | 08 | Compound filter/sort indexes missing | TESTED | `hrPagination.test.cjs`: owned local index creation and hinted IXSCAN; actual unhinted large-data plans remain 08D |
| AUD-077 | 08 | N+1 was not confirmed; measure query behavior instead of asserting it | TESTED | 08D counts Mongoose methods and unhinted plans: no per-row network N+1 claim; correlated internal parent lookup cost reproduced as AUD-100, replaced with indexed joins/batches |
| AUD-078 | 08 | Mobile accessibility not verified despite responsive CSS | TESTED | `hrAccessibility` with full App CSS: four viewports, table/board keyboard regions, forms/detail, CV chooser and three-language names; documented workflow coverage, not WCAG certification |
| AUD-079 | 03 | DOCX has download but no native preview | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| AUD-080 | 11 | No Graph/OAuth/poll/delta/webhook renewal integration | TESTED | 11A–11D approved default-disabled Graph/delta/durable Source/current actor/worker/review local tests; real consent/mailbox/provider/hosting P11-020 blocked |
| AUD-081 | 12 | No approved external API/public application adapter | TESTED | 12A default-off approved signed registry/relay interface + actual local Source/Mongo/HTTP,51targets/full1743; real vendor adapter schema P12 external |
| AUD-082 | 12 | External website capabilities and administrator access unknown | BLOCKED_EXTERNAL | All public GET attempts proxy403; vendor API/form/email/export/admin capabilities UNKNOWN, per-source company access checklist |
| AUD-083 | 12 | Signed identity/privacy/anti-malware required before external real CV ingestion | BLOCKED_EXTERNAL | Local signed source/consent/hash scan/quarantine/private receipt/scoped approval/lifetime controls TESTED. Actual malware/private durability/retention/provider ownership/approved channel activation unavailable; no real public ingestion. |

## Package 01: P0 authorization

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P01-001 | Candidate PDF candidate.read scope independent of application.read | TESTED | `Backend/tests/hrResourceScopes.test.cjs`: 85/85; baseline 75 failing / 78 |
| P01-002 | Application list independently scoped Candidate projection | TESTED | `Backend/tests/hrResourceScopes.test.cjs`: 85/85; baseline 75 failing / 78 |
| P01-003 | Application detail independently scoped Job projection | TESTED | `Backend/tests/hrResourceScopes.test.cjs`: 85/85; baseline 75 failing / 78 |
| P01-004 | Application create validates Candidate read scope | TESTED | `Backend/tests/hrResourceScopes.test.cjs`: 85/85; baseline 75 failing / 78 |
| P01-005 | Application create validates Job read scope | TESTED | `Backend/tests/hrResourceScopes.test.cjs`: 85/85; baseline 75 failing / 78 |
| P01-006 | CV pipeline validates Job read scope independent of create grants | TESTED | `Backend/tests/hrResourceScopes.test.cjs`: 85/85; baseline 75 failing / 78 |
| P01-007 | all/own/department/assigned combinations | TESTED | `Backend/tests/hrResourceScopes.test.cjs`: 85/85; baseline 75 failing / 78 |
| P01-008 | Missing/none grants fail closed | TESTED | `Backend/tests/hrResourceScopes.test.cjs`: 85/85; baseline 75 failing / 78 |
| P01-009 | Allowed admin and HR workflows preserved | TESTED | `Backend/tests/hrResourceScopes.test.cjs`: 85/85; baseline 75 failing / 78 |
| P01-010 | Parent payload uses explicit safe projection | TESTED | `Backend/tests/hrResourceScopes.test.cjs`: 85/85; baseline 75 failing / 78 |
| P01-011 | Mixed-scope negative regression | TESTED | `Backend/tests/hrResourceScopes.test.cjs`: 85/85; baseline 75 failing / 78 |
| P01-012 | No external ingestion before P0 closure | TESTED | `Backend/tests/hrResourceScopes.test.cjs`: 85/85; baseline 75 failing / 78 |

## Package 02: CRUD and data flow

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P02-001 | Normalize populated _id/id | TESTED | `Frontend/tests/hrContracts.test.cjs`: 8/8; summary contract 36/36 |
| P02-002 | JobDetail displays job-specific applications | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| P02-003 | JobDetail displays ranking | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| P02-004 | Preserve Candidate new status | TESTED | `Frontend/tests/hrContracts.test.cjs`: 8/8; summary contract 36/36 |
| P02-005 | Preserve preferredSkills on Job edit | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| P02-006 | Preserve department on Job edit | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| P02-007 | Preserve location on Job edit | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| P02-008 | Preserve type on Job edit | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| P02-009 | Preserve zero experience on Job edit | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| P02-010 | Candidate CV replacement persists file | TESTED | `Frontend/tests/hrContracts.test.cjs`: 8/8; summary contract 36/36 |
| P02-011 | Stale responses cannot replace current state | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| P02-012 | Secondary failure does not hide primary data | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| P02-013 | 401/403/404/500 distinct UI states | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| P02-014 | Language change does not reset edits | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| P02-015 | Permission change refetches and fails closed | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| P02-016 | Cancellation on context change | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| P02-017 | Create/edit/detail/list contract tests | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |

## Package 03: CV parsing and HR review

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P03-001 | Parse +994 50 123 45 67 | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-002 | Parse +994 (50) 123-45-67 | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-003 | Parse 0(50)1234567 | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-004 | Parse 994501234567 | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-005 | Parse +994-50-123-45-67 | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-006 | Validate other international formats | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-007 | Separate raw and normalized phone | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-008 | Extract name and surname | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-009 | Extract email | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-010 | Extract employment history and dates | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-011 | Extract education | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-012 | Extract skills | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-013 | Extract languages | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-014 | Extract certificates | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-015 | AZ CV fixtures | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-016 | English CV fixtures | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-017 | Russian CV fixtures | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-018 | Restaurant operations/kitchen/cash skills | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-019 | HACCP and food safety skills | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-020 | Shift/customer service/management skills | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-021 | Unknown fields not fabricated or zero | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-022 | Persist source and evidence | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-023 | Version extraction | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-024 | Confidence and review status | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-025 | HR edits all extracted fields | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-026 | CV replacement parsing races | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-027 | Scanned CV processing/unsupported state | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| P03-028 | Real OCR E2E only with tested implementation | TESTED | 10C9–10C11 actual image-only AZ/EN/RU local OCR; actual private scan -> persisted job -> explicit HR UI save; full 1915/1915. Hosted runtime remains EXT-OCR-001 BLOCKED_EXTERNAL |

## Package 04: GFC brands and branches

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P04-001 | Expandable Brand catalog | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |
| P04-002 | KFC | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |
| P04-003 | Pizza Hut | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |
| P04-004 | Simit Sarayı | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |
| P04-005 | Create brand selector | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |
| P04-006 | Edit brand selector | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |
| P04-007 | Brand to branch to vacancy relation | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |
| P04-008 | Office and warehouse vacancies | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |
| P04-009 | Same position in different branches | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |
| P04-010 | New brand and branch extensibility | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |
| P04-011 | Legacy jobs not falsely backfilled | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |
| P04-012 | Brand and branch filters | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |
| P04-013 | Brand vacancy cards | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |
| P04-014 | Brand application contract | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |
| P04-015 | Brand analytics contract | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |
| P04-016 | Brand selection never replaces authorization | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |

## Package 05: Versioned ATS scoring

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P05-001 | Score Application plus Job only | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-002 | Restore contextual match display | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-003 | Empty data cannot score 100 | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-004 | Real zero distinct from missing | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-005 | Canonical skill aliases | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-006 | Invalidate score after Job changes | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-007 | Invalidate score after Candidate changes | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-008 | Persist breakdown and evidence | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-009 | Required skills | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-010 | Preferred skills | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-011 | Relevant experience | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-012 | Education only when required | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-013 | Certification only when required | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-014 | Criterion weights | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-015 | Score version | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-016 | scoreStatus | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-017 | calculatedAt | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-018 | dataCoverage | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-019 | Matched and missing criteria | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-020 | Recalculation | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-021 | Legacy compatibility | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-022 | Insufficient data pending/incomplete | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-023 | No protected characteristics | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-024 | No automatic hire/reject | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| P05-025 | Same score JobDetail/Applications/Profile/Kanban | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |

## Package 06: Application Kanban

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P06-001 | Replace Candidate-global board | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-002 | New application stage | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-003 | AI processing separate from HR stage | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-004 | Initial selection stage | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-005 | Interview stage | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-006 | Offered/Hired/Rejected decisions | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-007 | Persist drag and drop | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-008 | Independent status across vacancies | TESTED | `applicationLifecycle.test.cjs`, `applicationScoreState.test.cjs`, `hrContracts.test.cjs`; backend workflow/history/CAS contract; UI integration remains 06B |
| P06-009 | Interview schedule | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-010 | Timezone | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-011 | Interviewer | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-012 | Interview result | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-013 | Substatus and next action | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-014 | Event before/after | TESTED | `applicationLifecycle.test.cjs`, `applicationScoreState.test.cjs`, `hrContracts.test.cjs`; backend workflow/history/CAS contract; UI integration remains 06B |
| P06-015 | Event actor/timestamp/reason | TESTED | `applicationLifecycle.test.cjs`, `applicationScoreState.test.cjs`, `hrContracts.test.cjs`; backend workflow/history/CAS contract; UI integration remains 06B |
| P06-016 | Transition validation | TESTED | `applicationLifecycle.test.cjs`, `applicationScoreState.test.cjs`, `hrContracts.test.cjs`; backend workflow/history/CAS contract; UI integration remains 06B |
| P06-017 | Revision and 409 conflicts | TESTED | `applicationLifecycle.test.cjs`, `applicationScoreState.test.cjs`, `hrContracts.test.cjs`; backend workflow/history/CAS contract; UI integration remains 06B |
| P06-018 | Optimistic UI rollback/refetch | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-019 | Status filter | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-020 | Search | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-021 | Sorting | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-022 | Profile quick edit | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-023 | Permission change fail closed | TESTED | `applicationLifecycleUI.test.cjs`, `applicationInterviewers.test.cjs`: 24/24; full 1196/1196; 06A server contracts retained |
| P06-024 | Interview notification tests | TESTED | `applicationNotifications.test.cjs` and `applicationLifecycleUI.test.cjs`: 35/35; full 1212/1212; mock/missing SMTP only, no real receipt claim |
| P06-025 | SMTP failure does not hide successful status change | TESTED | `applicationNotifications.test.cjs` and `applicationLifecycleUI.test.cjs`: 35/35; full 1212/1212; mock/missing SMTP only, no real receipt claim |

## Package 07: HR analytics

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P07-001 | GFC overall dashboard | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-002 | KFC dashboard | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-003 | Pizza Hut dashboard | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-004 | Simit Sarayı dashboard | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-005 | Brand filter | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-006 | Branch filter | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-007 | Vacancy filter | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-008 | Date filter | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-009 | Source filter | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-010 | Status filter | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-011 | Active vacancies | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-012 | New applications | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-013 | Parsing/review queue | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-014 | Source distribution | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-015 | Application funnel | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-016 | Interview pipeline | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-017 | Offered/hired/rejected counts | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-018 | Time in stage | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-019 | Time to hire | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-020 | Score distribution | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-021 | Duplicate/review alerts | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-022 | Integration health | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-023 | Same scoped Application/Job datasets | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-024 | Server aggregations | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-025 | Small DTO without sensitive Candidate data | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |
| P07-026 | Correct empty state | TESTED | `hrAnalytics.test.cjs`, `hrAnalyticsUI.test.cjs`, CV source assertion in `hrContracts.test.cjs`: target 40/40 (30 new); full 1242/1242 |

## Package 08: Performance and stability

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P08-001 | Scoped HR pagination | TESTED | `hrPagination`, `hrPaginationUI`, `applicationMatchingUI`, existing HR lifecycle tests; server pages, filters, cancellation/lazy evidence, contextual lookup and error/retry contracts |
| P08-002 | Bounded payloads | TESTED | `hrPagination`, `hrPaginationUI`, `applicationMatchingUI`, existing HR lifecycle tests; server pages, filters, cancellation/lazy evidence, contextual lookup and error/retry contracts |
| P08-003 | Safe projection | TESTED | `hrPagination`, `hrPaginationUI`, `applicationMatchingUI`, existing HR lifecycle tests; server pages, filters, cancellation/lazy evidence, contextual lookup and error/retry contracts |
| P08-004 | Appropriate indexes | TESTED | `Backend/tests/hrPagination.test.cjs`: owned local compound IXSCAN usability; actual unhinted large-data plans remain 08D |
| P08-005 | Versioned backward-compatible transition | TESTED | `hrPagination`, `hrPaginationUI`, `applicationMatchingUI`, existing HR lifecycle tests; server pages, filters, cancellation/lazy evidence, contextual lookup and error/retry contracts |
| P08-006 | Job-specific queries | TESTED | `hrPagination`, `hrPaginationUI`, `applicationMatchingUI`, existing HR lifecycle tests; server pages, filters, cancellation/lazy evidence, contextual lookup and error/retry contracts |
| P08-007 | Searchable Candidate lookup | TESTED | `hrPagination`, `hrPaginationUI`, `applicationMatchingUI`, existing HR lifecycle tests; server pages, filters, cancellation/lazy evidence, contextual lookup and error/retry contracts |
| P08-008 | Debounce | TESTED | `hrPagination`, `hrPaginationUI`, `applicationMatchingUI`, existing HR lifecycle tests; server pages, filters, cancellation/lazy evidence, contextual lookup and error/retry contracts |
| P08-009 | Cancellation | TESTED | `hrPagination`, `hrPaginationUI`, `applicationMatchingUI`, existing HR lifecycle tests; server pages, filters, cancellation/lazy evidence, contextual lookup and error/retry contracts |
| P08-010 | Virtualization/lazy loading | TESTED | `hrPagination`, `hrPaginationUI`, `applicationMatchingUI`, existing HR lifecycle tests; server pages, filters, cancellation/lazy evidence, contextual lookup and error/retry contracts |
| P08-011 | Memoization | TESTED | `hrAccessibility` 28/28 plus `cvReviewUI` 12/12: actual score render counter, current auth/language, skeleton/reduced motion, named filters/forms, native file chooser, keyboard scroll regions and 320/390/768/1280px list/board/form/detail with full App CSS; full 1447/1447 |
| P08-012 | Large Kanban handling | TESTED | 08D API/scopes/unhinted plans plus `benchmarkHrUI.cjs` production builds: 0/5000/50000, 6 current cases PASS; baseline 50k failures retained; raw bytes/paint/long tasks/CDP heap and explicit local-only limits in `HR_PERFORMANCE_MEASUREMENTS.md` |
| P08-013 | 0-record benchmark | TESTED | 08D API/scopes/unhinted plans plus `benchmarkHrUI.cjs` production builds: 0/5000/50000, 6 current cases PASS; baseline 50k failures retained; raw bytes/paint/long tasks/CDP heap and explicit local-only limits in `HR_PERFORMANCE_MEASUREMENTS.md` |
| P08-014 | 5000-record benchmark | TESTED | 08D API/scopes/unhinted plans plus `benchmarkHrUI.cjs` production builds: 0/5000/50000, 6 current cases PASS; baseline 50k failures retained; raw bytes/paint/long tasks/CDP heap and explicit local-only limits in `HR_PERFORMANCE_MEASUREMENTS.md` |
| P08-015 | 50000-record benchmark | TESTED | 08D API/scopes/unhinted plans plus `benchmarkHrUI.cjs` production builds: 0/5000/50000, 6 current cases PASS; baseline 50k failures retained; raw bytes/paint/long tasks/CDP heap and explicit local-only limits in `HR_PERFORMANCE_MEASUREMENTS.md` |
| P08-016 | Response size measurement | TESTED | 08D API/scopes/unhinted plans plus `benchmarkHrUI.cjs` production builds: 0/5000/50000, 6 current cases PASS; baseline 50k failures retained; raw bytes/paint/long tasks/CDP heap and explicit local-only limits in `HR_PERFORMANCE_MEASUREMENTS.md` |
| P08-017 | Latency measurement | TESTED | 08D API/scopes/unhinted plans plus `benchmarkHrUI.cjs` production builds: 0/5000/50000, 6 current cases PASS; baseline 50k failures retained; raw bytes/paint/long tasks/CDP heap and explicit local-only limits in `HR_PERFORMANCE_MEASUREMENTS.md` |
| P08-018 | Query behavior | TESTED | 08D API/scopes/unhinted plans plus `benchmarkHrUI.cjs` production builds: 0/5000/50000, 6 current cases PASS; baseline 50k failures retained; raw bytes/paint/long tasks/CDP heap and explicit local-only limits in `HR_PERFORMANCE_MEASUREMENTS.md` |
| P08-019 | UI rendering measurement | TESTED | 08D API/scopes/unhinted plans plus `benchmarkHrUI.cjs` production builds: 0/5000/50000, 6 current cases PASS; baseline 50k failures retained; raw bytes/paint/long tasks/CDP heap and explicit local-only limits in `HR_PERFORMANCE_MEASUREMENTS.md` |
| P08-020 | Memory measurement | TESTED | 08D API/scopes/unhinted plans plus `benchmarkHrUI.cjs` production builds: 0/5000/50000, 6 current cases PASS; baseline 50k failures retained; raw bytes/paint/long tasks/CDP heap and explicit local-only limits in `HR_PERFORMANCE_MEASUREMENTS.md` |
| P08-021 | No unmeasured live performance claims | TESTED | 08D API/scopes/unhinted plans plus `benchmarkHrUI.cjs` production builds: 0/5000/50000, 6 current cases PASS; baseline 50k failures retained; raw bytes/paint/long tasks/CDP heap and explicit local-only limits in `HR_PERFORMANCE_MEASUREMENTS.md` |
| P08-022 | Loading and skeleton | TESTED | `hrAccessibility` 28/28 plus `cvReviewUI` 12/12: actual score render counter, current auth/language, skeleton/reduced motion, named filters/forms, native file chooser, keyboard scroll regions and 320/390/768/1280px list/board/form/detail with full App CSS; full 1447/1447 |
| P08-023 | Error and empty | TESTED | `hrPagination`, `hrPaginationUI`, `applicationMatchingUI`, existing HR lifecycle tests; server pages, filters, cancellation/lazy evidence, contextual lookup and error/retry contracts |
| P08-024 | Retry | TESTED | `hrPagination`, `hrPaginationUI`, `applicationMatchingUI`, existing HR lifecycle tests; server pages, filters, cancellation/lazy evidence, contextual lookup and error/retry contracts |
| P08-025 | Accessibility | TESTED | `hrAccessibility` 28/28 plus `cvReviewUI` 12/12: actual score render counter, current auth/language, skeleton/reduced motion, named filters/forms, native file chooser, keyboard scroll regions and 320/390/768/1280px list/board/form/detail with full App CSS; full 1447/1447 |
| P08-026 | Responsive | TESTED | `hrAccessibility` 28/28 plus `cvReviewUI` 12/12: actual score render counter, current auth/language, skeleton/reduced motion, named filters/forms, native file chooser, keyboard scroll regions and 320/390/768/1280px list/board/form/detail with full App CSS; full 1447/1447 |

## Package 09: Real AI provider

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P09-001 | Remove hardcoded AI suggestions | TESTED | `hrAiUI` and `hrAiAuthorization`: HR-reviewed create/edit, explicit translated unavailable and mock identity, immutable context, independent scope |
| P09-002 | Configurable backend adapter | TESTED | `hrAiProvider.test.cjs`: 47/47; adapter-only bounds/contract, real provider E2E blocked |
| P09-003 | Title and responsibilities context | TESTED | `hrAiProvider.test.cjs`: 47/47; adapter-only bounds/contract, real provider E2E blocked |
| P09-004 | Restaurant/brand context | TESTED | `hrAiProvider.test.cjs`: 47/47; adapter-only bounds/contract, real provider E2E blocked |
| P09-005 | Experience and criteria context | TESTED | `hrAiProvider.test.cjs`: 47/47; adapter-only bounds/contract, real provider E2E blocked |
| P09-006 | Structured required/preferred skills | TESTED | `hrAiProvider.test.cjs`: 47/47; adapter-only bounds/contract, real provider E2E blocked |
| P09-007 | Explanation | TESTED | `hrAiProvider.test.cjs`: 47/47; adapter-only bounds/contract, real provider E2E blocked |
| P09-008 | Confidence/uncertainty | TESTED | `hrAiProvider.test.cjs`: 47/47; adapter-only bounds/contract, real provider E2E blocked |
| P09-009 | Source context | TESTED | `hrAiProvider.test.cjs`: 47/47; adapter-only bounds/contract, real provider E2E blocked |
| P09-010 | HR approval/edit | TESTED | `hrAiUI` and `hrAiAuthorization`: HR-reviewed create/edit, explicit translated unavailable and mock identity, immutable context, independent scope |
| P09-011 | Schema validation | TESTED | `hrAiProvider.test.cjs`: 47/47; adapter-only bounds/contract, real provider E2E blocked |
| P09-012 | Timeout | TESTED | `hrAiProvider.test.cjs`: 47/47; adapter-only bounds/contract, real provider E2E blocked |
| P09-013 | Bounded retry | TESTED | `hrAiProvider.test.cjs`: 47/47; adapter-only bounds/contract, real provider E2E blocked |
| P09-014 | Rate limit | TESTED | `hrAiProvider.test.cjs`: 47/47; adapter-only bounds/contract, real provider E2E blocked |
| P09-015 | Cost budget | TESTED | `hrAiProvider.test.cjs`: 47/47; adapter-only bounds/contract, real provider E2E blocked |
| P09-016 | Usage logging without sensitive input | TESTED | `hrAiProvider.test.cjs`: 47/47; adapter-only bounds/contract, real provider E2E blocked |
| P09-017 | AI-assisted CV review | TESTED | 09C2 `hrAiCvReview`, `hrAiCvAuthorization`, `hrAiCvUI`: minimized professional evidence only, strict literal references, current independent scope/source identity and explicit HR apply. Real provider/full-source extraction/general DLP are not verified; see contract |
| P09-018 | Explicit unavailable state | TESTED | `hrAiUI` and `hrAiAuthorization`: HR-reviewed create/edit, explicit translated unavailable and mock identity, immutable context, independent scope |
| P09-019 | Mock never presented as real AI | TESTED | `hrAiUI` and `hrAiAuthorization`: HR-reviewed create/edit, explicit translated unavailable and mock identity, immutable context, independent scope |
| P09-020 | Untrusted CV prompt injection defense | TESTED | 09C2 `hrAiCvReview`, `hrAiCvAuthorization`, `hrAiCvUI`: minimized professional evidence only, strict literal references, current independent scope/source identity and explicit HR apply. Real provider/full-source extraction/general DLP are not verified; see contract |
| P09-021 | Data disclosure controls | TESTED | 09C2 `hrAiCvReview`, `hrAiCvAuthorization`, `hrAiCvUI`: minimized professional evidence only, strict literal references, current independent scope/source identity and explicit HR apply. Real provider/full-source extraction/general DLP are not verified; see contract |
| P09-022 | Adapter mock tests | TESTED | `hrAiProvider.test.cjs`: 47/47; adapter-only bounds/contract, real provider E2E blocked |
| P09-023 | Real AI E2E with actual provider credentials | BLOCKED_EXTERNAL | Approved credentials/configuration unavailable; local adapter work remains independent |

## Package 10: Durable storage and background processing

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P10-001 | Private object storage adapter | TESTED | 10B2 adapter/current Candidate scope/source/no-fallback targets 177/177 and full 1682/1682; mock object transport, real provider/durability/recovery blocked; no object writer/migration activated |
| P10-002 | Authorized file access | TESTED | 10B2 adapter/current Candidate scope/source/no-fallback targets 177/177 and full 1682/1682; mock object transport, real provider/durability/recovery blocked; no object writer/migration activated |
| P10-003 | Original CV retention | BLOCKED_EXTERNAL | Immutable original/manifest/archive/per-record exact-source preparation and Source one-upload/replay are locally tested. Actual lawful retention decision, approved provider/redeploy durability/backup/recovery and activation pending; no original deletion. |
| P10-004 | Parsing metadata | TESTED | 10C5 explicit source-bound HR approval and historical server receipt tested by `hrCvApproval`/`hrCvApprovalUI` (110 combined targets);  10C3 `hrCvProcessing`/`hrCvProcessingHttp`/`hrCvProcessingUI`: rules-2 source SHA/revision/full-context identity, private evidence metadata, current-result guard; 104 targets / 1766 full. HR facts remain read-only here; explicit correction uses existing Candidate edit. |
| P10-005 | Source identity | TESTED | 10B2 adapter/current Candidate scope/source/no-fallback targets 177/177 and full 1682/1682; mock object transport, real provider/durability/recovery blocked; no object writer/migration activated |
| P10-006 | Existing file migration plan | TESTED | HR_CV_MIGRATION_PREPARATION, HR_CV_ORIGINAL_MANIFEST/ATTACHMENT and HR_DB_RELEASE_PREPARATION: metadata-only dry run, exact per-record immutable/hash/CAS preparation, additive owned local DDL rehearsal. Actual migration/backup/provider/retention requires separate approval; no automatic apply. |
| P10-007 | Existing file fallback | TESTED | 10B2 adapter/current Candidate scope/source/no-fallback targets 177/177 and full 1682/1682; mock object transport, real provider/durability/recovery blocked; no object writer/migration activated |
| P10-008 | Bounded parsing jobs | TESTED | 10C2–10C3 actual queue/parser/HTTP/UI: unique bounded slots, lease/retry, private source checks; 104 targets / 1766 full. Parse only, disabled by default, exact DDL required; OCR/AI/ingestion separately OPEN. |
| P10-009 | OCR jobs | TESTED | 10C9–10C11 real local scanned PDF/task/HTTP/UI/explicit approval and bounded repair retry; 1915 full. Default off, hosted Native prerequisites EXT-OCR-001 BLOCKED_EXTERNAL |
| P10-010 | AI jobs | TESTED | 10C8/10C12 source-bound durable task, opt-in HTTP/worker/UI/review and repair retry; 169 targets / 1931 full; actual adapter with synthetic transport only, real provider P09-023 BLOCKED_EXTERNAL |
| P10-011 | Email jobs | TESTED | 10C1 existing Mongo Application event outbox, current scope/retry actor, bounded automatic/manual retry/diagnostics; 67 targets and 1714 full tests; actual SMTP receipt blocked |
| P10-012 | Ingestion jobs | TESTED | 10D2–13G Source HTTP/queue/current scopes/worker/explicit HR UI/retry, 11B Graph and 12A signed relay actual local Mongo/HTTP. Graph/store/AV external transport synthetic; real activation remains separately BLOCKED_EXTERNAL. |
| P10-013 | Idempotency | TESTED | Source exact immutable UUID/body, one PUT, lost-ack replay/restart/reserved approval IDs; Graph/signed receipts; email/parse/OCR/AI task idempotency/regressions. Existing legacy pipeline exactly-once limitation explicitly retained AUD-067/073. |
| P10-014 | Job state | TESTED | Persisted Source/task/Graph/email state, leases/restart/current creator authority/cancel/quarantine/HR approval, exact-source CAS and three lifetime attempts; 13G69 backend/26 browser. |
| P10-015 | Retry/failure monitoring | TESTED | Native worker bounded sanitized health, Source metadata queue/filters/read-only detail/manual retry2 with lifetime3 cap; existing email/OCR/AI repairs. Real hosted provider operations/monitoring require external activation, not claimed. |
| P10-016 | Reuse infrastructure | TESTED | 11D default-disabled native worker reuses existing Node/Mongo leases/outbox/queues, no broker/new cluster/staging/resource. Optional approved private object provider and scanner/runtime external gates remain. |
| P10-017 | Justify additional resources first | TESTED | HR_PRIVATE_STORAGE_CONTRACT/HR_NATIVE_MALWARE_SCANNER/HR_BACKGROUND_IDENTITY justify optional private durable provider and runtime binaries; no paid resource created or credential configured. Company must approve any actual provisioning. |
| P10-018 | Real storage durability test | BLOCKED_EXTERNAL | Approved credentials/configuration unavailable; local adapter work remains independent |
| P10-019 | Real storage recovery test | BLOCKED_EXTERNAL | Approved credentials/configuration unavailable; local adapter work remains independent |
| P10-020 | Access control tests before real CV acceptance | BLOCKED_EXTERNAL | Local mixed independent scopes/private URL/path/hash/current actor/Source approval/AV verdict tests pass. Real storage recovery/private policy/scanner/EICAR/retention must pass before any real CV acceptance; not certified by local mocks. |

## Package 11: Outlook Microsoft Graph

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P11-001 | Approved GFC mailbox adapter | TESTED | 11A–11C local approved default-disabled Graph transport+MongoSource sink+explicit review UI, real mailbox P11-020 blocked |
| P11-002 | OAuth/application permission choice | TESTED | 11A application client-credentials/.default contract + setup; actual tenant consent P11-020 blocked |
| P11-003 | Least privilege mailbox scope | BLOCKED_EXTERNAL | Actual Exchange/Entra least privilege/mailbox restriction evidence unavailable; local approved allowlist is TESTED28 but not tenant policy proof |
| P11-004 | Token lifecycle | TESTED | 11A synthetic transport token cache/skew/single-flight/401 refresh;28/28, real provider blocked |
| P11-005 | Polling/delta or webhook | TESTED | 11B persistent single delta page/cursor+CAS lease/restart;98targets/fullbackend1704, synthetic Graph |
| P11-006 | Pagination | TESTED | 11A bounded delta and attachment metadata next links;28/28 synthetic transport |
| P11-007 | Subscription renewal if used | TESTED | 11A chooses delta polling; no subscription/webhook endpoint; renewal not applicable to this mode |
| P11-008 | Attachment ingestion | TESTED | 11B actual private Source/Mongo/DOCX parsing + explicit HR Candidate/Application only; synthetic Graph/store/scan, real external blocked |
| P11-009 | Deduplication | TESTED | 11B immutable attachment/Source dedup;11C scoped five possible SHA/email/phone person matches, explicit HR identity review/no auto merge |
| P11-010 | Retries | TESTED | 11A network/429/5xx bounded retry/exhaustion sanitized;28/28 |
| P11-011 | Rate limits | TESTED | 11A two shared slots,2s max Retry-After,timeout/late transport retain capacity;28/28 |
| P11-012 | Sync health | TESTED | 11B sanitized server-only health/current actor and no raw cursor/subject/facts;98targets/full1704; hosted binding external |
| P11-013 | Subject/recipient/vacancy matching | TESTED | 11B exact approved source reference/recipient/current Job mapping;11C safe current hint and explicit HR linking/UI30/backend82 |
| P11-014 | Ambiguous matching HR review | TESTED | 11C ambiguous/unmatched/unavailable private Source review; no guessed Application/current scope/human confirmation |
| P11-015 | No token/CV logging | TESTED | 11A sanitized errors/no logger/private body GET; transport28/28, no real provider data |
| P11-016 | Tenant setup checklist | TESTED | HR_OUTLOOK_ADAPTER company single-tenant UUID setup/negative config test; actual access blocked |
| P11-017 | Mailbox setup checklist | TESTED | HR_OUTLOOK_ADAPTER approved mailbox object UUID allowlist + Exchange restriction validation checklist |
| P11-018 | Admin consent checklist | TESTED | HR_OUTLOOK_ADAPTER Mail.Read-only admin consent/revocation/foreign mailbox test checklist; consent not performed |
| P11-019 | Credential setup checklist | TESTED | HR_OUTLOOK_ADAPTER server-only secure credential/expiry/rotation checklist; no env/secret change |
| P11-020 | Real mailbox E2E requires access | BLOCKED_EXTERNAL | Approved credentials/configuration unavailable; local adapter work remains independent |

## Package 12: External career sources

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P12-001 | Public kfc.az research | BLOCKED_EXTERNAL | Public read attempted: proxy403; live site/form content not verified, retained research + per-site access checklist |
| P12-002 | Public pizzahut.az research | BLOCKED_EXTERNAL | Public read attempted: proxy403; live site/form content not verified, retained research + per-site access checklist |
| P12-003 | Public JobSearch research | BLOCKED_EXTERNAL | Public read attempted: proxy403; live vacancy form/email/GoogleForms channel not verified |
| P12-004 | First-party API/webhook evidence | BLOCKED_EXTERNAL | Unknown first-party capability; company/partner schema/approval required, no invented working API |
| P12-005 | Actual form destination evidence | BLOCKED_EXTERNAL | Actual form destinations unknown; approved owner/admin metadata required |
| P12-006 | Email notification evidence | BLOCKED_EXTERNAL | Actual destination mailbox/email notification unknown; approved company mailbox mapping needed |
| P12-007 | CSV/admin export evidence | BLOCKED_EXTERNAL | Actual CSV/admin export schema/owner permission unavailable; no personal data collection |
| P12-008 | Official partner API evidence | BLOCKED_EXTERNAL | Official partner API not verified; company/partner contact required |
| P12-009 | Approved adapter interfaces | TESTED | 12A approved default-off signed Source registry + real local HTTP/Mongo sink; targets51/fullbackend1743; vendor schema external |
| P12-010 | Actual email/Google Forms channels only | BLOCKED_EXTERNAL | JobSearch email/GoogleForms actual channels unverified; no fictitious channel; approved mailbox/owner export path documented |
| P12-011 | No unauthorized private scraping/login bypass | TESTED | Only retained public read attempts, server fixed approved Graph transport/signed relay; no website scrape/login/private CV acquisition |
| P12-012 | BLOCKED_EXTERNAL_ACCESS with required access | TESTED | HR_EXTERNAL_SOURCE_CAPABILITIES per-site BLOCKED_EXTERNAL_ACCESS, required access and no secret collection |
| P12-013 | Approved alternative integration path | TESTED | Documented approved first-party signed relay/mailbox/authorized export alternatives, conditional on real owner/schema |
| P12-014 | Public form abuse/rate limit | TESTED | 12A raw body2/7.1MB/30s,IP/source shared Mongo20/5 budgets/currentActor/timeout slots; actual HTTP/rate tests51 |
| P12-015 | Upload validation | TESTED | 12A byte/ZIP worker +5MB/MIME/extension/filename/base64 negatives before write;51targets/full1743 |
| P12-016 | Anti-malware gate | TESTED | 12A clean hash-bound scan before object write + Source worker rescan, infected/unknown/late cancellation tests; actual scanner external |
| P12-017 | Signed source identity | TESTED | 12A exact raw signed version/source/epoch/UUID/SHA,constant-time validation, no forwardedIP spoof;51targets |
| P12-018 | Idempotency | TESTED | 12A private unique receipt/body conflict/immutable commands/lost ack/new timestamp replay, actual Source no second PUT;51targets |
| P12-019 | Privacy controls | TESTED | 12A consent/version/approved ownership/private ack/no PII/public ID,source-secret HMAC rate keys/metadata-only TTL; actual lawful retention approval external |
| P12-020 | Real external integration E2E requires approved access | BLOCKED_EXTERNAL | Approved credentials/configuration unavailable; local adapter work remains independent |

## Package 13: E2E security and readiness

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P13-001 | Disposition every prior finding | TESTED | HR_AUDIT_FINDING_DISPOSITION: every AUD-001–131 retained without gaps, 122 locally TESTED/7 BLOCKED_EXTERNAL/2 OPEN; named per-finding evidence, no DONE without test. |
| P13-002 | Source to ingestion E2E | TESTED | hrRecruitmentE2E8/8 plus Source/Graph/relay actual local HTTP/Mongo receipts/parser/explicit HR; source transport synthetic, real external channel separately blocked. |
| P13-003 | Private storage E2E | BLOCKED_EXTERNAL | Local private object/manifest/Source/read/one-PUT/recovery contracts tested; actual provider private policy/persistence/redeploy/encryption/restore unavailable P10-018/019. Mock is not storage E2E PASS. |
| P13-004 | Extraction/OCR E2E | TESTED | cvExtraction/hrCvOcr/hrCvSourceOcr/SourceOCR UI: actual local Tesseract AZ/EN/RU image-only/text PDF/DOCX, strict hash/provenance/explicit approval; hosted OCR EXT-OCR-001 blocked. |
| P13-005 | HR review E2E | TESTED | hrCvApproval/SourceApproval/SourceScore + actual browser/DB explicit confirmed corrections, unknown facts pending, thirteen-J validation/language proof; no auto HR decision. |
| P13-006 | Candidate and Application E2E | TESTED | Joined E2E actual current independently scoped Candidate/Application creation, immutable reserved identities/replay/reconciliation; no automatic duplicate person merge. |
| P13-007 | Scoring and Kanban E2E | TESTED | ApplicationMatching/scoreState/fairness/ordering/board and UI + joined E2E ATSv2 actual0/100/missing/legacy/stale/sameJob context; protected metadata excluded. |
| P13-008 | Interview/decision/analytics E2E | TESTED | Joined E2E real HTTP status/409/interview Asia/Baku/explicitOffered-Hired/scoped analytics; synthetic SMTP failure preserves workflow, real receipt external. |
| P13-009 | Three brands | TESTED | Catalog/analytics/scale/joined E2E KFC/Pizza Hut/Simit Sarayı, no guessed legacy brand. |
| P13-010 | Multiple branches | TESTED | Catalog/UI/joined E2E brand→branch→Job, multiple restaurant/non-restaurant branches and independent scoped metadata. |
| P13-011 | Same Candidate multiple vacancies | TESTED | Joined E2E sameCandidate secondJob independent status/score; lifecycle/board queries never candidate-global. |
| P13-012 | PDF/DOCX/scanned documents | TESTED | Actual generated text PDF/DOCX/image-onlyPDF local parser/Tesseract and browser source/current-hash/review tests; unsupported legacy DOC stays explicit. |
| P13-013 | AZ/EN/RU fixtures | TESTED | Real local AZ/EN/RU PDF/DOCX/scanned fixtures, normalized/raw +994 formats; no assertion of arbitrary real corpus accuracy. |
| P13-014 | Mixed scopes | TESTED | hrResourceScopes + Source/private storage/lifecycle/query/mixed parent scopes, actual oldJWT/role/grant/assignment/dept revocation; authorization632 gate. |
| P13-015 | Duplicate CV | TESTED | Source Review duplicateSHA/email/phone bounded5 candidate hints, Graph/relay receipt dedup and lost ack; explicit human review/no guessed auto merge. |
| P13-016 | Retries and provider outage | TESTED | Source/task/Graph/provider/email bounded outage/retry/lifetime/lease tests and SourceRepair browser lost-ack sameUUID; real provider/scanner recovery separately blocked. |
| P13-017 | Stale requests/concurrent updates | TESTED | Current browser/HTTP stale route/permission/source/async cancellation; CAS409/reorder/lostack; SourceDownloadRace focus/URL revocation and late-role suppression. |
| P13-018 | Large datasets | TESTED | HR_PERFORMANCE_MEASUREMENTS owned0/5k/50k backend and actual production-build browser baseline/current; committed scale/query tests. Local named historical samples not hosted/currentHEAD latency claims. |
| P13-019 | Frontend/backend compatibility | TESTED | hrContracts/scoped current HTTP/DTO normalization, current ATSv2 legacy compatibility, durable Source validation, full corrected frontend408/408 plus current build/TS. |
| P13-020 | Security/privacy/retention | OPEN | Local security/access/privacy projection/prompt guards tested; AUD-030 archive/restore is approved/tested. AUD-051 lawful duration/permanent-erasure authority and true scanner/storage/recovery gates remain unresolved. Real CV acceptance NO-GO. |
| P13-021 | Separate local mock and real external evidence | TESTED | HR_RELEASE_E2E_MATRIX separates actual local Mongo/HTTP/parser/Tesseract/browser from synthetic Graph/AI/storage/AV/SMTP and all genuine external gates. |
| P13-022 | All package commit SHAs | TESTED | HR_LOCAL_COMMIT_LEDGER inventories65 actual full SHA objects since c74 release and changed paths; final report-only commit SHA delivered after creation. |
| P13-023 | Full finding disposition | TESTED | HR_AUDIT_FINDING_DISPOSITION has all131 stable IDs with current status/evidence/limits; all prior titles/history retained. |
| P13-024 | Tests and benchmarks | TESTED | Current bound backend1819/frontend408, TS/build PASS lint0/9 smoke13/authorization632; fresh ATSv2 owned0/5k/50k24endpoint200/15 scopes plus retained production-build browser comparison with archived-source limitations. |
| P13-025 | API/model/frontend changes | TESTED | Provider/task/source/signedrelay/catalog/ATSv2/board/DTO/readonly review and exact repair API documented in contracts + HR_IMPLEMENTATION_COMPLETION; no hidden migration/automatic provider activation. |
| P13-026 | AI/Outlook/external setup | TESTED | HR_AI_PROVIDER_CONTRACT/OUTLOOK_ADAPTER/EXTERNAL_SOURCE_CAPABILITIES/NATIVE_MALWARE_SCANNER/PRIVATE_STORAGE and final setup list; actual access absent explicitly external. |
| P13-027 | Production risks | TESTED | HR_RELEASE_E2E_MATRIX/DB_RELEASE_PREPARATION state unresolved durability/scan/retention/runtime/realtenant/backup/DDL gates and security-preserving roll-forward; no production operation. |
| P13-028 | Ready and blocked modules | TESTED | HR_RELEASE_E2E_MATRIX explicitly separates locally verified core/default-off adapters from actual activation/realCV/production NO-GO. No hosted staging/resource declared created. |

## Execution ledger

| Package | Commit | Validation | Remaining risk |
|---|---|---|---|
| 01 | `a832bd76f918d6a142e3086c1a5be108935a0000` | Target 85/85; full regression 1020/1020; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 13 existing warnings | Scope-denied parents return null; UI normalization/lifecycle remains package 02 |
| 02A | `80fa2d709b3213a7f6a3abc60072cebeb5a57562` | Full regression 1029/1029; HR + summary target 44/44; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 13 existing warnings | UI lifecycle and edit form criteria still OPEN; replaced old files retained for migration |
| 02B | `10f01026948e8b2bc0ad2b2f9fcd018d144b668e` | Full regression 1051/1051; HR browser targets 30/30; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 9 warnings (baseline 13) | CV review/extraction and contextual score contracts remain packages 03/05; no external ingestion activated |
| 03 | `bb561691b0faafd635bcc7b217b24a9455c3d7fe` | Full regression 1101/1101; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 9 warnings | OCR is not implemented; historical unknown zeros not rewritten; old files retained for package 10 |
| 04 | `942df3fc87fe8bda9c148fcb12e267b9c0165c84` | Full regression 1124/1124; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 9 warnings | HR locations do not expose audit Restaurants; no legacy brand backfill; analytics execution remains package 07 |
| 05 | `2d2cb13af787542756437af20213edfc6ed4c9c9` | Full regression 1155/1155; target matching/state 24/24; browser 28/28 including prior lifecycle; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 9 warnings | Conservative role/date aliases may require HR evidence; no global score or automatic hiring decisions |
| 06A | `659084198ed19a8f23ae8a186eb35b47dc85165d` | Full regression 1172/1172; targets 38/38; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 9 warnings | DnD/interview UI and notification worker remain 06B/06C; real SMTP not claimed |
| 06B | `b23d77674c0f6a4ed41f91e2c99eea8be900d0dc` | Targets 24/24; full 1196/1196; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 9 warnings | Manual card ordering remains AUD-064/08; notification worker follows in 06C; no real SMTP claim |
| 06C | `121fc7196571114c1d070de4e4d25dfeffe72e55` | Targets 35/35; full 1212/1212; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 9 warnings | SMTP at-least-once, real receipt unverified; explicit retry/archive UI remains 10 |

| 07 | `2e44f1321dad611c42677b88b2bade1f5b3fff8b` | Targets 40/40; full 1242/1242; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 9 warnings | Linked-profile review cohort only; transactional snapshot not claimed; large-data benchmark and paging remain 08; real integrations remain external |

| 08A | `4c0a4eee3e735d0f5c8abe70b37a0e6bfc5f7bad` | Targets 25/25; current final serial full 1267/1267; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 9 warnings | Frontend transition 08B; large-data plans/measurements 08D; AUD-090 concurrent Source download investigation remains OPEN |

| 08B | `148fa8171a7b98744dca507c13abcb7feea77717` | Targets 54/54; full 1289/1289; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 9 warnings | Page-local score/name order explicitly labeled; global ranking/manual order/parsing/benchmarks remain 08C–08D; Source concurrency finding AUD-090 remains OPEN |

| 08C1 | `37b90bf63a1d16bdaea3124367183558b67fc264` | Target 46/46; full 1298/1298; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 9 warnings | Client abort does not roll back accepted server mutations; manual order/ranking/parsing/benchmarks remain OPEN |

## External prerequisites

- AI provider credentials and approved processing/privacy configuration; no real AI E2E claim without access.
- Durable private storage credentials/configuration and recovery evidence before accepting real CVs.
- GFC Graph tenant, approved mailbox list, mailbox permission restrictions, admin consent and secure credentials.
- Approved website API/webhook/email/export access. Public pages do not authorize private CV collection.
- Production deployment, migration, new paid resources and permission policy changes require separate decisions. No new staging or Atlas cluster.

## New findings

Append here; never delete earlier findings.

Package 01 validation artifacts: `/tmp/inop-hr01-baseline.log`, `/tmp/inop-hr01-final-target.log`, `/tmp/inop-hr01-regression.log`, `/tmp/inop-packagehr01-validation.json`. Full suite ran 84 new checks plus 936 existing checks; final target rerun includes one additional missing-department check. Test DBs are uniquely owned loopback databases, never Atlas.


02A evidence: `/tmp/inop-hr02a-final-regression.log`, `/tmp/inop-hr02a-summary-contracts.log`, `/tmp/inop-hr02a-final-smoke.log`, `/tmp/inop-packagehr02-validation.json`. Baseline frontend reproduces partial Job update 400. Existing summary tests now assert actual new status, preserving identical scope/count/privacy assertions.

02B artifacts: `/tmp/inop-hr02b-verified-regression.log`, `/tmp/inop-hr02b-lifecycle-final.log`, `/tmp/inop-hr02b-contract-final.log`, `/tmp/inop-packagehr02b-validation.json`. Baseline frontend lifecycle: 18 failures / 19 checks. Final suite includes canonical PDF pipeline and Job-specific ranking. Form focus refresh is disabled to preserve unsaved drafts; list/detail focus refresh remains enabled and server-authorized. All test DBs are isolated loopback fixtures; CV race tests use explicitly synthetic mock responses.

### Additional findings (append-only)

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-084 | 05 | Unused frontend ranking formula differs from backend; remove/align contextual authority | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| AUD-085 | 03 | Concurrent CV replacements can commit older extraction over the latest file | TESTED | `Backend/tests/cvConcurrency.test.cjs`: gated slow PDF vs newer DOCX, 409 CAS, stale revision, legacy __v |
| AUD-086 | 03 | Numeric age can be misread as years of employment | TESTED | `Backend/tests/cvExtraction.test.cjs`: age excluded from experience and evidence |

03 evidence: `/tmp/inop-hr03-final-regression.log`, `/tmp/inop-hr03-validation-run.log`, `/tmp/inop-packagehr03-validation.json`. This package does not implement OCR or statistically calibrated confidence. Unknown legacy experience zeros cannot be distinguished from actual historical zeros and are not mass rewritten. Old replaced files are retained for the package 10 migration/retention policy. Concurrent replacement rejects an older writer with 409; rejected files are not silently deleted. Heuristic evidence is reviewable and never presented as real AI output. Original DOCX download survives secondary preview outages; permission failures fail closed.

04 evidence: `/tmp/inop-hr04-baseline.log` (17/17 failing before patch), `/tmp/inop-hr04-target-final.log`, `/tmp/inop-hr04-final-regression.log`, `/tmp/inop-packagehr04-validation.json`. New brand/branch APIs, permissions and additive DB/index contract: `docs/HR_CATALOG_CONTRACT.md`. Catalog writes reuse recruitment.create all; branch CRUD retains recruitment provenance scopes. No production operations or seed were run.

| AUD-087 | 05 | Derived Application score/evidence can disclose unreadable parent criteria | TESTED | `applicationScoreState.test.cjs`, `applicationMatchingUI.test.cjs`: independently denied parents suppress score, proof and contextual review |

05 final guard verification: completely absent parent inputs return pending safely; all-zero custom weights are rejected. Target matching/state tests rerun 24/24 after these guards.

05 evidence: `/tmp/inop-hr05-baseline.log` (11/11 failing before patch), `/tmp/inop-hr05-target.log`, `/tmp/inop-hr05-final-browser.log`, `/tmp/inop-hr05-final-regression.log`, `/tmp/inop-packagehr05-validation.json`. Contract and limitations: `docs/HR_MATCHING_CONTRACT.md`. Existing lifecycle test's numeric legacy score assertion now verifies restricted derived data while preserving the row visibility/count, missing parent names and prohibited edit assertions. Recalculation never changes stage. No bulk legacy rewrite or external provider call. The Application board is a score-consistent display; lifecycle/DnD work remains package 06.

06A evidence: `/tmp/inop-hr06a-baseline.log` (11 failed / 14 before patch), `/tmp/inop-hr06a-target-final.log` (38/38), `/tmp/inop-hr06a-regression.log`, `/tmp/inop-hr06a-validation-run.log`, `/tmp/inop-packagehr06-validation.json`. Contract: `docs/HR_APPLICATION_LIFECYCLE.md`. Draft fixture now explicitly checks 409, then opens the job for the existing canonical pipeline test; partial Job metadata preservation assertions remain. History is atomically appended without truncation; defensive count/byte limit reports archiving requirement. Delivery pending records do not imply sent email; next increment implements the worker. Scoring event summaries are independently parent-scoped. All DB operations remain isolated loopback fixtures.


06B evidence: `/tmp/inop-hr06b-baseline.log` (old 06A UI fails new board/card contract; 2 failures), `/tmp/inop-hr06b-target-final.log` (24/24), `/tmp/inop-hr06b-regression.log`, `/tmp/inop-hr06b-validation-run.log`, `/tmp/inop-packagehr06b-validation.json`. StrictMode stays enabled in browser tests. Real isolated HTTP + Mongo tests prove keyboard drag persisted after refresh, independent vacancies, 409 rollback, 500 visible data, stale route/mutation protection, language no-refetch, read-only UI, 401/403/404/500, independently scoped roster and assignment revocation on focus with an old JWT. Backend scope checks remain authoritative. Application detail focus/visibility refresh resets an unsaved workflow draft to enforce current assignment; existing profile edit forms keep their draft policy. Server controls the processing lane. Search/sorting currently operate on the scoped loaded dataset; bounded server pagination belongs to 08. 06C is the next unfinished independent increment.

06C evidence: `/tmp/inop-hr06c-baseline.log` reproduces raw provider error disclosure using the previous commit's transport source with a synthetic stub; `/tmp/inop-hr06c-target-final.log` (35/35), `/tmp/inop-hr06c-transport-final.log`, `/tmp/inop-hr06c-regression.log`, `/tmp/inop-hr06c-validation-run.log`, `/tmp/inop-packagehr06c-validation.json`. The worker and status persistence use isolated owned loopback databases. No email is sent externally. Durable event claims/recovery, current role/parent scopes, assignment revocation, latest schedule only, three attempts/backoff/timeout, revision/timestamp preservation and UI blocked/failed visibility are tested. All P06 criteria now have test evidence; AUD-064 manual card order is still explicitly OPEN for 08. Next independent package is 07 analytics.

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-088 | 10 | Notification reason codes and terminal manual retry are not yet actionable in UI | TESTED | 10C1 `applicationDeliveryRetry`, `applicationNotifications`, `applicationDeliveryUI`, `applicationLifecycleUI`: safe reasons, bounded audited/CAS manual retry/current actor, 67 target / 1714 full tests. Real SMTP receipt remains BLOCKED_EXTERNAL |
| AUD-089 | 06C | SMTP lacks transport bounds and can return/log raw provider diagnostics | TESTED | `applicationNotifications.test.cjs` synthetic transport: old source fails sanitized-error assertion, new bounded/closing transport passes |
| EXT-SMTP-001 | 06/10 | Approved company SMTP credentials, consent and actual delivery/receipt test | BLOCKED_EXTERNAL | Missing configuration and mocked delivery are tested; real SMTP receipt/bounces are not verified |

07 evidence: `/tmp/inop-hr07a-target-final.log` (17 backend checks), `/tmp/inop-hr07-target-final.log` (40/40, including 10 existing HR contract checks), `/tmp/inop-hr07-regression.log`, `/tmp/inop-hr07-validation-run.log`, `/tmp/inop-packagehr07-validation.json`. Contract: `docs/HR_ANALYTICS_CONTRACT.md`. Backend derives aggregate counters from independent Application/Job scopes, with separately protected Candidate metrics; internal streaming score facts are never returned in the DTO. UI covers GFC/three brands, branch/Job/date/source/status filters, empty/null versus real zero, three locales, no language refetch, stale response/permission protection, malformed envelope, 403/500/retry and mobile overflow. Source values are server-set on new manual/CV pipeline records; old unknown data is not rewritten. Catalog caps do not reduce totals and are explicitly flagged. Package 08 is next: bounded HR pagination/projections/indexes, searchable lookups, manual lane ordering, render/query benchmarks and remaining localization/stability findings. No live-performance or connected-provider claim is made.

| AUD-090 | 13 | Concurrent native PDF download / focus revokes shared preview URL | TESTED | 13H causal Chromium focus boundary baseline ordinaryPASS/race canceled; independent current Bearer download, concurrent final28/28 + previous61/61. Historical timeout lacks trace; exact retrospective attribution not claimed. |
| AUD-091 | 08A | New Application parent-ID filtering could disclose an unreadable parent cohort count | TESTED | `/tmp/inop-hr08a-parent-filter-baseline.log` reproduces 200 versus expected 404; `hrPagination.test.cjs` now checks independent parent read plus indistinguishable missing/denied 404 |

08A evidence: `Backend/tests/hrPagination.test.cjs` 25/25, `/tmp/inop-hr08a-target-final.log`; TS/build/lint, 13 smoke and 632 authorization in `/tmp/inop-packagehr08a-validation.json`. Backend page contract and non-unique additive index inventory are in `docs/HR_PAGINATION_CONTRACT.md`. Existing array endpoints remain backward compatible; frontend remains unbounded until 08B. P08-001–007 evidence applies to the server contract, not an assertion that the whole package is complete. Manual ordering, parsing isolation and 0/5000/50000 benchmark evidence remain OPEN. No production DDL or deployment performed.

08A final serial regression: `/tmp/inop-hr08a-regression-final.log` 1267/1267, including the corrected denied-parent 404 contract assertion. The earlier parallel Source download failure remains AUD-090, not suppressed or declared resolved.

| AUD-092 | 08B | Paged static populate serialized Mongoose Candidate internals instead of a plain projected DTO | TESTED | Initial HR lifecycle/35-record page failures; `hrPagination` now asserts plain parent id/name, no `$__`/`_doc` for calculated and legacy scores; independent parent scope remains enforced |
| AUD-093 | 08B | Application normalizer omitted createdAt/updatedAt, breaking newest order | TESTED | `applicationLifecycleUI`: newest ordering uses preserved API timestamps; no candidate-global/legacy score used |
| AUD-094 | 08C4 | Global trustworthy ranking is not available after bounded-page transition | TESTED | `hrRanking`, `hrRankingUI`: full scoped vacancy, current input fingerprints, older best applicant outside newest page, signed bounded cursor, real zero/unknown separation, 409 cohort restart and parent redaction |
| AUD-095 | 08C1 | Candidate detail PDF export/delete callbacks are not keyed to route/permission context | TESTED | `candidateActions.test.cjs`: baseline starts 1 unauthorized stale download (expected 0); final 9/9 covers revoked permission, profile navigation, delayed delete, HTTP states, real Bearer PDF and legal deletion |

08B targets: `/tmp/inop-hr08b-baseline.log` reproduces 35 versus required 30 rows; `/tmp/inop-hr08b-target-current.log` 54/54 backend pagination, new browser page tests and matching UI checks. Existing HR lifecycle/brand/workflow checks are included in full regression. New catalog options are searchable across pages; lazy evidence fetches once on demand, not for every row; 403 and late responses retain primary rows and mask unavailable scores. The retained Source download finding AUD-090 remains OPEN. No live benchmark/provider/SMTP/durability claim is made. Next independent increment is 08C stability/order/ranking, then 08D measurements.

08B final validation: `/tmp/inop-hr08b-regression.log` 1289/1289; `/tmp/inop-packagehr08b-validation.json` and `/tmp/inop-hr08b-validation-run.log`. The earlier lookup test failures were strict locator/translated label mismatches; response and DOM inspection confirmed correct backend/option data. Final assertions use accessible exact roles/names and retain independent server response checks.

08C1 evidence: `/tmp/inop-hr08c1-baseline.log` reproduces a delayed PDF download after local permission revocation. `/tmp/inop-hr08c1-target-final.log` 46/46 (9 new action checks plus existing CV review/lifecycle/service contracts). `CandidateDetail` now binds PDF export/deletion controllers, busy/error state and callbacks to actor/role/permission, route and current Candidate/CV revision; it cancels only requests belonging to the obsolete context. Optional AbortSignal preserves existing service calls and server API contracts. Action HTTP 401/403/404/500 is shown separately from still-authorized profile data; old callbacks cannot download, navigate or alter feedback in another context.

Cancellation does not undo a deletion already accepted by the server. This increment protects client lifecycle, not transactional rollback; orphan/retention/recovery work remains package 10. Job/Candidate forms already use context-keyed inner components with unmount guards; no unsupported claim that those are unguarded is added. Manual order AUD-064, global ranking AUD-094, parsing isolation AUD-034/049 and 0/5000/50000 measurements remain open.

08C1 final full evidence: `/tmp/inop-hr08c1-regression.log` 1298/1298; `/tmp/inop-hr08c1-validation-run.log`, `/tmp/inop-packagehr08c1-validation.json` (08C1). No production data or network integration used.

| AUD-096 | 08C3 | Initial hypothesis: read-only Candidate users cannot preview DOCX because parse-cv is create-protected | TESTED | NOT_REPRODUCED: actual route is candidate.read, not create; `/tmp/inop-hr08c3-baseline.log` passes lawful own-read preview. Original note was a mistaken code inference, not an established vulnerability. Existing read-only workflow is retained and tested |

| AUD-097 | 08C2 | Unbounded email regex retries every suffix on a 100k unbroken token, monopolizing structured CV parsing after extraction | TESTED | `documentProcessing`: old parser exceeds 2-second child-process deadline; bounded-token parser passes without manufacturing suffix emails; structured parsing also runs in the worker |

## 08C2 — bounded document workers

Local commit pending creation; only this increment's files are staged. Target 97/97; full serial regression 1317/1317; authorization 632/632; smoke 13/13; TypeScript/build PASS; lint 0 errors / 9 warnings. Evidence: `/tmp/inop-hr08c2-target-final.log`, `/tmp/inop-hr08c2-regression.log`, `/tmp/inop-packagehr08c2-validation.json`. The malformed DOCX test initially expected single newlines; actual existing Mammoth paragraph semantics use double newlines. The corrected assertion preserves that existing behavior and content.

Contract/limits and single-run before/after responsiveness measurements: `docs/HR_DOCUMENT_PROCESSING.md`; raw measurements `/tmp/inop-hr08c2-baseline.log`, `/tmp/inop-hr08c2-current-measurement.log`, old contact-parser proof `/tmp/inop-hr08c2-regex-baseline.json`. These are local synthetic observations, not hosted performance or OCR/provider readiness. No production data, new env variable, migration, seed or storage provisioning. V8 limits do not cap native/external memory; request workers are not durable jobs or an OS sandbox. Durable retry, malware quarantine, original retention/recovery and CV double-upload remain package 10 / AUD-073. Global ranking/manual order and larger-data measurements remain OPEN. Next independent increment: AUD-096 read-scoped original DOCX preview.

| AUD-098 | 08C3 | Original DOCX preview downloads private bytes then uploads them again to parse-cv; no current-original identity guard | TESTED | `candidatePreview`, `cvReviewUI`: zero redundant POST; actual scope/JWT/assignment/department recheck, hash/revision conflict, retained legitimate download and canceled stale preview |

08C2 commit: `7dea767c7ed38150bd5ae3ece07d4c89c0edf56e` (19 files), exact full/target evidence above. AUD-096 is explicitly corrected rather than removed or falsely claimed FIXED. AUD-073 also covers create parsing double upload; removing the original-preview re-upload alone does not close the create/pipeline/durable-job requirement.

## 08C3 — original CV preview without re-upload

Local commit pending creation. Target 95/95; full serial regression 1344/1344; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 9 warnings. Artifacts: `/tmp/inop-hr08c3-target-final.log`, `/tmp/inop-hr08c3-regression.log`, `/tmp/inop-packagehr08c3-validation.json`. Additive read-only contract: `docs/HR_CV_PREVIEW_CONTRACT.md`. Backend tests include actual current JWT revocation/inactive account, role grant/department/assignment changes during extraction, foreign scopes, legacy identity, path/symlink and workload limits. Browser tests cover lawful own-read, zero new multipart POST, escaped text, original download, 401/403/404/500 and 409 reload plus late permission-response URL suppression. No DB data mutation by preview, migration, env/secret or external service change.

Correction preserved: AUD-096's create-protected-route hypothesis was not reproduced; its original record remains, explicitly marked NOT_REPRODUCED with a passing baseline. AUD-098 is the actually reproduced redundant-upload/identity problem. Create/CV pipeline double upload AUD-073, manual ordering AUD-064, global ranking AUD-094, broader UI/performance measurements and external dependencies remain open. Next: trustworthy full-vacancy ranking, then persisted ordering and package 08D benchmarks.

08C3 commit: `5d0b56435682cf76ed9eaf18ff2c87fca6ea015a` (8 files), target 95/95, full 1344/1344 and baseline gates above.

08C4 completed: AUD-094 full-vacancy current-fingerprint ranking. Old UI reproduction `/tmp/inop-hr08c4-ui-baseline.log` places newest zero first and excludes the older best applicant. New bounded/signed-cursor contract, existing API compatibility and local index inventory: `docs/HR_RANKING_CONTRACT.md`. Targets 112/112 plus final focused 25/25; full serial 1369/1369; post-lint-change affected browser tests 55/55; TS/build PASS, lint 0 errors / 9 warnings, smoke 13/13 and authorization 632/632. AUD-094 is TESTED. Manual order AUD-064, benchmark/UI acceptance items and external requirements remain open.

08C4 final evidence: `/tmp/inop-hr08c4-regression.log`, `/tmp/inop-hr08c4-ui-post-lint.log`, `/tmp/inop-packagehr08c4-validation.json`. Initial React Compiler preserve-manual-memoization lint error is corrected without disabling a rule: callbacks use AbortSignal and keyed feedback; final affected HR browser suites rerun 55/55. The full suite's new ranking UI ran after that correction; earlier affected suites are explicitly covered by the post-correction rerun. No transactional live-cohort snapshot or 50k performance claim. Local additive Job/id index requires release DDL inventory/approval before production use. This commit is local only; next independent increment is persisted per-vacancy Kanban ordering, followed by large-data/UI benchmarks.

08C4 commit: `b5c32126d8d44f8534aa84fc23ac6999fbe09f62` (17 files), exact validation above.

## 08C5A — revision-bound server card ordering

Local commit pending creation. Target 132/132, full serial regression **1385/1385**, authorization 632/632, smoke 13/13, TS/build PASS, lint 0 errors / 9 warnings. Evidence: `/tmp/inop-hr08c5a-baseline.log` (12/13 failing before support), `/tmp/inop-hr08c5a-target-final.log`, `/tmp/inop-hr08c5a-regression.log`, `/tmp/inop-packagehr08c5a-validation.json` (preserved completed 08C5A metadata). Contract, new non-unique simple-collation index and concurrency limitations: `docs/HR_BOARD_ORDERING_CONTRACT.md`.

Optional placement uses independent current Application read/update and parent Job read, scoped adjacent neighbors, mandatory target/neighbor revisions, one atomic target CAS plus before/after event, command replay and current old-JWT scope checks. Same-stage placement leaves decisions, score, processing, stage time and notification delivery unchanged. Legacy keys have a stable fallback without bulk rewriting. Pinned dependency archive integrity verified; the lockfile adds only fractional-indexing 4.0.0, no other dependency changes. 50k pure-key insertion tests are not an API/UI benchmark. Cross-record serializability is not claimed.

Initial target failures were fixture mistakes: a prior test had already populated the supposed empty lane; placing a singleton at its unchanged default key correctly produces no event. Corrected fixtures make real ordering changes, preserving the one-write/one-event concurrency assertion. `AUD-064` remains OPEN until the bounded board and browser drag/refresh portion is complete. `hrBoard.test.cjs` has been prepared for the next increment and is intentionally excluded from this commit and this 1385-test run; its missing-route baseline fails. No production operations or new external provider connection.

08C5A commit: `10e3114d032797237972cee3ae73c5cf8cfdbc94` (9 files). Its completed validation JSON was copied to the increment-specific 08C5A name before the subsequent runner reused the generic 08C5 path; target/full logs are separate.

## 08C5B — bounded stage-specific Application board API

Local commit pending creation. Target **142/142**, full serial **1398/1398**, authorization **632/632**, smoke **13/13**, TS/build PASS, lint **0 errors / 9 warnings**. Evidence: `/tmp/inop-hr08c5b-baseline.log` (missing route), `/tmp/inop-hr08c5b-target-final.log`, `/tmp/inop-hr08c5b-regression.log`, `/tmp/inop-packagehr08c5b-validation.json` (preserved completed 08C5B metadata). Contract: `docs/HR_BOARD_PAGINATION_CONTRACT.md`.

One bounded initial API returns complete scoped counts for eight disjoint lanes; per-lane signed cursors return only that column and adjacent-page anchors. Independent parent redaction/search, own/department/assigned/all, forged/borrowed cursors, boundary 409, empty lanes and permission revocation during aggregate are tested. New endpoint is additive; existing consumers still use their former lists until 08C5C. No whole-cohort transaction or live query/performance claim. AUD-064 and P08-012 remain OPEN until browser persistence/paging tests. `Frontend/tests/hrBoardUI.test.cjs` is the next prepared baseline and is intentionally excluded from this commit and 1398-test run. No production operations.

08C5B commit: `1c1ba805ed33091774bfe5706b3b764138cd2836` (6 files); its complete 1398-test run and gates are recorded above.

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-099 | 08C5B follow-up | A placement accompanied by the unchanged status is incorrectly classified as workflow instead of reorder | TESTED | `applicationOrdering.test.cjs` now sends status Applied with the placement and checks reorder event, unchanged stage time/processing and idempotent replay; `hrBoardUI.test.cjs` initially reproduces workflow vs reorder |

## 08C5B follow-up — semantic event classification

Only the controller, its existing regression test and this tracker are included in the local follow-up commit. Event classification now compares persisted before/after values: status changes are status; order-only changes are reorder, including an explicitly repeated unchanged status; other workflow changes remain workflow. Scope, revision/CAS, command identity and notification rules are unchanged.

Evidence: `/tmp/inop-hr08c5c-target.log` reproduces the workflow/reorder difference, `/tmp/inop-hr08c5c-target-final.log` **79/79**, `/tmp/inop-hr08c5c-regression.log` **1411/1411**, `/tmp/inop-packagehr08c5c-validation.json`: TS/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**. The full run validates the current working tree, including pending 08C5C frontend changes; it is not represented as a clean-HEAD-only test of this smaller commit. Those frontend files/test stay outside the classification commit and are preserved for the next increment. AUD-064 remains OPEN until that UI increment is committed; no production action.

08C5B classification follow-up commit: `92e7282a8da5bddd5af8a2f57921aea5d546b70e` (3 files), checked without any push or other staged files.

## 08C5C — bounded, persisted, cancelable Kanban UI

Local commit pending creation. `AUD-064` is TESTED. Targets **79/79** (server ordering/board, new browser board and prior lifecycle/page suites), full serial **1411/1411**, authorization **632/632**, smoke **13/13**, TS/build PASS, lint **0 errors / 9 warnings**. Artifacts: `/tmp/inop-hr08c5c-baseline.log` (old board has no bounded lane contract), `/tmp/inop-hr08c5c-target-final.log`, `/tmp/inop-hr08c5c-regression.log`, `/tmp/inop-packagehr08c5c-validation.json`. These source files are unchanged since that final run; splitting the validated classification into its preceding commit did not require rerunning unchanged tests.

Actual keyboard reorder persists through refresh, uses offpage neighbor anchors and atomically carries permitted stage changes. Stage pages replace bounded card slices; old global table refetch is disabled in board view. Primary data survive secondary 500; secondary 401/403/404 mask cards and loaded filter parents. Cursor 409 supplies restart; mutation 409 rolls back/refetches. Translation produces zero requests. AbortSignal plus actor/filter/view keys suppress late mutation/permission responses. Three locales and accessible native lane controls are included. Contract and limitations: `docs/HR_BOARD_UI_CONTRACT.md`.

Initial UI test correctly detected AUD-099; it is fixed in the preceding classification commit rather than weakening its assertion. A TypeScript check also caught boardOrder accidentally inserted in Candidate instead of Application; it was moved to the correct interface before final TS/build/full gates. Neither failure is described as a passing first attempt.

P08-012 is IN_PROGRESS until 08D large datasets/production-build measurements; P08-011 memoization, 013–022 benchmarks/skeleton, 025–026 accessibility/responsive and remaining localization requirements are retained. Generic Source concurrent-download finding AUD-090 is still OPEN. The board is bounded, not a claim of a transactional whole-cohort snapshot or hosted performance. No production data, secrets, deployment or provider call. Next independent work is 08D measurements and remaining HR UI stability criteria, followed by packages 09–13.

08C5C commit: `d337755196aa17c8f7a83c508a3bea6d2a6880b6` (12 files), final evidence above. The user-requested classification follow-up remains a separate preserved commit; no push performed.

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-100 | 08D1 | HR analytics reaches its unchanged ten-second deadline with 50000 synthetic Applications and returns 503 | TESTED | `/tmp/inop-hr08d-backend-first.json` reproduces ANALYTICS_TIMEOUT; fourth report gives 200/4686 ms; `hrAnalyticsScale.test.cjs` exercises final 50k output/count/score/payload and 875-parent cache boundaries |
| AUD-101 | 08D1 | Expensive analytics can return old aggregates after current role-read revocation, account deactivation or department change | TESTED | Read-only git-show baseline d337755 fails three gated negative assertions with 200; current `hrAnalyticsScale` returns 403/409 without aggregates and tests revoked JWT=401 |

## 08D1 — local scale evidence and bounded analytics execution

Local commit pending creation. Full serial regression **1419/1419**, authorization **632/632**, smoke **13/13**, TS/build PASS, lint **0 errors / 9 warnings**. Artifacts: `/tmp/inop-hr08d-regression.log`, `/tmp/inop-packagehr08d-validation.json`. The additional JWT regression passes in this final full run; earlier targeted run **109/109** precedes that addition. Frontend production-benchmark helpers are prepared outside this backend increment; they are not included in this test count or commit.

No API envelope, index, schema, environment, hosting or permission policy change. Equality parent joins are immediately independently filtered/projected before counts/metadata. Score facts are fetched in 250-record batches with a request-local 500-Job hash cache; no global actor cache and no protected personal traits are used. The same-batch eviction case preserves all permitted records. Yielding bounds event-loop monopolization; the existing ten-second query/score guard remains.

Final authority checks happen after asynchronous Branch lookup, before output. Revoked JWT=401, removed grants/inactive account=403, changed role/department/permissions=409 ANALYTICS_CHANGED; responses contain no old aggregates. Existing admin/HR/all, own, department, assigned and independently denied-parent behavior remains tested. No automatic retry under old authority.

Evidence: `/tmp/inop-hr08d-analytics-target-rechecked.log` **109/109** (before the additional JWT regression), `/tmp/inop-hr08d-authority-baseline.log` (three expected failing negative assertions), `/tmp/inop-hr08d-backend-first.json` (50k failure), `/tmp/inop-hr08d-backend-fourth.json` (all dataset sizes plus 15 scope checks). Source/query assumptions, exact measurements and memory limitations: `docs/HR_PERFORMANCE_MEASUREMENTS.md`. New benchmark uses only unique owned loopback fixtures; actual hosting/global limiter/proxy and browser paint are excluded. Negative RSS deltas are GC observations, not proof of reduced peak memory.

P08-013–018/020 remain IN_PROGRESS until the next production-build browser increment. P08-011/022/025/026 and AUD-047 remain OPEN; AUD-090 concurrent Source timeout is retained, not silently fixed. No real AI, SMTP, Outlook, website, OCR or durable-storage readiness is claimed. Pending production benchmark helper/script are outside this backend increment and will receive their own tests/commit.

08D1 commit: `13b0245f9d9c552b5aa4a9d714ebec429fcdc680` (6 files). Completed validation metadata preserved under `/tmp/inop-packagehr08d1-validation.json`.

## 08D2 — production-build HR browser measurements

Local commit pending creation. `Frontend/scripts/benchmarkHrUI.cjs` and its production-build helper compare archived package 07 and current Applications UI against the same current isolated backend. Only source is archived into new /tmp directories; no .env, uploads or secrets copied. Actual API Bearer headers and GET-only behavior are asserted; external network is blocked. Final report `/tmp/inop-hr08d-ui-completed.json` has completed=true/currentPassed=6 and process exit **0**. Four smaller baseline cases PASS; both 50k old-UI cases fail because the browser closes before readiness. They are not fabricated PASS/OOM/latency/heap measurements. The previous two reports retained tooling handles after crashed baseline browsers and were terminated after owned DB cleanup; the final CLI exits only after awaited fixture cleanup/report writes. Separate current-only Bearer assertion run passes all six cases and exits 0.

P08-012–021 and AUD-077 have evidence for the measured local workload: 0/5000/50000 synthetic Candidates/Applications, three Jobs/brands/branches, API bytes/latency/scopes/unhinted newest-page plans, bounded production board/table, paint/long-task and browser heap samples. This is not a full-shell render CPU, hosted throughput/p95/SLA or peak process memory claim. DTOs and permissions are unchanged. No browser failure is silently skipped. Details: `docs/HR_PERFORMANCE_MEASUREMENTS.md`.

Gates `/tmp/inop-packagehr08d2-validation.json`: TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**. App/backend source is unchanged since 08D1's **1419/1419** full serial run; adding the exercised benchmark/helper and docs does not justify rerunning that entire unchanged application suite. The twelve comparative browser observations plus six independent current-only checks are benchmark assertions, not added to the node:test regression total.

P08-011 memoization, P08-022 skeleton, P08-025/026 broader accessibility/responsive, AUD-047 localization and AUD-090 concurrent Source download remain tracked OPEN. CV double upload AUD-073 remains explicitly delegated to package 10's draft/durable storage flow, not forgotten or closed by original preview. Next independent increment: 08D3 remaining UI stability acceptance; then package 09 configurable AI with real E2E BLOCKED_EXTERNAL until approved credentials.

08D2 commit: `8f08c3b063ed102769770acae3f822ef69a3312d` (4 files), final comparative process exit 0; six current cases PASS, four smaller baselines PASS, two 50k baselines FAILED_OR_TIMEOUT. No hosted performance claim.

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-102 | 08D3 | Candidate CV input display:none prevents keyboard access to the native chooser | TESTED | Full-App-CSS negative baseline cannot reach file input with Tab; corrected `hrAccessibility` reaches it and opens native filechooser with Space without any upload |
| AUD-103 | 08D3 | Job detail decorative pseudo-element extends beyond the mobile viewport | TESTED | Expanded full-CSS detail test fails page-width assertion; keeping the glow inside its container passes four-width Job/Candidate detail checks without clipping real data |

## 08D3 — final package 08 UI stability checks

Local commit pending creation. Full serial regression **1447/1447**, authorization **632/632**, smoke **13/13**, TS/build PASS, lint **0 errors / 9 warnings**, diff-check clean. Artifacts: `/tmp/inop-hr08d3-regression.log`, `/tmp/inop-hr08d3-validation-final.log`, `/tmp/inop-packagehr08d3-validation.json`. Final focused suite `/tmp/inop-hr08d3-corrected-final.log` **40/40** includes 28 accessibility/memoization checks and 12 CV review checks; existing board/page/matching/lifecycle protections run in the complete suite.

P08-011/022/025/026 and AUD-078 now have concrete evidence for critical HR workflows. Skeletons are decorative/bounded, announce actual loading and respect reduced motion. Named focusable table/board regions retain reachable content and keyboard drag. Candidate grid/table toggle announces state. CV input is visually clipped while preserving keyboard interaction. Job fields/lookup and CV date names are localized. Memoization skips unchanged score props but still honors language/permission context and existing revision resets. Contract and tested limits: `docs/HR_UI_STABILITY.md`. No backend, API, routing, storage or permission policy changes.

Baseline evidence: `/tmp/inop-hr08d3-ui-baseline.log` 15 negative failures/21 checks, `/tmp/inop-hr08d3-memo-baseline.log` confirms actual extra renders after correcting a stable-context fixture, `/tmp/inop-hr08d3-full-css-baseline.log` confirms unnamed Job description and keyboard-hidden CV input, `/tmp/inop-hr08d3-history-corrected-baseline.log` confirms hardcoded English date names. Initial history selector guessed the wrong translated Add label; it was corrected and the real date-name problem reproduced before patching.

Expanded test initially sampled Candidate table layout before switching out of grid mode; moving the measurement after the switch preserved the assertions. The corrected test then found the real desktop/tablet Candidate overflow:hidden rule; the fix is scoped to hr-candidates-page. CV review's old English aria-label selector was updated to the exact current AZ name; its unknown month=null storage assertion remains. Job detail overflow was traced to the decorative right:-150px glow, not hidden data, and corrected. Failed intermediate logs are preserved rather than represented as PASS.

All enumerated P08 acceptance IDs have test/measurement evidence for the documented local workload. Remaining cross-package findings are kept: AUD-047 broader upload/provider error localization remains OPEN for 09/13; AUD-073 parse/create double upload is explicitly retained for package 10's durable draft flow; AUD-090 concurrent Source native PDF timeout remains OPEN/root cause unconfirmed. No real OCR/provider/SMTP/durable storage/Graph/website readiness is claimed. Provider variable names/presence were inspected without reading/reporting values: HR_AI_PROVIDER, HR_AI_MODEL, OPENAI_API_KEY, AZURE_OPENAI_API_KEY, ANTHROPIC_API_KEY are absent from injected bindings and Backend .env names. P09-023 stays BLOCKED_EXTERNAL, independent adapter/security/mock/UI work is next. No production push/deployment performed.

08D3 commit: `ee41a48e1fbf4dd7af2bd9591f1207f85ea5bde0` (19 files), 1447/1447 full regression and the recorded final gates. No push performed.

## 09A — disabled-by-default structured AI adapter

Target `/tmp/inop-hr09a-target-final.log`: **47/47**. Full serial regression **1494/1494**, authorization **632/632**, smoke **13/13**, TypeScript/production build PASS, lint **0 errors / 9 warnings**. Local commit pending creation. Evidence: `/tmp/inop-hr09a-regression.log`, `/tmp/inop-hr09a-validation.log`, `/tmp/inop-packagehr09a-validation.json`. Contract: `docs/HR_AI_PROVIDER_CONTRACT.md`. The adapter is independent of HTTP/UI integrations; mock validation of professional title/responsibilities/brand/workplace/experience/skills context is not a live provider proof.

Two process-local active requests, bounded stream/timeout/retry, atomic cross-instance daily budget and hashed actor quotas, sanitized errors and aggregate-only usage counters are tested. Reservations remain conservative after failure; billing/provider-side limits and model compatibility require approved external configuration. TTL is declared for a new counters collection but no production DDL is executed. Protected lexical criteria are checked in skill names, reasons and uncertainty; human approval is still required for semantic bias/accuracy.

P09-001 and AUD-052 remain OPEN until 09B removes the existing Job form hardcoded suggestions. P09-010 approval/edit and 018/019 UI states remain OPEN until the UI and server authorization increment; P09-017/020/021 CV-assisted review/prompt minimization remain OPEN for 09C. P09-023 remains BLOCKED_EXTERNAL. No provider call, production operation, secret, new infrastructure or push.

09A commit: `bb7ff48edf76f3a2fb2b12caacc18ec3d13e9e4c` (7 files), 47 target / 1494 full tests and recorded gates. No push.

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-104 | 09B | Nullable unset brand/workplace normalization is not idempotent and prevents the explicit unavailable state | TESTED | `hrAiProvider`: nullable normalization regression; actual `hrAiUI` first run reproduces invalid context for an unbranded draft, corrected UI reports unavailable without fabricated skills |

## 09B — independently authorized, human-reviewed Job proposals

Target `/tmp/inop-hr09b-target-expanded.log` **87/87**. TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632** via `/tmp/inop-packagehr09b-validation.json`. Full serial regression **1534/1534** via `/tmp/inop-hr09b-regression.log`; local commit pending. Additional final UI run `/tmp/inop-hr09b-ui-final.log` **19/19** includes direct intercepted-AI POST counting for the zero language-refetch assertion. Application code is unchanged since the passing full run/gates. The live provider is not configured and P09-023 remains BLOCKED_EXTERNAL. Contract: `docs/HR_AI_PROVIDER_CONTRACT.md`.

Additive draft/create and existing-Job/edit proposal routes independently require current server recruitment permissions. Read/all does not overwrite update/own or the converse. Parent, assignment, role, account, JWT revocation, millisecond Job changes and scoped catalog changes are rechecked after latency; no proposal or data is returned on failure. Neither route persists criteria. Scope-denied parent is unavailable; missing business context stays null without guessing a legacy brand.

Actual Job form removes its fixed 600ms Git/Teamwork suggestions. Structured proposals are not auto-applied; HR can edit the proposed skill names and explicitly approve before normal authorized submit. Confidence including null/real zero is shown separately from matching. Mock identity stays visible. Draft/route/auth identity invalidates and cancels stale proposals; translation produces no request. 401/403/404 hide the form; outage/timeout/limit/invalid output preserve primary input with AZ/EN/RU messages. Four viewport widths and bounded long text are tested. Shared Axios Bearer and 401 expiry remain; only opted-in AI requests suppress duplicate generic toasts. Existing manual Job CRUD and preferred/location/type/zero experience edit behavior are tested.

First UI fixture used a guessed position-label selector and produced failures; it was corrected to the actual current localized label, without changing product/assertions. The next run found actual AUD-104, fixed with a separate nullable normalization assertion. Expanded current run passes. Baseline initially targeted the new-only assistant container and therefore established missing UI rather than static behavior; the baseline selector was then adjusted to the shared old/new action and an explicit zero-fabricated-skills assertion. All failed/intermediate logs remain, never presented as PASS.

Remaining: P09-017/020/021 minimized AI-assisted CV review, real provider P09-023, durable AI evidence/job history in P10, broader AUD-047 upload error localization, AUD-073 draft/double upload and AUD-090 Source concurrency finding. No external call, production write, new infrastructure, secret change or push.

09B corrected read-only archived UI baseline `/tmp/inop-hr09b-static-baseline-corrected.log` reproduces **3 manufactured skills vs expected 0** without any provider configuration; final current UI **19/19**. Previous missing-container and label-fixture failures remain distinct from this actual static-behavior proof. Every owned fixture cleanup completed; no production test records or files were used.

09B commit: `0b8c4d2f0154ab04580eb5257942d092ac469def` (17 files), 1534 full / 87 focused / 19 final UI tests and recorded gates. No push.

## 09C1 — minimized professional CV evidence adapter foundation

Target `/tmp/inop-hr09c1-target-final.log` **101/101**, full serial `/tmp/inop-hr09c1-regression.log` **1567/1567**, authorization **632/632**, smoke **13/13**, TS/build PASS, lint **0 errors / 9 warnings**, diff check clean. Validation metadata preserved at `/tmp/inop-packagehr09c1-validation.json`. Local commit pending creation. Only existing cv-text professional evidence is eligible, bounded and filtered. Contact/name/raw CV/file/identity fields are excluded, protected criteria and Unicode/contact patterns checked. No new facts, dates, credentials, matching score or hire/reject decision are inferred. Each output requires same-field literal evidence at token boundaries, preventing 4 from 14 years and Go from mango. Input snapshots and source identity are separate and immutable. Job/CV use the same existing capacity, budget and provider protocol rather than separate unbounded queues.

External CV review additionally requires HR_AI_CV_REVIEW_APPROVED=true; no setting or credential was enabled. Mock transport proves local schema/privacy/capacity invariants only. HTTP/UI authorization, revision/source recheck and explicit HR apply are next; P09-017/020/021 stay IN_PROGRESS, P09-023 BLOCKED_EXTERNAL. Foundation limitations and setup: `docs/HR_AI_CV_REVIEW_CONTRACT.md`. Raw original-source AI extraction, broader histories and OCR remain package 10/13 work, not a claim of this evidence-review increment. Existing full-field manual HR review remains unchanged. No production operation or push.

09C1 commit: `d84c7301c51e6c770d4d8eb8898070a24d5331d9` (5 files), 101 target / 1567 full tests and recorded gates. No push.

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-105 | 09C2 | Approving unchanged Job criteria leaves proposal controls visible because the parent context key stays unchanged | TESTED | `/tmp/inop-hr09c2-approval-baseline.log` fails 1 versus 0; Job/CV assistants explicitly clear proposal before parent callback; unchanged approval regressions pass |
| AUD-106 | 09C2 | Active Candidate copy still calls rule parsing AI, advertises DOC and implies automatic Kanban placement | TESTED | `/tmp/inop-hr09c2-doc-copy-baseline.log` independently reproduces six AZ/EN/RU AI/DOC-copy failures; final actual Candidate form states rule parsing, PDF/DOCX and ordinary save, optional profession-only AI explicitly separate; AUD-045/046 were reopened before correction |
| AUD-107 | 09C2 | Authority-change 409 is indistinguishable from a data-context conflict and leaves the old-scope form visible | TESTED | `/tmp/inop-hr09c2-authority-classification-baseline.log` fails Job/CV department-change code assertions; both controllers now return AI_AUTHORIZATION_CHANGED and both actual UIs mask the form; ordinary data/source 409 retains authorized primary input |

## 09C2 — independently authorized CV evidence review and explicit HR apply

Full serial regression **1619/1619**, focused **184/184**, authorization **632/632**, smoke **13/13**, TypeScript/production build PASS, lint **0 errors / 9 warnings**. Evidence: `/tmp/inop-hr09c2-target-final.log`, `/tmp/inop-hr09c2-regression.log`, `/tmp/inop-hr09c2-validation-final.log`, `/tmp/inop-packagehr09c2-validation.json`. Local commit pending creation. Final gates follow all source changes; the earlier first validation is not substituted for the final run.

Additive Candidate proposal POST requires independent current candidate.read and candidate.update, caller's stored source hash/revision, registered rule-parser evidence and bounded original-file SHA verification before and after latency. Current JWT/account/role/department/assignment and millisecond Candidate identity are rechecked; no unauthorized proposal or mutation. Known former name aliases and unknown parser provenance are excluded. List-like facts may have several proposals; conflicting singleton role/education/experience is rejected. Original bytes never go to AI. Existing authorized private downloads/preview remain unchanged; the new internal bounded read helper is not a public route.

Actual Candidate UI sends only hash/revision with Bearer, never raw CV/contact/proposals. Human selection/approval modifies only the draft's professional fields; ordinary current-authorized save/CAS persists them. No auto score/status/decision, missing experience stays null and explicit zero is retained. Route/auth/draft/source replacement invalidates requests/proposals; language causes zero new data/AI requests. Old callbacks cannot apply or affect another Candidate. Source absence/unsupported/outage/data 409 stays auxiliary to primary information; parent/auth failures and authority-change 409 mask the form. New/replaced/scanned draft sources require ordinary save/reopen before this evidence-only AI review; package 10 durable draft work remains open.

Three genuinely reproduced problems (AUD-105–107) are separately tracked above. Early browser harness/selector syntax failures are retained as fixture failures, not product evidence or PASS. The corrected negative baseline splits AI and DOC copy assertions independently. Tests use only UUID-owned synthetic local files/DBs and injected mock transport; HTTP fixture metadata is intentionally synthetic, while existing extraction/replacement suites cover actual rule parsing. No real AI quality, OCR, complete original-source extraction, generic DLP or hosted privacy/durability claim. No credential/approval flag, production write, migration or push.

All enumerated package 09 local adapter/security/HTTP/UI acceptance IDs now have evidence for this narrow documented contract. P09-023 remains BLOCKED_EXTERNAL; raw professional source extraction beyond existing facts, OCR, durable evidence/job history, AUD-073 double upload, AUD-047 broader upload localization, AUD-088 job diagnostics and AUD-090 Source concurrent timeout remain tracked for 10/13. Next independent work: package 10 private durable storage/background processing and privacy/recovery gates. No production resource is created.

09C2 commit: `f4dd3a5d5881f3672fef3a783cbee879eb70def5` (20 files), 184 target / 1619 full tests and final recorded gates. Working tree was clean after the commit; no push.

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-108 | 10A | Unauthenticated malformed JSON logs its raw request body and echoes parse excerpts via the global error handler | TESTED | Actual owned local HTTP baseline `hrErrorPrivacy` fails no-leak assertions; final metadata-only logs/generic unknown responses pass, 1628 full regression and final gates |
| AUD-109 | 10A | HR Candidate/Job/Application/pipeline/export catch blocks serialize raw DB/activity/export errors that can contain private values or nested causes | TESTED | Actual Candidate route with injected DB error reproduces leakage without a write; final metadata-only named HR boundaries pass privacy plus 1628 full regression. Broader non-HR/external logs not claimed verified |

## 10A — privacy prerequisites for durable processing

Negative baseline `/tmp/inop-hr10a-privacy-baseline.log` **0/9 passed**; targeted `/tmp/inop-hr10a-target.log` **126/126** covers new privacy checks plus existing private upload and mixed HR parent scope tests. Full serial `/tmp/inop-hr10a-regression.log` **1628/1628**, TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632** via `/tmp/inop-hr10a-validation.log` and `/tmp/inop-packagehr10a-validation.json`. Only docs/tracker changed after source freeze; local commit pending creation. Contract/limits: `docs/HR_ERROR_PRIVACY.md`. This is a small prerequisite, not completion of storage, quarantine, jobs, retention or all package 10 acceptance IDs. No production, external transport, env or storage change.

10A commit: `65b86c2a5afafe3e0b585a6c83ec9760448caa25` (10 files), 126 target / 1628 full regression, 632 authorization / 13 smoke, TypeScript/build PASS, lint 0 errors / 9 warnings. No push.

## 10B1 — private object storage adapter foundation

In progress. New adapter/test/contract are intentionally not wired into runtime upload/download or a new schema. Target `/tmp/inop-hr10b-target.log` **31/31** is entirely synthetic mock/DNS/HTTPS-injected proof, not real provider access. Fixed endpoint private SigV4, conditional encryption, immutable SHA/size, bounded slots/deadlines and no public URLs/deletion/retry are covered. No new resource, credential, migration or live request. Native filesystem still ephemeral; AUD-050 remains OPEN. Contract, external setup and proposed migration/fallback/backup approval: `docs/HR_PRIVATE_STORAGE_CONTRACT.md`.

Existing application code is unchanged after 10A's 1628 full regression; the new unwired module has its own 31 tests. No unexecuted 1659-test full-suite total is claimed. Final `/tmp/inop-hr10b-validation.log` and `/tmp/inop-packagehr10b-validation.json`: TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**. Local commit pending creation. Real object ownership/bucket policy/conditional write compatibility/durability/recovery and malware/retention are not verified. P10-001/006/007/016/017 in progress; P10-018/019 BLOCKED_EXTERNAL. Next: current-owning-resource read integration, then durable manifests/jobs/quarantine/source drafts.

10B1 commit: `c87c7dc41a80e830a48e1f7fc73fd46dd8cc7fa4` (4 files), 31 synthetic adapter tests; 10A's unchanged application 1628 full test proof retained separately; 632 authorization / 13 smoke, TypeScript/build PASS, lint 0 errors / 9 warnings. No activated writer/provider/resource/migration/push.

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-110 | 10B2 | Legacy Candidate download uses initial ownership even after assignment is revoked during asynchronous filesystem read | TESTED | Read-only c87c7dc controller baseline returns 200 after revocation; current actual file regression returns 404; 23 new current-storage authorization tests and 1682 full regression/final gates pass |

## 10B2 — current-resource private object/legacy reads

Focused `/tmp/inop-hr10b2-target.log` **177/177**, including 23 new actual HTTP/object/local authorization checks and existing private upload, original preview, Candidate action, CV review/AI UI protection. Full `/tmp/inop-hr10b2-regression.log` **1682/1682**, final `/tmp/inop-hr10b2-validation.log` and `/tmp/inop-packagehr10b2-validation.json`: TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**. Local commit pending creation; docs/tracker only changed after final source freeze. The new optional select:false/JSON-hidden Candidate blob is server-only with no default/backfill/index. No object upload route is enabled. Existing Candidate/Audit/Source/frontend contracts stay compatible; new storage is read-only until approved manifest/quarantine writer work. Whole-source DOCX/PDF extraction remains local, minimized AI only receives approved professional facts. Contract and precise limitations: `docs/HR_PRIVATE_STORAGE_CONTRACT.md`.

All object transport is synthetic; real durability/recovery/provider policy/access/cost remain BLOCKED_EXTERNAL. Existing filesystem originals remain authorized but ephemeral; native replacement safely clears old blob reference and retains the old object. Retention/orphans/AUD-050 and P10-003/006/008–015 remain OPEN/IN_PROGRESS. No production DB/env/secret/resource/migration/push. Next: bounded durable job/manifests and HR-visible processing/retry diagnostics; real CV ingestion stays gated.

10B2 commit: `c720a841b40573c4ef6cffee4b1e8c4575825db6` (7 files), 177 target / 1682 full regression, 632 authorization / 13 smoke, TypeScript/build PASS, lint 0 errors / 9 warnings. AUD-110 TESTED, native storage still ephemeral; no activated object writer/migration/push.

## 10C1 — email diagnostics and audited manual retry

In progress. Final targets `/tmp/inop-hr10c1-target-final.log` **67/67** after the optional-revision TypeScript correction; final `/tmp/inop-hr10c1-validation-final.log` and `/tmp/inop-packagehr10c1-validation.json`: TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**. Full serial `/tmp/inop-hr10c1-regression.log` **1714/1714**. Local commit pending creation; final gates correspond to the frozen source, only docs/tracker changed afterwards. Contract/limits: `docs/HR_NOTIFICATION_RETRY_CONTRACT.md`. Current server independent parent scopes, whole event/revision CAS, command replay, workflow/stale bounds, current retry actor and safe visible codes are tested without SMTP/provider access.

Negative backend corrected baseline reproduces missing route (404); first omitted Job description and later null interview mutation are fixture failures, preserved separately. Corrected read-only UI baseline proves AZ/EN/RU missing reason labels; its preceding readiness selector failure is not represented as three independent language proofs. Build initially caught optional revision; current UI requires known integer instead of guessing. Generic jobs/storage/drafts/retention/quarantine remain unfinished; external SMTP receipt stays BLOCKED_EXTERNAL. No production, secret, migration, resource, external email or push.

10C1 commit: `dddd640d7e699a5309588bd1a391f50d37ee7581` (15 files), 67 final targets / 1714 full regression, 632 authorization / 13 smoke, TypeScript/build PASS, lint 0 errors / 9 warnings. AUD-088's evidence cell is updated here to the actual completed UI/retry proof; its original 06C API-only wording was inadvertently retained in the preceding commit, not a different test status. No push.

## 10C2 — durable current-source parsing queue foundation

In progress. New model/service/test are unconnected to runtime routes/worker/UI, disabled by default and do not change current CRUD/SMTP flows. Existing 10C1 application source remains unchanged with **1714/1714** full evidence. New owned-DB actual parser/queue tests plus document processing/private storage/privacy regression run separately; no unexecuted sum is called a full-suite run. Final `/tmp/inop-hr10c2-target-final.log` **66/66** (18 new queue checks plus document worker/private storage/privacy), `/tmp/inop-hr10c2-validation-final.log` and `/tmp/inop-packagehr10c2-validation.json`: TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**. Local commit pending creation. Contract/DDL and explicit remaining work: `docs/HR_CV_PROCESSING_CONTRACT.md`.

Parse-only durable metadata, atomic unique global/actor slots and source-context replay, current source/role, bounded lease/deadline/retry and private structured result/HR approval requirement are implemented. There is no automatic Candidate mutation or saved rawText/sections/CV bytes/keys/token. Scans explicitly block for OCR. Native original durability, object writer/drafts, retention/orphans/quarantine and real external provider remain unfinished. No TTL/retention policy, schema migration/backfill, hosting flag or production DDL is activated. Next independent increment: authenticated Candidate-bound queue/status and HR-visible lifecycle/retry/review; then durable source manifests/quarantine, AI/OCR/ingestion preparation and packages 11–13.

10C2 commit: `d3e036f54f7718fef71d301bbead248ed721334e` (5 files), 66 target checks, TypeScript/build PASS, lint 0 errors / 9 warnings, smoke 13 / authorization 632. Runtime integration is the separate 10C3 increment below; no push.

## 10C3 — Candidate-bound status/start and HR review panel

Existing JWT middleware and current independent Candidate read/update scopes protect additive start (202), metadata history (latest 20) and child detail routes. Foreign child IDs never read another parent's result. JWT/current role and parent source are rechecked after queue reads; changed revision/source timestamp/metadata suppresses old facts. Optional Native worker is disabled by default, needs separately approved exact queue DDL, and does not automatically parse on upload or write Candidate facts.

Actual Candidate detail uses explicit history/refresh/start/inspect, current hash/revision, StrictMode-safe cancellation, zero initial/language processing requests, read-only HR controls and AZ/EN/RU safe reasons. Missing identity cannot start. Parent 401/403/404 masks/reloads primary data; child/auxiliary errors retain it. Source 409 clears retained results. Successful facts are rule-based, require manual HR review, preserve real zero and omit unknowns; existing Candidate edit remains the explicit correction/save path. No job result automatically changes a Candidate, application score/status or hiring decision.

The first typecheck failed on optional SHA; start now explicitly checks known hash/revision. Final `/tmp/inop-hr10c3-target-final2.log`: **104/104** (`hrCvProcessing`, `hrCvProcessingHttp`, `hrPrivateObjectStorage`, `hrCvProcessingUI`, `candidateActions`, `cvReviewUI`), real owned loopback HTTP/JWT/DB/file/DOCX and actual browser, not real provider. Final `/tmp/inop-hr10c3-validation-final2.log` and `/tmp/inop-packagehr10c3-validation.json`: TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**. Final `/tmp/inop-hr10c3-regression-final.log`: **1766/1766**, no skipped/cancelled tests, serial full regression on this source. `git diff --check` PASS. Local commit pending creation.

Generic manual parsing retry/direct result approval, durable original writer/source drafts/quarantine/retention/recovery and OCR/AI/ingestion remain unfinished; P10 is partial. External AI/storage/SMTP/Graph/source access stays blocked where appropriate; packages 11–13 and all original audit IDs remain retained. No .env/hosting/production DB/migration/resource/push.

10C3 commit: `89fb9017d73c605a86f9831d7341a6622f61d8ba` (15 files), 104 targets / 1766 full, TypeScript/build PASS, lint 0 errors / 9 warnings, smoke 13 / authorization 632. Working tree was clean after commit; no push.

## 10C4 — current-source repair retry without resetting lifetime bounds

Authenticated additive Candidate-bound retry is limited to blocked missing-original/unconfigured-storage jobs with current source and remaining attempts. Independent current read+update, original creator and retry caller authority, fresh source, timestamp/CAS, hashed UUID command replay, atomic original-creator/global slot reservation and private actor audit are implemented. Original creator is retained; worker checks both actors before/after work, no privileged fallback. Total processing attempts stay at three across automatic/manual retries; max two manual reservations. No retry of OCR/oversize/cancelled/active/success/exhausted contexts and no automatic storage repair, Candidate fact/status/score/hiring write.

Actual UI shows zero/manual retry counts, explicit repair-first action, read-only versus missing identity, current source/auth cancellation, safe auxiliary 409 and AZ/EN/RU narrow controls. The initial new browser run failed at the actual AZ missing-file label (`Original` versus `Orijinal`); the product spelling was corrected, assertions were not relaxed. Strict input checks additionally reject array command/hash coercion and noncanonical calendar timestamps. Final `/tmp/inop-hr10c4-target-final.log`: **73/73** (`hrCvProcessing`, `hrCvProcessingHttp`, `hrCvProcessingRetry`, `hrCvProcessingUI`, `hrCvProcessingRetryUI`), actual owned-loopback restored original/HTTP/JWT/Mongo/rule parser/browser. Final `/tmp/inop-hr10c4-validation-final.log` and `/tmp/inop-packagehr10c4-validation.json`: TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**. Final `/tmp/inop-hr10c4-regression-final.log`: **1787/1787**, no skipped/cancelled tests, serial full regression on this source. `git diff --check` PASS. Commit SHA is reported after creation and recorded in the next tracker update under the resume protocol.

P10-013/014/015 stay IN_PROGRESS: parse and email-specific idempotency/state/retry are now tested, other future job kinds are not. P10-003/006/009/010/012/020 and AUD-030/047/048/050/051/067/073 retain their unfinished scope. P10-018/019, P09-023, P11-020, P12-020 and EXT-SMTP-001 remain BLOCKED_EXTERNAL for real provider/durability/recovery/receipt/access. No real CV intake readiness. No production env/secret/DDL/DB/resource/push.

Next independent increment: explicit current-source job-result provenance/HR approval into the existing Candidate edit/save flow (no automatic replacement), then durable source manifests/writer/drafts and fail-closed quarantine preparation; real storage/retention/recovery activation needs approved access/policy. OCR/AI/ingestion and packages 11–13 remain in order; no original finding/acceptance ID is removed or silently closed.


10C4 commit: `bd7b5789fbcf73e08e4c1972333ce33b3d1c0f52`, 13 files, 73 targets / 1787 full, TypeScript/build PASS, lint 0 errors / 9 warnings, 13 smoke / 632 authorization. All predecessor commits are retained.

## 10C5 — explicit HR approval and source provenance (local increment)

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-021 | Explicit load → draft apply/edit → unchecked HR confirmation → existing save, no auto-apply/save | TESTED | Actual `hrCvApprovalUI` detail/editor/Bearer/DB test; missing confirmation sends zero PUT; true zero and unknown preservation |
| P10-022 | Server-derived current-source/job/parser/result/profile receipt, no client provenance trust | TESTED | Actual `hrCvApproval` positive all five scopes; source/result/profile SHA, evidence, actor/time; forged client metadata ignored; historical receipt survives later manual edits |
| P10-023 | Independent read/update and current JWT/Role/parent/assignment/source checks, atomic approval CAS | TESTED | `hrCvApproval`: mixed scopes, old JWT during await, foreign job, exact source timestamp/assignment final CAS, two concurrent saves yield 200/409 |
| P10-024 | Source/error/route/permission lifecycle, zero language refetch, auxiliary failures preserve primary draft | TESTED | Actual `hrCvApprovalUI`: 401/403/parent404 masks edit; child404/500/503 retains primary; stale PUT409 retains corrections without fake ordinary-save fallback; abort route/auth; AZ/EN/RU |
| P10-025 | Existing manual review compatibility and no automatic decision/status/job-evidence mutation | TESTED | `hrCvApproval` legacy manual save/no forged receipt; status-write rejection and unchanged job; inherited processing/manual review targets pass |

`Backend/services/hrCvApproval.service.js` derives evidence/provenance only from the current successful server job and normalized human facts. Approval uses one existing atomic Candidate write; no separate partial job-approval flag, no automatic Candidate replacement. Optional receipt has no default/backfill for legacy rows. Exact source CAS covers timestamp-only edits without revision increments. Historical receipt contains its own actor/time/profile hash, so later manual correction metadata does not misattribute the original approval. Actual source-bound edit flow has an explicit Apply and mandatory confirm/save, not an automatic fact import.

First backend run caught a test fixture incorrectly assuming the existing model default status was `new`; the fixture now explicitly starts `new` and verifies it is preserved. First UI run expected a non-existent translation; it now checks the actual existing AZ source-change copy. These failures are not claimed passes. Final combined target `/tmp/inop-hr10c5-target-final.log`: **110/110**, no skipped/cancelled tests, actual owned-local data/files/HTTP/parser/browser (no external provider).

Final `/tmp/inop-hr10c5-validation-final.log` and `/tmp/inop-packagehr10c5-validation.json`: TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**. Final serial `/tmp/inop-hr10c5-regression-final.log`: **1812/1812**, zero failures/skips/cancellations on this source. `git diff --check` PASS. Local commit is created only after these checks; exact SHA is recorded in the next tracker update under the resume protocol.

P10 remains partial. P10-003 original retention/durable manifests, P10-006 actual migration preparation, P10-009 OCR jobs, P10-010 AI jobs, P10-012 ingestion jobs and P10-020 pre-real-intake comprehensive access/security checks are not silently closed. P10-013/014/015 cover tested parse and email only; future kinds remain pending. AUD-030/047/048/050/051/067/073 and AUD-090 remain open in their original scope. P10-018/019 and real AI/SMTP/Graph/source access remain BLOCKED_EXTERNAL. No real CV intake readiness, no automatic retention policy, no credentials/.env/DDL/production DB/push.

Resume: finish safe local durable-original manifest/write/draft/quarantine preparation and migration inventory before external activation; retain OCR/AI/ingestion adapters and packages 11–13 in order. Any real-provider durability/recovery/scan/retention activation needs approved external access/policy and must not be represented as tested locally.


10C5 commit: `62cb10a201e313af1382beb69ea4db5a3ed5b2ce`, 18 files, 110 combined targets / 1812 full, TypeScript/build PASS, lint 0 errors / 9 warnings, 13 smoke / 632 authorization; working tree was clean, no push.

## 10C5B — approval draft boundary corrections

| ID | Package | New finding | Status | Evidence |
|---|---|---|---|---|
| AUD-111 | 10C5B | Rejected non-CV selection clears the job approval proof before validation and silently permits an ordinary save without confirmation | TESTED | Actual browser baseline on `62cb10a` issues one PUT instead of zero; `hrCvApprovalDraftUI` final invalid-file test blocks PUT and retains proof/primary facts |
| AUD-112 | 10C5B | Malformed processing review warnings pass the partial DTO guard and crash Candidate editor | TESTED | Actual browser injected malformed warnings produces a page error on `62cb10a`; final bounded metadata guard returns auxiliary error while retaining editable primary facts |

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-026 | Validate a new file before changing draft/source/proof; rejected selection cannot bypass confirmation | TESTED | `hrCvApprovalDraftUI` invalid-file regression, actual editor/request count/owned DB |
| P10-027 | Valid replacement cancels old evidence, omits old proof and starts pending review for the new original | TESTED | Actual browser new DOCX extraction/save, late old response, multipart body, new SHA/pending/no receipt; original bytes retained. `hrCvApproval` old-proof + replacement 400 only cleans rejected new file |
| P10-028 | Bounded result metadata guard prevents malformed evidence/warnings/list/history render or apply | TESTED | `hrCvApprovalDraftUI` malformed warnings returns auxiliary error without page crash or primary draft loss; existing current result/source/UI regressions pass |

No new policy/provider/env/production operation. Metadata validation covers warnings/correction arrays, evidence source/quotes/confidence, known scalar/list/history fields before applying. Invalid selections preserve current source and approval proof; real replacements invalidate old proof and cancel old evidence. Legacy synchronous editing still passes. The reproduction/fix is retained rather than hiding it behind the earlier passing suite.

`/tmp/inop-hr10c5b-baseline.log`: both targeted negative tests fail on prior source (expected, not PASS). Final `/tmp/inop-hr10c5b-target-final.log`: **61/61** on the corrected app source (before two added replacement tests); final `/tmp/inop-hr10c5b-new-target.log`: **20/20**, including both replacement regressions. `/tmp/inop-hr10c5b-validation-final.log` and `/tmp/inop-packagehr10c5b-validation.json`: TypeScript/build PASS, lint 0 errors / 9 warnings, 13 smoke / 632 authorization. Final serial `/tmp/inop-hr10c5b-regression-final.log`: **1817/1817**, no failures/skips/cancellations on this source. `git diff --check` PASS; commit created only after successful checks. Exact commit SHA is recorded next update.

Resume next at P10-006 scoped, bounded **dry-run metadata inventory**; no original bytes will be moved, deleted or represented as verified by metadata alone. Durable manifest/writer/source draft/quarantine, legal retention and real recovery remain pending; all earlier OPEN/BLOCKED_EXTERNAL IDs are retained.


10C5B commit: `e477943ca9884e5178f00edca8f09054f15252f8`, 6 files, corrected app targets 61/61 plus final replacement/proof targets 20/20, 1817/1817 full, TypeScript/build PASS, lint 0/9, 13 smoke / 632 authorization. Working tree was clean, no push.

## 10C6 — scoped metadata-only migration dry-run preparation

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-029 | Read-only bounded metadata inventory with stable keyset and page-scoped counts | TESTED | `hrCvMigrationInventory`: limit/input/cursor, idempotent pages; actual owned Mongo, 14/14; no collection/index/Candidate mutation, file access or provider call |
| P10-030 | Current independent Candidate read/update, actor/department/source rechecks and no stale count/cursor leak | TESTED | `hrCvMigrationInventory` all five roles, none/missing-department/mixed scope, forged caller grants ignored; role/timestamp/ownership races refuse whole page |
| P10-031 | Legacy/malformed/conflicting source metadata stays review-only; metadata never proves original durability | TESTED | `hrCvMigrationInventory` unknown hash/locator/no source, valid object still requires recovery verification, corrupt reference remains private/no fallback/key leakage; response always metadataOnly/bytesVerified=false |

The internal module is unwired (no route/CLI/worker invocation) and does not authorize/apply a migration. Existing middleware must authenticate the eventual caller before supplying its actor ID; the helper itself freshly resolves current User/Role. No new env/dependency/model/index is introduced. Response excludes candidate name/contact/raw CV/extraction/display filename/file URL/blob key/actor/credential. At most 200+1 metadata rows, two bounded Candidate queries, fixed reason codes and current-authority/source guards; this is not a 50k benchmark/global point-in-time backup assertion.

`docs/HR_CV_MIGRATION_PREPARATION.md` specifies backup/recovery, separate apply authorization, server-owned manifest/key reservation, quarantine/scan, conditional immutable write, exact hash readback, current-source CAS, retention-policy gate, preservation of old bytes and safe private-read rollback. No native/object deletion, TTL/backfill/seed/role change or production operation. Legacy HR migration remains separate. Manifest/writer/source drafts/quarantine implementation and real storage/recovery remain unfinished and are **not** marked TESTED by the dry-run preparation.

Final `/tmp/inop-hr10c6-target-final.log`: **14/14**, zero failures/skips/cancellations, owned loopback metadata only. Final `/tmp/inop-hr10c6-validation-final.log` and `/tmp/inop-packagehr10c6-validation.json`: TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**. Final serial `/tmp/inop-hr10c6-regression-final.log`: **1831/1831**, zero failures/skips/cancellations on this source. `git diff --check` PASS; commit only after these checks. Exact commit SHA is recorded in the next tracker update.

Resume at P10-003/006: implement disabled, server-owned original manifest/write/source-draft/quarantine preparation with approved scanner/storage interfaces; actual provider/backup/retention activation remains gated. P10-009/010/012 OCR/AI/ingestion jobs, P10-020 comprehensive pre-intake security and AUD-030/047/048/050/051/067/073/090 remain OPEN/IN_PROGRESS in their original scope. P10-018/019 and actual AI/SMTP/Graph/website access stay BLOCKED_EXTERNAL. Do not skip or silently close these IDs; packages 11–13 are preserved. Production push/deploy is not authorized by this implementation task.


10C6 commit: `a932580b5da3b670aca592361c5519166b94de63`, four files, 14 target / 1831 full, TypeScript/build PASS, lint 0/9, smoke 13 / authorization 632. Predecessors preserved.

## 10C7 — source-bound original manifest/archive preparation

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-032 | Disabled internal original manifest with exact separately approved unique DDL; no automatic migration/TTL | TESTED | `hrCvOriginalArchive` 19/19 owned-loopback checks |
| P10-033 | Server key saved before immutable PUT, exact scan/hash readback and same-key uncertain-write recovery | TESTED | `hrCvOriginalArchive` 19/19, synthetic scanner/storage only |
| P10-034 | Current independent read/update and original actor/source/lease guards; bounded attempts/capacity/deadline | TESTED | `hrCvOriginalArchive` 19/19 owned-loopback checks |
| P10-035 | Retain original/obsolete object and manifest; hide keys/PII/errors; no Candidate attachment or fake recovery | TESTED | `hrCvOriginalArchive` 19/19 owned-loopback checks |

P10 remains partial. The technical archive is disabled/unwired and never applies the migration inventory. No production DDL, provider config, scanner activation, Candidate pointer, file/object deletion or TTL. `docs/HR_CV_ORIGINAL_MANIFEST.md` records exact DDL and activation/recovery/retention gates. Original IDs and external blockers are retained, including draft/attachment, orphan/deletion lifecycle, actual OCR/AI/ingestion and P11–13. Continue independent work after this local commit; no per-package user confirmation or push/deploy.

Final 10C7 evidence: `/tmp/inop-hr10c7-target-final.log` **64/64** (new original archive 19, inventory 14, private object adapter 31); `/tmp/inop-packagehr10c7-validation.json`: TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**. `/tmp/inop-hr10c7-regression-final.log` full serial **1850/1850**, no failures/skips/cancellations, frozen source. `git diff --check` PASS. Five package files only; SHA recorded after commit next update. P10-003/006 remain IN_PROGRESS: technical synthetic archive is tested, actual migration/attachment/storage/scan/backup/recovery/retention is not. No user confirmation wait; next independent P10 increment is durable professional AI review/task preparation using the existing queue, preserving parse-only HTTP/UI.


10C7 commit: `4f487005c8fb630a33cf6778c81a439e74ce23e8`, five files, 64 targets / 1850 full, TypeScript/build PASS, lint 0/9, smoke 13 / authorization 632; working tree clean, no push.

## 10C8 — durable professional AI task preparation

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-036 | Exact immutable task kind/version and shared durable queue bounds without breaking parse HTTP/UI | TESTED | `hrCvAiProcessing` 15/15; 84 combined targets / 1865 full; `hrCvAiProcessing` 15/15 local targets |
| P10-037 | Current authorized original/source before and after professional-only provider operation | TESTED | `hrCvAiProcessing` 15/15; 84 combined targets / 1865 full; revocation during original IO sends zero provider requests |
| P10-038 | Private validated evidence/provenance, explicit blocked/unavailable, no static AI or automatic decision | TESTED | `hrCvAiProcessing` 15/15; 84 combined targets / 1865 full; actual P09 adapter with synthetic transport only |

The original first target run failed because the new fixture used invalid model status `ocr-required`; it now uses the canonical `unsupported_ocr`. An existing HTTP race test then waited on a `findById` hook bypassed by the new query. The production query retains `findById` plus the exact kind/version filter; the test assertion was not weakened. The interrupted run is not PASS. `/tmp/inop-hr10c8-abort-cleanup.json` records removal of only that run's uniquely owned loopback fixture and four exact generated DOCX files, verified by time/content/hash/parent metadata; existing files/data were untouched. Final combined targets `/tmp/inop-hr10c8-target-final.log`: **84/84**, no failures/skips/cancellations. Full regression/build gates pending.

P10-010 stays IN_PROGRESS: the adapter/queue is internal and disabled, HTTP/UI integration and real AI are not claimed complete. No P10 storage/OCR/ingestion/privacy gate is silently closed. Original audit/acceptance IDs and P11–13 remain preserved; external access remains BLOCKED_EXTERNAL, and independent work continues after local commit. No provider/environment activation, DDL/migration/resource/secret/production/push.

Final 10C8 evidence: `/tmp/inop-hr10c8-target-final.log` **84/84** AI/parse/HTTP/retry/approval, `/tmp/inop-packagehr10c8-validation.json` TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**. `/tmp/inop-hr10c8-regression-final.log` serial full **1865/1865**, zero failures/skips/cancellations, frozen source. `git diff --check` PASS. Six package files only; local SHA recorded next tracker update. P10 stays partial; next independent increment is bounded optional OCR profile with real local scanned-PDF tests and explicit missing runtime/language status, then authenticated task diagnostics/review, ingestion/drafts/orphans and P11–13. No push/deploy.


10C8 commit: `aa11a9d6155fdebdbff9b970ef86eba306578856`, six files, 84 combined targets / 1865 full, TypeScript/build PASS, lint 0/9, smoke 13 / authorization 632; working tree clean, no push.

## 10C9 — real local bounded OCR preparation

| ID | Package | New finding | Status | Evidence |
|---|---|---|---|---|
| AUD-113 | 10C9 | Real Russian scanned CV recognizes HACCP as Cyrillic НАССР, so exact-only structured extraction loses the professional acronym | TESTED | `/tmp/inop-hr10c9-target-second.log` and `target-third.log` fail the unchanged HACCP expectation; narrow OCR acronym/raw-evidence correction, 85 combined targets / 1885 full |
| AUD-114 | 10C9 | Approval rejection cleanup test compares a shared upload directory globally and falsely counts another concurrent test's generated PDF as an orphan | TESTED | `/tmp/inop-hr10c9-target-final.log` fails on other test's `test-UUID.pdf`; exact process/request-owned write observation fixes isolation without weakening original/cleanup assertions, 85 combined targets / 1885 full |

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-039 | Actual image-only AZ/EN/RU OCR with known/unknown facts and engine/model evidence | TESTED | `hrCvOcrProcessing` 20/20; 85 combined targets / 1885 full; actual Tesseract 5.5.0 and pinned official test models, not mock OCR |
| P10-040 | Bounded pages/geometry/text/bytes/deadline/capacity and explicit runtime/language/unsupported states | TESTED | `hrCvOcrProcessing` 20/20; 85 combined targets / 1885 full; overlong CV fails without silent truncation |
| P10-041 | No inherited secrets, private temporary files, own cleanup and explicit cleanup failure | TESTED | `hrCvOcrProcessing` 20/20; 85 combined targets / 1885 full; native process shim tests separate from actual OCR |
| P10-042 | Durable OCR source/scope/version boundaries, private review-only provenance, null confidence/no auto decision | TESTED | `hrCvOcrProcessing` 20/20; 85 combined targets / 1885 full; real original reader/queue/five scopes plus negative and raced cases |

First targets caught unknown email as the existing raw parser's empty string (new OCR DTO now omits empty/null fields), a fixture expecting wrong-kind approval before enabling the parsing profile, the real Cyrillic acronym loss, and concurrent test-directory interference. All are retained; no failed log is PASS and no assertion for required HACCP was removed. Final combined `/tmp/inop-hr10c9-target-final2.log`: **85/85** OCR/AI/parse/approval/document worker, zero failures/skips/cancellations. Build/full gates pending.

`docs/HR_CV_OCR_PROCESSING.md` separates real local OCR from synthetic security tests, limits and hosted runtime prerequisites. Models are test artifacts outside Git, explicit preparation only; no runtime/hosting download, dependency/env/secret/start change or resource provisioning. Default parse HTTP/UI and rules-2 parser/scoring contracts are preserved. OCR/AI HTTP/review integration, source draft/attachment/migration/privacy/ingestion and P11–13 remain open; storage/recovery/real AI/SMTP/Graph/website provider access remains BLOCKED_EXTERNAL. Continue independent work after local commit, no confirmation wait and no push/deploy.

Final 10C9 evidence: `/tmp/inop-hr10c9-target-final2.log` **85/85**, including **20/20** new OCR checks (real AZ/EN/RU scanned PDFs separated from synthetic security shims). `/tmp/inop-packagehr10c9-validation.json`: TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**. `/tmp/inop-hr10c9-regression-final.log`: full serial **1885/1885**, zero failures/skips/cancellations on frozen source. `git diff --check` PASS. Eight package files only; exact local SHA recorded next update.

User decision requested asynchronously for AUD-030/051 deletion lifecycle (archive/restore versus rejecting deletion with dependencies); dependent deletion behavior stays unchanged until an answer. Other independent P10 source retention/attachment, queue UI/ingestion and P11–13 continue without per-package confirmation. All production/env/resource/secret/push restrictions remain.


10C9 commit: `04e73a11af33151fd460eb61db80d3b921cce4d6`, eight files, 85 combined targets / 1885 full, TypeScript/build PASS, lint 0/9, smoke 13 / authorization 632. Predecessors preserved, no push.

## 10C10 — exact-source attachment and original/provider authorization boundaries

| ID | Package | New finding | Status | Evidence |
|---|---|---|---|---|
| AUD-115 | 10C10 | Explicit synchronous AI review submits professional evidence after first original read loses JWT/role/assignment/source, although the final response is denied | TESTED | `/tmp/inop-hr10c10-security-baseline.log`: provider counter 1 instead of 0; fresh pre-provider guards added; 229 combined targets / 1902 full; TypeScript/build PASS, lint 0/9, 13 smoke / 632 authorization |
| AUD-116 | 10C10 | A newly attached archive pointer remains downloadable after its manifest is blocked/missing/foreign or quarantined during IO | TESTED | Same baseline returns 200 instead of required 409; current owning manifest guards added; 229 combined targets / 1902 full; TypeScript/build PASS, lint 0/9, 13 smoke / 632 authorization |

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-043 | Disabled exact per-record migration attachment, trusted server approval and one source-only CAS | TESTED | `hrCvOriginalAttachment`, real owned DB/HTTP and synthetic storage/scanner/operator gates; 229 combined targets / 1902 full; TypeScript/build PASS, lint 0/9, 13 smoke / 632 authorization |
| P10-044 | Independent current read/update, exact source/manifest, bounded cancellation and uncertain acknowledgement reconciliation | TESTED | Five scopes, mixed/foreign/raced cases, ignored-cancellation slots and idempotent receipt; 229 combined targets / 1902 full; TypeScript/build PASS, lint 0/9, 13 smoke / 632 authorization |
| P10-045 | Private current-manifest read guard, legacy fingerprint/reader compatibility and replacement retains every old original | TESTED | Download/quarantine and replacement tests plus inherited processing/approval/storage suites; 229 combined targets / 1902 full; TypeScript/build PASS, lint 0/9, 13 smoke / 632 authorization |

`HR_CV_ORIGINAL_ATTACHMENT.md` documents internal disabled preparation and external backup/scanner/provider/retention gates. Receipt is optional/hidden, no default, backfill/index or startup migration. No Candidate facts/decisions/Application scores are changed. Existing receipt-free processing identity stays compatible. New server receipt is part of source identity/CAS. Real provider/durability/recovery are not represented by synthetic evidence. P10-003/006 remain IN_PROGRESS, 018/019 BLOCKED_EXTERNAL. Other remaining P10 and P11–13 IDs are preserved.

Separate owned-loopback deletion baseline `/tmp/inop-hr10d-delete-baseline.json` confirms Candidate DELETE 200 leaves linked Application and original bytes but canonical download becomes 404. AUD-030/051 decision remains pending asynchronously (archive/restore versus dependency-blocked deletion); no policy is applied without the answer. Independent work continues.


Final 10C10 evidence: `/tmp/inop-hr10c10-target-final.log` **229/229**, including **17/17** new attachment/reader/provider-boundary checks. `/tmp/inop-packagehr10c10-validation.json`: TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**. Full frozen-source serial `/tmp/inop-hr10c10-regression-final.log`: **1902/1902**, zero failures/skips/cancellations. Security baseline failures are retained, not counted as PASS. `git diff --check` PASS; 13 package files only, local SHA recorded next update. Resume with optional OCR HTTP/UI/explicit HR approval, then AI/drafts/ingestion/P11–13 without per-package approval. No push/deploy.


10C10 commit: `e93ab040bb949099d9c0a81ae478901144043f5f`, 13 files, 229 targets / 1902 full, TypeScript/build PASS, lint 0/9, 13 smoke / 632 authorization; clean tree, no push.

## 10C11 — optional OCR status/start/worker and explicit HR approval UI

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-046 | Separate opt-in trusted OCR profile on existing authenticated routes and Mongo worker, default parse compatibility | TESTED | `hrCvOcrHttp` actual owned Mongo/HTTP/real OCR; pre-patch baseline fails because OCR is not routed; local targets passed; final frozen-source 1915/1915 full |
| P10-047 | Current-source, independent scope, truthful OCR provenance and explicit human apply/confirm/save | TESTED | Five role positives and mixed/foreign negatives, actual `hrCvOcrUI` scanned source -> private job -> editor -> server receipt; local targets passed; final frozen-source 1915/1915 full |
| P10-048 | Bounded idempotent OCR repair retry with original/current actor guard, remaining lifetime attempts and source CAS | TESTED | `hrCvOcrHttp` / `hrCvOcrUI` runtime repair, no automatic profile writes; local targets passed; final frozen-source 1915/1915 full |
| EXT-OCR-001 | Hosted Native executable/model availability and resource limits | BLOCKED_EXTERNAL | Actual local Tesseract/model tests do not prove Render runtime provisioning; opt-in stays off |

`HR_CV_OCR_HTTP_REVIEW.md` documents flags/metadata-only requirements, contracts and release gates. No new provider/dependency, automatic model download, source deletion, startup DDL/seed/migration, production env/DB/push/deploy. Shared default parse behavior is retained; persisted child kind chooses its trusted profile. Source draft/storage/retention/ingestion, AI task UI and P11–13 remain unfinished; independent work continues after successful local commit.


10C11 targeted evidence: `/tmp/inop-hr10c11-target-first.log` 95/95 before added retry cases; final combined target caught a fixture using `wire.url` although the shared browser harness records `wire.path` (116 pass / 2 fail including parent). The fixture is corrected, assertions are unchanged; `/tmp/inop-hr10c11-ui-final.log` **4/4** including actual retry, zero failures/skips/cancellations. Remaining combined cases passed; full final frozen-source run now underway. `/tmp/inop-packagehr10c11-validation.json` TypeScript/build PASS, lint 0 errors / 9 warnings, 13 smoke / 632 authorization. No failed log is reported as PASS. Final full gates pending; no commit before completion.


Final 10C11 gates: full frozen-source serial `/tmp/inop-hr10c11-regression-final.log` **1915/1915**, zero failures/skips/cancellations, includes all 118 target cases after the fixture correction. `/tmp/inop-packagehr10c11-validation.json` TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**. `git diff --check` PASS; 18 package files only. Local commit after these checks; SHA recorded next update. Next independent work: durable AI task status/start/worker/review, then source draft/ingestion and P11–13. No push/deploy. P10 overall stays partial with real provider/storage/recovery/hosting gates and deletion policy pending.

| ID | Package | New finding | Status | Evidence |
|---|---|---|---|---|
| AUD-117 | 10C12 | HTTP child with obsolete non-parse task version may be classified as parent-unavailable, hiding a still-readable primary Candidate | TESTED | Child baseline reproduces wrong parent code; `hrCvTaskLifecycle` + actual obsolete-job UI retain authorized primary draft; full 1931/1931 |


10C11 commit: `3653430831434ac4f9b286ddce5c2eeb33974849`, 18 files, 1915 full including all 118 final target cases, TypeScript/build PASS, lint 0/9, 13 smoke / 632 authorization; clean tree, no push.

## 10C12 — optional durable AI HTTP/worker and explicit professional HR review

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-049 | Authenticated separate opt-in AI task profile/status/start/worker; default parse/OCR compatibility | TESTED | `hrCvAiHttp` + inherited task-profile/parse/OCR/approval suites; 169 combined targets / 1931 final full, TypeScript/build PASS, lint 0/9, 13 smoke / 632 authorization |
| P10-050 | Bounded source-derived professional proposals/reasons, truthful provider/test provenance and explicit apply/edit/confirm/save | TESTED | Five scope positives, actual `hrCvAiProcessingUI`; real adapter with synthetic transport only; 169 combined targets / 1931 final full, TypeScript/build PASS, lint 0/9, 13 smoke / 632 authorization |
| P10-051 | Only HR-confirmed source-bound OCR facts eligible; unknown/protected/recursive/insufficient facts fail closed | TESTED | `hrAiCvReview` approved OCR positive and pending/changed-hash/parser/recursive negatives; actual adapter validations; 169 combined targets / 1931 final full, TypeScript/build PASS, lint 0/9, 13 smoke / 632 authorization |
| P10-052 | AI configuration-repair retry stays current-source/actor/idempotent/lifetime bounded, without automatic decision | TESTED | `hrCvAiHttp` actual retry and no Candidate mutation; existing outage/timeout budgets; 169 combined targets / 1931 final full, TypeScript/build PASS, lint 0/9, 13 smoke / 632 authorization |

AUD-117 baseline `/tmp/inop-hr10c12-child-baseline.log` reproduces obsolete child PROCESSING_PARENT_UNAVAILABLE instead of JOB_UNAVAILABLE. Corrected metadata/version classification keeps old facts closed; `hrCvTaskLifecycle` and actual bookmarked obsolete-job UI preserve authorized primary draft. Default AI routing baseline `/tmp/inop-hr10c12-baseline.log` fails expected profile availability (400 before optional wiring); no failed run is PASS.

First combined targets passed backend/old flows but the new UI asserted mixed-case Mock before the asynchronous result rendered; it now waits for the result and asserts the actual existing MOCK TEST label. Corrected standalone UI 4/4, including malformed proposals/current route/permission and obsolete child handling. The external helper initially rejected a new package label before any validation; its allowed labels were extended and actual checks rerun. These are not claimed successful runs. `HR_CV_AI_HTTP_REVIEW.md` documents contracts, defaults and live external gates. P09-023 real AI stays BLOCKED_EXTERNAL; P10 source draft/ingestion/deletion/retention and P11–13 are retained and continue independently. No production operation or push/deploy.


Final 10C12: `/tmp/inop-hr10c12-target-final.log` **169/169**, zero failures/skips/cancellations. `/tmp/inop-packagehr10c12-validation.json` TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**. Full frozen-source serial `/tmp/inop-hr10c12-regression-final.log` **1931/1931**, no failures/skips/cancellations. `git diff --check` PASS. 24 package files only; local SHA recorded next tracker update. All prior commits preserved. Real AI/storage/recovery/hosting/SMTP/Graph/website access and pending deletion decision remain unverified; no program-completion/live intake claim. Continue remaining independent P10 source/error/draft/ingestion work then P11–13, no per-package approval wait/push/deploy.


10C12 commit: `42c1a4a65e1a5bfd2dcc7df1fa49c887a76ee0f1`, 24 files, 169 targets / 1931 full, TypeScript/build PASS, lint 0/9, 13 smoke / 632 authorization; clean tree, no push.

## 10C13 — localized upload/parsing error states and auth fail-closed UI

| ID | Package | New finding | Status | Evidence |
|---|---|---|---|---|
| AUD-118 | 10C13 | Parsing 401/403 leaves a stale editable Candidate and raw server detail is presented instead of localized document error state | TESTED | Corrected pre-patch baseline fails document/auth expectations; actual editor/HTTP DTO targets 45/45 and final frozen-source 1943/1943. TypeScript/build PASS, lint 0/9, smoke 13/13, authorization 632/632; no raw detail/auth-stale editor. |

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-053 | Stable localized document errors react to AZ/EN/RU without API refetch/draft loss or raw provider detail | TESTED | `hrCvDocumentErrorsUI` nine error cases × AZ/EN/RU, zero refetch and retained draft; targets 45/45, final frozen-source 1943/1943; TypeScript/build PASS, lint 0/9, smoke 13/13, authorization 632/632. |
| P10-054 | Parsing auth failures hide editor, auxiliary errors preserve primary, existing cancellation/proof/save behavior preserved | TESTED | Actual UI 401/403 masking plus inherited approval/OCR/AI/lifecycle/cancellation/proof/save; targets 45/45, final frozen-source 1943/1943; TypeScript/build PASS, lint 0/9, smoke 13/13, authorization 632/632. |

The first harness forgot the shared helper's required navigation hook and failed before the intended requests. That initial log is neither app proof nor PASS. The harness was corrected before the valid baseline; no production patch was applied to bypass a fixture problem. Corrected baseline reproduces missing localized states and auth masking. `/tmp/inop-hr10c13-target-first.log` **45/45**, zero failures/skips/cancellations. `/tmp/inop-packagehr10c13-validation.json` TypeScript/build PASS, lint 0 errors / 9 warnings, 13 smoke / 632 authorization. Full frozen-source suite underway. `HR_CV_DOCUMENT_ERROR_STATES.md` documents narrow scope and remaining broader localization. No backend/DB/env/provider/secret/resource/original/push/deploy changes; independent P10 and P11–13 work continues after local commit.

## Safe-stop checkpoint 2026-10-11

User explicitly requested a safe checkpoint and stop, superseding the earlier instruction to continue all packages in this turn. No new implementation package is started after 10C13. Preserve every prior commit and every tracked/untracked/ignored file, including `.env`; do not reset, clean, delete user files, seed/overwrite data, push, deploy or operate on production.

### Git and validation binding

- Branch `work`; checkpoint began at `42c1a4a65e1a5bfd2dcc7df1fa49c887a76ee0f1` (10C12). All predecessors are preserved. 10C7–10C12 complete SHAs and evidence remain in the chronological ledger above.
- 10C13 contains only Candidate parsing presentation/auth fail-closed changes, its new helper/UI regression, three locales, contract document and this tracker (nine explicit paths). No backend, route, model, dependency, lockfile, secret, startup/hosting config or source original is changed.
- Targeted `/tmp/inop-hr10c13-target-first.log`: **45/45**. Current package `/tmp/inop-packagehr10c13-validation.json`: TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**, owned loopback DB only. Baseline/fixture failures are retained separately and are not PASS.
- First full frozen-source run `/tmp/inop-hr10c13-regression-final.log` was **interrupted, not PASS** after extensive browser resource failures. `/tmp` is 100% full (about 9 MB free); the failed run records `ERR_INSUFFICIENT_RESOURCES`. A specific resource cause is not independently proven by that error alone. No cache/user file was deleted to free space. Exact owned runner PID was interrupted; no unrelated service was stopped.
- Fresh full serial run uses `TMPDIR=/workspace/inop-hr10c13-checkpoint-tmp` (outside the repository, separate filesystem with available capacity) and writes `/workspace/inop-hr10c13-checkpoint-regression-final.log`. **Completion/commit pending at checkpoint preparation; final outcome is appended below before stopping.** Existing code/tests stay frozen during this run; only tracker notes change.
- The first alternate-TMPDIR attempt `/workspace/inop-hr10c13-checkpoint-regression.log` was also interrupted, **not PASS**: the existing OCR test-model helper resolves its pinned model directory from `os.tmpdir()`, so the new root initially lacked those fixtures. The three existing public models were copied only after checking their exact pinned SHA-256; originals are untouched. Explicit `TMPDIR=... node Backend/scripts/prepareOcrTestModels.cjs` verifies the copied models without downloading or weakening integrity. Final run uses the prepared scratch root; code/tests were not changed to pass this setup issue.
- Environment prerequisite for next session: check free disk space and available browser resources before tests. Do not rerun unchanged into the full `/tmp`; choose an owned scratch directory with capacity. Do not erase retained caches/logs or orphan DB/files indiscriminately. Earlier AUD-090 concurrency issue remains OPEN; a serial pass is not a fix for it.

### Exact continuation point after checkpoint

1. Read this tracker and run `git status --short --branch`, `git rev-parse HEAD`, `git log` before edits. Verify the final checkpoint commit/files and preserved history. If 10C13 final gates do not pass, resume **10C13 / P10-053/054 / AUD-118** first; do not commit or label that implementation complete blindly.
2. Once 10C13 is committed, resume **P10-003/006**, then **P10-012**, **AUD-067/073**: reproduce the CV pipeline compensation/uncertain-write problem in an owned temporary loopback DB; determine a minimal source-draft/immutable original/idempotent ingestion contract to avoid parse→create double upload and orphan records/files. No source-draft, ingestion adapter or compensating-rollback fix has been implemented in this session. Architectural brainstorms are not completed code or approved access/retention policy.
3. Current disabled original manifest/archive, per-record attachment, private reader and parse/OCR/AI queues are the tested foundations; preserve current independent resource scopes, source CAS, old-JWT/current-role checks, truthful provenance and explicit human apply/confirm/save. Do not replace existing architecture or enable real intake prematurely.
4. **AUD-030/051 deletion policy is awaiting a genuine user decision**: archive/soft-delete with retained Applications/CVs versus reject dependent deletion with 409. No answer/approval is inferred. Owned local reproduction `/tmp/inop-hr10d-delete-baseline.json` proves current DELETE 200 removes Candidate, leaves Application/original, and canonical download becomes 404. Do not apply either policy without the answer. Continue unrelated work once asked to resume.
5. Complete remaining independent P10 items before P11 local Graph adapter/setup/security preparation, then P12 approved-source interfaces/form security preparation, then P13 integrated matrix/disposition/release report. Missing credentials block only real external activation/E2E, not local contracts, mock/security tests or UI preparation. No whole-program completion is claimed.

### Remaining program requirements (stable IDs retained)

| Package | Remaining tracked work / scope |
|---|---|
| 01–08 | Original acceptance rows are locally TESTED with named evidence, but cross-package **AUD-047** (broader HR CRUD/backend validation/action localization), **AUD-073** (double upload), **AUD-090** (concurrent Source PDF failure) are not silently closed. Do not repeat completed implementations without a new regression. Existing performance report is local 0/5k/50k evidence, not hosted measurement. |
| 09 | **P09-023 BLOCKED_EXTERNAL** real provider E2E/approved privacy/config. Existing synthetic adapter/AI UI tests are not live AI proof. |
| 10 | **P10-003/006/013/014/015/016/017 IN_PROGRESS**, **P10-012/020 OPEN**, **P10-018/019 BLOCKED_EXTERNAL**. Original retention/migration apply/ingestion/idempotency/state/monitoring/reuse/pre-intake security still require remaining evidence. Local OCR/AI task/HTTP/HR-review evidence does not prove hosted OCR, real AI/storage/recovery/scanner readiness. **AUD-030/047/048/050/051/067/073** remain OPEN/IN_PROGRESS; 10C13 IDs depend on final gates. |
| 11 | **P11-001–019 OPEN**, **P11-020 BLOCKED_EXTERNAL**: approved mailbox adapter; OAuth/application least privilege; token lifecycle; delta/pagination/subscription choice; attachment ingestion/dedup/retry/rate limits/health; source→vacancy matching/ambiguous review; no token/CV logging; tenant/mailbox/admin-consent/credentials setup checklist. **AUD-071/080** remain OPEN. No Graph adapter or real mailbox integration was implemented here. |
| 12 | **P12-001–019 OPEN**, **P12-020 BLOCKED_EXTERNAL**: public source research and actual API/form/email/export/partner evidence; approved adapters/actual channels only; no private scraping/login bypass; blocked-access/alternative-path documentation; public form rate/abuse/upload/malware/signed source/idempotency/privacy. **AUD-081/082/083** remain OPEN. Public GETs of kfc.az, pizzahut.az and jobsearch.az/vacancies hit proxy tunnel 403 (`/tmp/inop-hr-external-public-research.json`); capabilities are unverified and must not be invented. |
| 13 | **P13-001–028 OPEN**: every-finding disposition; full source→private storage→extraction/OCR→HR review→Candidate/Application→score/board/interview/decision/analytics E2E; three brands/multiple branches/same Candidate different vacancies; PDF/DOCX/scans and AZ/EN/RU; mixed scopes/duplicates/retry/outage/stale requests/concurrency/large datasets/compatibility/security/privacy/retention; separate synthetic versus external evidence; final SHAs/tests/benchmarks/API/model/UI/setup/risks/ready-versus-blocked report. **AUD-009/010/061/068/090** invariants require final evidence; existing narrow regressions do not silently close this final matrix. |

All original finding rows and acceptance criteria remain intact. New AUD-113–118 and P10-032–054 are preserved alongside the original backlog. Status changes require actual test evidence; BLOCKED_EXTERNAL is not DONE.

### External blockers and release conditions

- **P10-018/019 + AUD-050**: approved private object storage/bucket ownership/conditional write policy, actual durability/recovery and backup evidence. Native Render legacy uploads remain ephemeral; synthetic storage does not resolve real persistence.
- **AUD-048**: actual malware scanner/quarantine policy and integration; current trusted synthetic scan gate is preparation only, not antivirus certification. No new real external CV ingestion is enabled.
- **AUD-051/030**: legal retention/deletion policy and pending user choice; original bytes are retained by preparation, not automatically removed.
- **P09-023**: real AI provider access and approved professional-fact processing/privacy/budget configuration. No secrets in chat/repo/logs. Test-only transport is visibly MOCK TEST; real provider E2E is not PASS.
- **EXT-OCR-001**: hosted Native OCR executable/pinned language models/resource limits. Actual local Tesseract 5.5.0 AZ/EN/RU tests are distinct from Render provisioning; optional OCR stays off by default.
- **EXT-SMTP-001**: approved SMTP/company receipt/bounce evidence. Local outbox/retry tests do not prove delivery.
- **P11-020**: approved GFC tenant/mailbox/least-privilege application consent and secure credentials; real Graph unavailable. Official Microsoft Graph documentation URLs also hit proxy tunnel 403 (`/tmp/inop-hr-graph-public-research.json`); do not represent unverified website content as reviewed.
- **P12-020 / BLOCKED_EXTERNAL_ACCESS**: company/partner administrator or approved first-party API/webhook/email/export access; three websites' real forms/channels/capabilities remain unconfirmed. No unauthorized personal CV collection.
- **Release stays NO-GO for real CV intake/hosted production readiness** until required durability/recovery/scan/privacy/current authorization and real integration gates are evidenced. No resource, env/secret, DDL/migration, hosting, production DB, push or deploy operation is authorized by this checkpoint.

After final validation/commits, stop as requested. The next session resumes from the exact incomplete item above, not from Package 01 and not by repeating completed OCR/AI/approval packages.

| ID | Scope | Finding | Status | Evidence |
|---|---|---|---|---|
| ENV-HR-001 | Local test environment | `/tmp` filesystem exhausted; browser resources fail during full regression | OPEN | `df` reports 100% / ~9 MB free; interrupted run records resource errors. Alternate owned scratch root is prepared with pinned OCR fixtures; no user cache/log/file is removed. Full final run outcome recorded below; original `/tmp` capacity remains unresolved. |

Checkpoint integrity check: all **435** prior stable AUD/P acceptance IDs remain present; the only additions against 10C12 are **AUD-118, P10-053, P10-054** (438 current AUD/P IDs). All original 83 audit findings and all 13 package catalogs are present. Eight implementation/test/contract paths are SHA-256-bound in `/workspace/inop-hr10c13-checkpoint-source-binding.json`; tracker is deliberately excluded while final notes are updated. `git diff --check` and release-baseline ancestry PASS; no unrelated staged or untracked repository path exists at preparation.

### Final checkpoint validation — PASS

`/workspace/inop-hr10c13-checkpoint-regression-final.log`: **1943/1943**, **0 failures / 0 cancellations / 0 skips / 0 todo**, exit **0**, duration **357341.772743 ms**. Includes all previous suites and 12 new document error/auth tests. Source SHA-256 binding matches the eight frozen implementation/test/contract files. `/tmp/inop-hr10c13-target-first.log` **45/45**; `/tmp/inop-packagehr10c13-validation.json` TypeScript/build PASS, lint **0 errors / 9 warnings**, smoke **13/13**, authorization **632/632**. Current implementation is validated; interrupted runs are not PASS. New test root successfully avoids the resource failure in this serial run; `/tmp` itself remains full, ENV-HR-001 OPEN, and AUD-090 concurrent test investigation remains OPEN.

**10C13 / AUD-118 / P10-053 / P10-054 are locally TESTED**. All nine package paths are reviewed; `git diff --check` PASS. No backend/auth policy/source original/DB/env/secret/config changes. This checkpoint adds no new source-draft/ingestion or Graph/external implementation. P10 original retention/migration/source draft/ingestion/privacy and P11–13 remain incomplete exactly as listed above. No real-provider, hosted OCR, malware, recovery or release readiness is inferred from local/synthetic tests. Next continuation after the checkpoint is **P10-003/006 → P10-012 / AUD-067/073**, with deletion policy pending separately. Local implementation commit and final documentation commit follow; their actual SHA/report are recorded after creation. Stop after the checkpoint as requested; no push/deploy.

### Checkpoint commit ledger and stop state

| Package | Local commit | Files | Final evidence |
|---|---|---|---|
| 10C13 | `0b8531500ad99c26896007a3429077ec3b0eb057` | Nine explicit reviewed paths (Candidate editor/service/error helper, AZ/EN/RU, actual UI test, contract doc, tracker) | Targets 45/45; full frozen-source 1943/1943; TypeScript/build PASS; lint 0/9; smoke 13/13; authorization 632/632; source fingerprints/staged diff check PASS |

After this implementation commit `git status --short` is empty on `work`; previous `42c1a4a65e1a5bfd2dcc7df1fa49c887a76ee0f1` and all ancestors are preserved. This final documentation-only checkpoint commit records the actual implementation SHA and stop state; its own SHA is obtained with `git rev-parse HEAD` and reported to the user (not embedded recursively). No additional source change or redundant regression is required for these ledger notes; the same eight source/test/contract fingerprints still match the tested implementation.

**Stop requested and honored after checkpoint.** No next package, external access/provider operation, production DB/migration/secret/hosting change, push or deployment is started. Owned final regression runner completed with exit 0. Existing logs/caches/models, ignored/local files and `.env` are retained. On resume read this checkpoint, verify `work`/clean status/current HEAD, then continue **P10-003/006** source draft/retention/migration preparation and **P10-012 / AUD-067/073** ingestion/orphan/double-upload work. Preserve pending **AUD-030/051** user decision and all OPEN/BLOCKED_EXTERNAL requirements listed above; complete independent work before P11/P12/P13, without replaying already TESTED packages.

## Active continuation 2026-10-11 — 10D1 creation recovery

User resumed from `d65d5e312cf8764402e9da6081d0d775231ffaf3` and authorized continuous independent implementation/local commits; the earlier checkpoint stop applies only to that completed turn. Branch work/clean HEAD matched before edits; all prior commits preserved. Continue without per-package approval, no push/deploy. Setup workflow reuses the existing Node/Mongo/Chromium/OCR environment; no configuration, secret or infrastructure is changed.

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-055 | Preserve possibly committed Candidate/Application/original after lost acknowledgement; no destructive compensation or false success | TESTED | `hrCvCreateRecovery`: actual lost-ack/child-failure/plain-create baseline fails; patched combined backend targets 127/127; full gates pending |
| P10-056 | Current independent authorization after async IO and scoped recovery IDs; translated UI blocks unsafe duplicate POST | TESTED | Current grant revocation/five-scope/create-only tests and actual `hrCvCreateRecoveryUI`; UI combined 37/37; full gates pending |

Baseline `/workspace/inop-hr10d1-baseline.log`: 5 passed / 9 failed including parent. Committed DB rows lose source or are deleted, stale upload grants still create data. `/workspace/inop-hr10d1-ui-baseline.log` reproduces missing recovery boundary. Patched `/workspace/inop-hr10d1-target.log` 127/127; `/workspace/inop-hr10d1-ui-target.log` 37/37. `HR_CV_CREATE_RECOVERY.md` documents backward-compatible error additions and remaining exactly-once/storage/privacy limitations. AUD-067 is IN_PROGRESS, not fully closed until durable source commands/ingestion remove retry/orphan gaps; AUD-073 still OPEN. No Candidate DELETE policy applied.

New gate artifacts live under `/workspace/inop-hr-gates`, preserving the full /tmp and old artifacts. Temporary preload removes only unique browser scratch caches created by the current process; it never cleans preexisting caches/user files. No test assertions or provider integrity are weakened. Full frozen-source regression underway; final count/commit follows. Real storage/AV/privacy/AI/SMTP/Graph/website gates remain unverified; independent work proceeds after commit.

Final 10D1 gates: full frozen-source `/workspace/inop-hr10d1-regression.log` **1961/1961**, zero failures/skips/cancellations. Backend targets **127/127**, UI targets **37/37**, `/workspace/inop-hr-gates/inop-packagehr10d1-validation.json` TypeScript/build PASS, lint **0/9**, smoke **13/13**, authorization **632/632**. `git diff --check` PASS. 13 explicit package paths only; local SHA recorded next update. Continue remaining P10 ingestion/source preparation, then P11/P12/P13.

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-119 | 10D1 | Create can continue with revoked request-time grants after asynchronous upload/parsing, including child Application writes | TESTED | Actual owned upload/Role-race baseline creates instead of 403; `hrCvCreateRecovery` now refuses before write or child, retains original, and redacts recovery IDs; full 1961/1961 |

10D1 commit: `d4ade8350317fda2ef2e5603f098a72d86d02e44`, 13 files; 1961 full, 127 backend / 37 UI targets; TypeScript/build PASS, lint 0/9, smoke 13/13, authorization 632/632; clean tree, no push.

## 10D2 — disabled immutable source-command / bounded ingestion foundation

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-057 | Server-owned immutable original/source command, independent scopes, explicit DDL and uncertain-ack replay | TESTED | `hrCvIntake`: actual owned Mongo/JWT + synthetic store/scan, 24 local checks; combined final targets 87/87 |
| P10-058 | Clean-scan gate then bounded actual rules parsing, private pending HR review and no Candidate/Application auto-write | TESTED | Five scopes, infected/unknown scan, no raw text/keys, zero/unknown and current-role races; 87/87 combined targets |
| P10-059 | Immutable byte/metadata snapshot, quotas/timeout/ignored cancellation, bounded retries and stale/exhausted lease recovery | TESTED | `hrCvIntake` late worker and producer mutation, two occupied slots, 3 attempts and capacity without source deletion; 87/87 combined targets |
| P10-060 | Current private original scan/scope/hash guards and withheld obsolete task facts with original compatibility | TESTED | Actual private reader, foreign/unclean/revoked/old-version negatives; 87/87 combined targets |

`HR_CV_INTAKE_FOUNDATION.md` records model/index/compatibility and external gates. Initial target 15/15, expanded snapshot baseline initially had a patch-harness indentation assertion before adding cases (not product proof); corrected baseline reproduces metadata/provider-buffer mutation. Corrected final `/workspace/inop-hr10d2-target-final4.log` **87/87**, zero failures/skips/cancellations, includes 24 intake checks plus inherited source recovery, processing and private storage boundaries. `/workspace/inop-hr-gates/inop-packagehr10d2-validation.json`: TypeScript/build PASS, lint 0/9, smoke 13/13, authorization 632/632. Frontend and mounted backend code are unchanged by 10D2; last full 1961 belongs to 10D1, not falsely claimed as a 1985 full run. New core is deliberately unwired/default-disabled; no redundant full browser cycle is necessary for the three isolated new backend files. `git diff --check` PASS; five package paths only.

P10-003/006/012/013/014/015 remain IN_PROGRESS in wider source/HTTP/UI/attachment/reconciliation/real-provider scope. Actual ingestion API/one-upload UI/source attachment is next; AUD-067/073 are retained. Real storage/scan/recovery/retention activation is not certified by synthetic dependencies; no production DDL/DB/env/secret/hosting/resource/push/deploy. Continue independently after local commit without per-package approval.

10D2 commit: `ae10bb791375e5279af3731901c748cc0b449db0`, five explicit paths, targets 87/87; TypeScript/build PASS, lint 0/9, smoke13, authorization632; clean tree/no push.

## 10D3 — explicit private source approval and authenticated API

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-061 | Explicit editable HR facts, immutable source provenance and reserved Candidate/Application identities; no duplicate or destructive compensation after lost ack | TESTED | Actual owned Mongo/HTTP/DOCX approval tests; final target 93/93, full gate underway |
| P10-062 | Independent current parent scopes, create-only child redaction, reassignment/quarantine/download and concurrent replay compatibility | TESTED | Five scopes, mixed negatives and actual private download; source receipt hidden and legacy fingerprints preserved |
| P10-063 | Default-disabled authenticated source enqueue/read/original/approve routes without startup DDL, automatic provider activation or legacy API replacement | TESTED | HTTP 401/403/default503/scoped404/confirmation400/source202/approval200, final target93; full pending |

Initial 73 targets pass. Expanded test reproduces reassignment misclassified as 503 after parent write; corrected lookup distinguishes an unreadable existing parent as404 and never creates a child. Application create-only is preserved with independent read redaction (not an invented read prerequisite). Final `/workspace/inop-hr10d3-target3.log` **93/93**, `/workspace/inop-hr-gates/inop-packagehr10d3-validation.json` TypeScript/build PASS, lint0/9, smoke13, authorization632. Full frozen-source `/workspace/inop-hr10d3-regression.log` is running; result/commit follows, no full PASS claimed yet.

`HR_CV_INTAKE_APPROVAL.md` documents additive model/API and activation gates. Original privacy/retention/provider blockers remain. AUD-067 retains legacy unknown-request limitations and AUD-073 waits for gated one-upload UI. Candidate deletion policy is unchanged. No production DB/index/provider/env/secret/hosting/push/deploy changes. Next independent work: gated source UI, then P11/P12 local adapters and P13 final matrix.

### 10D3 additional security/recovery reproductions

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-120 | 10D3 | Linked source ownership could retain CV/fact access after Candidate assignment loss | TESTED | `/workspace/inop-hr10d3-linked-baseline.log` actual owned Source/Candidate scope negative fails; shared linked parent guard added to reads/original/approval, final gates pending |
| AUD-121 | 10D3 | Completed source replay could resurrect a subsequently deleted Application | TESTED | `/workspace/inop-hr10d3-resume-baseline.log` actual DELETE then replay reproduces; completed receipt now refuses missing child without recreating/deleting parent |
| AUD-122 | 10D3 | Browser restart cannot recover approved draft; semantic JSON key order produces false 409 | TESTED | Real child outage/store/restart baseline; hidden approved payload + explicit reconcile and canonical hash tested by 45 intake checks; broad current gates pending |
| P10-064 | 10D3 | Persist exact explicit approval command and recover after browser restart; never resurrect completed deleted records | TESTED | Source GET scoped approved facts/state, private notes withheld, explicit reconcile; test 45/45 |

The first frozen full `/workspace/inop-hr10d3-regression.log` passed **2003/2003** before these extra uncovered negatives. It is not claimed as final-source full proof. A subsequent backend run `/workspace/inop-hr10d3-backend-final.log` passed **1649/1649** before the recovery additions. `/workspace/inop-hr10d3-backend-final2.log` was deliberately interrupted (exit130), NOT PASS, when a targeted failure was noticed; no source was committed. Lost-recovery hash order and concurrent receipt-only timestamp conflict were corrected without weakening parent/source/scan guards. Current focused `/workspace/inop-hr10d3-intake-final.log` **45/45**, zero fail/cancel/skip. Final frozen all-backend run is `/workspace/inop-hr10d3-backend-final3.log`; current validation is `hr10d3current`, result appended before commit. Frontend source/tests remain identical to the successful full2003 snapshot.

Final 10D3 evidence: `/workspace/inop-hr10d3-backend-final3.log` **1651/1651**, zero failures/cancellations/skips, exit0; includes 21 new approval/HTTP/recovery/linked-parent checks. Focused intake45/45. `/workspace/inop-hr-gates/inop-packagehr10d3current-validation.json` TypeScript/build PASS, lint0/9, smoke13, authorization632. Earlier full2003 includes the unchanged 355 frontend checks; it precedes the additional backend edge corrections, which are covered by the complete current backend1651. Counts are not misrepresented as one full2006 run. `git diff --check` PASS. Local commit follows; UI still legacy, therefore AUD-073 remains OPEN until 10D4. Continue independently.

10D3 commit: `d987f3f2fd4bd3ae38f0163f40f047f1e8420526`, 20 reviewed paths, complete current backend1651, focused45, TS/build PASS lint0/9 smoke13 authorization632; clean work/no push. The earlier complete2003 snapshot is distinguished from current backend evidence above.

## 10D4 — opt-in one-upload source / explicit HR review UI

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-065 | Single source upload, editable zero/unknown facts, explicit unchecked HR confirmation and JSON source-only approval | TESTED | Actual HTTP/Mongo/JWT/DOCX browser fixture, no Candidate/create or parse-CV multipart; current targets57/57; full frontend gate underway |
| P10-066 | Same-command uncertain upload/approval recovery, frozen corrections, browser restart and completed existing-record link | TESTED | Actual child outage/restart source receipt, response-loss recovery, same UUID/source/object PUT; 57 targets |
| P10-067 | AZ/EN/RU zero language requests, private SHA/Bearer/objectURL lifecycle and primary error/current permission fail-closed | TESTED | Browser 401/403/404/500, permission loss, original download and objectURL revoke; strict DTO/approved metadata guards |

`HR_CV_INTAKE_UI.md` explains default-off `VITE_HR_DURABLE_INTAKE_ENABLED`, Source API server remains disabled, no real storage/AV/worker/retention activation. Normal source path is one upload; a lost HTTP acknowledgement may resend bytes for the SAME command but never a second source/PUT. Default legacy double-upload remains explicitly IN_PROGRESS AUD-073. P10 wider monitoring/ingestion/real provider/deletion gates remain tracked.

First UI harness failed JavaScript parse (fixture missing object closure), not product PASS; corrected without changing assertions. First build found optional parsed phone type, corrected string fallback. Combined `/workspace/inop-hr10d4-ui-fourth.log` **57/57**, zero failures/cancel/skip. Full frozen current frontend is `/workspace/inop-hr10d4-frontend-full.log`, current build/typecheck/lint/smoke/auth gate `hr10d4current`; results appended before commit. Backend remains exactly 10D3 committed source (all1651 pass). Read helper now accepts an optional suppressErrorToast flag and includes it in pending-read keys; existing callers retain default behavior, auth fingerprint and no settled cache. No backend/schema/DDL/provider/env/secret/deploy changes.

Final 10D4: `/workspace/inop-hr10d4-frontend-full.log` **366/366**, zero failures/cancellations/skips, exit0; includes11 new Source UI checks. Targets57/57; `/workspace/inop-hr-gates/inop-packagehr10d4current-validation.json` TS/build PASS lint0/9 smoke13 authorization632. Unchanged backend source has complete1651/1651 evidence from 10D3. These are separate complete backend/frontend runs, not a fabricated single2017 run. `git diff --check` PASS, nine explicit frontend/test/docs/tracker paths. Default flag is off and real-provider gates remain blocked. Candidate deletion choice has been requested asynchronously (409 dependent reject versus archive/restore); no answer is inferred and unrelated work continues. Next: remaining independent source monitoring/OCR/security preparation, then P11 Graph/P12 approved external adapter mocks/setup and P13 disposition/E2E. No package stop or production operation.

10D4 local commit: `38da456760144bdd2a5aab5b734e3be073a330f4`, nine explicit paths; frontend366/366/targets57, unchanged backend1651; all gatesPASS, clean work/no push.

## 10D5 — scoped private review queue / metadata monitoring

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-068 | Bounded Source list and counters independently respect linked Candidate current scope; private fields projected out before joins | TESTED | Final owned Mongo mixed scope/race/HTTP/receipt targets58/58 |
| P10-069 | Opt-in review queue, resume metadata, debounce/page/current auth/error/language behavior; feature off honestly unavailable | TESTED | `/workspace/inop-hr10d5-ui-final.log`22/22; no raw private facts/POSTs, TS/build gatesPASS |
| P10-070 | 0/5k/50k source metadata measurement, explicit paging indexes and no per-row network query | TESTED | `HR_CV_INTAKE_QUEUE.md`; optimized 50k203–219ms/13,700B/30items versus first timeout; actual local synthetic evidence only |

Initial backend57/57; frontend build found pagination prop/metadata TS errors and corrected. Initial UI20/22 includes parent failure because malformed DTO maps to generic `error`, not HTTP500; corrected classification assertion retains no-private-fact guard; final22/22. `hr10d5final` TS/build PASS lint0/9 smoke13 authorization632. New Source-only query optimization followed measured prototype timeout; original before measurements retained in log and contract. Final Source backend target/commit appended once complete. No permission/retention/provider/production policy invented; new unique/quota/paging indexes require explicit local/approved production preparation, never startup DDL.

P10 wider original legacy migration/retention/actual scanner/storage/worker activation remain IN_PROGRESS/BLOCKED_EXTERNAL. Review queue is a tested opt-in local path, not real durability/monitoring-provider certification. Pending Candidate DELETE decision untouched. Continue independent Graph adapter prep, approved source interfaces/security and final evidence without package-stop/push/deploy.

Final10D5 `/workspace/inop-hr10d5-backend-current.log`58/58, zero failures/skips/cancellations; UI22/22; optimized source benchmark all nine runs return bounded metadata; TS/build PASS lint0/9 smoke13 authorization632. `git diff --check` PASS; 15 explicit package files reviewed. Full inherited backend/frontend runs from10D3/D4 are preserved and not mislabeled as a new full cycle; P13 current full matrix remains pending. No real provider activation. Local SHA recorded in next increment.

10D5 commit `c1e63c6078df109e87034360dc5abef043664d5b`,15paths, backend58/UI22, TS/build PASS lint0/9 smoke13 authorization632; clean tree. No push/deploy.

## 11A — approved default-disabled Graph transport / setup

Proceeding on independent P11 transport preparation while actual storage/scan/Graph/admin access remain blocked and Candidate retention decision remains pending. No missing P10 criteria are silently deleted or closed.

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P11-021 | Fixed approved tenant/mailbox server-only transport, private bounded metadata/attachment DTO and immutable source identity | TESTED | Repository28/28, default disabled; synthetic transport only |
| P11-022 | Bounded retries/timeouts/stream cleanup/current caller abort/shared capacity/token lifecycle | TESTED | Repository28/28, real consent/token/cursor provider E2E not PASS |

`HR_OUTLOOK_ADAPTER.md` covers chosen application+delta polling, no webhook/subscription, least-privilege company consent/mailbox restrictions and setup. Planned variable names are documentation only; no binding/env/secret/provider/resource is changed. Source sink/persistent delta health/vacancy review integration remains11B; original P11-001..019 retained until their actual local tests/required external metadata is present. P11-020 staysBLOCKED_EXTERNAL.

Final11A `/workspace/inop-hr11a-repo-target.log`28/28 (0 fail/skip/cancel), validationhr11a TS/build PASS lint0/9 smoke13 authorization632. Four explicit paths only, diff-checkPASS; no mounted routes/model/DB/source UI changes. Local SHA next increment. Source sink/health/matching unfinished original IDs preserved.

11A commit `204167a4236a3c7eca82018883955f7d37f7ac82`,4paths; transport28/28, TS/build PASS lint0/9 smoke13 authorization632; cleanwork/no push.

## 11B — persistent mailbox checkpoint / immutable Source provenance

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P11-023 | Owned Mongo checkpoint/receipt and Source sink before cursor advance; lost-ack replay no duplicate PUT/person writes | TESTED | Local Mongo/actual Source/parser, synthetic Graph/store/scan, targets98/fullbackend1704 |
| P11-024 | Exact approved reference/recipient mapping with independent current Job scope; ambiguity/private source review and source enum propagation | TESTED | Current scope/unknown/ambiguous/closed/foreign mappings, explicit HR Application source persistence;98targets/1704backend |
| P11-025 | Current actor/JWT/department/role, bounded lease/retry and sanitized health; no startup DDL or deleted-mail cascade | TESTED | Targets98/fullbackend1704, actual lost-ack/restart/lease/currentRole; no live provider |

`HR_OUTLOOK_SYNC.md` documents additive explicit MongoDDL, server-only Source origin/command bridge and disabled sync. Initial fixture failures exposed direct DTO Date versus HTTP ISO input and intentional Source quotas; fixture now serializes the same ISO as real HTTP, runs actual bounded Source worker between batches rather than weakening capacity assertions. No success/complete count inferred from failed run. Fresh combined targets/current gates appended before commit. Original P11-001/003/005/008/009/012/013/014 unfinished until backend/UI/provider requirements evidenced. Actual approval policy unchanged; retention choice pending, independent work continues.

Final11B `/workspace/inop-hr11b-final.log`98/98 (0 fail/skip/cancel), complete frozen-source backend `/workspace/inop-hr11b-backend-full.log`1704/1704 exit0, frontend Source targets22/22. `hr11b` TS/build PASS lint0/9 smoke13 authorization632; diff-checkPASS. Initial second failure: server-only origin validation threw synchronously; approved enqueue now consistently async/rejects, assertion preserved. All old Source/role/JWT/audit/private-upload tasks included in full backend. Ten explicit paths, no mounted Graph endpoint/worker, no productionDDL/provider binding; SHA next increment. Continue source hints/person-level review/security then approved website adapter prep/P13 without dropping P10 blockers.

11B commit `bbfcbad9f0b9c0cbdae711d5dab70af353e69882`,ten reviewedpaths; full frozenbackend1704/1704, targets98/SourceUI22; TS/build PASS lint0/9 smoke13 authorization632; cleanwork/no push.

## 11C — explicit Job suggestion / scoped human duplicate review

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P11-026 | Scoped current source origin/Job hint with no provider identity/PII and no guessed binding | TESTED | Backend82/82, Job IO reassignment negative + source/current role/HTTP; private additive detail DTO |
| P11-027 | Up to five current-scope SHA/email/phone review candidates, no foreign counts/facts, no auto merge/reject | TESTED | Actual owned Mongo five scopes, late Candidate reassignment, bounded no-global-count;82targets |
| P11-028 | Explicit suggestion click then HR confirmation, AZ/EN/RU source/duplicate notices and primary/auxiliary failure separation | TESTED | Browser30/30 with actual HTTP/DB/source/approval; no autoApplication/zero language refetch |

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-123 | 13 | Explicit Source approval with corrected fields stores corrected status but ATS-v1 requires confirmed; trusted score remains pending | TESTED | 13A actual Source/HR approval/Candidate/Application/HTTP score regression; explicit confirmation only, correction evidence retained, no legacy migration. |

`HR_CV_SOURCE_REVIEW.md` documents opaque source hints, independently scoped Job IDs, explicit linking and possible-duplicate review (not person dedup certainty/automatic merge). First fixture was invalid Job missing required description; corrected fixture, no model change. `/workspace/inop-hr11c-backend-second.log`82/82; `/workspace/inop-hr11c-ui-first.log`30/30; validationhr11c TS/build PASS lint0/9 smoke13 authorization632. Existing Source/private current-role tests preserved. Full backend1704 belongs11B and is not mislabeled current full; current finalP13 complete run still pending. All newly observed issue IDs are retained; no secret/production/DDL/provider/push/deploy.

11C commit `263501b84c9d33f236dafc16b1da9842344286fc`,13paths; backend82/UI30, TS/build PASS lint0/9 smoke13 authorization632; cleanwork/no push.

## 11D — approved server-only actor / bounded native worker preparation

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P11-029 | Tokenless private server context for an approved existing actor, current DB grants/department/inactivity on every boundary; public JWT contract unchanged | TESTED | Final targets141/141, complete current backend1725/1725 and authorization632 |
| P11-030 | Default-off native worker, serialized per-mailbox bounded polling, independent Source parse on Graph outage and sanitized health/graceful stop | TESTED | Actual local current User/Role/Source plus injected worker adapters;141target/fullbackend1725; no live activation |

`HR_BACKGROUND_IDENTITY.md` explains internal WeakMap-only identity, approved fixed actor, no persisted employee JWT/no remote-forged context, existing permission policies/current scope preserved. Current source/Job hint and duplicate review are retained. First141/141 targets; metadata result now reports running=false after tick finally cleanup, final tests/complete backend pending. Authority helper addition affects no public verifyToken/role schema or grants; full current backend required because shared HR helper changed. No production auth policy/hosting/provider/env/secret change or worker start. New code is preparation, actual approved actor/bindings/real external integrations remain blocked.

Final11D `/workspace/inop-hr11d-target-final.log`141/141, complete frozen current backend `/workspace/inop-hr11d-backend-full.log`1725/1725 exit0, 0fail/skip/cancel; validationhr11d TS/build PASS lint0/9 smoke13 authorization632; diff-checkPASS. Six explicit paths only. All previous Source/role/JWT/user-privilege/audit/upload suites pass with the private context branch; public verifyToken unchanged. No worker starts and no approval of production actor/tenant is implied. SHA follows next increment.

11D commit `a57b2d7bb8de539cf0659c43fe0e08c51b92dd86`,six reviewedpaths; complete current backend1725/1725, targets141; TS/build PASS lint0/9 smoke13 authorization632, clean work/no push.

## 12A — approved signed career relay / external capability gates

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P12-021 | Default-off signed registry/raw-body interface with current approved server actor, fresh signature and exact immutable command/body identity | TESTED | Final targets51/fullbackend1743; actual private HTTP/Source/Mongo, synthetic relay/store/scan only |
| P12-022 | Public disabled-before-parser route, bounded raw/processing/IP/source budgets, safe files/hash-bound clean scan before object write | TESTED | Final targets51/fullbackend1743; actual private HTTP/Source/Mongo, synthetic relay/store/scan only |
| P12-023 | Source/consent/provenance/durable receipt, independent Job mapping/HR ambiguity review; no automatic people/decisions/PII reply | TESTED | Final targets51/fullbackend1743; actual private HTTP/Source/Mongo, synthetic relay/store/scan only |

Public read-only website attempts are retained as proxy403, capability UNKNOWN not fake API. `HR_EXTERNAL_SOURCE_CAPABILITIES.md` details per-site access and approved mailbox/signed relay/export alternatives, unknown actual Google Forms/email destinations, no private scraping and privacy/runtime/DDL/scan/durability requirements. The user will obtain administrator access later; preparation continues independently. Real first-party channels/provider/admin/privacy/runtime remainBLOCKED_EXTERNAL. New endpoint is additive and default-disabled before parsing; all other HR paths still globalJWT. No secrets in browser/env/repo, no activated real intake/provider/production operation.

Final12A `/workspace/inop-hr12a-target-final.log`51/51, complete frozen current backend `/workspace/inop-hr12a-backend-full.log`1743/1743 exit0,0fail/skip/cancel; validationhr12afinal TS/build PASS lint0/9 smoke13 authorization632. Source immutability/processing slots/reference scalar checks and source-wide budget were tightened before final tests; all assertions preserved. Ten explicit paths only; default profile no source registry/actor/store/AV/credential activation. API addition remains unavailable before accepted octet-stream parsing; global JSON parser still its original100KiB limit. No provider/website/hosting/DDL/production/push/deploy change. Actual vendor schemas/tenant consent/AV runtime/durability/lawful retention remain external/pending; continue native scan preparation/final invariants/matrix, not fake DONE.

12A commit `2edc863b31dd7491e2886dc5042ce28967fb877a`, ten paths; targeted51/fullbackend1743, all gatesPASS. No push/deploy.

## 13A — explicit corrected Source facts and contextual score

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P13-029 | Actual Source explicit corrected approval preserves evidence and exposes legitimate100/real0; draft/legacy/unknown remains untrusted | TESTED | `/workspace/inop-hr13a-score-target.log`78/78; UI28/28; baseline failed corrected approval score before patch |

`HR_SOURCE_SCORE_CONFIRMATION.md` distinguishes correction from explicit approval. Only Source approval's already mandatory explicit confirmed act becomes confirmed review status; no weakening of existing legacy review, current scopes or automatic migration. Targets78/78, UI `/workspace/inop-hr13a-ui.log`28/28, zero failures/skips/cancellations. Validationhr13a TS/build PASS lint0/9 smoke13 authorization632; diff-checkPASS. Current full P13 run remains pending and earlier full1743 belongs12A. Separate protected plural/unknown-field scoring reproduction is next; no problem is silently ignored, external gates and deletion policy question remain pending. No production/provider/env/DDL/push/deploy.

13A commit `209c925` (full SHA in Git ledger), five paths, targets78/UI28/all gatesPASS.

## 13B — versioned protected-criterion and unknown-fact guards

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-124 | 13 | Obvious protected plural/synonym criteria bypass Job/matching/AI guards | TESTED | Actual HTTP women/qadınlar/женщины create/update baseline400 assertion failed; shared AZ/EN/RU guard, purpose32/32 + matching/AI/analytics/ranking137/137 |
| AUD-125 | 13 | Global confirmed status treats omitted/unreviewed facts as real0 | TESTED | Baseline direct confirmed unknown skills/education/certificates failed; actual partial Source approval and per-field reviewed presence tests pass |

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P13-030 | Protected metadata excluded, explicit protected plural criteria denied and no automated hiring decision | TESTED | hrMatchingFairness + existing matching/lifecycle; no universal semantic fairness claim |
| P13-031 | ats-v2 hides stored v1 percentages as legacy, explicit recalculation/current parent checks retained | TESTED | applicationScoreState, hrRanking/hrAnalytics, frontend Matching/analytics22/22; no bulk migration |

`HR_ATS_V2_COMPATIBILITY.md` documents required version change and per-field known semantics. `/workspace/inop-hr13b-target.log`137/137; after added actual partial Source regression `/workspace/inop-hr13b-final-added.log`32/32; UI22/22,0fail/skip/cancel. Validationhr13b TS/build PASS lint0/9 smoke13 authorization632. Candidate partial confirmation no longer invents zero. Legacy v1 remains stored, status-aware clients hide until authorized explicit recalc. Native scanner files are a separate next increment and are not staged into13B. Current final complete matrix remains pending; no real provider/production/env/DDL/push/deploy.

13B commit `ee4b4f8` (full SHA in ledger), eight paths; targets137/additional32/UI22/all gatesPASS.

## 13C — native scanner preparation, full backend trust regression

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-071 | Default-off Native Node clamscan adapter: fresh signatures, stdin-only private bytes, stripped environment and strict verdict/hash | TESTED | hrClamScan14/14 includes synthetic executable environment proof; actual scanner NOT PASS |
| P10-072 | Scanner deadline/abort/output bounds and retained noncooperative capacity fail closed | TESTED | hrClamScan14/14, no new install/resource/activation |
| EXT-AV-001 | Real deployed ClamAV/signature/EICAR/quarantine/recovery evidence | BLOCKED_EXTERNAL | clamscan/clamdscan unavailable; approved runtime preparation + real harmless fixture test required |

`HR_NATIVE_MALWARE_SCANNER.md` has activation/outage/recovery checklist. `/workspace/inop-hr13c-av-final.log`14/14; complete frozen backend `/workspace/inop-hr13c-backend-full.log`1789/1789,0fail/skip/cancel; validationhr13c TS/build PASS lint0/9 smoke13 authorization632. Source OCR test was added after full-run file list capture and is explicitly NOT included in1789; initial synthetic store missing-error fixture corrected and new baseline retained separately. Parallel Source/lifecycle/intake frontend `/workspace/inop-hr13-source-concurrent.log`55/55 passes, but does NOT establish AUD-090 root cause; retained OPEN. No real scanner/storage/provider/production/env/DDL/push/deploy. Four explicit scanner/docs/tracker paths; OCR files belong next separate increment.

13C commit `ff450ae` (full SHA in ledger), four paths; fullbackend1789/scanner14/all gatesPASS.

## 13D — private Source real local OCR / strict frontend compatibility

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-126 | 10/13 | Clean scanned private Sources cannot reach explicit approval even when existing local OCR engine is ready | TESTED | Corrected synthetic store baseline yields blocked versus requiredready; optional existing real Tesseract bridge, no default activation |

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-073 | Private clean scanned Source → actual bounded OCR → pending evidence → explicit corrected HR confirmation | TESTED | hrCvSourceOcr5/5, English actual image-only PDF/Tesseract, exact bytes retained; actual scanner/store separately external |
| P13-032 | Source OCR frontend strict version/provider/null confidence and AZ/EN/RU zero language refetch | TESTED | Source OCR/intake UI15/15 + existing Candidate OCR UI4/4 |

`HR_PRIVATE_SOURCE_OCR.md` documents optional existing native engine; no new resource/env/boot/activation. Original backend78/78, current shared parser24/24 and extra late-role5/5. Initial UI normalized-phone assertion incorrectly expected raw editable phone to equal normalized storage value; corrected to validate actual digits (keeps final stored normalized assertion), final15/15. Existing Candidate OCR UI4/4. Validationhr13d TS/build PASS lint0/9 smoke13 authorization632; diff-checkPASS. Broader E2E eight checks pass after fixture delta added required evidenceMode; belongs next separate package, not this commit. Original scanner/storage/recovery gates remain BLOCKED_EXTERNAL, retention choice pending and AUD-090 still OPEN despite current parallel55 pass. No production/push/deploy.

13D commit `7f4f5068028482fc2c4601ebd133a6a46f50ca18`, seven paths; actual local OCR78/current24/late-role5, frontend Source15 + Candidate OCR4, all gatesPASS.

## 13E — localized mutation lifecycle and safe diagnostics

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-127 | 02/13 | Job submit401/403/404 leaves an editable form despite lost server authority | TESTED | Archived browser baseline missing fail-closed states; current JobForm primary access state/no submit controls |
| AUD-128 | 02/13 | HR raw server/axios errors appear in CRUD toasts/DOM/JobForm console | TESTED | Archived pre-patch 9failed/10; current no raw diagnostic/toast/log, status localization keeps drafts |

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P13-033 | HR Job/Candidate/Application CRUD/action validation/status states localized AZ/EN/RU and stable keys retranslate without refetch | TESTED | hrCrudErrorsUI + existing lifecycle/contracts/document tests,73initial/51final |

`HR_CRUD_ERROR_PRESENTATION.md` explains HR-only toast suppression, sanitized presentation and unchanged backendAPI. `/workspace/inop-hr13e-crud-baseline.log`1pass/9fail reproduces actual old code, not PASS. Initial target73/73; after storing error keys across lists/linking/workflow `/workspace/inop-hr13e-ui-current.log`51/51,0fail/skip/cancel. Current validationhr13ecurrent TS/build PASS lint0/9 smoke13 authorization632; diff-checkPASS. Shared axios behavior is limited to HR relative paths, previous nonHR default unchanged; final complete frontend matrix pending. No production/provider/DDL/push/deploy. Retention and real storage/scanner gates remain separate; Source parallel55 pass does not close AUD-090.

13E commit `8ec6ae1` (full SHA in ledger),16paths; final51/unchangedextra22 UI, all gatesPASS.

## 13F — joined recruitment E2E / owned local DB release rehearsal

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P13-034 | Joined immutable approved mock Graph → actual Source/parser/HR/Candidate/Application/ATSv2/board/interview/explicitdecision/scoped analytics | TESTED | hrRecruitmentE2E8/8; actual local Mongo/HTTP/PDF/DOCX/AZ-EN-RU, synthetic Graph/store/AV only |
| P13-035 | Three brands/branches, same Candidate separate Jobs, actual0/100, revision409 and SMTP outage leaves status valid | TESTED | Joined E2E8/8, no real email/provider call; independently restricted CV downloads verified |
| P13-036 | Schema-only inventory, no-write dry run, additive idempotent owned local DDL and conflicting-index refusal without data/legacy snapshot backfill | TESTED | hrReleaseIndexes6/6; no production apply capability or startup import |

`HR_DB_RELEASE_PREPARATION.md` documents exact schema-derived inventory, production approval/backup/uniqueness/window/rollback and separate HR account repair; existing legacy schema auto-index defaults explicitly retained, not claimed disabled. Initial local comparison treated Mongo's omitted default simple collation as a conflict; fixed equivalence without relaxing uniqueness/partial/TTL. Final `/workspace/inop-hr13f-final.log`103/103,0fail/skip/cancel, includes E2E/DDL/hrSeed/userPrivileges. Previous99run did not include misspelled hrSeed filename and is not mislabeled; final correctly includes actual hrSeed4. Validationhr13f TS/build PASS lint0/9 smoke13 authorization632; diff-checkPASS. No actual Atlas DDL/account repair/backup/provider/runtime activation, production/push/deploy. AUD-090 retained OPEN pending causal investigation; final frontend/backend full matrix/disposition next.

13F commit `087f19a5ab483a6aee7ad08ca49fabfc43fca765`, six paths; final103/103 and all gatesPASS.

## 13G — bounded Source operator repair / read-only evidence review

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-129 | 10/13 | Repairable blocked private Source has no safe operator retry/read-only detail; pending guard prevents retry form | TESTED | hrCvSourceRetry6/6 and browser lost-ack/manual-draft/read-only/revocation assertions; no lifetime reset or reupload |

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P10-074 | Current independent scopes/original creator, immutable retry command and bounded quota/lifetime attempts | TESTED | `/workspace/inop-hr13g-backend-final.log`69/69 includes command privacy, quarantine, revision/hash, creator revocation, own/department/assigned/foreign |
| P10-075 | Read-only Source evidence/original, fail-closed focus/permission lifecycle and lost-ack retry without clobbering manual fields | TESTED | `/workspace/inop-hr13g-ui-current.log`26/26, strict current HTTP/Mongo/browser, synthetic scanner/store only |

`HR_SOURCE_RETRY_AND_READ_ONLY_REVIEW.md` documents additive default-off repair API and UI. First UI failures were harness syntax/ambiguous queue selector and then the real pending guard; corrected without weakening assertions. Backend69/69/browser26/26,0fail/skip/cancel. Validationhr13gfinal TS/build PASS lint0/9 smoke13 authorization632; diff-checkPASS. No existing Source bytes/approval/permissions changed, no runtime activation or production/push/deploy. AUD-090 still being causally investigated in separate work; genuine scanner/storage/Graph/provider/recovery gates remain BLOCKED_EXTERNAL.


13G commit `47c41321f3320de0ebc96f1e5682fda3953fc2e7`,17paths; backend69/browser26/all gatesPASS.

## 13H — investigate and isolate native PDF download from preview revalidation

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P13-037 | Reproduce focus/native default URL-revocation race; independent fresh authorized exact-byte download | TESTED | Baseline ordinaryPASS/focus canceled; `/workspace/inop-hr13h-permission-final.log`28/28 concurrent Source/race |
| P13-038 | Preserve focus/role/route private preview disposal, deny fresh403 and suppress late authorized reply after permission loss | TESTED | Current real local HTTP/Mongo/Chromium, no raw error/download URL on denial; prior four-suite61/61 |

`HR_SOURCE_DOWNLOAD_RACE.md` documents causal evidence and its historical limitation. Initial independent-download test cleanup compared creation order to revocation order; now tests require exact complete URL multisets (no leaked/repeated URL), preserving actual download failure/byte assertions. Initial downstream strict-selector failures depended on early cleanup assertion and are retained in logs. Final concurrent28/28,0fail/skip/cancel; validationhr13hfinal TS/build PASS lint0/9 smoke13 authorization632; diff-checkPASS. No StrictMode/auth/API/backend/production/provider/resource/push/deploy change. Final full matrix remains separate.

13H commit `5ec3314` (full SHA in ledger), seven paths; concurrent final28 + prior61, all gatesPASS.

## 13I — truthful AI configuration metadata in analytics

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-130 | 07/13 | Analytics always reports AI not_integrated even when its real adapter is configured | TESTED | hrIntegrationHealth actual HTTP default/incomplete/unsupported/complete synthetic config, zero external calls and no secret/model response |

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P13-039 | Integration metadata distinguishes missing/configuration-required/configured-not-verified without fake provider PASS | TESTED | `/workspace/inop-hr13i-health-current.log`78/78; existing analytics UI13/13, AZ/EN/RU configuration-required copy |

`HR_INTEGRATION_HEALTH.md`: no live network health check or reservation/write; malformed configuration does not break analytics. Baseline fixed-string failures retained. Validationhr13i TS/build PASS lint0/9 smoke13 authorization632; diff-checkPASS. Full frozen backend/frontend2 regression has started against all current source/test files (506 SHA-256 manifest paths, excludes credential filenames); its outcome is still pending and not PASS. No source changes during that run. Actual provider/privacy/hosted operational states remain external; no production/secret/resource/push/deploy.

13I commit `2f246042873cf95156c95ed7cbbf742091cbed35`, nine paths; target78/UI13/all gatesPASS.

## 13J — final matrix exposes untranslated Candidate validation keys

| ID | Package | Finding | Status | Evidence |
|---|---|---|---|---|
| AUD-131 | 02/13 | CandidateForm shared error branch renders stored translation keys literally for explicit confirmation/409 | TESTED | Actual complete frontend399/408 reproduction; one JSX translation correction, unchanged approval/AI/OCR/manual/source assertions and extra three-language zero-refetch checks, targets45/45 |

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P13-040 | Complete matrix failures investigated; explicit unconfirmed review/409 remains safe/localized and old raw-delete-message test obeys safe contract | TESTED | `/workspace/inop-hr13j-target.log`45/45, all existing row/persistence/current-auth assertions preserved |
| ENV-HR-002 | Backend directory snapshot test cannot overlap frontend writes in shared legacy uploads directory | TESTED | Known fixture limitation: complete runners serialized, final backend1819/frontend408 exit0. Frontend suites remain concurrent2; no filename-validation/assertion weakening or global upload cleanup. |

`HR_FINAL_REGRESSION_CORRECTIONS.md` records both non-PASS full attempts and required serialized verification. Validationhr13j TS/build PASS lint0/9 smoke13 authorization632; diff-checkPASS. P10 acceptance/disposition rows are updated to the now-tested local Source/Graph/relay contracts and true external activation gates; original history stays intact. No backend/data/policy/secret/provider/runtime/production/push/deploy change. Final full matrix/ledger/report remain pending; no fake scanner/storage PASS.


13J commit `0903b744127165448781d1605f9424b24610b07a`, five paths; targets45/all gatesPASS; complete corrected source verified below.

## 13K — final local completion / exhaustive disposition and release gate

Historical13K checkpoint below: pre-archive policy/counts/resume instruction are retained as history. Current continuation and newly approved archive policy are in14A–14F; use the latest resume point, not this historical one.

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P13-041 | All current regression files execute without skipped/cancelled tests, bound to frozen source and preserved commits | TESTED | Backend1819/1819 after frontend408/408 concurrency2, both exit0;506 SHA-256 paths unchanged at0903b744127165448781d1605f9424b24610b07a; final report-only changes do not alter code |
| P13-042 | Current ATSv2 owned0/5k/50k scoped API measurement retains all results/method limits and never claims hosted or synthetic provider readiness | TESTED | `/workspace/inop-hr13-final-atsv2-benchmark.json`,24endpoint200/15Admin-HR-own-department-assigned expected counts;31key/document plans; node benchmark exit0 |

**No unfinished independent implementation is silently skipped.** The canonical acceptance rows now cover all13 packages, including original HR audit and every discovered AUD-001–131:122 locallyTESTED,7BLOCKED_EXTERNAL,2OPEN. All366 earlier stable acceptance IDs retained plus newP13-041/042 (368total). All65 existing HR/checkpoint commits since c74 release are preserved and inventoried with full SHAs/files in `HR_LOCAL_COMMIT_LEDGER.md`; this final report-only commit SHA is shown after creation (self-SHA cannot be embedded before commit). Every true external test is separated; no provider/storage/scanner PASS is fabricated. Historical next/stop notes are retained as history and superseded by this final gate.

Final current complete runs: `/workspace/inop-hr13-final-frontend-corrected.log`408/408 concurrency2,200604.621001ms; `/workspace/inop-hr13-final-backend-isolated.log`1819/1819 concurrency1 after frontend completed,164013.10126ms. Both0fail/cancel/skip/todo, exit0 recorded in `/workspace/inop-hr13-final-exits.json`. Frozen manifest `/workspace/inop-hr13-final-corrected-source-sha256.json`506source/test files, credential filenames excluded, unchanged after suites and benchmark. Current13J TSapp/node/buildPASS, lint0errors/9baselinewarnings, smoke13/13authorization632/632. Failed first frontend399/408 and overlapped backend1817/1819 remain NOTPASS;13J and ENV-HR-002 explain actual correction/runner serialization. No original file is removed/reset to get green tests.

Current standalone0/5k/50k benchmark completes24actual local GET200 cases and15scope comparisons. At50k paged Applications43.4ms/23,744bytes/30rows vs legacy8,267.8ms/162,222,693bytes/50,000; board266.6ms/66,689bytes/80cards; analytics4,956.0ms/2,871bytes/213Mongoose method observations. Indexed31row reads examine31keys/documents; no wire-getMore/p95/constant-time/memory/hosted guarantee is inferred. Prior production-build UI comparison remains explicitly archived-source evidence rather than a fake current isolated React CPU rerun. `HR_FINAL_API_BENCHMARK.md` has timings/limits.

Final artifacts: `HR_IMPLEMENTATION_COMPLETION.md` package summary/current test evidence/API/model/frontend changes/setup/risk/readiness; `HR_RELEASE_E2E_MATRIX.md` every local-real versus synthetic/external scenario; `HR_AUDIT_FINDING_DISPOSITION.md` all131 findings; `HR_LOCAL_COMMIT_LEDGER.md`65fullSHA/path inventory; `HR_FINAL_API_BENCHMARK.md` current0/5k/50k.

**Local core and default-off provider/worker/Source interfaces: verified to their documented scope. Real CV acceptance / hosted staging / production activation: NO-GO.** Remaining only genuine gates: actual private durable storage/redeploy/restore/encryption/backup P10-018/019; real ClamAV/definitions/EICAR EXT-AV-001; hosted OCR EXT-OCR-001; AI P09-023; tenant/Exchange/mailbox P11-003/020; website/admin/API/form/email/export channels P12external; real SMTP EXT-SMTP-001; approved runtime worker actor/profile/DDL/hosting metadata and privacy law/retention. Legacy ephemeral/multipart paths remain transitional until verified activation, not silently retired. No external integration is assumed from a public website or mock.

**Genuine pending decision:** AUD-030/051 linked Candidate deletion must choose dependency409 versus archive/restore and lawful retention duration/basis/authority. Prior owned DELETE200 orphan reproduction retained; silence is not a policy approval. No mass deletion/migration/seed/index drop/role rewrite is performed. Legacy HR repair, hosted snapshot/index/backups and any migration require separate explicit approval/access; owned DDL rehearsal is not production verification.

**Resume point:** obtain the external evidence/setup and explicit deletion/retention answer; implement/test only the newly unblocked item and update this tracker. Do not repeat completed local packages, infer expired stop instructions, enable new real intake, create infrastructure or push/deploy without separate authorization. All ignored/local/.env files and prior artifacts/caches/models are preserved. `/tmp` remains nearly full ENV-HR-001; tests use the owned workspace TMPDIR and remove only their own fresh caches/fixtures. Roll-forward/disable gated providers preserves current scoped private reads and security fixes; no automatic insecure rollback.


## 14 — renewed audit, HR department boundary and premium product UI

Initial development push: all prior66 local commits retained, remote `inop-hr-development`=`f735acb47d27e4a93f0eeb3336af79d4209fbdd2`; main remains`c74c49f41bb3a8a54566324c8902576a48a88e8f`. No merge/deploy/migration. All13 package acceptance sections,368 existing stable acceptance IDs and131 finding rows retained and reviewed against final disposition/matrix/completion reports.122TESTED/7BLOCKED_EXTERNAL/2OPEN is the original13K checkpoint count, not a claim of new verification. External provider/scanner/storage readiness still blocked. Archive/restore is now explicitly authorized; lawful duration/permanent erasure remains undecided.

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P14-001 | Push full history to development only and verify both remote SHAs | TESTED | Successful non-force explicit HEAD:refs/heads/inop-hr-development, ls-remote exact SHA; main unchanged |
| P14-002 | Reconcile original13 packages/131 findings/368 acceptance IDs without dropping external/open work | TESTED | Original final artifacts retained; this extension explicitly tracks newly approved archive policy and new department constraint |
| P14-003 | Canonical HR membership independently required for CRUD, summaries, analytics, export, CV/legacy files and approved background contexts | TESTED | hrDepartmentAccess canonical real local HTTP/DB policy tests plus independent scope/privateFiles/background targets138/138 |
| P14-004 | HR menu/routes/actions/cancelled data fail closed on department or membership loss; Audit access and Admin preserved | TESTED | hrDepartmentAccessUI + hrLifecycle28/28 Chromium; zero new requests/hidden stale data, unrelated audit permission stays true |
| P14-005 | Generic activity logs cannot expose HR data outside current HR/parent scope | TESTED | hrActivityPrivacy + canonical membership/scopes104/104; bounded aggregate filters before500cap |
| P14-006 | Archive/restore retains Candidate/Application/CV/history, scoped recovery and no permanent deletion | TESTED | Candidate archive7/7 + previous CV/parent/privacy regression162/162, browser42/42; archive history/current revision409/old DELETE reversible |
| P14-007 | Consistent quiet HR design system for lists/forms/details/analytics/Kanban/modals/mobile | TESTED | hrWorkspaceUI20/20 actual full AppShell/Sidebar, real Mongo/API,390/1280screens; existing responsive target62/62 incl320/390/768/1280 |
| P14-008 | Final current source E2E/authorization/full regression/build/lint and responsive evidence | TESTED |14E frontend439/439,14F backend1845/1845; no failures/cancels/skips/todo. Frozen hashes/frontend input reuse audited, TS/buildPASS lint0/9 smoke13 authorization632; source-bound matrix below |

| ID | Finding | Status | Evidence |
|---|---|---|---|
| AUD-132 | Resource grants/wildcards previously allowed non-HR departments to read HR data | TESTED | Corrected baseline7 failures; canonical policy now enforced independent of role/JWT/body, bytes rechecked after IO; target138/browser28, TS/buildPASS lint0/9 smoke13 authorization632 |
| AUD-133 | Generic activity-log API can reveal HR record descriptions independently of HR department/parent authorization | TESTED | Baseline4failures; hrActivityPrivacy denies non-HR wildcard and HR foreign/missing/deleted parents, preserves Admin/non-HR Audit logs |

14A validation `/workspace/inop-hr-gates/inop-packagehr14a-validation.json`,138backend/28browser, TSapp/node/buildPASS lint0errors/9baselinewarnings,13smoke/632authorization, diff-checkPASS. First baseline had invalid synthetic Job setup; corrected baseline reproduces the real bypass, retained separately. No roles or department IDs changed outside owned local fixtures. Existing mathematical scope fixtures explicitly simulate HR membership in two synthetic departments ONLY in their owned loopback DB; strict canonical policy suite opts out and tests unmodified production predicate/real routes. Browser fixture maps those synthetic HR memberships to canonical UI metadata, while backend scope ownership remains independently tested. This simulation does not assert that dep_A/dep_B/dep_HR are eligible in production.

14A commit `65e64da` pushed development; main unchanged.14B activity privacy:104/104 owned backend targets; TS/buildPASS lint0/9 smoke13 authorization632. Non-admin HR log visibility now requires exact current Candidate/Job/Application parent read grant, while Admin retains historical/orphan logs. Single bounded aggregate, no per-row HTTP/service query, parent filter before500limit, no lookup/private fields in DTO. No user/role/data migration.

14B commit `feacace` pushed development only.14C implements explicitly approved archive/restore: active/null legacy filter, additive archived-only page, no guessed backfill, original retained, Application/history untouched, Candidate-local atomic archive history+revision, restore requires current independent read/update and canonical HR membership. Legacy DELETE is idempotent soft archive, never permanent deletion; new POST archive/restore use expectedRevision, stale/concurrent409. Archived ordinary edit/status/newApplication/processing/approval are blocked. Authorized historical detail/CV/PDF/Application access retained. Active exports/summary/lookup omit archived Candidates. UI archive/filter/restore/history, readonly direct edit, accessible trapped-focus HR dialog and AZ/EN/RU copy. Candidate retention duration/lawful erase policy AUD-051 staysOPEN; permanent deletion disabled and no original/history TTL. No existing account/role changes or migration.

14C target evidence: `/workspace/inop-hr14c-archive-final.log`7/7; `/workspace/inop-hr14c-regression.log` current scope/CV/privacy targets; `/workspace/inop-hr14c-browser-final.log`42/42. Initial browser test observed route URL before the new list committed; corrected readiness waits for real empty state, retains exact absence/SQL/Application checks. Initial lint found render-time ref write in new dialog; moved to layout effect without suppressing lint. Final TS/buildPASS lint0/9 smoke13 authorization632 (`hr14cfinal`). Full final matrix remains separate.


## 14D — premium HR workspace and actual-shell responsive verification

14C commit `7110d2e` pushed development. New scoped `hr-workspace.css` product layer uses neutral white/slate surfaces, system type, readable hierarchy, consistent controls/focus/borders, contained tables and Kanban, calm data-bound KPI/funnel, responsive cards/forms and keyboard-modal behavior. HR shell navigation/language buttons are scoped to HR routes; unrelated Audit/Execution/core shell design remains intact. Retained legacy stylesheet has220important declarations; necessary important overrides are confined to HR gradient/border/button rules. No wide CSS rewrite, animation additions, provider/API/backend change or fabricated data. Candidate primary contact/header now precedes secondary matching/processing/history panels. Global Dashboard HR-only summary receives the same card styling without altering audit widgets.

| ID | Finding | Status | Evidence |
|---|---|---|---|
| AUD-134 | Actual AppShell analytics mobile tables inherit520px minimum width and spill beyond viewport; legacy selectors defeat consistent mobile heading sizes | TESTED | Real-shell baseline4failures, including analytics scroll557 at390; scoped fixed-width wrapping/24px+ titles and no gradient checks, final20/20 |

Evidence `/workspace/inop-hr14d-product-verified.log`20/20 includes8surfaces at390/1280, actual Sidebar removes HR links on department loss while Audit links remain, real3-brand/Application totals and selectedKFC count1, Dashboard true3/1/3/0 KPI and zero new requests on language change. Screenshots `/workspace/inop-hr14d-visual/` are synthetic-data local actual UI, no hosted or provider readiness claim. Existing responsive/accessibility/analytics/archive/pagination target62/62; final TSapp/node/buildPASS lint0/9 smoke13 authorization632 (`hr14dproduct`). A Dashboard assertion initially matched both sidebar group and heading; now scoped to the actual HR summary heading, retaining the zero-refetch assertion. An absent optional test filename was not counted as executed: real target62 is unchanged; new actual Dashboard coverage belongs to hrWorkspaceUI. Full final matrix next; no source changes during frozen verification.


## 14E — full-suite archive action harness correction

ENV-HR-003: the first renewed full frontend runner reached the previous Candidate native-confirm test and waited indefinitely for DELETE after the product intentionally changed to an accessible application dialog. The owned runner was stopped; that run is incomplete, never PASS. Existing stale-export/mutation assertions remain, but the action test now confirms the real archive dialog, bounds intercepted request-start waits to15seconds, and proves the actual Bearer PDF plus retained archived record/history instead of permanent deletion. This is a test-only contract update; no production source or privacy policy weakened. Target `candidateActions` + `hrCandidateArchiveUI`13/13; fresh `hr14e` TSapp/node/buildPASS, lint0/9, smoke13/13 and authorization632/632. Complete renewed current-source suites follow. Prior runner evidence `/workspace/inop-hr14-final-frontend.log` retained.


## 14F — activity lifecycle regression fixture and newly reproduced Job dependency

ENV-HR-004: frozen14E full backend1843/1845 (exit1) exposed one obsolete activity fixture plus its failing parent test: it submitted an Application activity without entityId and expected visibility.14B deliberately denies unknown/missing/foreign HR parents. No authorization source was relaxed. Fixture now links an actually readable own Application, retains server-only snapshot anti-spoof checks, and additionally rejects parentless and foreign-parent activity even with an own snapshot. `applicationLifecycle` + `hrActivityPrivacy` + strict `hrDepartmentAccess`35/35. Fresh `hr14f` TSapp/node/buildPASS, lint0/9, smoke13/13, authorization632/632. Complete backend rerun follows; frontend439/439 input code is unchanged except this backend-only test, which frontend does not load. Initial failed backend log retained.

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P14-009 | Preserve Applications when an authorized user deletes a linked Job, using an explicitly agreed dependency/archive policy | TESTED |15A explicit archive/restore policy;120backend targets and4real browser archive checks, retained Job/Application/events/status, scoped CAS409 and read-only UI |

| ID | Finding | Status | Evidence |
|---|---|---|---|
| AUD-135 | Authorized linked Job deletion returns200, removes the Job but retains Application with jobId=null | TESTED |15A approved reversible Job archive, current mixed scopes/revisions, retains parent/history and rejects new applications;120targets/UI4, prior reproduction retained as history. Historical:  `/workspace/inop-hr14-linked-job-delete-baseline.json`: owned fixture only, DELETE200/Job absent/Application retained/detail200 null parent. User asked dependency409 with Closed workflow versus explicit Job archive/restore. No production data touched or new policy inferred. |


## 14 final full verification

14E `ebaf0859898efa3e177ff79de3342a10233817e0` frontend439/439, exit0,218153.528336ms, concurrency2;14F `fcceff65fdeb908a4eb41d92853b5e8e82356a7f` backend1845/1845, exit0,174748.725741ms, concurrency1 after frontend. Both zero failed/cancelled/skipped/todo. Only backend standalone applicationLifecycle test changed between runs: all frontend/shared fixture/production code inputs remain byte-identical.504frozen hashes in `/workspace/inop-hr14f-final-source-sha256.json` and exits `/workspace/inop-hr14e-final-exits.json`. Current14F TSapp/node/buildPASS lint0errors/9baselinewarnings, smoke13/13 authorization632/632. Parallel source-document download remains in current439, never replaced with a serial-only proof. Initial incomplete frontend and1843/1845 backend retained as failed/incomplete, not counted as PASS.

Current14F benchmark owned0/5k/50k:24HTTP200/15scope totals matched, exit0;50k Applications bounded43.4ms/23744B/30 versus legacy8156.3ms/162222693B/50000, Candidates59.5ms/14209B versus legacy1221.2ms/35698891B. Board260.7ms/80cards, analytics4771.9ms/2871B, ranking1149.6ms. All-active local single samples; current UI CPU/hosted p95/archive-heavy performance unmeasured. Analytics/ranking cohort scans remain a measured limitation. No external PASS.

**Historical14F resume point (superseded by section15):** all independently available13-package work and renewed14A–14F tests/UI/HR boundary/archive are verified locally; original368 acceptance IDs and131 findings retained, current377acceptances/135findings. P14-009/AUD-135 waits for the explicit linked-Job dependency409/Closed versus archive policy answer; implement/test only that newly unblocked change if answered. AUD-051 lawful retention/permanent-erasure authority remainsOPEN; permanent deletion stays disabled.18original external acceptance gates plus named scanner/SMTP/hostedOCR remain BLOCKED_EXTERNAL. Obtain approved provider/scanner/durability/recovery/AI/tenant/mailbox/company-channel evidence without inventing capabilities or collecting unauthorized CVs; then test only newly unblocked work. Do not repeat completed packages. Development-only pushes authorized; production push/merge/deploy/DB migration/real-CV activation remain forbidden/NO-GO. No user roles, original/history objects or ignored/.env/local files are rewritten/deleted. Final report-only commit SHA and remote parity are checked after creation.


## 15 — approved Job archive, analytics optimization and existing-main integration

User explicitly approved Job archive/restore with linked Applications/history retained and no permanent deletion; supersedes the pending P14-009/AUD-135 policy question. User also authorized integration/push into existing inop-main and development branch deletion only after successful merge/remote-SHA confirmation. No additional remote branch, hosting resource, automatic hosted DDL/migration, secret change or unverified real CV/provider activation. Existing history preserved.

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P15-001 | Scoped reversible Job archive/restore, retained parents/events/status, active exclusion and current revisions | TESTED | Backend120targets, UI55(including4actual archive cases), TS/buildPASS lint0/9 smoke13 authorization632; final full matrix follows |
| P15-002 | Diagnose4.77s analytics and improve measured latency without changing scope/score/envelope contracts | TESTED | Native Mongo explain shows repeated Job/Candidate joins; projection trial slowed8.9s and was reverted.1000score batches/same individual fingerprints, bounded500Job request-only cohort fast path, overflow indexed-join fallback and fresh parent recheck. Target44/44 plus5/5 fast-path/fallback/current-parent/empty/golden-hash regression, build/typechecks/lint0/9 smoke13 authorization632. Final serialized0/5k/50k benchmark24HTTP200/15scope totals after frontend443/backend1858.50k2928.1ms/2871B/68method observations versus4771.9ms/2871B/213 (~38.6% latency/68.1% observed-method reduction); local single samples, no hosted p95 claim |
| P15-003 | Main startup must not run automatic DDL/migration or unapproved notification/provider activation | TESTED | Explicit autoIndex/autoCreate false; notification worker opt-in; actual Native startup test1/1 (health200/auth401/no auto-created collections/default worker off/explicit synthetic opt-in), combined backend13/13; TS/build/lint0/9 smoke13 authorization632 |
| P15-004 | Integrate into existing main without force/history loss, verify exact remote SHA and main checks | TESTED | Main unchangedc74c49f confirmed immediately before normal fast-forward push;78 HR commits integrated into02890cac3b364060bd53c67b58b4d0000ff4d2e4, exact ls-remote parity. Main TSapp/node/buildPASS lint0/9 smoke13 authorization632; full frontend443/backend1858 and527 source hashes identical. No force/rewrite/additional branch. |
| P15-005 | Inspect Vercel/Render deployment and public checks without claiming inaccessible outcomes | BLOCKED_EXTERNAL | Supplied Render/Vercel panels and frontend URL: CONNECT403; no hosted success/failure/served SHA observed. Repository Node24/start/health/API contracts verified independently; actual public backend URL and hosted SHA/health/auth flows require accessible hosting evidence. |
| P15-006 | Delete development only after successful integration/remote SHA and retained ancestry | TESTED | After main/development both matched02890ca and main gates passed, normal targeted remote deletion succeeded; ls-remote confirms development absent/main unchanged, all development history is in main. No local development branch exists; existing work remains intact. |

Retained failed investigative artifacts: first browser used Candidate edit label instead of actual Job label; fixed to canonical localization (no assertion removed). First profile helper referred to fixture h.models.Application, which is not exported; corrected diagnostic uses actual model. The projected foreign lookup trial regressed to8.9s and was reverted rather than accepted as an optimization. Benchmark overlapped with early build is exploratory only; final comparison will be serialized. All initial logs retained.

###15D — OCR language measurement synchronization

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P15-007 | Measure language-only OCR requests after the independent initial duplicate read is ready; keep zero-refetch assertion | TESTED | First full frontend441/443, exit1, actual wire2 versus expected1. Initial Source POST exposed phone before duplicate effectGET; wait for actual duplicate-ready UI and assert exactly one initial read before measuring. Target cvIntakeOcrUI4/4; all AZ/EN/RU zero additional calls/provenance/no person write/explicit confirmation retained. Production code unchanged; existing15final TS/build/lint0/9 smoke13 authorization632 remain byte-identical; corrected complete frontend443/443, exit0/218405.803702ms, concurrency2 retained. |
| AUD-136 | OCR language-only test can count the legitimate initial duplicate read as language refetch | TESTED | P15-007 actual ready-state synchronization, no arbitrary sleep/count allowance/assertion deletion;4/4 real browser/HTTP/OCR target. First failed full log retained at /workspace/inop-hr15-full-frontend.log. |

###15 complete regression proof

Source7309cb72ca5f1f9d160a23bc3af66c30d4f500e5: corrected frontend443/443,218405.803702ms, exit0, concurrency2 with actual parallel authorized downloads/mobile/keyboard; backend1858/1858,174918.753431ms, exit0, concurrency1 started after frontend ended. Both zero failures/cancelled/skipped/todo.527 tracked source/test/config hashes in /workspace/inop-hr15-final-corrected-source-sha256.json are unchanged; only report updates follow. First full frontend441/443 is retained as FAILED, not overwritten or hidden. Backend includes the new Job7, analytics5 and actual Native-startup1 alongside all previous regression/auth/E2E tests. No real provider/scanner/storage/hosted PASS is inferred.

**15 pre-push checkpoint:** all independently available local code checks passed; original368 acceptance/131 findings retained, current384 acceptance IDs and136 findings. Acceptance362TESTED/19BLOCKED_EXTERNAL/3OPEN before integration; findings128TESTED/7BLOCKED_EXTERNAL/1OPEN (lawful retention). Remaining acceptance work is main remote proof/development deletion and lawful retention; hosting verification is explicitly BLOCKED_EXTERNAL.527 frozen source inputs unchanged; only reports modified. Main integration is authorized, real CV/storage/scanner/provider activation is not.

###15 final integration checkpoint

Verified normal fast-forward main push02890cac3b364060bd53c67b58b4d0000ff4d2e4 (78 HR commits beyondc74c49f), development deletion and main gates. Source/test/config527 hashes remain byte-identical to7309cb7 full443frontend/1858backend and serialized24API/15scope benchmark. Original368 acceptance/131 finding IDs retained; current384acceptances:364TESTED/19BLOCKED_EXTERNAL/1OPEN(P13-020 lawful retention);136findings:128TESTED/7BLOCKED_EXTERNAL/1OPEN(AUD-051). ENV-HR-001 /tmp capacity is still constrained; the existing owned workspace scratch path allowed all tests without deleting existing files/caches.

Post-push Render panel/Vercel panel/supplied frontend/GitHub status GET: curl56/HTTP000/proxy CONNECT403. This is not an application error or verified deploy failure/success. Hosted servedSHA/health/login/dashboard/Audit/HR/Execution/private downloads remain UNVERIFIED/BLOCKED_EXTERNAL; accessible panel/runtime evidence is the exact continuation point. No blind rollback, guessed backend domain, new branch/resource, real CV/provider activation, hostedDDL/migration/seed/reset, user role rewrite or secret change. RealCV/durable storage/scanner/recovery/provider operational readiness remains NO-GO. This final report-only confirmation is committed/pushed to existing main; its actual SHA/remote parity are verified afterward, without inventing its own future SHA.

##16 — Premium HR workspace and measured opening lifecycle

User authorizes small local commits and existing-main pushes, no new branch, no unsafe live DB operation/provider activation. No screenshots attached to the current message; actual existing product is inspected locally. Original acceptance/findings and all prior history are retained.

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P16-001 | Measure Network/API/production render baseline without inventing hosted performance | TESTED | Owned production lazy routes/fullAppCSS8134e35, real scopedHTTP/Mongo0/5k:10screensPASS; loading538px;5k ApplicationsAPI27.6ms/23749B vs navigation625.9ms/response-to-paint102.9ms; board74.5ms/66687B/nav692.5ms; analytics325.1ms/2847B/nav872.8ms. Single samples, no isolated React CPU/hosted SLA. |
| P16-002 | Compact primary/auxiliary loading, slow hint, finite deadline/timeout and manual retry; cancel stale/private work | TESTED | HR-only15s deadline, no shared Audit timing change, compact feedback instead of nested PageState+four skeletons; Target33/33 plus TSapp/node/buildPASS, lint0/9, smoke13, authorization632; controlled stalled/late/permission and actual held-primary ranking tests retained.
| P16-003 | Parallel independently authorized Job/ranking requests without exposing secondary data before primary permission | TESTED | PriorJob result→ranking waterfall; route-id ranking already independently authorized on backend; controlled held-primary proof: Target33/33 plus TSapp/node/buildPASS, lint0/9, smoke13, authorization632; controlled stalled/late/permission and actual held-primary ranking tests retained.
| P16-004 | Cohesive premium navigation/type/spacing/buttons/tables/cards/board/profile/forms/details | TESTED | Actual-shell14-page×4-width matrix, visual desktop/mobile review; final60/60 plus hr16bcomplete TS/build/lint0/9/smoke13/auth632. HR-only CSS/components; other modules retain their shell. |
| P16-005 | Genuine scoped KPI/funnel/source/score graphs, honest zero/unknown/empty/integration states | TESTED |104/104 combined analytics/workspace/mock-source tests; final60/60 includes zero-height empty bars and exact actual API score cohort/brand counts, no PII/language refetch. Existing analytics contract preserved. |
| P16-006 | Responsive keyboard/permission/error/CRUD/archive/history checks for everyHR page | TESTED |14 pages at320/390/768/1440, overflow<=1px; keyboard Job link, canonical department loss, disabled source zero-requests; existing functional CRUD/archive/history tests will also be included in final complete suite. |
| P16-007 | Production before/after request/JSON/paint/long-task measurements and meaningful full regression/build gates | TESTED | Three baseline/final runs each30/30 actual production scenarios; full509frontend/1858backend, zero skipped/cancelled; TS/build/lint0/9 smoke13 authorization632.532 source hashes unchanged. Board increase/remaining cold long tasks and hosted limits explicitly retained. |
| P16-008 | Main normal push/remote-SHA and separate hosting observations without false deployPASS | TESTED | Normal fast-forward8134e35→2b89bb67b8883b098a4cc6acfc261a1686deb30d; remote exact SHA verified. Post-push Render/Vercel/frontend/GitHub status proxy CONNECT403/HTTP000, hosted deploy explicitlyUNVERIFIED. No force/new branch/provider activation. |
| AUD-137 | Large nested generic PageState plus HR skeleton renders a538px blank opening panel | TESTED | Actual baseline productionCSS measurement538px, compact contextual request state: Target33/33 plus TSapp/node/buildPASS, lint0/9, smoke13, authorization632; controlled stalled/late/permission and actual held-primary ranking tests retained.
| AUD-138 | Job ranking waits for primary Job before starting its own server-authorized query | TESTED | Code baselinejob?.id dependency; actual held-primary regression, no backend scope change: Target33/33 plus TSapp/node/buildPASS, lint0/9, smoke13, authorization632; controlled stalled/late/permission and actual held-primary ranking tests retained.

### Additional visual finding

| ID | Finding | Status | Evidence |
|---|---|---|---|
| AUD-139 | Shared field padding overrides SearchInput icon spacing in HR filters | TESTED | Actual mobile/Job screenshots, scoped padding/clear-control correction, final60/60 checks computed padding>=34px at all widths. |

###16B visual correction evidence

Actual desktop analytics/Job and mobile profile/board were inspected. First expanded matrix93 total failed13 including parent: bare disabled-source pages8 and legacy Job-card gradients4, plus aggregate parent failure. The initial source/Job fix then failed3 early-width Job cases plus parent, exposing the separate first-column selector. Final104/104 target passed after all card fixes. Final search-icon/ranking polish adds explicit icon padding and first-rank gradient checks:60/60 (14 pages ×4 widths plus genuine empty/filter/keyboard/permission cases and parent). No assertion or failing investigative log is discarded. Source intake stays disabled and makes zero requests; full independent mock source queue11/11 remains valid.

**16B gate:** hr16bcomplete TSapp/node and production buildPASS, lint0errors/9existingwarnings, smoke13/13, authorization632/632; no source changes follow before this package commit.

###16C — actual CSS cascade and deferred candidate painting

| ID | Acceptance/finding | Status | Evidence |
|---|---|---|---|
| P16-009 | Preserve actual analytics grid against global important rules; defer offscreen candidate card paint without changing paging/permissions/keyboard access | TESTED |81/81 actual-shell tests,14pages×4widths; computed grid/paint assertions, deferred-card keyboard navigation and current-department removal. hr16c gates recorded below. |
| AUD-140 | Legacy admin important flex overrides new analytics grid; 30 rich candidate cards incur offscreen layout/paint | TESTED | Real cascade diagnostic identified admin important rule; scoped grid and content-visibility with81/81 regression. Final production measurements remain pending rather than claiming an unmeasured speedup. |

**16C gate:** TSapp/node/buildPASS, lint0/9, smoke13, authorization632. Exact source/test inputs will be frozen after this commit; final before/after and full suite follow without overlapping their measurements.

###16 final validation checkpoint

Frozen source d5ffbe7ebf8e166be027f2b828add10c3a91ee86,532 unchanged inputs. Fullfrontend509/509,258284.902954ms, concurrency2 incl. real parallel private downloads; fullbackend1858/1858,180646.797517ms, concurrency1 after frontend ended. All failures/cancelled/skipped/todo0. hr16c TSapp/node/buildPASS, lint0/9, smoke13/13, auth632/632. No source change after these runs. Three baseline/final production runs each30/30: loading538→64px, one GET each, bounded JSON;5k candidate paint120.4→67.5ms/analytics70.8→55.4ms, board116.5→127.2ms and remaining51–65ms median cold long tasks preserved in HR_PREMIUM_WORKSPACE_REPORT. Not hosted or isolated React CPU/memory proof.

All520 preexisting tracker IDs (384 acceptance/136 findings) remain; current393 acceptance/140 findings.393 acceptances:372TESTED/19BLOCKED_EXTERNAL/2OPEN(P13-020 retention and P16-008 main verification);140 findings:132TESTED/7BLOCKED_EXTERNAL/1OPEN(AUD-051 retention). Real provider/storage/scanner/recovery/hosted integration readiness remains NO-GO. No env/schema/index/migration/role/provider changes.

Remote fetch confirms unchanged inop-main8134e354864d7ead2972d85ae83c9bd76a6f40bf, ancestor of current source; normal existing-main push follows this report-only commit. No new branch. Pre-push Render panel/Vercel panel/supplied frontend HTTPS: curl56/HTTP000/proxy CONNECT403; this is not verified application403 or deploy outcome. Main remote-SHA proof and post-push transport observations are the exact remaining release step.

###16 verified existing-main integration

Normal push8134e354864d7ead2972d85ae83c9bd76a6f40bf→2b89bb67b8883b098a4cc6acfc261a1686deb30d succeeded, exact remote SHA verified. Post-push read-only Render panel/Vercel panel/provided HR frontend/GitHub commit status: curl56/HTTP000/proxy CONNECT403 on all four. This is transport denial, not an application403 or deployment success/failure. Hosted servedSHA/health/login/HR/Audit/Execution/private downloads remain UNVERIFIED/BLOCKED_EXTERNAL. No guessed backend URL or blind rollback.

All393 acceptance IDs:373TESTED/19BLOCKED_EXTERNAL/1OPEN(P13-020 lawful retention).140 findings:132TESTED/7BLOCKED_EXTERNAL/1OPEN(AUD-051). Original520 IDs retained. Full509frontend/1858backend and all532 frozen source inputs remain unchanged. Core UI/local functionality GO; realCV/storage/scanner/recovery/external provider operational activation NO-GO. This report-only confirmation will also be normal-pushed to existing main; its final future SHA is reported by Git after commit/push, not invented here.

**Exact continuation:** obtain actual served-SHA/health/deploy evidence from the existing Render/Vercel panels; compare the current main frontend/API pair and perform authorized HR/Admin live navigation/private-download smoke. Do not activate unverified ingestion/provider flags or live migration. Remaining legal/external IDs stay open/blocked, not silently markedPASS.

##17 — Premium refinement and measured navigation

User confirms hosted loading completes after a few seconds: do not diagnose a hang. Existing main/work76503c3 is clean; no new branch, provider activation or permission-policy changes. Prior findings/IDs/evidence are retained. Hosting transport is checked afresh; inaccessible hosted timings are not invented.

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P17-001 | Separate reachable live evidence from controlled API/chunk/render/navigation measurements | TESTED | Hosted supplied frontend/panels proxy CONNECT403/HTTP000, no live cause invented. Local actual production0/5k baseline/final30/30 each, identical controlled navigation12/13 and alternating CDP10/10; all unfavorable cold/paint samples retained in HR_PREMIUM_REFINEMENT_REPORT. |
| P17-002 | Intent-load only public authorized route code; coalesce duplicate HR visibility/focus refreshes without PII cache | TESTED | Actual immediate focus/visibility2→1 GET; later focus/current permission preserved. Public HTTP-only intent0 privateGET before click/1 after, failed503 recovery; 5k click→API173.8→69.0ms under identical120ms transit/150ms lead. SaveData/2g/current Audit-department negatives and StrictMode/cancellation pass. |
| P17-003 | Compact primary search/status controls and deliberate secondary filter access with visible active state | TESTED | Native keyboard disclosure with visible active count; main search/status/sort stay visible, scoped lookup requires deliberate open.180/180 UI/workflow targets; selected brand survives close and clear resets it. No eager catalog queries. |
| P17-004 | Concise analytics overview and genuine operational detail, no fake statistics/trends | TESTED | Overview renders real KPI/funnel/score/source DTO; operational/review/interview/duration/integration panels open through accessible keyboard tabs with zero new GET. Genuine zero vs unknown preserved; compact zero chart retains five zero-height bars.180 targets plus final74/74 charts/14-page visual matrix. |
| P17-005 | Coherent tables, profiles, forms and board; keyboard links, long text and URL view state | TESTED | 14 HR pages at320/390/768/1440 plus10 dense/long screens at320/768/1440; all page overflow<=1px, bounded30-row/35-card synthetic datasets, readable profile facts/actions and board counts. Application parent titles are keyboard buttons; table/board URL survives refresh/back and retains other params. |
| P17-006 | Preserve CRUD/workflow/archive/history/private-file lifecycle and Admin/HR restrictions | TESTED | Final source9978447 fullfrontend552/552 incl. actual parallel private/source downloads, CRUD/archive/history/workflow/CAS409/401403404500/stale/keyboard/current canonical dep_hr vs Audit; backend1858/1858 current unchanged inputs, authorization632/632. No provider or permission-policy change. |
| P17-007 | Measure final production network/API/render/navigation; typecheck/build/lint/smoke/security gates | TESTED | Frozen9978447 source540 hashes unchanged; frontend552/552/284471.474524ms, backend1858/1858/184489.118599ms on byte-identical Backend inputs. hr17e TSapp/node/buildPASS lint0errors/9existingwarnings smoke13/auth632. Three before/final repeats30/30 each and local limits/cold increases/remaining long tasks documented. |
| P17-008 | Normal existing-main push, remote parity and honest deployment evidence | TESTED | Normal fast-forward source push76503c3→997844757731b92cd093200682540fab0ff30319 succeeded, exact ls-remote parity. Post-push all supplied panels/frontend/GitHub status proxy CONNECT403/HTTP000: hosted outcomes UNVERIFIED, P15-005 remains BLOCKED_EXTERNAL. Final documentation-only push SHA is verified afterward; no force/new branch/real-CV activation. |

###17A navigation safety evidence

Actual focus/visibility baseline:2 GETs; immediate HR-only250ms coalescing:1 GET, later focus still revalidates.26/26 target tests preserve Audit focus behavior, StrictMode, current permission/token, timeout/retry and stale cancellation. A speculative dynamic-import prototype FAILED its network-failure regression and was discarded before commit. Final HTTP-only public code prefetch passed failed-fetch→real-navigation, Save-Data/2g, current Audit-department exclusion, no speculative dataGET, keyboard intent and genuine Application navigation. Successful public bytes may use HTTP cache; private settled responses remain uncached. Vite emits public hr-route-manifest.json; no runtime env/API/backend contract change. hr17asafe TSapp/node/buildPASS, lint0errors/9existingwarnings, smoke13/13, auth632/632. Production navigation comparison remains pending; no hosted speedup claim.

| AUD-141 | Sequential HR focus/visibility events produce two identical fresh resource reads | TESTED | Real browser baseline2→final1, later refresh and current-department revocation preserved;26/26 lifecycle targets plus complete gates. |

Failed exploratory harness/selector logs are retained outside repo. They are not latency evidence. The measured transition fixture will use real HTTP cache (Playwright request interception disables cache) and identical controlled120ms public-chunk transit for both commits.

###17B daily-workspace refinement checkpoint

180/180 focused UI/archive/CRUD/board/pagination/accessibility tests passed, including30 long/dense viewport scenarios and14pages×4widths. Final empty histogram/analytics refinement independently74/74; final public-code failure/current-access/genuine-keyboard checks3/3. Fresh hr17final TSapp/node/buildPASS, lint0errors/9unchangedwarnings, smoke13/13, authorization632/632. Screenshots inspected: actual empty/dense desktop analytics and mobile profile, with smaller controls, explicit real zero counts, quiet surfaces and no gradients. No Backend file/API/permission/model/env/schema/index/migration or provider activation changes.

HTTP-prefetch follow-up: successful public asset fetched once per loaded app; manifest revalidates rather than force-caching a stale manifest; whitelist/type guard; keyboard focus-visible only, pointer touch excluded. Private reads remain current-token/scope authenticated and uncached after settlement. Failed speculative HTTP does not poison native module imports.

| AUD-142 | Application view toggle uses local state only and loses board view on refresh/back | TESTED | Prior source initializes from URL only; URL-derived view now retains unrelated params, real board reload/back E2E and existing manual-order/history/CAS409 tests pass. |
| AUD-143 | Application populated parent title cells require pointer-only clicks | TESTED | Authorized parents now real buttons; actual keyboard activation, canonical Audit department revocation and restricted-parent regression preserve independent backend scope. |

Final frozen-source full regression and serialized production measurements follow this local source commit. Current remote main remains76503c32d7fd8c8ad8decbf39895aa19c56f82bf; no push yet. Failed dynamic-import prototype/harness logs retained; only final successful evidence is used.

###17C — trace investigation and deferred score body

Three old/final cold-profile repeats each30/30 exposed a noisy Application response→paint increase (122.6→193.4ms median; final third sample115.4ms). Alternating Chromium trace5before/5after with the same real5000-row loopback fixture separated work: window153.3→159.1ms, renderer JS37.98→50.31ms and paint8.04→15.05ms. Trace subsystem unions overlap and are not isolated React duration. Do not present all cold pages as faster.

| P17-009 | Defer closed score evidence/recalculation bodies, keep truthful summary, scoped on-demand evidence, retry/review/permission lifecycle | TESTED | Real browser baseline3 hidden body nodes→0 before explicit intent; one authenticated detailGET on first keyboard open, no repeat on close/reopen, genuine100% unchanged, Audit-department revocation removes content.59/59 matching/ranking/board/accessibility/disclosure tests, hr17c TSapp/node/buildPASS lint0/9 smoke13 auth632. Final performance comparison pending. |
| AUD-144 | Every collapsed score widget mounts hidden explanation/form DOM before explicit intent, multiplying work across30/80 items | TESTED | Baseline actual3 body nodes per summary; same visible score/summary now0 with59/59 functional tests. Final measured impact to follow without inventing a speedup. |

Only score-body construction is deferred; existing wanted/read lifecycle, matching model/API, weights, missing-vs-zero, backend scopes and recalculation stay intact. Public prefetch remains HTTP-only. Production failed-prefetch test successfully opened the Application page with one privateGET; the first measurement assertion incorrectly expected failed fetches in ResourceTiming. Fixed fixture asserts the server's forced503 directly;13/13 production scenarios now pass. Failed exploratory logs retained, no product failure hidden. CDP trace tool10/10 and node syntax check passed. No backend/env/migration/real provider change.

This local commit follows successful targeted gates. Full suites and repeated profiles will bind the final source snapshot; previous537-file freeze is preserved as an earlier checkpoint, not reused across this actual Badge change.

###17D — numeric locale-safe update timestamp

Actual inspected Azerbaijani Chromium screenshots exposed Intl medium-date fallback text “2026 M10 11”. Numeric localized year/month/day plus24-hour time keeps Asia/Baku and the original ISO datetime while avoiding unresolved month names.

| P17-010 | Readable actual update time in all three locales, unchanged timezone/ISO/source and no language refetch | TESTED |74/74 analytics/14-page viewport tests; three locales reject Mxx placeholders, retain datetime and unchanged GET count. hr17d TSapp/node/buildPASS, lint0/9, smoke13/13, authorization632/632. |
| AUD-145 | Azerbaijani Intl medium-date fallback prints M10 month marker in real workspace screenshots | TESTED | Actual prior screenshot evidence; numeric local formatting and all-three-locale regression above; no fake timestamp or date-filter/API change. |

17C final score-source proof:30/30 cold production cases,13/13 transition/recovery scenarios and10/10 alternating traces passed. Application DOM1038→948 relative to the intermediate rich UI; visible30rows/score contracts unchanged. Endpoint/JSON count remains one/bounded; cold metrics vary, no universal or hosted speedup claimed. Only this subsequent analytics timestamp expression/test changes; final source will be frozen afresh before full regression and release.

###17E — unresolved totals are not zero

| ID | Acceptance/finding | Status | Evidence |
|---|---|---|---|
| P17-011 | Jobs/Application table/board counts appear only after a successful scoped read; distinguish loading/failure from actual zero and preserve manual retry | TESTED | Three actual-route held-response baseline failures (plus failing parent) reproduce false zero. Final hrHeaderCounts4/4 covers loading, actual zero,500server-error and retry;105/105 combined daily/dense/14-page visual/loading targets. hr17e TSapp/node/buildPASS, lint0/9, smoke13, authorization632. |
| AUD-146 | Jobs and Application header substitutes0 for unresolved API totals, including board and failed-read states | TESTED | Actual held primary response and canonical server-error reproduction; count caption requires ready+data. Genuine zero and existing scoped total/visible count remain unchanged;105targets/gates above. |

The first diagnostic accidentally checked outer route Suspense rather than the mounted page and used generic error instead of canonical server-error; that failed diagnostic is retained. Corrected baseline waits for the actual page header, then reproduces all three false-zero states before patching. No failed diagnostic is counted as product PASS. Only two caption expressions plus the targeted test changed; no request/service/API/permission/timing policy changed. Final source-bound frontend regression and serialized production repeats follow; Backend inputs remain byte-identical to the1858/1858 run.

###17 final source-bound validation and main push

Source997844757731b92cd093200682540fab0ff30319: fullfrontend552/552,284471.474524ms, concurrency2 with genuine parallel private/source-document downloads; zero failed/cancelled/skipped/todo. Backend1858/1858,184489.118599ms, concurrency1 after the earlier548frontend completed, zero failed/cancelled/skipped/todo. Only two frontend header captions and a frontend test changed afterward; all Backend/shared inputs and every runtime/service/API are unchanged. No unnecessary backend rerun is claimed. Fresh hr17e TSapp/node/buildPASS lint0/9 smoke13/auth632.540 tracked source/test/config inputs remain SHA256-identical after final tests; only documentation follows.

Production30/30 before and30/30 final cases, all API200/one GET, bounded30rows/80cards. Final5k Application paint122.6→111.9ms/navigation640.8→615.8ms; analytics navigation938.5→886.9ms. Candidate navigation545.1→586.8ms, board paint122.0→127.5ms and final54–57ms cold long tasks retain limitations. Identical controlled-intent transition5k APIstart173.8→69.0ms/ready paint294.1→271.4ms, while no-intent cold paths did not improve. Trace7.7→15.2ms paint cost remains. No hosted or isolated ReactCPU guarantee.

All533 initial phase17 IDs preserved. Current404 acceptances:384TESTED/19BLOCKED_EXTERNAL/1OPEN(P13-020 lawful retention);146 findings:138TESTED/7BLOCKED_EXTERNAL/1OPEN(AUD-051). P15-005 hosted verification stays blocked; public Git push is not provider/storage/scanner/deployment evidence. Original131 findings and all prior13-package acceptance requirements remain.

Normal source fast-forward76503c32d7fd8c8ad8decbf39895aa19c56f82bf→997844757731b92cd093200682540fab0ff30319 succeeded; exact remote parity queried. Read-only post-push Render/Vercel panels/supplied frontend/GitHub status: CONNECT403/curl56/HTTP000 before TLS. Hosted servedSHA/health/login/HR/Audit/Execution/Bearer download outcomes remain UNVERIFIED/BLOCKED_BY_TRANSPORT; backend public URL is unknown and never guessed. No blind rollback or automatic DB/environment/provider change.

**Exact continuation:** observe servedSHA/health/deployment in existing Vercel/Render, then authorized HR/Admin zero/dense filters and board/profile/archive/private download smoke; Audit department must stay denied. Keep realCV/storage/scanner/recovery/external provider activation NO-GO and lawful-retention/external IDs open/blocked until actual evidence/approved policy. No new branch/resource/secret/seed/migration/reset or old-file cleanup. This final documentation-only commit is also normal-pushed; its own exact SHA/remote parity is reported after creation rather than invented in its contents.

##18 — Auth-inclusive performance, clean design and actual AI availability

User reports live opening3s→5–6s after release36464b6. This is a user observation, not a measured hosted root cause: current frontend probe remains CONNECT403/HTTP000. Keep earlier measurements/history; do not reuse injected-session measurements as evidence of actual auth startup. Existing work/main36464b6 is clean, no new branch. Supplied logo is visible in the conversation; prepare a faithful derived asset and inspect it before shipping. A failed transparent extraction is not accepted as a final asset.

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| P18-001 | Real AuthProvider-inclusive production waterfall: session/API/code/render, paired events and cold/warm distinction | OPEN | Add reproducible owned loopback measurement; hosted cause remains unverified. |
| P18-002 | Remove reproduced duplicate auth work without settled session cache, stale grants or broken Admin/Audit workflows | TESTED | Actual held focus/visibility baseline2→1 physical /me reads. Only an opposite pending event pair within250ms/same token shares; completed reads/same-source events/changed tokens revalidate. Real role revocation/restoration and old-token Audit tests retained;5/5 targets, hr18a TS/build lint0/9 smoke13/auth632. |
| P18-003 | Audit and safely remove duplicate CSS rather than adding product override layers | OPEN | Source307826B styles / initial built CSS222KB; exact duplicate pruning within same cascade context plus responsive/Audit equivalence required. |
| P18-004 | Quiet, accessible login and existing shell language/navigation, preserving Audit content/layout | OPEN | Existing login renders unused ambient/grid/orbit effects and duplicates language controls. Replace in existing styles/components; no new decorative layer. |
| P18-005 | Faithful small INOP logo assets, intrinsic sizing, no giant startup image | OPEN | Supplied conversation image; original file is not exposed in workspace. Inspect a derived asset, label provenance honestly and preserve source/reference. |
| P18-006 | Inventory every AI action and expose real provider/prerequisite/configuration status without activation or fake output | OPEN | Job/CV assistants and source processing exist; no dedicated status endpoint currently. Use server-owned nonsecret metadata and existing gates. |
| P18-007 | Preserve structured AI validation, HR approval, timeout/budget/provider outage and current authority | OPEN | Existing adapters and mock tests retained; real provider credentials/E2E remain blocked. |
| P18-008 | Verify scoped pagination/integrity/filters/workflows for100 branches and high-volume applications | OPEN | Owned synthetic branch fixture, bounded DTO and scope counts, no production index/migration. |
| P18-009 | Admin/canonical dep_hr, Audit exclusion, independent parent/private file/export regression | OPEN | Full prior tests preserved; run source-bound security regressions. |
| P18-010 | Full frontend/backend regression, TS/build/lint/smoke, honest before/after and small local commits | OPEN | No package complete without evidence; preserve external gates and previous IDs. |
| P18-011 | Normal existing-main push/remote parity, deployment status separate and no risky DB/provider changes | OPEN | Recheck remote before pushing, no force/new branch. |

Real CV/provider/scanner/storage/recovery/SMTP/Graph/website gates remain separately BLOCKED_EXTERNAL; lawful retention remains OPEN. Do not mark real provider working through local transport tests. Logo or hosted access gaps must not block independent work.

###18A — measured session event duplication

| AUD-147 | AuthProvider aborts and restarts the same pending session read for a focus/visibility event pair | TESTED | Owned real AuthProvider baseline fails2vs1; final5/5 including immediately fresh completed permission reads, real Audit revocation/restoration and StrictMode/private-prefetch failure checks. hr18a TSapp/node/buildPASS lint0/9 smoke13/auth632. |

New profileHRSession uses real App/AuthProvider/protected routes, one real /me plus one bounded primary GET; initial owned0/5k10/10 baseline complete at36464b6. It does not inject ready session state. It records actual public chunks/API/backend timing/DOM+two frames; hosted latency/cold start remains unavailable. Complete repeated baseline/final runs follow after bundle/style changes. Settled user/PII responses are not cached; no permission weakening/provider/DB/hosting operation. Source package commits only the session change, targeted regression, reproducible profiler and tracker.

###18B — table/board code split, no data-contract change

| AUD-148 | Application table eagerly downloads drag-and-drop Kanban runtime | TESTED | Actual route baseline loads ApplicationKanban1times in table, final0; board intent1scopedGET/one code load. Failed503 module gives finite error and reload recovery preserving URL.50/50 daily/dense/keyboard/board/manual-order tests; hr18b TSapp/node/buildPASS lint0/9 smoke13/auth632. |

Dynamic public board code starts concurrently with its scoped board query; table never loads that runtime. Existing cards/status/CAS409/current permission/ordering/history/paging remain. An initial test used a shortened label rather than canonical locale hrMatch.board; corrected fixture retains all assertions, initial failed logs preserved. Exact new Application and Kanban chunk bytes and Auth-inclusive repeated before/after are recorded in final report. No new backend/private-cache/schema/flag/migration behavior.
