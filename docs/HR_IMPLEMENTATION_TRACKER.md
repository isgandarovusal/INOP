# GFC HR implementation tracker

Baseline: `c74c49f41bb3a8a54566324c8902576a48a88e8f`, branch `work`. Local implementation and commits only; no production push/deployment. Existing data, secrets and user files must be preserved.

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
| AUD-009 | 13 | Live JWT and role.update escalation protection must remain intact | OPEN | — |
| AUD-010 | 13 | Legacy hr role migration is not automatic and hosted state unknown | OPEN | — |
| AUD-011 | 06 | Assigned creator field lacks explicit reassignment workflow | OPEN | — |
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
| AUD-028 | 06 | Activity log lacks scope fields for own/department visibility | OPEN | — |
| AUD-029 | 06 | Best-effort generic activity log is not Application event history | OPEN | — |
| AUD-030 | 10 | Hard deletion leaves orphan Applications/CV files | OPEN | — |
| AUD-031 | 06 | Closed/draft Job accepts applications without lifecycle validation | OPEN | — |
| AUD-032 | 02 | Canonical Candidate/CV pipeline unused by frontend job context | TESTED | `Frontend/tests/hrLifecycle.test.cjs`: 21/21; `hrContracts.test.cjs`: 9/9; full 1051/1051 |
| AUD-033 | 03 | PDF/DOCX extraction is real but scanned OCR unavailable | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| AUD-034 | 08 | Extraction caps text only after potentially expensive extraction | OPEN | — |
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
| AUD-045 | 09 | Rule parser and static suggestions are presented as AI | OPEN | — |
| AUD-046 | 03 | UI advertises DOC despite PDF/DOCX-only upload contract | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| AUD-047 | 02 | Upload/processing/error strings have incomplete localization | OPEN | — |
| AUD-048 | 10 | No malware quarantine/scan for untrusted uploaded documents | OPEN | — |
| AUD-049 | 08 | Synchronous decompression/extraction may block requests | OPEN | — |
| AUD-050 | 10 | Native Render CV storage is ephemeral without durability/recovery | OPEN | — |
| AUD-051 | 10 | Privacy retention/deletion lifecycle is absent | OPEN | — |
| AUD-052 | 09 | Job AI suggestion is hardcoded timeout and three/four fixed skills | OPEN | — |
| AUD-053 | 05 | Standalone aiMatchService and MatchScoreBadge unused | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| AUD-054 | 05 | Historical global match UI removed; restore only Application context | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| AUD-055 | 05 | Exact-string score ignores skill aliases and deduplication | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| AUD-056 | 05 | Empty Job/Candidate can score 100 and missing data receives credit | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| AUD-057 | 05 | Score only calculated on create and becomes stale | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| AUD-058 | 05 | Breakdown/version/hash/coverage not persisted | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| AUD-059 | 05 | Default zero conflates uncalculated and real zero | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| AUD-060 | 05 | Cross-vacancy global ranking is not meaningful | TESTED | `applicationMatching`, `applicationScoreState`, `applicationMatchingUI`; 31 new passing checks; authoritative Application context |
| AUD-061 | 13 | Protected traits excluded and no automatic decision must remain invariant | OPEN | — |
| AUD-062 | 06 | Candidate-global statuses conflict with Application stages | OPEN | — |
| AUD-063 | 06 | No processing state, revision CAS or transition validation | OPEN | — |
| AUD-064 | 06 | DnD order not persisted and status requests can race | OPEN | — |
| AUD-065 | 06 | No interview schedule/timezone/interviewer/results/next action | OPEN | — |
| AUD-066 | 06 | SMTP awaited per request with no durable retry/idempotency/visible delivery | OPEN | — |
| AUD-067 | 10 | CV pipeline manual rollback can leave file/record orphans | OPEN | — |
| AUD-068 | 13 | HR user.create does not override privileged role.update account administration | OPEN | — |
| AUD-069 | 04 | No HR Brand catalog or Brand/Branch relationships | TESTED | `recruitmentCatalog.test.cjs`, `recruitmentCatalogUI.test.cjs`; 23 new checks; analytics field/filter contract only, implementation tracked in P07 |
| AUD-070 | 07 | No dedicated scoped HR funnel/source/brand analytics | OPEN | — |
| AUD-071 | 11 | No ingestion source identity or person-level deduplication | OPEN | — |
| AUD-072 | 08 | HR lists unbounded with full populated documents | OPEN | — |
| AUD-073 | 08 | CV parse then create double uploads file synchronously | OPEN | — |
| AUD-074 | 08 | HR service requests lack signal/dedup despite safe main Dashboard implementation | OPEN | — |
| AUD-075 | 08 | Search/filter/render all records without pagination/virtualization/debounce | OPEN | — |
| AUD-076 | 08 | Compound filter/sort indexes missing | OPEN | — |
| AUD-077 | 08 | N+1 was not confirmed; measure query behavior instead of asserting it | OPEN | — |
| AUD-078 | 08 | Mobile accessibility not verified despite responsive CSS | OPEN | — |
| AUD-079 | 03 | DOCX has download but no native preview | TESTED | `cvExtraction`, `cvReview`, `cvConcurrency`, `cvReviewUI`: 50 new passing checks; full 1101/1101 |
| AUD-080 | 11 | No Graph/OAuth/poll/delta/webhook renewal integration | OPEN | — |
| AUD-081 | 12 | No approved external API/public application adapter | OPEN | — |
| AUD-082 | 12 | External website capabilities and administrator access unknown | OPEN | — |
| AUD-083 | 12 | Signed identity/privacy/anti-malware required before external real CV ingestion | OPEN | — |

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
| P03-028 | Real OCR E2E only with tested implementation | OPEN | Deferred to background/OCR package 10; scanned originals retained as unsupported_ocr, not claimed extracted |

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
| P06-001 | Replace Candidate-global board | OPEN | — |
| P06-002 | New application stage | OPEN | — |
| P06-003 | AI processing separate from HR stage | OPEN | — |
| P06-004 | Initial selection stage | OPEN | — |
| P06-005 | Interview stage | OPEN | — |
| P06-006 | Offered/Hired/Rejected decisions | OPEN | — |
| P06-007 | Persist drag and drop | OPEN | — |
| P06-008 | Independent status across vacancies | OPEN | — |
| P06-009 | Interview schedule | OPEN | — |
| P06-010 | Timezone | OPEN | — |
| P06-011 | Interviewer | OPEN | — |
| P06-012 | Interview result | OPEN | — |
| P06-013 | Substatus and next action | OPEN | — |
| P06-014 | Event before/after | OPEN | — |
| P06-015 | Event actor/timestamp/reason | OPEN | — |
| P06-016 | Transition validation | OPEN | — |
| P06-017 | Revision and 409 conflicts | OPEN | — |
| P06-018 | Optimistic UI rollback/refetch | OPEN | — |
| P06-019 | Status filter | OPEN | — |
| P06-020 | Search | OPEN | — |
| P06-021 | Sorting | OPEN | — |
| P06-022 | Profile quick edit | OPEN | — |
| P06-023 | Permission change fail closed | OPEN | — |
| P06-024 | Interview notification tests | OPEN | — |
| P06-025 | SMTP failure does not hide successful status change | OPEN | — |

