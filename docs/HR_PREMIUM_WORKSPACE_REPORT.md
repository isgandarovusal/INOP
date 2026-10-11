# HR premium workspace and opening lifecycle — package 16

2026-10-11. Existing `work` checkout, baseline `8134e354864d7ead2972d85ae83c9bd76a6f40bf`, existing `inop-main` release target. No branch creation, role rewrite, API/schema change, database migration, seed overwrite or external-provider activation. Prior commits, all original tracker IDs and external blockers are retained.

## What changed

- HR requests have a finite 15-second UI deadline, cancellation, distinct timeout/error states, a three-second slow-response hint and manual retry. Old responses cannot restore data after route/permission changes. Other Audit resource timings are unchanged.
- Compact request feedback replaces nested generic state pages and four loading skeletons. Production baseline measured the old loading container at **538px**.
- Job detail starts the independently server-authorized Job and application-ranking reads in parallel. Secondary records remain hidden until the primary Job is readable. The candidate-linking lookup still requires a current readable, open, unarchived Job.
- Shared HR product navigation, restrained canvas/surfaces, readable typography, consistent controls, tables, profile cards, forms, board lanes, history and disabled source pages. Scoped CSS preserves other modules. Search fields retain icon/clear-button space, and the Job list uses a keyboard-accessible title control.
- Analytics uses the existing `hr-analytics-v1` response. KPI, funnel, source bars and bounded memoized SVG score histogram use real scoped counts. Missing values and genuine zero remain distinct; loading KPI placeholders are dashes, never fabricated statistics. Cohort details remain available in a disclosure. No synthetic trend is added when the API contains no time-series data.
- No settled private-response cache is introduced. Existing auth-context pending-request deduplication and per-consumer cancellation are retained, avoiding PII reuse across permissions. Language changes retain data without extra reads.

## Evidence and limitations

Production profiling uses actual lazy routes, protected HR routes, production CSS and a synthetic authenticated context; actual authenticated GETs reach a uniquely owned loopback Mongo fixture. Each tested cohort has three catalog Job fixtures plus 0 or 5,000 synthetic application/candidate records. No real CV or hosted database is read. Measurements are single local samples, not a hosted SLA or isolated React CPU benchmark. Navigation/response-to-paint includes DOM work and two animation frames. Auth bootstrap, hosted DNS/TLS, Render cold starts and production credentials are outside this measurement.

Baseline artifact: `/tmp/inop-hr16-baseline-production.json` (10/10 scenarios). The existing backend optimization and serialized 0/5k/50k evidence remain in `HR_FINAL_API_BENCHMARK.md`; this frontend-only package does not change backend queries or indexes.

The exact final full-suite, before/after, commit and remote evidence is recorded below after validation. Investigative failures remain in `/workspace/inop-hr16b-target.log` and `...-target-corrected.log`; the source-page presentation and legacy Job CSS causing them were fixed without deleting assertions.

## Release limits

Real CV ingestion, durable object storage, scanner/recovery and unverified AI/Outlook/partner integrations remain **BLOCKED_EXTERNAL / NO-GO**. Feature flags and backend authorization are unchanged. Lawful retention remains open. A normal existing-main push is authorized for the validated UI/core changes; it does not certify hosted deploy success. Render/Vercel status, served SHA, live login and private downloads must be reported separately and cannot be marked PASS through proxy errors.

## Final production comparison

Source `d5ffbe7ebf8e166be027f2b828add10c3a91ee86`; three serialized measurements of the old baseline and three of final source, each with0/5k cohorts and five screens. **30/30 baseline and30/30 final scenarios PASS**. All data API responses200, one GET per opening, no page errors, bounded30-row lists /80-card board. Actual bytes remain unchanged apart from clock-dependent analytics JSON formatting. No full suite/build overlapped these measurements. Earlier richer-UI exploratory samples are retained separately; they motivated the deferred-card fix.

5,000-record medians, milliseconds except bytes:

| Screen | API before→after | Backend before→after | Response-to-paint before→after | Navigation before→after | Median JSON bytes | Max-long-task median before→after |
|---|---:|---:|---:|---:|---:|---:|
| jobs | 26.5→30.4 | 11.3→15.4 | 83.9→70.5 | 587.5→590.6 | 1554 | 0.0→54.0 |
| candidates | 29.0→20.6 | 16.9→15.7 | 120.4→67.5 | 653.3→576.8 | 14178 | 0.0→65.0 |
| applications | 38.5→30.3 | 34.4→27.6 | 112.7→109.3 | 666.4→645.0 | 23749 | 63.0→51.0 |
| board | 74.5→69.4 | 70.3→65.7 | 116.5→127.2 | 692.5→720.2 | 66687 | 57.0→55.0 |
| analytics | 369.6→370.6 | 362.8→365.4 | 70.8→55.4 | 957.4→896.7 | 2840 | 58.0→55.0 |

