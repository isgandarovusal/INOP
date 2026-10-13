# INOP premium light enterprise — local validation

Approved baseline: `823b7da06f1b79c487d379629755d275167a8d17`. Work remained on `work`; no push, merge, rebase, reset or deployment was performed.

| Package | Local commit |
| --- | --- |
| Shared light enterprise tokens and controls | a8f00cb |
| Vacancy form and inline catalog behavior | 5bf8b89 |
| Login and field validation | 91d61b5 |
| Candidates and compact application styling | 206ed22 |
| HR analytics visual hierarchy | a4995fd |
| Measured analytics score-count optimization | 3d777f8 |
| Final localization/responsive regression | this commit |

Vacancy publishing was reproduced locally: an empty description sent a POST and received HTTP 400, while a complete authorized synthetic payload returned HTTP 201. The backend requires a description; the original frontend did not mark or validate it. Frontend validation now matches that rule, identifies the input, and focuses the first invalid field. Drafts preserve the backend requirements. Inline branch/brand Enter no longer submits the vacancy; synchronous locks prevent duplicate submissions, existing catalog codes are detected, and the backend uniqueness/permission rules remain in place. Catalog details begin closed and successful creation selects the new record and closes its panel. Known missing AI configuration disables suggestions; no provider output is fabricated.

Login retains the existing auth provider, JWT/session handling and redirects. New local field validation avoids empty/invalid requests and retains errors beside inputs. AZ/EN/RU language controls and password visibility are verified against a real local auth request with synthetic credentials. There is no password-reset backend route, so no decorative reset button was added.

Candidates' two metric cards use only the current server response's filtered total and page item count. Status badges, long text, expandable long roles, grid actions, sticky Actions, and existing archive confirmation/permissions are retained. Excel export produced a real XLSX ZIP file. Analytics uses existing scoped aggregate responses, trusted score data, SVG bars, status badges, numeric table alignment and a brand table. It has no existing Word/Excel export action; no fake export or workforce KPI was added. Existing aggregate/filter semantics and bounded results were preserved.

Final checks: the explicit Node regression selection passed 56 checks, 0 failures. The Playwright CLI smoke passed one test covering six HR routes at 1440/768/390 pixels, visible button names, overflow, keyboard form navigation, real synthetic publish and language switching. Targeted real-login validation and the final Analytics table-width regression also passed. TypeScript (`tsc -b`) and Vite build passed. ESLint passed with 0 errors and 9 existing react-hooks/set-state-in-effect warnings in AuditDetail (3), SafetyAuditsList, RestaurantsList, DepartmentsList, RolesOverview, UserForm and UsersList. Those unrelated source files were unchanged.

Screenshots were actually generated from the local application with synthetic records. Selected desktop and mobile screenshots were visually inspected, including login, vacancy form, Candidates table/grid, Kanban and analytics. This is local UI evidence, not production screenshots or a full WCAG certification. Initial test-only mistakes (a nonexistent third synthetic brand row and offscreen drawer isVisible detection) were corrected; the final assertions passed. Final mobile review scoped the 55% first-column width to the funnel, giving the three-column brand tables balanced widths.

See HR_ENTERPRISE_ANALYTICS_PERFORMANCE.md for the dataset, methods, raw timing locations and measured before/after results. Local navigation did not reproduce the user's 4–5 seconds. Unchanged overview timings also improved in the controlled run, so whole-page differences cannot be attributed entirely to the backend count optimization.

No new dependencies or browser downloads were introduced. All browser fixtures reuse /workspace/work/premium/vite-cache (approximately 13 MB), avoiding per-run Vite cache accumulation. Existing caches were not removed. At completion /workspace had approximately 28 GB free (2.0 GB used), /tmp approximately 4.9 GB free. The isolated MongoDB container and its dedicated data/config volumes were retained. The old onboarding MongoDB container and its data directory were unchanged. Fixture cleanup removed only each fixture's own random local test database.

Remaining limitations: production latency and a configured live AI provider were not tested. Password reset requires a real backend flow. Very long user text can increase row height when expanded. Release/push and any later container/volume cleanup require separate user authorization.