## Package 07: HR analytics

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P07-001 | GFC overall dashboard | OPEN | — |
| P07-002 | KFC dashboard | OPEN | — |
| P07-003 | Pizza Hut dashboard | OPEN | — |
| P07-004 | Simit Sarayı dashboard | OPEN | — |
| P07-005 | Brand filter | OPEN | — |
| P07-006 | Branch filter | OPEN | — |
| P07-007 | Vacancy filter | OPEN | — |
| P07-008 | Date filter | OPEN | — |
| P07-009 | Source filter | OPEN | — |
| P07-010 | Status filter | OPEN | — |
| P07-011 | Active vacancies | OPEN | — |
| P07-012 | New applications | OPEN | — |
| P07-013 | Parsing/review queue | OPEN | — |
| P07-014 | Source distribution | OPEN | — |
| P07-015 | Application funnel | OPEN | — |
| P07-016 | Interview pipeline | OPEN | — |
| P07-017 | Offered/hired/rejected counts | OPEN | — |
| P07-018 | Time in stage | OPEN | — |
| P07-019 | Time to hire | OPEN | — |
| P07-020 | Score distribution | OPEN | — |
| P07-021 | Duplicate/review alerts | OPEN | — |
| P07-022 | Integration health | OPEN | — |
| P07-023 | Same scoped Application/Job datasets | OPEN | — |
| P07-024 | Server aggregations | OPEN | — |
| P07-025 | Small DTO without sensitive Candidate data | OPEN | — |
| P07-026 | Correct empty state | OPEN | — |

