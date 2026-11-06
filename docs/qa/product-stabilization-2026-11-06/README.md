# Product stabilization acceptance — 2026-11-06

Local synthetic acceptance only. Original full workspace is preserved; implementation uses its independent /tmp clone. No production data, configuration, scanner activation, messages, deployment or comprehensive gate.

## Working functionality delivered

| Package | Exact behavior / principal files |
|---|---|
| Login | `Frontend/src/Pages/Auth/Login/Login.tsx`, `Context/AuthContextProvider.tsx`, `Services/authService.ts`: valid submission is independent of pending session hydration; explicit login cancels obsolete restoration, pending submissions remain locked, DOM/autofill values synchronize into drafts, localized inline errors replace raw transport text and duplicate toasts. |
| Dashboard | `Pages/Dashboard/Dashboard.tsx`, `api/dashboardSnapshot.ts`, `api/aggregateCache.ts`: one RAM snapshot bound to session/token/permissions/backend, 10-second freshness and 60-second per-section reuse. No automatic Dashboard focus fetch; AuthProvider permission revalidation remains. Navigation after freshness expires revalidates in background, preserves known content and shows errors. Manual Refresh forces all endpoints. No browser persistence. Authorized recent candidate names may exist only in this bounded RAM snapshot; it is not a document/offline store. Audit mutations now also invalidate aggregates. Recent candidate links accept keyboard Enter/Space. |
| Duplicate review | `Backend/controllers/candidateDuplicate.controller.js`, `models/candidateDuplicateReview.model.js`, routes and `Frontend/src/Components/CandidateDuplicateReview.tsx`: on-demand exact-email/original-hash hints, at most five scoped profiles, independent update eligibility for BOTH records, current revision fingerprints and append-only human decisions (uncertain/same-person/different-people). No automatic merge, identity proof, Candidate edits, CV changes, Application reassignment or history deletion. Old decisions remain stored but are not presented as current after profile changes. |
| Personal workload | `Backend/services/recruiterWorkload.service.js`, `controllers/hrAnalytics.controller.js`, `Services/hrAnalyticsService.ts`, `Pages/Recruitment/Analytics/HRAnalytics.tsx`: one extra facet in the existing operations aggregation, not N+1 queries/new initial endpoints. Counts assigned-to-me applications inside the existing scoped Job/Application/filter cohort. Includes active, pending readable CV reviews, overdue next actions, pending interviews in next 7 days, current terminal stages entered in last 30 days, active stages older than 14 days. Not recruiter productivity; hidden/unknown CV review facts are excluded. No global recruiter directory/ranking. Baku date display uses existing central formatter. |
| CAPA correctness | `Backend/controllers/auditAction.controller.js`: reject unknown status payload fields, non-string and >4000-character verification notes before mutation. Existing rejected → in-progress → completed → independent verification flow remains usable and tested. No invented mandatory attachment/score policy. |
| Additional OSS | Test-only fast-check 4.10.2 with pure-rand 8.4.2, both MIT. `Frontend/tests/dashboardSnapshotProperty.test.cjs`: 500 reproducible generated cache traces and a targeted partial-refresh expiry test. No production bundle import. |
| PDF/OCR | `Backend/scripts/benchmarkPdfOcr.cjs/.py`: reproducible offline synthetic vector/scanned PDF benchmark with exact source hashes, real native OCR, marker/memory/latency/failure evidence. No production parser replacement. |

All new labels/errors have AZ/EN/RU translations. No CSS/design-system changes.

## Reproductions and measurements

Login failed the initial browser regression: hydration kept Submit disabled despite entered credentials. This could last until the existing 40-second XHR deadline. The deadline itself is unchanged. A separate failing regression found DOM-only autofill lost the password after a failed login; synchronizing captured form values fixes it. There is no remote Render cold-start measurement.

Dashboard baseline fresh return: 2 additional summary reads (6 cumulative versus 4 initial). Existing focus behavior also refetched Candidate/Audit summaries. After change:

| Local case | Summary HTTP reads | Loading behavior |
|---|---:|---|
| Initial Dashboard | 4 | Real initial loading retained |
| Fresh return within 10s | 0 | No replacement with loading text |
| Focus/visibility pair | 0 | Data retained; session permission check is independent |
| Return after simulated 11s | 4 | Background refresh, no loading flash |
| Manual Refresh | 4 | Explicit forced revalidation |

Actual interaction samples are in measurements.json. Latest autofill-specific Login sample is approximately 28ms valid input → enabled, 24ms submission → visible busy, 617ms local login → ready Dashboard. Earlier samples are recorded separately. These are individual local observations, not percentiles or hosted latency guarantees. Slow request tests hold responses deliberately and verify one submission, immediate busy state, retained drafts and recovery. Clock advancement tests TTL only, not real network latency.

## Focused QA and actual browser acceptance

- Backend duplicate review/workload/CAPA/analytics/queue integration: **29/29 PASS**, native isolated Mongo replica set. Includes simultaneous same-command duplicate-review writes, unchanged original Candidate records, scope denial, stale revisions, inaccurate input rejection and real persistence.
- Existing HR/Service/Standard/HSE scoring plus Audit lifecycle: **18/18 PASS**. Scoring/catalog implementations unchanged.
- Session/navigation/StrictMode/authorization browser regressions: **14/14 PASS**.
- Integrated feedback/CAPA/product smoke: **13/13 PASS**. Login, Dashboard, candidate/job navigation, feedback, findings/actions/independent verification, logout and Audit navigation actually executed.
- Updated authentication/intake/product browser run: **23/23 PASS**. Stored valid/revoked/expired/malformed/inactive/unavailable sessions, no pre-hydration protected reads, drafts, scope isolation and current product flows covered.
- Final changed Login/duplicate/workload visual rerun: **2/2 PASS**; final autofill-specific regression rerun: **1/1 PASS**.
- Date/selector/manifest/property checks: **28/28 PASS**, including 500 generated traces; counts overlap other runs and must not be summed as unique coverage.
- Build, lint, JS/Python syntax and diff checks PASS. Existing Vite large-chunk advisory remains; no warning threshold changed. Frontend npm audit including development dependencies: zero vulnerabilities. Backend dependency graph unchanged.
- A failed test-clock experiment is retained locally: simulated JS time does not advance Chromium native XHR.timeout. Corrected test verifies the production default stays 40000ms, then exercises real XHR abort with a fixture-only 1200ms override. No production timeout increase or weakened failure assertion.

