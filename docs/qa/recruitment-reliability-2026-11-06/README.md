# Recruitment reliability acceptance — 2026-11-06

Base: b37c1d9b9d51d70b6f39dc14f9cdd478bcd46727. Independent temporary clone; original full workspace and existing evidence unchanged. All fixtures synthetic. No production resources or model inference used.

## Reproduced and corrected

- Concurrent identical source retry commands: CAS loser previously returned 409; now rechecks current authoritative access and replays the winning command. Exactly one retry increment and no additional storage PUT. Different commands still conflict. Only CAS-loss path gains revalidation; ordinary path unchanged.
- Retry UUID/hash validation previously coerced arrays to strings. Non-string inputs now return 400 without changing the source.
- Processing HTTP guard previously overwrote service currentSource:false with a fingerprint-only true. It now preserves the authoritative rejection. Corrupted cached proposals expose no result, cannot be applied, and leave the manual draft intact. No demonstrated prior disclosure: the service already omitted rejected facts.
- Scanner health already failed closed after signatures expired but retained AV_READY. It now reports AV_DEFINITIONS without another scanner connection. Local protocol tests use a mock Unix daemon, not a real scanner acceptance.
- Dashboard StrictMode/navigation cancellations logged raw Axios errors before checking effect ownership. Stale effects now produce no diagnostics; active genuine failures retain visible UI errors and a fixed diagnostic without raw request/config data. No cache, timeout, request, visual or authorization policy change.

## Real MongoDB and focused QA

Existing native MongoDB replica set, loopback port27018; no Docker volume created. Deterministic barriers force competing source retry CAS operations.

| Scope | Result |
|---|---|
| Source retries, AI HTTP, processing HTTP, private-storage authorization, scanner protocol | 72/72 PASS |
| Scanner Unix/native adapter readiness | 25/25 PASS |
| Async runner, process bounds, scope selector | 22/22 PASS |
| Final real browser: milestone app, session efficiency, AI processing, intake repair, request lifecycle | 23/23 PASS |
| Frontend build/lint; changed JS syntax; diff whitespace | PASS |

Counts overlap and must not be summed as unique coverage. Existing Vite chunk-size warning remains.

## Browser and performance evidence

Actual local App and loopback HTTP synthetic fixtures; system Chromium. Login, Dashboard refresh/repeat navigation, candidates/vacancies, search/pagination, CV evidence/manual review, logout/reauthentication and Audit smoke ran. Screenshots captured and opened for visual inspection at1440/768/390/320px, covering AZ/EN/RU. No observed clipping, overlap, glyph corruption or unintended design change in inspected screenshots. Main smoke had zero unexpected console/API/websocket failures; one expected navigation abort. Deliberate genuine Dashboard failure separately asserts its fixed diagnostic and visible error.

Existing summary request behavior preserved: initial/repeat navigation2 reads, focus remains2, explicit Refresh4 cumulative. Before-fix StrictMode cancellations emitted four discarded-effect diagnostics; after-fix none. No remote cold-start measurement. Source retry concurrency issues one mutation, one manualRetries increment and zero additional PUTs.

Screenshot SHA256 manifest accompanies sanitized synthetic screenshots. Raw temporary logs are not committed because before-fix diagnostics or transport errors may contain request metadata. Temporary raw evidence remains under /tmp/inop-approved-recovery/reliability-next-evidence and is ephemeral.

## Hosted CI failure root cause and repair

Previous routine42185311699 succeeded. Comprehensive42185366259 failed in backend tests:2471 total,2467 passed,4 failed. Connector-retrieved hosted log identified all four in browserSuiteRunner.test.cjs: obsolete synchronous mocking and15-group/34-file expectations after the previously delivered async runner and16-group/38-file manifest. Backend step lasted7m39s, not a timeout. Local reproduction failed before correction. Tests now await the real runner contract and retain failure/signal/invalid-port/selection assertions. Full runtime coverage stays16groups/38files; matching runs once. Routine safety now includes this cheap contract test. Full release gate remains manual/scheduled, with bounded child processes; no required check removed.

## AI and operational readiness

No new real contextual inference is claimed. Existing42 AZ/EN/RU scenarios and14 safety scenarios remain the baseline; UI AI provider here is a mock. No newly verified compact multilingual checkpoint with exact accessible artifact, revision, digest and compatible runtime was available; prior official distribution route was blocked. No repeated downloads, unverified mirrors or extra dependencies. Semantic production qualification remains disabled; deterministic ATS and human decisions unchanged.

Still requires staging/owner acceptance: real scanner engine and fresh signature checks, private storage restore integrity, production worker recovery/load, source-owner integration approval, and meaningful real multilingual contextual quality/latency/memory/licensing gates. Local tests do not certify production readiness. Audit scoring, approved design, CV privacy and existing leases/provenance remain unchanged.
