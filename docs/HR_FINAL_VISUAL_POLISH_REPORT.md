# Focused HR visual polish — 13 October 2026

Scope: improve existing A–F analytics presentation and sidebar grouping without changing backend, APIs, permissions, dependencies, logo assets or Audit module. Baseline 16848763e3bdd6dd0a4b8c335d3130edc2692b68. Screenshot datasets are synthetic localhost fixtures served by real production App/AuthProvider/StrictMode builds; never sample records imported from the reference.

## Analytics package

| Defect | Before | After | Result |
|---|---|---|---|
| Zero cohort occupied full seven-stage table, empty histogram axes and all-zero sources | [Before](qa/hr23/before-zero-1440.jpg) | [After](qa/hr23/after-zero-1440.jpg) | FIXED locally: actual 0 KPI stays; one shared EmptyState explains missing stage/match analysis. |
| KPI icons detached from value, duplicate CSS typography/padding; filters visually faint | Same before | Same after | FIXED locally: existing semantic palette, left icon tile, stronger numerals, readable compact labels/segments. |
| Missing scores still rendered a 0–100% empty histogram | [Before](qa/hr23/before-filled-1440.jpg) | [After](qa/hr23/after-filled-1440.jpg) | FIXED locally: no chart when no reliable result; genuine pending/legacy/restricted state counts remain. Actual calculated zero still renders the first bucket. |
| Small screens | Existing A–F proof retained | [390](qa/hr23/after-zero-390.jpg), [768](qa/hr23/after-zero-768.jpg) | Current screenshots captured/inspected; no page overflow. |

Targeted analytics tests 23/23 PASS. TypeScript app/node, production build, lint 0 errors / 9 pre-existing warnings, owned-local smoke 13 and authorization632 PASS (`hr23analyticsfinal`). Initial failed runs retained; Operations zero notice and incorrect test assumption of pending vs actual legacy classification diagnosed and corrected. Heavy score remains independent of real KPI overview, scope denial still clears metrics, manual refresh retains allowed data, language/focus/stale tests pass. Shared EmptyState reused; no dependency/API/provider activation.

Sidebar/all-route QA, matched performance and final transport evidence will be appended before release. The supplied Candidate reference guides styling, not synthetic counts. No new live analytics PNG was attached this turn; current hosted screenshot comparison is UNVERIFIED. Local visual proof cannot certify live deployment.


## Sidebar package

HR shell only: existing group headings now readable10px/slate, separated by quiet rules and16px padding. Existing136px SVG preserved, dark navy active/white text and semantic action hierarchy untouched. No route/permission/User/Role/NavGroup content or Audit workspace change.28/28 tests pass including current department fail-closed, production modal/contrast/focus controls and eight actual Audit computed-design comparisons. Current sidebar TypeScript/build/lint0errors/9warnings/smoke13/auth632 gates PASS.

Same Job create scene: [Before at unchanged A–F runtime](qa/hr22/F/job-create-route-1440.jpg) / [After](qa/hr23/routes/job-create-route-1440.jpg). Additional [keyboard-focus control screenshot](qa/hr23/sidebar-after-1440.jpg) / [measured styles](qa/hr23/sidebar-styles.json). The before runtime is source-identical to16848763 for these components (later commit only documented transport). Current all-route42 captures plus parent43 checks completed at390/768/1440; intake routes remain disabled. Final gallery/performance follow in the QA evidence package.