## Package 08: Performance and stability

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P08-001 | Scoped HR pagination | OPEN | — |
| P08-002 | Bounded payloads | OPEN | — |
| P08-003 | Safe projection | OPEN | — |
| P08-004 | Appropriate indexes | OPEN | — |
| P08-005 | Versioned backward-compatible transition | OPEN | — |
| P08-006 | Job-specific queries | OPEN | — |
| P08-007 | Searchable Candidate lookup | OPEN | — |
| P08-008 | Debounce | OPEN | — |
| P08-009 | Cancellation | OPEN | — |
| P08-010 | Virtualization/lazy loading | OPEN | — |
| P08-011 | Memoization | OPEN | — |
| P08-012 | Large Kanban handling | OPEN | — |
| P08-013 | 0-record benchmark | OPEN | — |
| P08-014 | 5000-record benchmark | OPEN | — |
| P08-015 | 50000-record benchmark | OPEN | — |
| P08-016 | Response size measurement | OPEN | — |
| P08-017 | Latency measurement | OPEN | — |
| P08-018 | Query behavior | OPEN | — |
| P08-019 | UI rendering measurement | OPEN | — |
| P08-020 | Memory measurement | OPEN | — |
| P08-021 | No unmeasured live performance claims | OPEN | — |
| P08-022 | Loading and skeleton | OPEN | — |
| P08-023 | Error and empty | OPEN | — |
| P08-024 | Retry | OPEN | — |
| P08-025 | Accessibility | OPEN | — |
| P08-026 | Responsive | OPEN | — |

## Package 09: Real AI provider

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P09-001 | Remove hardcoded AI suggestions | OPEN | — |
| P09-002 | Configurable backend adapter | OPEN | — |
| P09-003 | Title and responsibilities context | OPEN | — |
| P09-004 | Restaurant/brand context | OPEN | — |
| P09-005 | Experience and criteria context | OPEN | — |
| P09-006 | Structured required/preferred skills | OPEN | — |
| P09-007 | Explanation | OPEN | — |
| P09-008 | Confidence/uncertainty | OPEN | — |
| P09-009 | Source context | OPEN | — |
| P09-010 | HR approval/edit | OPEN | — |
| P09-011 | Schema validation | OPEN | — |
| P09-012 | Timeout | OPEN | — |
| P09-013 | Bounded retry | OPEN | — |
| P09-014 | Rate limit | OPEN | — |
| P09-015 | Cost budget | OPEN | — |
| P09-016 | Usage logging without sensitive input | OPEN | — |
| P09-017 | AI-assisted CV review | OPEN | — |
| P09-018 | Explicit unavailable state | OPEN | — |
| P09-019 | Mock never presented as real AI | OPEN | — |
| P09-020 | Untrusted CV prompt injection defense | OPEN | — |
| P09-021 | Data disclosure controls | OPEN | — |
| P09-022 | Adapter mock tests | OPEN | — |
| P09-023 | Real AI E2E with actual provider credentials | BLOCKED_EXTERNAL | Approved credentials/configuration unavailable; local adapter work remains independent |