Real Playwright screenshots at 1440/768/390/320 with AZ/EN/RU were opened and inspected. Login has one localized recoverable error, enabled submit, no transport text/toast duplication. Dashboard cards stay readable; duplicate form and long descriptions wrap at 320px; corrected HR Analytics date is day/month/year. Screenshots explicitly scroll to top before full-page capture to avoid fixed-header stitching artifacts. No observed horizontal overflow, clipped controls, broken glyphs or new design changes. Scoped axe WCAG2A/AA on Login form, Dashboard and duplicate-review region: zero violations; existing feedback/CAPA region checks retained. This is not whole-product WCAG certification. The clean integrated navigation smoke recorded zero unexpected console/API/websocket errors; synthetic 401/503 tests intentionally generate failures and must not be counted as clean-network runs.

## PDF/OCR results — actual extraction, not contextual hiring AI

See pdf-benchmark.json and pinned OCR artifact hashes. Three vector PDFs and three raster-only PDFs, synthetic EN/AZ/RU, no candidate data or external provider calls.

- INOP vector extraction: **12/12 exact markers**. MarkItDown: **12/12**. Neither reconstructs the drawn table as an authoritative structured table in this experiment.
- Raster PDF text extraction: **0/12** for both. Native Tesseract **5.5.0** with official hash-pinned `tessdata_fast/4.1.0` AZ/EN/RU models recovered **11/12** exact markers (EN4, AZ4, RU3). The Russian miss is a real limitation, not normalized into a PASS.
- Native OCR time: approximately **563–605ms/page** in the measured run; INOP process peak RSS **146MiB**, MarkItDown Python process **130MiB**. These process measurements have different runtimes/initialization and are not total system memory or production benchmarks.
- Lightweight signature validation accepts a malformed `%PDF-` header; actual INOP parsing rejects the malformed document. These are distinct gates. MarkItDown conversion accepted it through fallback. Do not replace authoritative INOP validation/parsing with permissive converter fallback.
- Source SHA256 and one-page OCR counts retained; no assertion that external converter text supplies authoritative page-level evidence. Existing production source/revision/scanner/OCR safeguards remain unchanged.
- Docling PDF/OCR **NOT RUN**: the previously reviewed slim DOCX experiment does not include verified PDF layout/OCR artifacts. No large model download.
- Real contextual qualification-model inference **NOT RUN**: no verified accessible contextual artifact/runtime has been established beyond prior official-host restrictions. OCR is genuine neural OCR, not AZ/EN/RU NLI. Deterministic ATS/guards and human hiring authority remain unchanged; production semantic hiring remains disabled.

## Open-source/skills adoption

Previous shortlist/license review is reused at `../opensource-capability-2026-11-06/README.md`; those projects are not rebranded as new integrations. No GPL/AGPL source or external agent scripts imported.

Additional adopted tool: https://github.com/dubzzz/fast-check, official MIT repository, nonarchived and updated 2026-11-06 at review; exact npm version/lock integrity pinned. Its pure-rand dependency is MIT. About 1.7MiB installed disk combined; no runtime application dependency. Install scripts disabled. Generated invariant tests provide reproducible seeds/counterexamples instead of manually enumerating only a few sessions.

Existing Microsoft Playwright and axe-core are extended, not newly adopted again. Official Clock API is used for TTL testing, with the native XHR limitation above. Existing MarkItDown/pdfminer and native OCR runtimes are reused only in the optional offline benchmark. Main application parser/dependencies unchanged. No hosted API receives private data.

Project-local safe-delivery and CAPA instructions were read and used. Skills now name real commands; the new performance-regression skill covers measurement, generated traces, screenshots and resource ownership. No additional autonomous agent was created.

## Genuine remaining gaps / rollout conditions

- New duplicate-review journal requires its declared unique `(actor,commandId)` index; writes fail closed with 503 if unavailable. Index was created and concurrency tested only in the isolated local fixture. Production database/index provisioning was not performed. Older backend simply lacks the additive route; no identity merge fallback exists.
- Review is non-destructive identity assessment, not an approved record-merging policy. Consolidating profiles/sources/history needs an explicit identity and retention policy. Cross-recruiter workload comparisons are not implemented; this milestone deliberately delivers personal scoped reporting without inventing staff visibility.
- CAPA independently verified closure and rework are tested; new external reinspection scheduling or mandatory photo policy was not invented.
- Staging recovery, fresh production scanner signatures, private-storage restore acceptance and source-owner approvals remain required operational acceptance. Local tests do not establish production readiness.
- Semantic AI contextual qualification quality gates and Docling PDF/OCR experiment remain open; no unsupported inference claim or production activation.

Raw diagnostic logs/optional runtimes stay in /tmp and can disappear. Selected sanitized screenshots, measurements, public license metadata and source hashes in this directory become durable after verified Git push. Existing original evidence is not overwritten or deleted.
