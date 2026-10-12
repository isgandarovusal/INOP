# HR final live bugfix and UI refinement — phase21

12 October 2026, Asia/Baku. Resume preserves all earlier work and P0 8b38320. No new branch, backend/schema/API rewrite, production data change, secret change or provider activation. Runtime source frozen at 93017e7635f76cdc567656a7421e98909f0dd271. Tests use owned synthetic localhost databases and real production App/AuthProvider + Chromium; no real candidates.

## Screenshot acceptance

| Reference | Local status | Concrete result / proof | Hosted |
|---|---|---|---|
| S1 Applications | FIXED | Coherent search/status/board/sort; page-only score/name versus server newest all-results explicit; mobile empty hint no longer clipped by wide table; explicit refresh retains content. applications-* images | UNVERIFIED |
| S2 Sidebar | FIXED | Existing transparent SVG retained, proportional 144px desktop, language row/gutter/mobile drawer preserved. sidebar-* | UNVERIFIED |
| S3 Candidates | FIXED | One New Candidate CTA, compact search/archive/raw-status/board/view toolbar; native scoped export and paging30→5; no fake demo data. candidates-* | UNVERIFIED |
| S4 Analytics | FIXED | Independent overview/scores; KPI does not await held score request; truthful zero/missing-score explanation; filters/tab/data intent preserved. analytics-* | UNVERIFIED |
| S5 Job forms | FIXED | Full-span groups and labels remove oversized gaps; explicit draft versus publish/implicit Enter; neutral cancel, secondary draft, primary publish. job-create/edit-* | UNVERIFIED |
| S6 Candidate forms/review | FIXED | Associated labels, full-width Education textarea, responsive grid, source-bound review and one professional AI generation action. candidate-create/edit-*, cv-ai-* | UNVERIFIED |
| S7 Login | FIXED | Forbidden KFC/Pizza Hut/Simit Sarayı line removed only from login; navy/white and approved SVG retained. login-* | UNVERIFIED |
| Application detail follow-up | FIXED | Header links grouped as existing PageHeader actions; fieldset full grid span; Save has own footer and height ≤48px, not textarea height; genuine empty history localized. application-detail-* | UNVERIFIED |
| AI action addition | FIXED local contracts; BLOCKED_EXTERNAL real provider | One generation per function, separate explicit setup check, AZ/EN/RU configuration-required/error and HR approval. See HR_AI_ACTION_VERIFICATION.md; real provider not WORKING. | UNVERIFIED |

[Actual screenshot gallery](qa/hr21/gallery.html): 78 unedited production-browser JPEGs. 14 routes ×3 widths=42 includes12 enabled routes and2 intentionally disabled intake routes. Remaining screenshots cover zero/few data, actual forms/configuration-required/queued review and shell/login. Files are test evidence outside the application asset/bundle path. Main viewports390/768/1910; form wide1711, analytics1875, login1440; earlier compact320 coverage retained. Desktop/mobile/tablet representative screenshots were visually inspected, including final detail header/Save, forms, board, empty table and provider failure. Geometry assertions alone were not accepted: earlier mobile clipping and detail defects were found visually and corrected.

## Measured lifecycle result

Root cause: list/board hooks inherited the shared resource's default focus/visibility/reconnect reload even after analytics opted out. Necessary auth/session and detail/history/private-parent rechecks remain. Lists/board now use existing opt-out and same-context retained explicit refresh; stale or changed scope clears data. No global settled cross-user cache or backend policy change. No idle polling/effect loop observed during the bounded tests; unobserved hosted trigger is not claimed proved.

Owned empty-data local production fixture; one paired sample per route, same harness/source baselineb71eee8 and current93017e7. `readyMs` is navigation-to-selector plus network-idle (including browser500ms idle threshold) and two RAFs, not TTI/KPI-only/live latency. Three event groups each include focus/visibility/online; auth checks are coalesced per group. API bytes sum recorded JSON bodies including auth, not gzip/bundle size.

| Route | Extra data GET | Loading mutations | Session GET | Local ready ms before→after | Initial API count | Initial JSON bytes |
|---|---|---|---|---|---|---|
| jobs | 3 → 0 | 3 → 0 | 3 → 3 | 1137 → 1074 | 2 → 2 | 374 → 374 |
| candidates | 3 → 0 | 3 → 0 | 3 → 3 | 974 → 1011 | 2 → 2 | 374 → 374 |
| applications | 3 → 0 | 3 → 0 | 3 → 3 | 986 → 954 | 2 → 2 | 374 → 374 |
| applications?view=board | 3 → 0 | 6 → 0 | 3 → 3 | 968 → 965 | 2 → 2 | 1285 → 1285 |
| analytics | 0 → 0 | 0 → 0 | 3 → 3 | 974 → 1016 | 3 → 3 | 1624 → 1624 |

