# Critical login, wordmark and performance — final QA

Published baseline 318f60d was verified clean on work and origin/inop-main before changes. Each main package is a separate local commit. No push, merge, deployment, history rewrite, production login/data write, container/volume removal or cache cleanup.

## Shipped changes

- 0988d64: actual light architectural login, separate white card, original fictional AI-generated WebP asset (50,204 bytes, 1200×800), decorative image excluded on mobile. Text remains one heading and one sentence; auth handlers unchanged.
- b7dd1b6: three genuinely different original INOP letterings previewed. Rounded monoline A selected; only I/N/O/P paths on all app placements. No gateway/icon/monogram. Favicon uses those paths in two rows for small browser tabs; final QA adds dark color-scheme adaptation. At 16px it remains necessarily small; 32px and larger are clearer.
- 39cf45f: measured initial workspace CSS reduction, 198,787→63,073 decoded bytes, AppShell/style route splitting. Relative workspace cascade order preserved; HR selector bodies/tokens unchanged.
- 1eeeba7: separate Analytics readiness audit. No new Analytics cache/query/API change was justified. Additional Analytics speedup is **not** established; cold KPI was slower, warm KPI faster and warm scores slightly slower. See detailed table and limits in ANALYTICS_READINESS_AUDIT.md.

## Performance evidence and limits

Production Chromium navigation was attempted with inherited proxy and failed ERR_TUNNEL_CONNECTION_FAILED. No production DNS/TLS/TTFB/LCP or Render cold-start numbers exist. Local numbers are explicitly local source-only production builds. First-load controlled comparison: five interleaved pairs per cold/warm mode, image decode and request completion awaited, real App/AuthProvider, no auth API for anonymous login. Cold usable 608.6→584.9 ms, warm 158.6→153.4 ms; variance overlaps. Initial JS 625,138→614,240 decoded bytes. No large timing gain claimed.

Analytics: same process/data, 5,000 candidates/applications, five cold/warm samples per phase, real auth/scoped APIs, 0 duplicate requests. Current real KPI appears before score completion; permissions/filter context still invalidate previous results. Profiling adds overhead. Hash-cache proposal rejected after measured 3.6–6.7ms CPU on repeated-parent profile. No production inference from localhost results.

Partial MIME/CPU-counter/shell-selector experiments remain separate; invalid fields are excluded. Final metadata was corrected to the actual source snapshot without altering measurements. Existing earlier 90 baseline and 180 HR measurements remain intact in /workspace/work/final-premium.

## Screenshots actually created and inspected

Under `/workspace/work/critical-login/`:
- wordmark-concepts.png: three letterings on navy/sidebar/mobile/small contexts.
- login-before/{1440,768,390}.png: actual published-source production build.
- login-after/{1440,768,390}.png: actual current-source production build, not hosted screenshots.
- login-qa/login-{1440,768,390}.png: CLI keyboard/mobile-source checks.
- favicon-{light,dark}.png: 16/32/48/64px SVG preview.
- hr-gallery-{1440,768,390}.png: contact sheets from actual local HR screenshots.
Full HR/form/drawer/inline catalog screenshots are retained in /workspace/work/premium/screens; actual computed styles in /workspace/work/acceptance/computed-styles.json. Full JobForm was inspected to its bottom, with unchanged panel styling/actions.

## Validation results

- TypeScript and final Vite build PASS.
- Final lint 0 errors / 9 existing set-state-in-effect warnings: AuditDetail (3), SafetyAuditsList, RestaurantsList, DepartmentsList, RolesOverview, UserForm, UsersList. No new warning suppressed.
- Related regression group: 89 tests, 88 pass / 1 page.goto 10s timeout in Candidates under concurrent QA load. Targeted Candidates repeat passed, including long-text/sticky/grid permission and real XLSX. Thus all 89 checks have successful coverage; the first grouped run is not described as all-green. Existing Mongoose deprecation warnings and intentional negative-path Vite proxy ECONNREFUSED logs occurred; these are not MongoDB/production diagnoses.
- Playwright CLI: 4 HR smoke/visual acceptance tests passed; corrected login CLI passed separately. The initial new mobile assertion erroneously counted Vite's JavaScript ?import wrapper as a binary image download; corrected to resourceType=image. Current source and network checks prove no architecture image download on mobile. No app workaround or retry-to-mask failure.
- Final four-letter/favicons regression passed. Actual auth validation, password visibility, AZ/EN/RU and real JWT redirect passed in related suite.
- HR design lock verified by actual styles: #F3F7FD / #D7E2F1 / 12px; #4338CA and #3730A3 primary states; #991B1B and #7F1D1D cancel; neutral disabled and visible focus. No horizontal page overflow at three viewports; intentional internal table/board scrolling remains.

Diff check and targeted added-text/path secret scan are performed before final commit; only the approved 50 KB visual asset is a new binary. Generated image originals, screenshots, logs, raw metrics, private data and env files remain outside Git. The reused Vite cache is 13 MB; workspace has approximately 28 GB free and /tmp below 2% used. No new dependency/browser was installed.

No backend/API/auth/permission source changed. This update needs only a future approved frontend release; no new Render manual deployment is required. Residual production startup latency remains unverified until network access is available, and no new Analytics speedup is claimed. These performance limits remain open rather than marked solved.
