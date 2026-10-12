# INOP systematic HR refinement — phase18

12 October2026 (Asia/Baku). Existing work/main starting36464b6; no new branch, secret change, hosted resource, automatic DB migration or unverified ingestion/provider activation. The user observed live3s→5–6s. Supplied live frontend and hosting access currently fail at proxy CONNECT403/HTTP000, so that live regression's cause is **UNVERIFIED**, not diagnosed as an application hang or attributed to Render without evidence.

## Implemented, measured changes

1. AuthProvider pending opposite focus/visibility event pairs now share one physical /me read rather than aborting/reissuing two. Only same-token pending pairs within250ms coalesce; completed reads, repeated same events and token changes revalidate. No settled private/session cache. StrictMode and current permission revocation remain.
2. Application table no longer eagerly loads drag-and-drop. Its actual production chunk falls100569B→about13KB; board code (~86KB) starts with its scoped query only on board intent. Failed code and forced stalled code have explicit finite error/15s timeout/reload recovery, and late code cannot replace the timeout.
3. In-place styling cleanup removes81 identical earlier declarations and30 obsolete language/mark rules; login's851-line ambient/grid/orbit implementation becomes35 route-owned rules. Login CSS is no longer an initial HR stylesheet. One shared language control and a small shared brand asset replace duplicated markup/inline white text.
4. Desktop uses existing Sidebar once instead of duplicate HR navigation. Mobile shortcuts remain; the closed drawer is inert to keyboard focus, with expanded/controls/Escape semantics. Four Audit content screens×2widths retain exactly equal computed content styling; other Audit functionality is tested unchanged.
5. User-image-based INOP web derivatives320/640px are3.6/7.3KB, with intrinsic sizing/srcset/alt/async decode. The rough transparent extraction was rejected. The source image was visible but its original downloadable/vector master was not supplied to the execution filesystem; derivatives are not falsely called pixel-identical official master artwork. Provenance and handoff are in INOP_BRAND_ASSETS.
6. Additive GET /hr/ai/status uses current server role/canonical HR membership and returns only secret-free configuration metadata, always explicitly unverified. Shared on-demand setup checks add zero opening requests. Missing vacancy context/CV external consent/setup and auxiliary failures are explained; manual editing and explicit HR approval remain. No real provider, task worker, CV intake or storage/scanner is enabled. Full action/setup inventory is HR_AI_ACTIONS_AND_CONFIGURATION.
7. /me403 for an inactive account now expires only its matching captured token and clears stale frontend identity through the existing event. Transient500 retains a valid session; resource403 and old-token/new-login guards remain. This follows a real owned reproduction, not a new backend permission policy.

All original131 findings and all13-package acceptance requirements remain. No role/department inference, mass account rewrite, backend CRUD/scoring/export/download authorization relaxation, fake KPI/trend/AI result, hiring automation or protected-attribute matching was added.

## Auth-inclusive measurement method

Source before36464b6; final db6b560315ff4ad2a9aa150de0f1c0f0a0fa3195. Three serialized before/final runs each30cases: actual App/AuthProvider/protected lazy routes, real signed owned-fixture token, actual /auth/me and scoped API against uniquely owned loopback Mongo. No ready fake session is substituted. Every case has one /me and one primary GET, all200, no page errors, bounded30-row lists /80-card board. No build/full suite overlaps these measurements.

Network/API timing and actual public asset graph are recorded. Response→paint is DOM readiness plus two frames, not isolated React duration. ServerTiming app duration is local application time, not hosted Mongo/network cold start. Bytes are decoded/uncompressed unless labelled wire. Zero cohort has0Applications/Candidates but three deliberate catalog Jobs; truly empty UI states are independently tested. Chromium viewport emulation is not physical Safari/iOS/Firefox or hosted p95 certification.

###5,000-record medians

| Screen | /me before→after ms | Primary API before→after ms | Backend app before→after ms | Response→paint before→after ms | Navigation before→after ms | Primary JSON bytes | Public decoded bytes before→after |
|---|---:|---:|---:|---:|---:|---:|---:|
| jobs | 17.4→12.3 | 21.1→21.8 | 10.2→9.8 | 57.5→58.8 | 592.7→601.7 | 1554 | 870518→864717 |
| candidates | 14.2→10.6 | 26.7→17.2 | 17.8→13.0 | 71.3→59.2 | 648.4→594.1 | 14178 | 868046→862206 |
| applications | 12.5→11.2 | 30.7→30.5 | 25.6→26.8 | 132.2→181.5 | 718.0→745.1 | 23749 | 979636→876886 |
| board | 17.0→9.7 | 84.1→79.0 | 81.2→75.3 | 134.3→103.4 | 742.8→725.5 | 66687 | 979636→975781 |
| analytics | 12.4→11.9 | 391.1→369.1 | 388.4→365.5 | 47.9→51.7 | 978.0→955.1 | 2847 | 854084→848200 |

