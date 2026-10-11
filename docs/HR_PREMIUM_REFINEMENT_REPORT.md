# HR premium refinement — phase 17

This report continues [the phase-16 report](HR_PREMIUM_WORKSPACE_REPORT.md). Hosted loading completes after a few seconds according to the user; it is not diagnosed as a hang. The objective is usable daily workflows and measured navigation speed, with restrained surfaces, genuine data and current server authorization.

## Product changes

- Primary search, status, sorting and archive controls stay visible. Secondary brand/branch/job filters use a keyboard-accessible disclosure with an active-filter count. Closed nested lookup controls do not fetch their catalogs; selected filters survive closing and remain clearable.
- Analytics has an accessible Overview/Operations tab set. Four real scoped KPIs and the genuine funnel/source/score DTO appear first; supporting review/interview/duration/integration panels remain available without another request. Empty charts preserve real zero heights, missing values remain unknown, and no fabricated trend/demo data is added.
- Application table/board view persists through refresh and browser back using the existing URL, including unrelated query parameters. Readable authorized parent titles are keyboard buttons; restricted parents remain text. Board lanes show actual counts and preserve paging, manual ordering, workflow, history and revision conflicts.
- Profile facts and mobile actions have readable compact grouping, long-text wrapping and usable touch targets. Unknown experience is not followed by a misleading “years” suffix. Numeric localized update timestamps retain the actual ISO value and Asia/Baku timezone, avoiding Chromium's unresolved Azerbaijani `M10` month marker.
- Public route code can load on authorized pointer/keyboard intent, ahead of a click. This does not execute a speculative component or fetch private data. Failed prefetch cannot poison a native module import; Save-Data/slow-connection and current HR membership checks apply. The public manifest revalidates and hashed code uses normal HTTP cache.
- Immediate HR visibility/focus pairs are coalesced for250ms: two identical data GETs become one. Later focus/manual retry/permission changes still revalidate. StrictMode and the existing current-context cancellation remain enabled; Audit resource timings are unchanged and settled private responses are not cached.
- Closed score widgets retain their truthful visible score but defer explanation/recalculation DOM until explicit intent. Evidence loads once on demand under the current independent scope, and is removed on permission loss.

All changes are frontend/test/documentation only. No backend route, API contract, role policy, schema, index, seed, secret, provider flag or hosted migration is changed. Canonical `dep_hr` membership remains independent of resource grants; Admin access is retained and Audit department is denied HR access.

## Measurement method and limits

The scripts use actual production lazy routes/CSS and authenticated scoped HTTP against uniquely owned loopback MongoDB fixtures. They inject a synthetic authenticated context: hosted login/bootstrap, DNS/TLS, Render cold starts and actual hosted latency are not measured. Zero-cohort benchmarks contain zero Applications/Candidates and three catalog Jobs; independent truly empty UI tests check all four genuine zero KPIs. Payloads are bounded30-row lists /80-card board; JSON bytes are uncompressed DTO bytes. Response-to-paint ends after DOM readiness and two animation frames, not isolated React CPU.

Raw production evidence and failed investigative logs are preserved outside the repository. Timing comparisons use identical cohorts and serialized measurements, never concurrent build/full-test load. Three-run medians are local evidence, not a hosted SLA. The existing phase-15 backend50k benchmark remains valid; this phase changes no queries or indexes.

### Navigation with controlled public-code transit

Baseline `76503c32d7fd8c8ad8decbf39895aa19c56f82bf`:12/12 scenarios. Optimized score source `70a345e74b8cddf8a8137436b64be2f52438ecc1`:13/13 including forced public-prefetch503 followed by successful real navigation. Each variant has identical controlled120ms target public-chunk transit and150ms pointer-intent lead. Three repeated measurements per mode/cohort; every navigation has zero private reads before click and one authorized data GET afterward.

| Cohort | Mode | Click→API start before→after, ms | Click→ready paint before→after, ms |
|---|---|---:|---:|
|0 |intent |179.6→71.2 |226.1→136.5 |
|5,000 |intent |173.8→69.0 |294.1→271.4 |
|0 |cold/no intent |177.8→180.6 |232.8→240.3 |
|5,000 |cold/no intent |179.4→181.4 |308.8→353.6 |

