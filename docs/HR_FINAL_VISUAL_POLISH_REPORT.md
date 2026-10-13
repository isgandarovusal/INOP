# Focused HR visual polish — 13 October 2026

Scope: improve existing A–F analytics presentation and sidebar grouping without changing backend, APIs, permissions, dependencies, logo assets or Audit module. Baseline 16848763e3bdd6dd0a4b8c335d3130edc2692b68. Screenshot datasets are synthetic localhost fixtures served by real production App/AuthProvider/StrictMode builds; never sample records imported from the reference.

## Analytics package

| Defect | Before | After | Result |
|---|---|---|---|
| Zero cohort occupied full seven-stage table, empty histogram axes and all-zero sources | [Before](qa/hr23/before-zero-1440.jpg) | [After](qa/hr23/final-zero-1440.jpg) | FIXED locally: actual 0 KPI stays; one shared EmptyState explains missing stage/match analysis. |
| KPI icons detached from value, duplicate CSS typography/padding; filters visually faint | Same before | Same after | FIXED locally: existing semantic palette, left icon tile, stronger numerals, readable compact labels/segments. |
| Missing scores still rendered a 0–100% empty histogram | [Before](qa/hr23/before-filled-1440.jpg) | [After](qa/hr23/final-filled-1440.jpg) | FIXED locally: no chart when no reliable result; genuine pending/legacy/restricted state counts remain. Actual calculated zero still renders the first bucket. |
| Small screens | Existing A–F proof retained | [390](qa/hr23/after-zero-390.jpg), [768](qa/hr23/after-zero-768.jpg) | Current screenshots captured/inspected; no page overflow. |

Targeted analytics tests 23/23 PASS. TypeScript app/node, production build, lint 0 errors / 9 pre-existing warnings, owned-local smoke 13 and authorization632 PASS (`hr23analyticsfinal`). Initial failed runs retained; Operations zero notice and incorrect test assumption of pending vs actual legacy classification diagnosed and corrected. Heavy score remains independent of real KPI overview, scope denial still clears metrics, manual refresh retains allowed data, language/focus/stale tests pass. Shared EmptyState reused; no dependency/API/provider activation.

Sidebar/all-route QA and matched performance evidence are recorded below; transport verification follows only after final commit. The supplied Candidate reference guides styling, not synthetic counts. No new live analytics PNG was attached this turn; current hosted screenshot comparison is UNVERIFIED. Local visual proof cannot certify live deployment.


## Sidebar package

HR shell only: existing group headings now readable10px/slate, separated by quiet rules and16px padding. Existing136px SVG preserved, dark navy active/white text and semantic action hierarchy untouched. No route/permission/User/Role/NavGroup content or Audit workspace change.28/28 tests pass including current department fail-closed, production modal/contrast/focus controls and eight actual Audit computed-design comparisons. Current sidebar TypeScript/build/lint0errors/9warnings/smoke13/auth632 gates PASS.

Same Job create scene: [Before at unchanged A–F runtime](qa/hr22/F/job-create-route-1440.jpg) / [After](qa/hr23/routes/job-create-route-1440.jpg). Additional [keyboard-focus control screenshot](qa/hr23/sidebar-after-1440.jpg) / [measured styles](qa/hr23/sidebar-styles.json). The before runtime is source-identical to16848763 for these components (later commit only documented transport). Current all-route42 captures plus parent43 checks completed at390/768/1440; intake routes remain disabled. Final gallery/performance follow in the QA evidence package.


## Final QA and performance

[Before/after gallery](qa/hr23/comparison.html) links all14 route pairs at1440px and current768/390px:12 enabled HR pages plus2 disabled intake routes. Desktop Candidate/App/Job lists, create/edit/detail, Kanban and analytics manually inspected; representative full mobile/tablet forms/details also inspected.42 current route captures and geometry checks (+parent=43 tests) completed; this does not mean every possible state or hosted screenshot is visually certified. Neutral outline navigation/cancel remains intentional, blue secondary/navy primary/purple AI/green approval/red archive preserved. Original raster/SVG assets and all Audit code unchanged. No new charts/providers/libraries/polling/invalidations/API reads.