Cold results are **mixed**, not a universal speedup. Candidates648.4→594.1ms, board742.8→725.5ms, analytics978.0→955.1ms improve in these local medians. Jobs592.7→601.7ms and Application table718.0→745.1ms increase; Application response→paint132.2→181.5ms remains a limitation. All samples/unfavorable results are retained. Lower /me medians are not falsely attributed to a backend change: successful /me/backend query implementation is unchanged. Applications public decoded transfer979636→876886B (about10.5% reduction); primary JSON remains23749B. Remaining cold long tasks and scheduling/network intervals are not treated as zero work.

### Renderer investigation and cold-start boundary

Alternating5before/5after production Chromium CDP trace cases10/10, same owned5000fixture, isolate work after primary responseEnd. Actual HR DOM remains948nodes/30rows. Median observed JS union41.4→38.9ms, style18.3→15.2ms, layout21.8→20.1ms, paint17.0→5.8ms. These stages overlap and are not isolated React CPU. Total RunTask union128.1→184.5ms and full observed window159.8→214.0ms increase; all extra wall time is not attributed to a known subsystem. GC/named event investigation is retained, not fabricated as the live cause. The code/payload improvement does not certify the live5–6s regression solved.

Raw evidence `/tmp/inop-hr18-render-final.json`, owned gzip traces `/workspace/inop-hr18-render-final-traces`; public scripts profileHRRender/profileHRSession reproduce these source-bound methods. Native Node default-off local child spawn→health is about1s in owned samples; includes local startup but excludes Render provisioning, actual Atlas TLS/latency and platform cold starts. No hosted Render cold-start diagnosis is claimed.

## One hundred branches, workflows and scopes

Owned canonical dep_hr database:100restaurant branches, three real catalog brands and5000synthetic Applications/Candidates. Admin/HR/department totals5000; own/assigned2500. Four30-item branch pages expose exactly100unique authorized branches; branch0 filters50Applications/1activeJob, KFC filters34Jobs. Thirty-item Application DTO ~20KB, no notes/events; branch aggregate ~2.3KB with no candidate PII.

Observed Mongoose methods remain11 for page10 and30 (not full Mongo wire telemetry). Existing schema indexes produce a sample scoped scan30returned/30docs/30keys. All indices/records are created only in the uniquely owned loopback fixture and removed only by its ownership guard. This is **not confirmation of hosted Atlas index state**; existing release/index dry-run procedures remain relevant and no live migration is performed.

Existing CRUD/edit, archive/restore with retained Applications/history, application-specific Kanban/revision409/ordering, interview/timezone/delivery failure, versioned ATS0vsunknown, source-bound explicit CV review, brand/branch filters, scopes/independent parents/export/private URLs, stale requests and real parallel private downloads remain in the complete regression. Audit wildcard grants remain403 for HR; anonymous401; Admin/canonical dep_hr admission is preserved. Metadata scope grants never substitute for parent/record permissions.

## Source commits

| Commit | Package | Validation |
|---|---|---|
|`eecc311ff58ef9f2d8fe165f21aa84e196ef0610` |18A paired pending session reads |5targets; TS/build/lint0/9/smoke13/auth632 |
|`406ac4f6cff0cb7275b0469c3a87bb85ee238b72` |18B board code split/recovery |50targets; all gates |
|`93bc13fe0628489e9078943eebf2a1ce82a85b9c` |18C cleanup/brand/language/mobile shell |107targets incl. actual Audit style equality; all gates |
|`36a465846bdd2d76587a33bc4b93b763c53e12e3` |18D honest AI setup/prerequisites |98backend/56frontend; all gates, real provider unverified |
|`e661eceab1ce50d0981589aa6d9b614de052303d` |18E100branch capacity/Native metrics |11targets and all gates |
|`353042a83191a2b43ebe47b1b7988973a83164f0` |18F bounded stalled public board code |16targets/late reply/reload; all gates |
|`db6b560315ff4ad2a9aa150de0f1c0f0a0fa3195` |18G inactive authentication rejection |6targets/current permissions/transient500; all gates |

