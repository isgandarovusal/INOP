# INOP HR — reference-led enterprise refinement (A–F)

12 October2026 Asia/Baku. Baseline ae4822ccd55d8c1c864e970d34f7a3c0fac45b48, existingwork branch. User's supplied dashboard PNG drives navy/blue/purple/green/amber palette, hierarchy and table quality. It is a visual reference, not a source of records/KPIs/percentages. No reference candidate names/counts/percentages were copied. Synthetic fixtures exist only in owned local test databases; runtime screens retain current backend DTOs. All original13 packages/131 findings and subsequent fixes preserved.

[Before/after comparison gallery](qa/hr22/comparison.html):14matched1440 desktop pairs, after768 tablet/390 mobile for every route, plus individual A–E package images, zero-data/configuration-required/review/modal proofs.12enabled routes plus2intentionally disabled intake routes. Every screenshot is a real Chromium production-build capture, not a rendered design mock or edited composite. Data mismatch due changed default Candidate grid→table is intentional; grid remains available. Partial A–D stage images document their stage and are superseded by F final images. Main route captures precede the final modal-only guard/zindex fix; ordinary content selectors retain original specificity via :where, and final modal/controls are captured on final source. Hosted screenshots are not certified.

| Package | What changed | Evidence / local status |
|---|---|---|
| A | Namespaced semantic tokens; original shared/header white-secondary rules changed in place. Primary navy, secondary blue, cancel neutral; accessible focus/disabled states. | FIXED:4production cases, actual contrast≥4.5,1440/768/390; narrow draft action found visually and corrected. docs/qa/hr22/A |
| B | Dark navy active nav/white text, blue-gray HR shell; compact136px SVG with readable abbreviated sidebar caption; full login accessible identity/raster originals retained. | FIXED:24brand/production cases, finalcompactvector9; Audit8computed comparisons unchanged. docs/qa/hr22/B |
| C | Optional shared header icons preserving no-icon Audit DOM; table-first Candidate/retained grid, actual names/email/initials/rawstatus/unknown experience; clear table header/hover/actions/paging. | FIXED:26production/scoped pagination/export cases and15actual Audit checks.65competing HR table rule blocks removed at source after purple-gradient/dot defects found; no new override sheet. docs/qa/hr22/C |
| D | Consistent Job/Candidate/Application create/edit/detail/review/interview headers, paired grids, compact footer, neutral cancel and modal action hierarchy. | FIXED:25workflow/jobform cases +19responsive detail scenarios. Correctly named archive suites are included in F54, not claimed run by the earlier misnamed invocation. docs/qa/hr22/D |
| E | Distinct real green/blue/purple/amber KPI cards, blue SVG chart/funnel bars, scoped tab/filter controls, color-coded board lanes; purple generation and green explicit HR approval. | FIXED local UI/contracts:23analytics/production targets +11final1440semantic/state cases. Job/CV AI suites passed; real provider CONFIGURATION_REQUIRED/BLOCKED_EXTERNAL, never WORKING. docs/qa/hr22/E |
| F | All-route responsive QA, current department/private/archive/scope regression, before/after timings and bundles, source-frozen release gates; modal root conflict fixed. | FIXED locally:50route/department cases,54actual archive/private/Audit/semantic cases,97backend scope/department cases; modal followup25 and final6. Source UI/backend gates below. docs/qa/hr22/F |

Modal visual finding P22-021: legacy Candidate detail `> div` container rules overrode fixed backdrop into an in-flow card.17source selectors now exclude `.hr-dialog` using zero-specificity :where; existing HR dialog z-index100 exceeds sidebar60. No portal/architecture change. Production test requires fixed overlay and elementFromPoint interception over sidebar/topbar, neutralcancel contrast and Escape preserving the candidate. Before-modal-in-flow-1440.jpg is unedited intermediate defect proof; archive-modal-1440/390.jpg are final viewport captures. Earlier focus/contrast-only PASS was insufficient and was not accepted as visual completion.

## Performance and scope preservation

Same owned3Job/35Candidate/35Application cohort,1440×900, actual production App/AuthProvider; two quiet before/after samples per route, baseline ae4822c versus final source. `readyMs` includes navigation, actual ready selector,500ms networkidle and twoRAF; not live TTI/KPI-only or Atlas/cold Render capacity. Synthetic fixture initial required-role omission was corrected; that failed run supplied no accepted measurement. No new API, dependency, library, polling, effect or cross-user cache was added. Candidate table intentionally has more DOM than old default cards (681versus425 nodes) but remains bounded30records; grid stays available.

