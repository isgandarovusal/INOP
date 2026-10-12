# Focused HR analytics and branding release — 2026-10-12

The user reports faster other HR pages and a finite but slow analytics load. This release changes analytics delivery and a small sidebar/login CSS area; it does not rebuild HR or change Audit modules, production data/roles/indices/env/secrets, infrastructure or provider/intake flags.

| Package | Source commit | Result |
|---|---|---|
| Analytics |55d22c83b5e65b94ac8437154f842f41142df188 |Scoped fast overview; independent current-fact scores; operations on intent; old full API compatible |
| Limited visual |0a7fe62be477f4aedebc2d9ce3ecd51d8b338590 |Centered144px logo, fitted language row, navy/white login; same asset bytes |

Both source commits were normal fast-forward pushed to existing `inop-main`:a4e7fdf→0a7fe62; exact remote parity confirmed. Local branch remains `work`, previous commits preserved. Final documentation commit has no runtime change; its own SHA/push parity is reported afterward. No force, new branch, migration/seed, provider/storage/scanner activation or new hosting resource.

## Measured bottleneck and implementation

Owned loopback full0/5000/50000Application request70.63/356.18/3157.04ms; the corresponding main Application aggregation6.28/338.88/3139.78ms. Full response waits for both Candidate/history facets and current Job/Candidate fingerprint scanning; metrics aggregation dominated the50k sample. This identifies a local bottleneck, not the unavailable hosted cause.

New additive GET routes all retain independent Application and Job read scopes, optional Candidate scope, canonical Admin/dep_hr admission and current server authority/parent rechecks:

- `/hr/analytics/overview`:actual KPI/funnel/sources/brand/options, no Candidate join, event history or score fingerprinting. DTO version `hr-analytics-overview-v1`.
- `/hr/analytics/scores`:current facts and versioned score states/distribution, independent count-consistency check; bounded1000Candidate batches and request-only500Job fingerprint cache. DTO version `hr-analytics-scores-v1`.
- `/hr/analytics/operations`:review/duplicates/interviews/stage/hire/delivery/health details on tab intent, without repeating scores; existing full envelope shape.
- Original `/hr/analytics` retains its original full contract for old clients. The new frontend falls back to that validated contract only when an additive route returns404 during staggered auto-deploy. Authorization/errors/timeouts never cause fallback.

Initial overview and scores run concurrently with independent loading/errors/retry/abort/permission keys. Score or operations outage does not hide genuine KPI/funnel/source results. A secondary401/403 hides all shown metrics and retry revalidates the reads. Changed filter/user/permission data never uses the previous request state; language changes make no new read. Score is shown only when its own scan is consistent and its total equals the current overview total. Each response has its own timestamp; they are not a transactional snapshot across requests.

Pending-only `readJson` deduplication remains token/scope/filter-aware under StrictMode. No settled private/PII response cache or global authority cache was added. Operations are revalidated on re-entry. Requests are purposefully split, not falsely reported as fewer requests.

Existing schema indices are sufficient for the owned test:overview5000 executionStats returned5000/docs5000/keys5000 using `jobId_1` IXSCAN,48ms; no repeated Candidate/history lookup. Production index state remains unverified; no DDL was run there. More than500Job fallback retains equality joins/exact totals rather than truncating counts.

## Actual production-build profile

`Frontend/scripts/profileHRAnalytics.cjs`:real App/AuthProvider and one authenticated `/auth/me`, actual scoped loopback APIs, fresh Chromium navigation, public production code, KPI/score DOM plus two animation frames. Three runs per0/5000/50000Application cohort,9/9before and9/9after; no injected ready AuthContext. Synthetic preparation creates3benchmark Jobs even at0Applications; real completely empty UI is separately tested. No production records/providers/files were used.

Frontend baselinea4e7fdf, analytics after55d22c; visual-only CSS follows separately. Baseline frontend used original full endpoint on the then-uncommitted additive compatible Backend; original controller/route semantics independently passed full endpoint regressions. The raw profile's `backend` field records Git HEAD during execution, not proof that that process loaded an unmodified tree. Do not mislabel it as a hosted or original-Backend paired benchmark. The initial backend diagnostic ran original controller source before edits.

| Applications | First KPI before→after | Primary full→overview API | Full score before→after |
|---|---|---|---|
|0 |599.4→626.8ms |29.0→29.8ms |635.1→658.0ms |
|5000 |942.3→720.0ms |390.1→93.1ms |975.0→919.8ms |
|50000 |3869.3→923.1ms |3276.4→348.3ms |3901.1→3375.3ms |