Final expanded production Analytics6/6 (including actual calculated0 and unknown-vs-zero states), existing analytics23/23, shell/current-department/Audit28/28, complete routes43/43, workflow/pagination37/37 and four paired performance runs7/7 each PASS. Last source gates `hr23sidebar`: TypeScript app/node, production build, lint0errors/9existingwarnings, smoke13, authorization632 PASS. Later changes only test/documentation/evidence, so those build gates still cover exact runtime. Previous completed A–F backend/private/scanner mocks remain source-identical; not rerun gratuitously or reclassified as external E2E.

Real calculated-zero [production screenshot](qa/hr23/analytics-calculated-zero.jpg) comes from an authorized synthetic Candidate with Cash handling and Job requiring HACCP, created inside owned localhost DB. The real backend calculates0; UI retains0–19% bucket1. Remaining35 uncalculated records retain their server classifications. No invented product score or sample reference data.

| Route | Before ready ms (n=2) | After ready ms (n=2) | Initial GETs | Extra idle/focus data GETs |
|---|---|---|---|---|
| jobs | 1167.0 | 1100.1 | 2 → 2 | 0 → 0 |
| candidates | 976.2 | 946.8 | 2 → 2 | 0 → 0 |
| applications | 972.2 | 962.3 | 2 → 2 | 0 → 0 |
| applications?view=board | 973.8 | 970.4 | 2 → 2 | 0 → 0 |
| analytics | 1001.7 | 977.2 | 3 → 3 | 0 → 0 |

Ready measurement includes networkidle+two animation frames; it is not a live cold-start/TTI benchmark. Small sample and test-machine concurrency/load variation prevent attributing ms improvement to CSS; results show no observed regression. All runs have0 idle/focus data GET,0 loading mutations,0 observed >50ms longtasks. Three current-session `/auth/me` checks remain (security), so do not interpret0 extra data GET as0 total requests. Manual refresh/content retention and department-loss clearing still pass. Analytics DOM267→250; all other measured route DOM counts unchanged. Analytics initial auth+overview+scores=3 GETs; operations stays lazy; DTO payload sizes unchanged. Raw bounded fixture evidence in [performance summary](qa/hr23/performance-summary.json), before/after request/bundle JSONs. All-emitted uncompressed JS1,511,895→1,512,748B (+853); CSS348,046→348,664B (+618), total+1,471B, no dependency added. Not gzip or route transfer size.

Runtime commits: analytics `c9796600510090e75d07200ec26e928e6937557f`; sidebar `1ac3b13960a5ce5fedf1c90b3efb55d62aac4c7a`. Final QA commit follows, with no runtime change.

Remaining: exact latest live screenshot comparison and hosted Render/Vercel deployment UNVERIFIED until reachable evidence; no new current-live screenshot attached this turn. Real AI CONFIGURATION_REQUIRED/BLOCKED_EXTERNAL, never WORKING without provider proof. Real CV/scanner/storage/recovery/Graph/site integrations remain BLOCKED_EXTERNAL and realCV activation NO-GO; retention AUD051/P13-020 OPEN. No production migration/seed/secret/role change. Existing source/ignored files preserved, inactive generated test builds archived byte-for-byte outside repo for disk space.


## Transport and hosting — actual outcome

Local analytics `c9796600510090e75d07200ec26e928e6937557f`, sidebar `1ac3b13960a5ce5fedf1c90b3efb55d62aac4c7a`, QA `9e194e7ad2c72fc726250ecb2160541c12376f51`. All gates completed; no runtime changes after sidebar gates. Normal main FF is possible, remote remains **16848763e3bdd6dd0a4b8c335d3130edc2692b68**. **Push BLOCKED_EXTERNAL — did not succeed.** Default/escalated nativeGit asks for unavailable credentials; standard command-scoped GitHub credential helper with injected binding fails authentication; proxy-aware unencodedBearer binding also fails. Read-only Git succeeds, which does not establish write access. GitHub REST metadata reports Forbidden; no assumption of valid/expired credentials. No secrets logged/stored/changed and no persistentGitconfig change. Restore environment GitHub write authentication/access to complete the already-authorized normalpush; force/newbranch unnecessary.

Frontend, Vercel and Render probes return proxyCONNECT403/HTTP000/curl56 beforeTLS. Deployment and current-live visual outcome **UNVERIFIED**. Since push failed, this task did not send these new local changes to hosted deployments. Final documentation checkpoint commit follows; runtime frozen. Previous operational blocks/realCVNO-GO unchanged. Never roll back security or performDBmigration to work around external authentication/transport.