Opening results are small mixed changes, not a claim of universal speedup; the demonstrated gain is eliminating redundant reloads/flicker without removing session validation. Analytics was already stable at this baseline. Previous owned100-branch/5000 and50000 scoped aggregation tests remain regression evidence; not hosted capacity certification. Raw request paths, timings and sizes: qa/hr21/requests-before.json and requests-after.json. State geometry: states-geometry.json.

## Test evidence and honest failures

- Current runtime: final63/63 (42route browser scenarios plus20application workflow cases and suite parent) PASS. Current states18/18 PASS: zero/few/forms/scoped paging/search/native export/configuration failure/HR review. Paired lifecycle baseline6/6 and after7/7 PASS (after includes held manual refresh and current department-loss negative case).
- Current source authority/download19/19 and private upload32/32 PASS: stale reply after department loss, current auth before private download, unauthorized bounds and file type/path/symlink/limit checks.
- Current hr21detail gate: TypeScript app and node PASS; production build PASS; lint0errors/9existing warnings; smoke13/13; existing authorization632/632. Source runtime has not changed since that gate. Test/helper/document-only follow-up is covered by current real browser states/lifecycle runs and syntax/diff checks; no gratuitous rerun of unchanged passing suites.
- Earlier phase21 focused tests retained: candidate20, application35, job52 plus5final draft/Enter, AI69frontend/134backend mocks/contracts, analytics/review34, shell/login/vector/Audit39. These are overlapping focused counts, not an invented unique total. Real provider/storage/scanner E2E is not PASS.
- Initial final backend invocation had197 tests /195pass /2fail (leaf plus parent) because ENOSPC blocked a test symlink. Disk diagnosis preserved old generated builds in byte-verified archives; failed private suite alone rerun32/32 PASS. Do not label the initial197-run PASS.
- Initial multi-file workflow run stalled in a test waiting for a focus data GET intentionally removed by P0; that incomplete run is not PASS. Only its owned runner was stopped; negative test now explicitly refreshes to hold an async reply, then loses HR department and suppresses stale data. Corrected authority/download target19/19 PASS. Already completed application/archive/document cases were not needlessly rerun.
- Actual Audit style regressions passed8comparisons; no Audit module source or backend changed. Scoped admin/all plus canonical dep_hr/current roles/private/export boundaries remain. RealCV ingestion/AI/OCR/provider/Graph/website/storage/scanner/SMTP operational gates are not activated.

## Remaining status

OPEN: AUD-051 / P13-020 lawful retention policy and permanent erasure authority; archive/restore remains approved, permanent erasure not enabled. BLOCKED_EXTERNAL: real approved provider/company CV consent, storage durability/recovery, scanner certificates, tenant/mailbox/approved external channels and operational delivery evidence. Hosted UI/API and Render/Vercel deployment remain UNVERIFIED until observed. No local PASS certifies external readiness; realCV activation remains NO-GO. Original131 findings and every original package tracker ID remain preserved; new phase21 findings160–164 are appended, never replace original findings.

## Local commits before final evidence commit

- `8b38320612bb01e4a467357ac064be9941dd0fd4` fix(hr): stop list and board focus reloads without weakening auth
- `d1fcbdd9f4b72de3b0fee353f765004e7c306dd1` fix(hr): unify candidate toolbar and remove duplicate create action
- `1f099e71ecc800536f9850c8fdf78f9a48a365cf` fix(hr): align application controls and clarify scoped sorting
- `4f153e75d0b0d480ff9fb6284ff13abd5b77a1ef` fix(hr): keep empty application content inside mobile viewport
- `99ede1fd8ec6747446cc6a57fcc874242e418393` fix(hr): compose job forms and preserve explicit draft and publish actions
- `9c028170c6225d12a411a5ba225f67d6fda8597c` fix(hr): clarify AI setup and prevent competing CV review actions
- `c91604e9426d9ef19f12feb8943b3cc2b7e804cd` style(hr): align analytics and professional review state presentation
- `9cc8e19416943a729ccf17a1e15a75791c0ba6a6` fix(auth): remove business brand text from login and verify shell
- `93017e7635f76cdc567656a7421e98909f0dd271` fix(hr): align application detail actions and workflow form

See HR_LOCAL_COMMIT_LEDGER.md for changed paths per commit. Final QA and remote verification commits are recorded by Git/the final response, not guessed in a self-referential file. Normal main fast-forward push is allowed only after source-bound gates and remote ancestry verification; no force/new branch. Hosted status must not be inferred from successful Git transport.

Final read-only hosted probes before push: frontend URL, Vercel panel and Render panel all failed at proxy CONNECT with403 and HTTP000/curl56, before TLS/application response. This is not application401/403 or deployment failure/success. Native Git ls-remote succeeds; main stillb71eee8. No approved live session or backend public endpoint is available here. Live login/dashboard/HR/private-download verification remains UNVERIFIED.