Intent navigation improves code availability, not backend latency. Cold navigation does not uniformly improve. Artifacts: `/tmp/inop-hr17-transition-baseline3.json`, `/tmp/inop-hr17-transition-optimized.json`; reproducible script `Frontend/scripts/profileHRTransitions.cjs`. The later Analytics datetime change does not modify the transition route; the final header-count correction changes only unresolved-state captions. These preceding source measurements are identified explicitly, not mislabeled as measurements of a later commit.

### Renderer investigation

An intermediate rich UI increased Application response-to-paint in noisy samples. Alternating five-before/five-after Chromium CDP traces were used to investigate actual render-window work; subsystem sums overlap and do not represent isolated React duration.

Intermediate `59bb4d6` had1,038 Application DOM nodes. Deferring closed score bodies reduces that to948, with the same30 visible rows; baseline has962. In the final score-source trace, median JS work is33.7→34.7ms, layout20.5→18.2ms, paint7.7→15.2ms and response-to-paint143.3→155.1ms. The richer accessible controls retain a paint cost: this is not a universal rendering speedup. Cold long tasks remain and are recorded in the final comparison.

Artifacts `/tmp/inop-hr17-application-render.json` and `...-render-optimized.json`:10/10 each; raw owned compressed traces are retained in `/workspace`. Reproducible script `Frontend/scripts/profileHRRender.cjs`. No keyboard semantics or StrictMode were removed to improve a benchmark.

## Source packages

| Commit | Change | Package validation |
|---|---|---|
|`55753e864fb5cb80dbd98869a031c0fbe52eb1e1` |Safe public-code intent and duplicate focus coalescing |26 targets; TS/build, lint0/9, smoke13, authorization632 |
|`59bb4d6a4a946d72534e0fa5bad2556985b7ea92` |Compact daily workflows, genuine analytics tabs, keyboard parents and URL board view |180 targets, final74 chart/visual tests and3 public-code cases; all gates |
|`70a345e74b8cddf8a8137436b64be2f52438ecc1` |Deferred closed score details and CDP investigation |59 matching/ranking/board/accessibility targets; all gates |
|`dedd4497af276a43c5ae816be608d58ca411e236` |Actual locale-safe update timestamp |74 chart/visual/three-locale targets; all gates |
|`997844757731b92cd093200682540fab0ff30319` |Unknown/failed list totals are not zero |4 actual-page loading/zero/500/retry cases,105 daily/responsive/lifecycle targets; all gates |

The source-bound final header correction, complete regression and repeated cold measurements are recorded below after validation. Earlier successful full-source proof is preserved: `dedd449` frontend548/548 (286407.433026ms, concurrency2), backend1858/1858 (184489.118599ms, concurrency1 after frontend), zero failures/cancelled/skipped/todo. Actual parallel private/source-document downloads remain tested. Backend inputs are unchanged throughout this phase.

## Responsive, workflow and security coverage

Actual AppShell/protected routes:14 screens at320/390/768/1440px, plus10 dense/long-text screens at320/768/1440. Analytics, Jobs, Candidates, Applications, Kanban, profile, Job/Application detail, Job/Candidate create/edit and disabled source queue/detail are included. Real35-row fixtures check bounded30-row lists and35 visible board cards, genuine counts and no aggregate PII. Document overflow<=1px; contained tables/board retain scrollability. Keyboard tabs, parent navigation, disclosure, mobile actions, empty data, long multilingual strings and current-department revocation are tested.

Existing create/edit/archive/restore, parent authorization, event history, drag order/status persistence, CAS409 rollback, 401/403/404/500, stale requests, timeout/manual retry, language-only no-refetch and parallel authorized download tests remain. Disabled source screens make zero intake requests. Browser evidence is Chromium viewport emulation, not certification of physical iOS/Safari/Firefox devices. Actual synthetic local desktop/mobile screenshots are inspected; they are not represented as hosted screenshots.

