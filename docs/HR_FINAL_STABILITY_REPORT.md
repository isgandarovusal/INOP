# INOP final HR stability and design report

12 October2026, Asia/Baku. Start work/main2243d68727d9213a6d128db6b2f8a9ac4ab41fdc. Production component/backend source verified atccf24e55baa35265b680ed341d079220fda027c4; the final measurement/doc increment changes no runtime component. No new branch, dependency, backend API/schema, production DB/index/DDL/migration/role/secret/feature activation.

## What changed and why

1. **Analytics stability — 3b6489ff1f3b8fe485a1fd78047fa14133af4d2f.** Actual production build reproduced three focus/visibility/online event groups causing six additional analytic reads. No polling/retry/infinite render effect was found. The three analytics resources now opt out of focus refresh; filters, manual refresh and authority changes still reload. AuthProvider's current session checks remain active. Opt-in same-context pending retention keeps genuine KPIs during explicit refresh, while changed actor/role/department/hrAccess/permissions/filter,401/403/error/deadline clear data. Audit callers keep default behavior. Scope-aware existing pending request sharing remains; no settled cross-user cache introduced.
2. **Canonical design — ade69dc0dbcbc28e429549659f52ecbfc0abdbaa.** Inventory and fixed-scope PostCSS cleanup remove277later-shadowed declarations in existing sheets (58HR/219Recruitment), preserving selector/order/at-rule/importance. Namespaced HR navy/slate/white/danger/focus tokens reuse existing components. Primary navy, secondary white, destructive red; actual hover/focus/disabled/dialog contrast and keyboard checked. No new override stylesheet or framework.
3. **Forms — c1bf5cd2f9c614cbd197e3c71c3736299353a626 + f5db6ffbaf221918829f863f23fdb5c2622b158c.** Candidate education was201px inside523px field with browser-default2px outer border. Borderless grid/full-width associated controls remove crowding, duplicate Skills caption removed, TagInput unique associated label, responsive full-span histories. Final desktop education521×112px and border0. Visual review found remaining :is-specificity height65.375px after width fix; new failing assertion and minimal canonical height correction preserve both commits. Existing parsing/review/edit/save and unknown/realzero data semantics remain.
4. **Brand — ccf24e55baa35265b680ed341d079220fda027c4.** User explicitly reconfirmed transparent SVG after automatic review rejected two unexecuted attempts. Inline wordmark interpretation preserves angular letters/violet O/subtitle, readable navy on white and light on navy. No background rectangle/image/script/gradient/extra logo request; markup<4KB,2.5aspect/144pxsidebar. Original bitmap assets retained unchanged. This is an approved reference interpretation, not an official vector master. Actual desktop/mobile screenshots inspected.
5. **Final QA and paired measurement.** Correct existing suite names verified, full relevant workflow/security/scale/responsive matrix rerun atfrozen component source. Optional comparisonSHA added only to the profiling tool to alternate builds on identical owned fixtures; normal single-SHA operation retained. Final Git ledger records actual objects and paths; the report-only future SHA is shown by Git/final user report.

## Requests and performance

Owned loopback MongoDB fixtures and real production App/AuthProvider; StrictMode remains enabled. No auth-ready context substitution. GET reads routed through current Backend, no real personal data/provider access. The user-facing KPI measurement includes session and code loading, two animation frames; API durations include local request overhead and are not hosted latency or pure server CPU.

Final alternating comparison uses identical dataset/browser setup,3fresh navigations per build/cohort (12PASS), reversing build order between repetitions. Baseline2243d68 vs runtimeccf24e5:

| Metric | Before | After |
|---|---:|---:|
| Initial auth+analytics physical reads |3|3|
| Extra analytics reads after3focus event groups |6|0|
| Necessary session reads after those groups |3|3|
| Operations reads after explicit tab intent |1|1|
|0record KPI median |587.3ms|583.4ms|
|5000record KPI median |709.2ms|673.3ms|
|0record score median |628.8ms|615.6ms|
|5000record score median |896.5ms|898.5ms|
| Decoded public asset bytes |850282|842707|
|0/5000cohort longtask count over3navigations |4/5|4/5|

5000median observed overview request91.8→79.9ms/scores325.2→309.7ms; Backend code is unchanged and timing is variable. No claimed score, general render or universal cold-start speedup. The major stable win is eliminating redundant work and KPI disappearance. DTOs unchanged:0overview1716B/scores380B;5000overview1749B/scores389B; initialauth272B. There is no oversized Candidate/checklist payload introduced.

All prior runs are retained: first isolated change0KPI652.5→652.5/5000693.7→679.5ms, final shared-test run618.1/688.2ms, final standalone638.7/784ms. The latter variance prompted paired measurement, not replacement/deletion of failed or slower evidence.50000full analytics remains separate finite work; previous score≈3.38s/operations≈3.09s are not newly optimized or represented as current live results.