50k first KPI improved≈76.1%; score readiness improved≈13.5%. Zero-record opening+27.4ms remains disclosed; no universal speedup or statistical/p95/live claim. Heavy50k scores still take≈2.81s API/3.38s navigation; Operations API≈3.09s on intent, independent of initial KPI. Future materialization would require a separate architecture/data-lifecycle decision and is outside this focused release.

Initial physical reads including auth:2→3(one `/me` plus two genuinely different scoped data endpoints, each once); Operations adds1intent read. Initial50k aggregate JSON2871→1763overview+392scores=2155B; reading all Operations later adds2616B, so all-tab total bytes increase. Public decoded code848200→850093B(+1893B,≈0.22%); no new dependency/global auth/other HR fetch layer. Median maximum observed long task0:67→74ms,5k:57→72ms,50k:72→77ms. These are browser long-task observations, not isolated React CPU or proof of universal render improvement. Main improvement is earlier actual data availability, not a hidden spinner.

Raw evidence:/workspace/inop-hr19-before-measure.json; /tmp/inop-hr19-production-before.json and after.json; /workspace/inop-hr19-explain.json. Separate exploratory after microbenchmark predates final edits and is not the final performance certificate. Production source/build copies were archived only when created during this task; original files/.env/ignored artifacts retained.

## Limited visual and regression evidence

Sidebar existing logo160→144px, centered, intrinsic2.5ratio retained; topbar112px unchanged. Language controls stretch within actual remaining sidebar width, including classic scrollbar gutter. Default headless overlay scrollbar had no overflow; reserving classic gutter reproduces old244client/257scroll and current244/244. Overflow is corrected rather than masked. No logo asset bytes changed; existing provenance in INOP_BRAND_ASSETS remains, no raw/vector-master claim.

Login left is solid deep navy `#0b1830`, right explicit white, small spacing/brand refinements; mobile stays stacked. No new gradient/neon/effect/dependency. Actual320/768/1440screens inspected; language/password/mock-submit/error/asset-budget remain tested. Synthetic UI credentials do not prove a real hosted login.

Audit test coverage was strengthened:the old filename comparison substituted only separately injected admin.css while four requested @imports lived inside App.css. It now requires all5actual source substitutions, then compares4Audit screens×2widths against406ac4f. All8computed content-style comparisons pass; no Audit module source/API/function change. AUD-156 records and corrects this past test gap.

| Final relevant check | Result |
|---|---|
| Backend analytics/independent scopes/current authority/500Job overflow/100branches |60/60,0fail/skip/cancel;29.37s |
| Final analytics UI including held score,503Operations,403fail-closed/retry,404old-backend compatibility |16/16 |
| Frozen0a7fe62 dense/responsive/workspace, other HR pages/mobile/long text/canonical Audit exclusion |116/116,96.57s |
| Combined visual/login/Audit |30/30; final visual screenshot/proportion assertions15/15 |
| Both package TypeScript app/node and actual Vite build |PASS |
| Lint |0errors/9unchanged non-HR warnings |
| Both package smoke / established authorization gates |13/13 and632/632 each |
| Diff check |PASS |

Earlier130integration run and intermediate failed test logs remain historical; current116other-workspace plus16final analytics are explicit source-focused checks. No new full576frontend/1877backend suite is claimed or redundantly run. Failed first visual run had wrong bundled-style lookup and scratch ENOSPC leading drawer state cascades; corrected serial tests pass with all assertions preserved. Existing full phase18 evidence remains separately source-bound, not reused as a new source PASS.

## Deployment and remaining gate

Post-source-push read-only supplied frontend, Render panel, Vercel panel and GitHub commit status all fail proxy CONNECT403/curl56/HTTP000 before TLS. That is not an application403, a proved deploy failure, or a success. Actual Render/Vercel build/deploy/health/servedSHA/authenticated live analytics remains **UNVERIFIED**. Supplied frontend address was a previous deployment-style URL; its current production-alias role is not assumed. No backend public URL was guessed.

Local manual/core HR release checks pass; current source is on existing GitHub main. User/hosting follow-up:confirm existing Render and Vercel use the final main SHA, check `/health` at the actual backend URL, verify actual Admin/dep_hr zero/dense analytics KPI-before-score/operations, three brands/filters, Audit HR denial and existing private-download rules. The additive404 fallback prevents a broken analytics page while the backend is older; it temporarily retains old performance. Do not automatically roll back to old authorization vulnerabilities.

Real CV ingestion, unverified durable storage/scanner/recovery/AI/Graph/external integrations stay disabled/NO-GO. Lawful retention remains OPEN. No production DB/index/migration/seed/credential/user role/storage/hosting change was made. Final422acceptances:401TESTED/20BLOCKED_EXTERNAL/1OPEN;156findings:148TESTED/7BLOCKED_EXTERNAL/1OPEN, original131 retained. Hosted operations and actual live improvement are unverified, not silently marked PASS.