Every loading feedback container is64px, down from538px. Candidate card content-visibility defers offscreen layout/paint while preserving the same bounded data/keyboard and authorization contract. Baseline code is unchanged across its repeated runs yet timings vary: do not treat any median difference as a hosted guarantee or proof of a backend optimization. The backend code is unchanged. Board response-to-paint increased10.7ms and navigation27.7ms in these samples; not every path got faster. Cold-start long tasks remain (final median51–65ms in5k screens); total React CPU and memory were not isolated. Further hosted cold-start/network profiling needs actual deployment access.

At0 applications/candidates, candidate/application/analytics response-to-paint medians66.2→60.2 /58.9→50.8 /68.8→57.9ms. Three catalog Jobs deliberately remain in all synthetic cohorts. Honest zero charts/KPIs, editable filters, finite loading, error/retry and permission loss are independently tested.

Owned raw evidence: `/tmp/inop-hr16-baseline-production.json`, `...-baseline-repeat2.json`, `...-baseline-repeat3.json`, `...-final-repeat1.json` through3. Browser images: `/workspace/inop-hr16-premium-visual` (actual desktop/mobile synthetic fixtures). Reproducible script: `Frontend/scripts/profileHRWorkspace.cjs <full-source-SHA> /tmp/<new-report>.json`.

## Source commits and coverage

| Commit | Change | Package evidence |
|---|---|---|
| `cfed60344fed9d5caaf4c11b242fe2c64c0bbb27` | Bound HR loading, compact feedback and independently authorized parallel Job ranking |33/33 targeted; TS/build, lint0/9, smoke13, authorization632 |
| `a1d2b76b998b44b843d6bdd65040687d6286bec9` | Unified workspace, real charts, keyboard titles and unavailable-source presentation |104/104 combined targets,60/60 final visual matrix; TS/build, lint0/9, smoke13, authorization632 |
| `d5ffbe7ebf8e166be027f2b828add10c3a91ee86` | Actual analytics grid cascade and deferred offscreen candidate painting |81/81 targets incl. keyboard/permission removal; TS/build, lint0/9, smoke13, authorization632 |

14 route/form states at320/390/768/1440px: analytics, Jobs, Candidates, Applications, Application Kanban, Candidate profile, Job detail, Application detail, Job create/edit, Candidate create/edit, source queue/detail (honestly disabled). Horizontal data tables/board remain contained and scrollable; document overflow<=1px. Actual zero-data graphs, brand filtering, current canonical department removal, no language refetch, real persisted archive/workflow and keyboard actions remain covered. Shared confirm modal retains focus trapping, Escape/cancel and history semantics. No backend/API/model/lockfile/env/permission policy changes are included in these commits.

Browser coverage is Chromium desktop/mobile viewport emulation; real Safari/iOS/Firefox devices and hosted timings are not certified. Unsupported content-visibility falls back to the same bounded normal layout. Existing HR-only tokens avoid loading external fonts or adding a chart library. Screenshots use synthetic local data, not production candidate records.

Complete frontend suite: **509/509 PASS**,258284.902954ms, concurrency2; zero failures/cancelled/skipped/todo. Actual parallel private downloads remain enabled. Source/test/config532 hashes still match the frozen final source `d5ffbe7`. Complete backend suite: **1858/1858 PASS**,180646.797517ms, concurrency1 started after frontend finished; zero failures/cancelled/skipped/todo.

## Final gates and release observation

- Final source TSapp/node and production buildPASS; lint0errors/9unchanged warnings, all `react-hooks/set-state-in-effect` in existing AuditDetail(3), SafetyAuditsList, RestaurantsList, DepartmentsList, RolesOverview, UserForm and UsersList. No new HR lint warning.
- Smoke13/13 and separate authorization632/632PASS; complete509frontend +1858backend above includes all earlier HR contracts, authorization, responsive workflows and non-HR regressions. Existing database/model deprecation warnings do not become failed tests.
- All532 tracked Backend/Frontend/runtime inputs are SHA256-identical to the frozen tested source; only tracker/disposition/report/ledger documentation follows. Original520 tracker IDs remain, including all original131 audit findings. Current393acceptances/140findings retain19external acceptance blockers/7external findings and lawful retention.
- Fetched `inop-main` remains `8134e354864d7ead2972d85ae83c9bd76a6f40bf`, an ancestor of current work. Normal fast-forward push is authorized; no force/history rewriting/new branch is used. Remote confirmation is recorded after push.
- Pre-push Render panel, Vercel panel and supplied frontend route: curl56/HTTP000, proxy CONNECT403. Hosted application/API health, served SHA, live login/dashboard/Audit/HR/Execution/private downloads and auto-deploy outcomes are **UNVERIFIED**. Backend public URL is unavailable; no guessed domain or production credentials are used.

Core UI/local functional validation: **GO**. Hosted deploy success: **UNVERIFIED**. Real-CV ingestion/storage/scanner/external integrations and unrestricted operational activation: **NO-GO**. Verify served SHA and health in existing Vercel/Render panels, then login as authorized HR/Admin and check0-data analytics, Job/Candidate archive/restore, Application board/history, current permission loss and Bearer CV/source-document preview/download. Do not enable provider/intake flags or perform live migrations through this UI release.
