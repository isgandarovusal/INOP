# Final premium branding and HR QA

Source under test: a8b14b4534b16817b115ef9976ead6f41835a35c (plus the new login CLI test). Baseline and fetched origin/inop-main: fccabbb19fbd4259c2a8e5fb83a42c356c8f1f0c. Work remains local; no push, merge or deploy.

## Recovery and performance

The preserved 90 baseline samples and completed 180 HR comparisons were verified on disk, not inferred from the prior chat. Partial interrupted output remains separate. The existing isolated regression Mongo container was stopped after environment restart and was started again; the old onboarding container remains stopped and its bind-mounted data was not touched. Fixtures create/drop only uniquely owned localhost test databases.

`HR_ROUTE_PERFORMANCE_FINAL.md` contains all nine route medians, query/render/request/bundle observations and methodological limits. The only proven query change is the permission-scoped candidate anti-join: five interleaved API pairs, full response equality, 623.31 → 513.99 ms median. No additional Analytics speedup is claimed; unchanged score readiness varied adversely in the later phase. Production network/Render cold-start are unmeasured; skeleton timestamps in the preserved HR run are lower bounds, not exact durations.

Anonymous login was additionally compared with source-only production builds, one browser/server process, five interleaved before/after pairs per mode (20 samples). Cold form-ready animation-frame median: 741.4 → 671.1 ms; warmed document navigation: 121.9 → 125.2 ms. Warm here means cached document resources, not SPA. Zero API requests or page errors. This confirms comparable local readiness, not a production speedup or performance SLA.

## Visual evidence actually inspected

Existing Chromium screenshots, local synthetic data:
- Three logo concepts in four contexts: `/workspace/work/final-premium/logo-concepts.png`.
- Login baseline and final: `login-before/login-{1440,768,390}.png`, `login-after/login-{1440,768,390}.png` under that folder.
- Nine-route contact sheets: `hr-gallery-{1440,768,390}.png`, rendered from actual QA screenshots.
- Full HR screenshots: `/workspace/work/premium/screens/final-*.png`; inline catalog and branding drawer included.
- Computed styles and held-submit evidence: `/workspace/work/acceptance/computed-styles.json` and screenshots in that folder.

B's IO gateway identity replaces the folded N in the shared component, so login, desktop sidebar, mobile topbar and drawer agree. The favicon artwork is checked against the same selected paths. SVG wordmark dimensions remain 224×64; no HR layout changes.

The login left panel retains navy, one heading and one sentence, with static tonal lighting and restrained architectural geometry. Artwork is decorative, noninteractive and hidden on mobile; the right form, handlers and auth contracts remain unchanged. No repeated platform footers, feature lists or reset placeholder added. A first baseline dev-overlay attempt failed while transforming SVG flag assets; it was excluded. The successful comparison overlays only the three relevant text source files, with real screenshots inspected.

HR CSS, SectionCard/FormSection, control tokens and route layouts have no changes from the accepted baseline. Actual computed styles confirm #F3F7FD section background, #D7E2F1 border, 12px radius; #4338CA primary/#3730A3 hover, #991B1B cancel/#7F1D1D hover, neutral disabled including hover, and visible focus. Form sections are checked to the bottom; tables/KPI/boards retain their semantics. Page overflow checks pass at 1440, 768 and 390; Kanban/table internal scrolling remains intentional.

## Validation

- TypeScript (`tsc -b`) and Vite production build: PASS.
- Lint: 0 errors, 9 existing set-state-in-effect warnings: AuditDetail (3), SafetyAuditsList, RestaurantsList, DepartmentsList, RolesOverview, UserForm, UsersList. No new warnings suppressed.
- Related Node backend/frontend regressions: 89 passed, 0 failed. Covers anti-join/ranking scoping, denied/foreign parents, pagination, analytics count/contracts/catalog concurrency, real auth revocation/login, publish/draft/inline entities, candidate sticky/grid permissions and real XLSX export, board keyboard ordering/conflicts/pending revocation, score disclosure, AI unavailable behavior and AZ/EN/RU.
- Playwright CLI: 4 HR smoke/visual acceptance tests plus 1 new login keyboard/responsive test passed. Existing Chromium only, no download.
- New identity/favicons test passed; earlier shared brand targeted regression passed 5 checks.
- Diff whitespace check: PASS. Changed-file and added-text scan found no .env, uploads, screenshots, databases, generated cache, binary or private-key/token patterns. This is a targeted scan, not a guarantee against every possible secret format.

Artifacts remain outside Git; no synthetic database records, JWTs or real user data are committed. The single reused Vite test cache is 13 MB. Workspace free space remained about 28 GB, 7% used; /tmp stayed below 1% used. Containers and volumes were retained. No cleanup or rollback was performed.

## Remaining limits

Production cold-start/network performance requires separately authorized hosted observation. Local profiling adds overhead and aggregate route deltas outside the proven query are not attributed to code improvements. Existing unrelated lint/Mongoose deprecation warnings remain. The query optimization needs a normal backend release to reach production; Render manual deployment was not started. Branding/login need a later authorized frontend release. None is deployed by this task.