## Hosting and operational release limits

Fresh pre-push probe of the supplied HR frontend fails at proxy CONNECT403/curl56/HTTP000, before application TLS. It is not an application403 or proof of a deployment failure. Accessible hosting evidence and a confirmed public backend URL are unavailable; no URL or login credentials are guessed. Git transport is independently available.

Normal fast-forward to existing `inop-main` is authorized and remote parity is checked after pushing. Render/Vercel deployment and live API/login/HR/Audit/Execution/Bearer downloads must be verified separately; transport failure is never marked PASS. Existing hosting resources/branches are retained; no blind security-regressing rollback is performed.

Real CV ingestion, durable storage/scanner/recovery and unverified AI/Outlook/partner integrations remain **BLOCKED_EXTERNAL / operational NO-GO**. Lawful retention remains open. Local core UI validation does not approve these external gates or live migration. Existing provider/intake defaults stay closed; no hosted environment value is claimed verified.

## Final cold production measurements

Source `997844757731b92cd093200682540fab0ff30319`; baseline `76503c32d7fd8c8ad8decbf39895aa19c56f82bf`. Three serialized repeats each, **30/30 baseline and30/30 final scenarios PASS**, all data responses200 and one private GET per opening. No build/full suite ran concurrently with these measurements. The final header correction retains the same ready-state DTO/counts; unresolved counts are hidden rather than falsified.


### 5,000 synthetic records

| Screen | API before→after ms | Backend before→after ms | Response→paint before→after ms | Navigation before→after ms | JSON bytes | Max-long-task median before→after ms |
|---|---:|---:|---:|---:|---:|---:|
| jobs | 22.9→24.9 | 10.5→15.2 | 59.7→69.2 | 589.1→558.8 | 1554 | 0.0→0.0 |
| candidates | 24.4→19.7 | 17.3→13.9 | 64.9→69.1 | 545.1→586.8 | 14178 | 0.0→57.0 |
| applications | 32.7→27.4 | 29.0→25.2 | 122.6→111.9 | 640.8→615.8 | 23749 | 0.0→54.0 |
| board | 65.1→79.4 | 61.0→69.5 | 122.0→127.5 | 686.1→690.8 | 66687 | 61.0→0.0 |
| analytics | 372.0→363.0 | 368.7→359.2 | 55.0→51.2 | 938.5→886.9 | 2847 | 0.0→55.0 |

### Zero Applications/Candidates; three catalog Jobs

| Screen | API before→after ms | Backend before→after ms | Response→paint before→after ms | Navigation before→after ms | JSON bytes | Max-long-task median before→after ms |
|---|---:|---:|---:|---:|---:|---:|
| jobs | 43.0→42.6 | 21.9→21.7 | 63.8→61.5 | 620.6→599.5 | 1554 | 0.0→0.0 |
| candidates | 19.3→23.9 | 8.8→9.1 | 54.6→57.3 | 575.6→560.5 | 102 | 51.0→0.0 |
| applications | 25.0→23.0 | 16.4→15.6 | 54.8→66.1 | 573.3→592.0 | 102 | 0.0→63.0 |
| board | 23.1→20.9 | 18.2→17.6 | 58.6→54.4 | 560.1→569.5 | 1013 | 52.0→51.0 |
| analytics | 31.9→32.4 | 28.1→28.2 | 58.8→50.2 | 583.8→580.6 | 2751 | 0.0→57.0 |

Applications5k median response→paint122.6→111.9ms and navigation640.8→615.8ms; analytics navigation938.5→886.9ms. Candidate navigation545.1→586.8ms and board paint122.0→127.5ms retain measured increases. Cold results are mixed; intent prefetch cannot improve an arrival without prior intent. Backend medians vary although its code is unchanged, and are not claimed as backend optimizations. Remaining cold long tasks reach54–57ms median in5k samples; zero means no task at least50ms was observed, not zero CPU work.