## Package 10: Durable storage and background processing

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P10-001 | Private object storage adapter | OPEN | — |
| P10-002 | Authorized file access | OPEN | — |
| P10-003 | Original CV retention | OPEN | — |
| P10-004 | Parsing metadata | OPEN | — |
| P10-005 | Source identity | OPEN | — |
| P10-006 | Existing file migration plan | OPEN | — |
| P10-007 | Existing file fallback | OPEN | — |
| P10-008 | Bounded parsing jobs | OPEN | — |
| P10-009 | OCR jobs | OPEN | — |
| P10-010 | AI jobs | OPEN | — |
| P10-011 | Email jobs | OPEN | — |
| P10-012 | Ingestion jobs | OPEN | — |
| P10-013 | Idempotency | OPEN | — |
| P10-014 | Job state | OPEN | — |
| P10-015 | Retry/failure monitoring | OPEN | — |
| P10-016 | Reuse infrastructure | OPEN | — |
| P10-017 | Justify additional resources first | OPEN | — |
| P10-018 | Real storage durability test | BLOCKED_EXTERNAL | Approved credentials/configuration unavailable; local adapter work remains independent |
| P10-019 | Real storage recovery test | BLOCKED_EXTERNAL | Approved credentials/configuration unavailable; local adapter work remains independent |
| P10-020 | Access control tests before real CV acceptance | OPEN | — |

## Package 11: Outlook Microsoft Graph

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P11-001 | Approved GFC mailbox adapter | OPEN | — |
| P11-002 | OAuth/application permission choice | OPEN | — |
| P11-003 | Least privilege mailbox scope | OPEN | — |
| P11-004 | Token lifecycle | OPEN | — |
| P11-005 | Polling/delta or webhook | OPEN | — |
| P11-006 | Pagination | OPEN | — |
| P11-007 | Subscription renewal if used | OPEN | — |
| P11-008 | Attachment ingestion | OPEN | — |
| P11-009 | Deduplication | OPEN | — |
| P11-010 | Retries | OPEN | — |
| P11-011 | Rate limits | OPEN | — |
| P11-012 | Sync health | OPEN | — |
| P11-013 | Subject/recipient/vacancy matching | OPEN | — |
| P11-014 | Ambiguous matching HR review | OPEN | — |
| P11-015 | No token/CV logging | OPEN | — |
| P11-016 | Tenant setup checklist | OPEN | — |
| P11-017 | Mailbox setup checklist | OPEN | — |
| P11-018 | Admin consent checklist | OPEN | — |
| P11-019 | Credential setup checklist | OPEN | — |
| P11-020 | Real mailbox E2E requires access | BLOCKED_EXTERNAL | Approved credentials/configuration unavailable; local adapter work remains independent |

## Package 12: External career sources

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P12-001 | Public kfc.az research | OPEN | — |
| P12-002 | Public pizzahut.az research | OPEN | — |
| P12-003 | Public JobSearch research | OPEN | — |
| P12-004 | First-party API/webhook evidence | OPEN | — |
| P12-005 | Actual form destination evidence | OPEN | — |
| P12-006 | Email notification evidence | OPEN | — |
| P12-007 | CSV/admin export evidence | OPEN | — |
| P12-008 | Official partner API evidence | OPEN | — |
| P12-009 | Approved adapter interfaces | OPEN | — |
| P12-010 | Actual email/Google Forms channels only | OPEN | — |
| P12-011 | No unauthorized private scraping/login bypass | OPEN | — |
| P12-012 | BLOCKED_EXTERNAL_ACCESS with required access | OPEN | — |
| P12-013 | Approved alternative integration path | OPEN | — |
| P12-014 | Public form abuse/rate limit | OPEN | — |
| P12-015 | Upload validation | OPEN | — |
| P12-016 | Anti-malware gate | OPEN | — |
| P12-017 | Signed source identity | OPEN | — |
| P12-018 | Idempotency | OPEN | — |
| P12-019 | Privacy controls | OPEN | — |
| P12-020 | Real external integration E2E requires approved access | BLOCKED_EXTERNAL | Approved credentials/configuration unavailable; local adapter work remains independent |