## Final verification and limits

| Verification | Result |
|---|---|
| Backend scopes, canonical HR/Audit exclusion, parent resources,100branches,50000scores, archive/lifecycle/private upload |236/236PASS|
| Frontend workflow/interview/CAS409/rollback/order, AI configuration/approval, archive/private/source/download races |170/170PASS|
| Final analytics/forms/semantic actions/dense+empty/mobile/tablet/desktop HR pages |119/119PASS|
| Transparent vector |5/5PASS|
| Existing branding/login/actual Audit computed design |30PASS in initial combined run; combined run itself failed new exactratio test, then5vectorPASS after subpixel assertion correction|
| TypeScript app/node and production build |PASS at every package gate and finalhr20e|
| Lint |0errors/9unchangedwarnings|
| Owned isolated smoke |13/13PASS|
| Existing auth/Audit security gate |632/632PASS|
| Paired production measurement |12/12PASS, physical read boundaries checked|

Final236tests take49.0s,170take161.9s,119take113.7s; serial within each suite. Earlier17analytics/25shared Audit+request+auth,113form/review/premium and5height tests belong to their explicit source increments, not added to a claimed new full suite. No silent skip/cancellation in final matrices. The earlier intermediate action command contained nonexistent shorthand filenames and only ran35cases; final corrected15file invocation ran170 and supplies coverage.

100branches/5000Applications: scoped sorted30row page examines30documents/30keys with existing schema indexes; no per-row query growth.50000full response<16KB, exact score/funnel/brand totals and no PII inside existing query deadline. This does not certify hosted Atlas indexes or latency. Canonical dep_hr plus current independent grants remain required except Admin; Audit wildcard admission fails. No user role changed. Archive preserves Applications/history, permanent deletion remains disabled pending retention policy.

Real Chromium download tests confirm exact PDF bytes, independent authorized download surviving focus-before-native-anchor, current403 noURL, late reply after permission loss noURL and URL revocation. No timeout waiver. Storage durability/recovery, real scanner, real provider/Outlook/websites remainBLOCKED_EXTERNAL; mocks verify local contracts only.

RAM scratch was approved for local tests because workspace/tmp were full; existing app/.env/ignored files preserved, only uniquely owned fixture DBs cleaned. Initial ENOSPC/browser harness failures and ratio/height failures retained and corrected; not reportedPASS. Source scripts and logs contain synthetic fixtures, not real candidate credentials/CV or secrets.

## Release and remaining gates

Local core manual HR/workflows/authorization:GO based on this bounded matrix. Normal existing-main push follows successful checks with remote ancestor/SHA verification; exact final remote is reported separately, never inferred from a future SHA. No new branch/force/history rewrite/production migration or external activation.

Hosted Render/Vercel deployment, actual servedSHA, backend/frontend pair, live health/login and live performance require observable hosting access. If proxy CONNECT403 persists, these remainUNVERIFIED; it is not an application403 or evidence of deploy success/failure. Real CV ingestion/storage/scanner/recovery/provider/Graph/site activation staysNO-GO; lawful retention P13-020/AUD-051 remainsOPEN. Existing external items are not silently completed by successful push or local UI.

Evidence: /tmp/inop-hr20-stability-{before,after,final,final-quiet,paired}.json; /workspace/inop-hr20-{backend-final,frontend-final,responsive-final,vector-final}.log; /workspace/inop-packagehr20e-validation.json and smoke-isolation.json; /workspace/inop-hr20-100branches.json; synthetic screenshots /workspace/inop-hr20-visual. Test scripts remain inFrontend/tests and profiling inFrontend/scripts/profileHRStability.cjs. Complete IDs stay inHR_IMPLEMENTATION_TRACKER and disposition/ledger; no original finding deleted.

Final release confirmation: normalfast-forward2243d68727d9213a6d128db6b2f8a9ac4ab41fdc→ffd7de5fa3a574f900d6610a568f76c4d671260a succeeded with exactremoteparity. Six local commits including QA/report are on existingmain; no branchcreated orforceused. Freshprovidedfrontend/Vercel/Render/GitHubstatus probes at15:02Asia/Baku returnedproxyCONNECT403/curl56/HTTP000beforeTLS. Hosteddeploy/servedSHA/health/liveperformance remainUNVERIFIED. This final documentation-onlyconfirmation increment is normallypushed and its actualSHA checked separately in the final user report.

All434acceptances412TESTED/21BLOCKED_EXTERNAL/1OPEN,159findings151TESTED/7BLOCKED_EXTERNAL/1OPEN retained. Production manualcore release has passed local gates/Git delivery, but hostedfunctionality is not verified; realCV/provider/scanner/storageactivation remainsNO-GO. The unresolved external/retention policy is explicit. No additional source change follows the verified runtimeccf24e5.