Artifacts `/tmp/inop-hr17-baseline-production-repeat1.json` through3 and `/tmp/inop-hr17-final-release-repeat1.json` through3. Earlier source-bound exploratory/release artifacts and trace costs are retained; no unfavorable sample is discarded. Reproducible script `Frontend/scripts/profileHRWorkspace.cjs <full-source-SHA> /tmp/<new-report>.json`.

## Complete final regression and release evidence

- Final source `997844757731b92cd093200682540fab0ff30319`: **552/552 frontend tests PASS**,284471.474524ms, concurrency2. No failed/cancelled/skipped/todo; actual parallel authorized private/source-document downloads are included. Frozen540 tracked source/test/runtime hashes are unchanged after the run; only documentation follows.
- **1858/1858 backend tests PASS**,184489.118599ms, concurrency1 after the preceding548frontend run; zero failed/cancelled/skipped/todo. Subsequent changes are two frontend header captions and a frontend test; all Backend/shared runtime/test inputs remain byte-identical. That successful backend run is valid for the final unchanged backend, not misrepresented as a newly repeated run.
- Fresh `hr17e` TSapp/node and production buildPASS, smoke13/13 and authorization632/632. Lint0errors/9unchanged warnings: existing `react-hooks/set-state-in-effect` in AuditDetail(3), SafetyAuditsList, RestaurantsList, DepartmentsList, RolesOverview, UserForm and UsersList. No HR warning was added. Gate certificate `/workspace/inop-hr-gates/inop-packagehr17e-validation.json`.
- Full logs `/workspace/inop-hr17-final-release-frontend.log` and `/workspace/inop-hr17-full-backend.log`; frozen source `/workspace/inop-hr17-final-source-v4.json`. Earlier source-bound runs/failed investigative logs are retained, not overwritten as successful evidence.
- Initial533 phase17 tracker IDs preserved. Current404acceptances:384TESTED/19BLOCKED_EXTERNAL/1OPEN;146findings:138TESTED/7BLOCKED_EXTERNAL/1OPEN. Original131 audit findings are retained; lawful retention and genuine external gates are not silently closed. Per-commit changed paths are inventoried in [HR_LOCAL_COMMIT_LEDGER](HR_LOCAL_COMMIT_LEDGER.md).

Git source release normal fast-forward **`76503c32d7fd8c8ad8decbf39895aa19c56f82bf` → `997844757731b92cd093200682540fab0ff30319`** succeeded; `git ls-remote --heads origin inop-main` returned that exact SHA. Existing local branch remains `work`; no force, history rewriting or branch creation. Final report-only commit is pushed afterward and its actual SHA is verified by Git/final response; it does not invalidate unchanged source/build/test evidence.

Post-source-push read-only probes of the supplied Render panel, Vercel panel, HR frontend and GitHub commit status all return **proxy CONNECT403 / curl56 / HTTP000** before application TLS. Render deployment: **UNVERIFIED**. Vercel deployment: **UNVERIFIED**. Live health/login/HR/Audit/Execution/private downloads: **BLOCKED_BY_TRANSPORT**. This is neither a verified application403 nor a successful/failed deployment. The supplied frontend URL is not a newly confirmed production alias; no backend public URL is guessed. No security-regressing rollback is attempted.

Core UI/local functional validation: **GO**. Hosted deployment success: **UNVERIFIED**. Real-CV/provider/scanner/storage/recovery operational activation: **NO-GO**. Required hosted checks on existing infrastructure:

1. Confirm the final `inop-main` SHA is served by Vercel and built/healthy on Render; inspect build/runtime logs without exposing secrets.
2. Check the known backend URL `/health` returns200 and `{success:true,status:"ok"}`; verify frontend API points to that backend's `/api` without changing environment values blindly.
3. Login as authorized Admin/HR: verify real zero/nonzero analytics, compact filters, Job/Candidate archive/restore, Application table/board refresh/order/status/history, keyboard/mobile navigation and private Bearer CV/source preview/download.
4. Confirm Audit department cannot enter HR or read/export/download its data; verify current permission revocation removes displayed private content.
5. Keep intake/provider/worker/scanner/storage gates unchanged. Do not seed/reset/migrate the live DB or enable real CV intake based on these local results.