## Package 13: E2E security and readiness

| ID | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| P13-001 | Disposition every prior finding | OPEN | — |
| P13-002 | Source to ingestion E2E | OPEN | — |
| P13-003 | Private storage E2E | OPEN | — |
| P13-004 | Extraction/OCR E2E | OPEN | — |
| P13-005 | HR review E2E | OPEN | — |
| P13-006 | Candidate and Application E2E | OPEN | — |
| P13-007 | Scoring and Kanban E2E | OPEN | — |
| P13-008 | Interview/decision/analytics E2E | OPEN | — |
| P13-009 | Three brands | OPEN | — |
| P13-010 | Multiple branches | OPEN | — |
| P13-011 | Same Candidate multiple vacancies | OPEN | — |
| P13-012 | PDF/DOCX/scanned documents | OPEN | — |
| P13-013 | AZ/EN/RU fixtures | OPEN | — |
| P13-014 | Mixed scopes | OPEN | — |
| P13-015 | Duplicate CV | OPEN | — |
| P13-016 | Retries and provider outage | OPEN | — |
| P13-017 | Stale requests/concurrent updates | OPEN | — |
| P13-018 | Large datasets | OPEN | — |
| P13-019 | Frontend/backend compatibility | OPEN | — |
| P13-020 | Security/privacy/retention | OPEN | — |
| P13-021 | Separate local mock and real external evidence | OPEN | — |
| P13-022 | All package commit SHAs | OPEN | — |
| P13-023 | Full finding disposition | OPEN | — |
| P13-024 | Tests and benchmarks | OPEN | — |
| P13-025 | API/model/frontend changes | OPEN | — |
| P13-026 | AI/Outlook/external setup | OPEN | — |
| P13-027 | Production risks | OPEN | — |
| P13-028 | Ready and blocked modules | OPEN | — |

## Execution ledger

| Package | Commit | Validation | Remaining risk |
|---|---|---|---|
| 01 | `a832bd76f918d6a142e3086c1a5be108935a0000` | Target 85/85; full regression 1020/1020; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 13 existing warnings | Scope-denied parents return null; UI normalization/lifecycle remains package 02 |
| 02A | `80fa2d709b3213a7f6a3abc60072cebeb5a57562` | Full regression 1029/1029; HR + summary target 44/44; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 13 existing warnings | UI lifecycle and edit form criteria still OPEN; replaced old files retained for migration |
| 02B | `10f01026948e8b2bc0ad2b2f9fcd018d144b668e` | Full regression 1051/1051; HR browser targets 30/30; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 9 warnings (baseline 13) | CV review/extraction and contextual score contracts remain packages 03/05; no external ingestion activated |

| 03 | `bb561691b0faafd635bcc7b217b24a9455c3d7fe` | Full regression 1101/1101; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 9 warnings | OCR is not implemented; historical unknown zeros not rewritten; old files retained for package 10 |

| 04 | `942df3fc87fe8bda9c148fcb12e267b9c0165c84` | Full regression 1124/1124; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 9 warnings | HR locations do not expose audit Restaurants; no legacy brand backfill; analytics execution remains package 07 |

| 05 | `feat(hr): version contextual Application matching` (SHA recorded next update) | Full regression 1155/1155; target matching/state 24/24; browser 28/28 including prior lifecycle; authorization 632/632; smoke 13/13; TS/build PASS; lint 0 errors / 9 warnings | Conservative role/date aliases may require HR evidence; no global score or automatic hiring decisions |

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