| Route | Mean ready ms before→after (n=2) | Initial API count | Extra data GET/3focus groups | Session GET | Loading mutations |
|---|---|---|---|---|---|
| jobs | 1086 → 1107 | 2 → 2 | 0 → 0 | 3 → 3 | 0 → 0 |
| candidates | 959 → 949 | 2 → 2 | 0 → 0 | 3 → 3 | 0 → 0 |
| applications | 965 → 960 | 2 → 2 | 0 → 0 | 3 → 3 | 0 → 0 |
| applications?view=board | 972 → 982 | 2 → 2 | 0 → 0 | 3 → 3 | 0 → 0 |
| analytics | 1009 → 992 | 3 → 3 | 0 → 0 | 3 → 3 | 0 → 0 |

All idle/focus checks retain0extra data requests/0loading flicker and3current session checks; held manualrefresh retains content, current department loss clears it. Longtask profiling: one52ms cold Jobs task in first after sample, absent in the quiet repeat; all other before/after route samples have zero >50ms tasks. Exact JS attribution is unresolved; do not claim universal zero longtasks or live speedup. Within these small samples no material opening regression was observed; timings vary by a few milliseconds. Large-scale backend/index/query architecture is unchanged, so this is not a fresh50k/100branch capacity certificate.

All emitted uncompressed bundle assets: JS1510584→1511895 bytes (+1311); CSS351485→348046 (-3439); combined1862069→1859941 (-2128). These are all chunks, not per-route/gzip transfer. JSON request paths/bytes/latencies/DOM/longtasks and both repeat bundles are under docs/qa/hr22/F; they contain synthetic metadata, no tokens.

## Final gates and honest diagnostics

Final hr22verified: TypeScript app/node PASS, production build PASS, lint0errors/9existing warnings,13smoke and632authorization checks PASS, ownedlocalhost DB isolation. Backend resource/current-department97PASS. F targeted54 includes correctly resolved hrCandidateArchiveUI/hrJobArchiveUI/privateFiles/hrCvDocumentErrorsUI/sourceDownloadRace/hrUnifiedBrand and actual production semantics. Source/download tests verify native bytes, fresh-denial/no URL, late permission loss, revoked objectURLs and focus race; source download also covers Audit. No Backend/Audit module or dependency/lockfile change.

Do not treat failed or incomplete attempts as PASS: A test first used a missing neutral class, then visual review caught narrow draft footer; both fixed. Initial C assumptions expected grid instead of new table and wrong cards locale path; updated to actual controls,26PASS. Initial E icon import failure and wrong test fieldID corrected;23+11final targets pass. First final lint had a duplicate unreachable `new` status case; removed, final0/9. Misnamed test paths did not run those files; actual filenames discovered and run in F54. Modal was caught by screenshots despite earlier geometry/focus tests; fixed and final6 verify placement/overlay. None of these initial failures is a release PASS.

Disk preservation: two inactive generated old build directories byte-verified into /workspace/inop-hr22-preserved-builds.tgz and checksum manifest before redundant generated copies removed. No repository/env/Git/DB files removed/reset; original raster assets and ignored local work retained.

## Local commits before F evidence commit

- `66d84410a1564430ba28492104dca5d2e59311e0` style(hr): establish reference-led semantic controls and palette
- `6de4a7f160a054bbae570cce066c6a39c7b98aab` style(hr): balance compact branding and dark active navigation
- `7703069df6fb17efb6c71d2bd8fe19b1e470c24d` style(hr): unify recruitment tables and remove legacy table decorations
- `ed437a3e35af065068cc45205a7430a7d55e9e48` style(hr): align professional forms and compact workflow actions
- `ccdd4e1dce8acc0337c4e4dc5c0e58c0b6e27aa6` style(hr): distinguish real analytics metrics and human-reviewed AI actions

F final runtime/test/evidence commit follows; full SHA and changed paths are recorded in Git/final response, not guessed in this self-containing file. Normalmainfast-forward permitted only after final gates, clean tree and exact remote ancestry. No new branch/force/history rewrite/migration/seed/secret change/provider activation. Render/Vercel/live status UNVERIFIED unless observable; successful Git transport is not deploy success. RealCV/provider/storage/scanner/recovery/Graph/external activation remains NO-GO/BLOCKED_EXTERNAL; AUD051 retention stillOPEN. No existing package acceptance is removed.