Final complete-source validation and normal-main remote proof are added below after their actual completion. Per-commit changed paths are in HR_LOCAL_COMMIT_LEDGER; no report invents its own future commit SHA.

## Environmental/release limits

First full frontend failed environmental ENOSPC:550tests/545PASS/5FAIL, exit1; never promoted to PASS. Only phase18-created disposable source/build copies were archived and2794files SHA256 verified before cleanup; exact manifest retained. All original repo/.env/ignored/prior local inputs and raw logs/profiles/generated logo references remain. Final full file concurrency1 reduces peak scratch use; actual parallel download/race operations inside tests stay unchanged.

Hosted frontend/API/health/login/deploy and actual live performance: **UNVERIFIED** through proxy CONNECT403. Existing Vercel/Render services remain, no guessed backend URL or security-regressing rollback. Real provider E2E, CV storage/scanner/recovery, hosted OCR, SMTP, Outlook/company website/partner access remain **BLOCKED_EXTERNAL / operational NO-GO**. Lawful retention/permanent erasure remains OPEN; archive/restore is retained and no permanent delete is activated. UI/core validation or successful push is not full production-readiness certification.

The additive AI status API is preferably backend-first. If frontend deploys first, unavailable404/503 config reads remain auxiliary and existing manual forms/AI POST contracts still work. No new schema/index/env dependency was introduced. Do not enable provider/worker/intake or mutate DB/secret values through this release.

## Final local proof and controlled network result

Source db6b560315ff4ad2a9aa150de0f1c0f0a0fa3195: **576/576 frontend PASS**,504851.852638ms, file concurrency1 with unchanged actual parallel download/race operations; **1877/1877 backend PASS**,190274.135722ms, file concurrency1 after frontend. Both zero failed/cancelled/skipped/todo. All552 tracked Backend/Frontend/runtime inputs remain SHA256-identical; documentation-only updates do not invalidate the tests/build. Each source package passed TSapp/node/build/smoke13/security632. Lint0errors/9existing react-hooks/set-state-in-effect warnings outside HR (AuditDetail3, SafetyAuditsList, RestaurantsList, DepartmentsList, RolesOverview, UserForm, UsersList).

Final full logs: /workspace/inop-hr18-final-frontend.log and inop-hr18-final-backend.log; freeze inop-hr18-final-corrected-source.json. Earlier failed/investigative logs remain. All original550 tracker IDs retained:415acceptances/153findings,19external acceptance blockers/7external findings and lawful-retention open. No provider/scanner/storage/hosted PASS follows from these local tests.

Additional controlled compressed HTTP/1 measurement:50ms latency/5Mbps bandwidth, real App/AuthProvider/token/me/scoped HTTP; three alternating before/after samples, **6/6 PASS**. Application public ResourceTiming transferSize median287603→261224B (about9.2% reduction), decoded979636→876886B; response→paint471.0→442.2ms, complete navigation1466.2→1468.9ms (essentially unchanged). It includes local synthetic network/compression and excludes hosted DNS/TLS/HTTP2/Render/Atlas provisioning. This is not a fabricated live-performance improvement. Raw JSON /workspace/inop-hr18-controlled-network.json and reproducible owned script inop-hr18-controlled-network.cjs are retained. No build/test run overlapped this measurement.

Local VITE_API_BASE_URL is /api, and existing dev proxy/Backend routes match that contract. This is not confirmation of hosted Vercel API configuration or a public Render backend URL. No secret value was displayed or changed. Normal existing-main push and exact remote proof are recorded separately after creation; the resulting report-only commit cannot record its own future SHA.

**GO:** locally validated core UI/manual HR workflows/authorization and additive unavailable/configuration handling. **UNVERIFIED:** actual live5–6s cause, served SHA, Vercel/Render deployment and hosted health/login/workflows/downloads. **NO-GO:** real CV/provider/durable-storage/scanner/recovery/external operational activation. To complete actual production readiness, verify served frontend/backend SHA+health and actual authenticated waterfall on existing hosting, confirm actual index/storage/recovery/scanner/provider evidence through the existing approved procedures, and retain closed gates until those pass. No new infrastructure, risky automatic migration or permission-policy inference is proposed.
