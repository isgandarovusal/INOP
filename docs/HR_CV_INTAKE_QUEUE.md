# Private source review queue (10D5)

Default-disabled additive GET `/api/hr/cv-intake?page=1&pageSize=30&status=ready&q=filename` uses current candidate.read permissions as Source scope and independently checks any linked Candidate. Rows **and counts** omit unreadable parents and missing completed parents. Pending approved-but-not-written parents remain recoverable; reserved/completed metadata is explicit without Candidate IDs, facts, contact fields, blob keys or receipt notes. Current role/JWT is loaded before and after IO, and page relationships are rechecked in one bounded follow-up aggregation; there is no per-row network query. A relationship/state race returns 409 without page data. This is a bounded query-time view, not a transaction across arbitrary simultaneous changes in all records.

Limits: page 1–2000, pageSize 1–30, escaped filename search <=80 characters, enumerated task state; maxTimeMS 2000 and follow-up 1000, no disk-spill permission. Unattached sources bypass unnecessary null parent lookups; receipt rows still apply both scopes. Heavy fields are projected out before joins/sort. Paging indexes are additive explicit DDL `{createdBy|departmentId|assignedTo, createdAt:-1, _id:-1}` plus global time/_id; autoCreate/autoIndex remain false. No index is created at startup or in production by this change. Existing unique command/quota indexes remain a runtime prerequisite.

The opt-in frontend `/app/recruitment/cv-intake` and Candidates queue link require `VITE_HR_DURABLE_INTAKE_ENABLED=true`; default UI performs zero requests. Debounced search, bounded paging, explicit reload, scoped pending/recovery counts, test-mode warning, distinct primary error states and stale authorization cancellation reuse existing hooks. Language switches do not refetch. Resume requires candidate.create in the UI and current independent server authorization on every request. Browser pages reject accidental private facts in a metadata DTO. Source providers/worker remain unconfigured and disabled; this UI is not an activation mechanism.

## Evidence

Owned loopback Mongo synthetic benchmark: 0 / 5,000 / 50,000 records with a private 4 KiB result each. Three runs, metadata-only JSON sizes 310 / 13,667 / 13,700 bytes; max30 items. Initial prototype 50k: 1889–1895 ms, one 2026ms Mongo timeout (not PASS). Final optimization: 0=7.11–19.58ms, 5k=28.26–36.57ms, 50k=203.42–218.81ms, no timeout/private payload. Process RSS includes fixture/insertion buffers: 124/184/253 MB; not HTTP-worker memory isolation or hosted performance. Approved-heavy cohorts were covered by authorization regressions, not a 50k linked-parent benchmark. Artifacts `/workspace/inop-hr10d5-source-benchmark.json` and owned runner outside repo; no production data touched.

UI final22/22; backend target final count recorded in tracker after execution. TS/build PASS, lint0/9, smoke13, authorization632. Initial UI harness expected an HTTP500 state for local malformed-DTO validation; corrected to existing generic `error`, still asserts no personal data rendered. All old audits/HR scopes and feature-off behavior preserved.

Real storage durability/recovery/approved malware scanner/worker activation, legal retention and hosted provider E2E remain separate gates. No public ingestion, automatic HR approval, env/secret/DDL/hosting/push/deploy operation.

### Lifecycle hardening (2026-11-06)

Worker completion now includes an unexpired-lease predicate alongside the current
running token. Synthetic regression advances the clock after the last guard:
previously stale parsed facts became ready; now no result/scan is committed by
the expired owner. Restart reclaims the same source, increments attempts and
rescans before publishing a valid review result. No extra query or HTTP call is
added to an ordinary successful attempt; scanner calls remain one per attempt.
The regression uses synthetic collaborators, not a real Mongo/provider/scanner
capacity or authorization acceptance result.

The server profile checks both durable-intake and scanner enabled gates before
returning a cached active profile. Closing the scanner gate therefore gives new
profile callers a disabled service while authorized metadata remains available.
This does not promise cancellation of a previously acquired in-flight service;
operator shutdown/drain and restart procedures remain required. No gate or
production environment was activated or edited by this change.

### Operational acceptance boundary

| Area | Evidence in this increment | Still required |
| --- | --- | --- |
| Lease/restart and metadata gates | Local deterministic regression | Staging real Mongo concurrent/restart acceptance; hosted CI for this SHA |
| Scanner | Injected clean/unavailable lifecycle tests; existing adapter reused | Actual daemon, official signatures <=24h,10s deadline/two-scan budget under combined load |
| Private storage/archive | Synthetic immutable readback, capacity and expiry tests | Owner-approved private configuration, real lost-ack/restart/restore, retention and deletion policy |
| Source integrations | Existing signed relay/brand contract unchanged | KFC/Pizza Hut site-owner contracts, consent/version, secret ownership and outbox acceptance |
| AI proposal | Source/evidence guards and offline42-case validator | Verified contextual model artifacts plus real AZ/EN/RU quality, attribution, latency and RSS |
| Production release | None performed; no configuration inspected/changed | Separate operator release/activation decision and approved synthetic smoke resources |

No new preflight endpoint is needed: existing profile availability, exact-index
checks and source/scanner guards remain the runtime checks. Passing configuration
or mocked tests does not establish external service availability or readiness.
