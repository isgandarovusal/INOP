# Mongoose option migration and backend QA

Baseline: fb24dfaa9ff64aa7fd10739f9b13a57c49c843f6, clean work branch. No push, merge, Render deploy, production DB access or history rewrite.

Installed Mongoose is 9.9.1. Its query.js implementation explicitly maps new:true to returnDocument:'after' and emits the deprecated-option warning. Official API: https://mongoosejs.com/docs/api/query.html#Query.prototype.findOneAndUpdate(). No Mongoose version upgrade required.

13 replacements in 12 controllers: auditAction, auditApproval, auditNotification, auditWorkflow, audits, auth (logout revocation upsert), candidates (2), jobs, occupationalSafetyDetails, products, restaurants, users. Only the option spelling changed. Query predicates, tenant/permission scopes, updates, validation, projection, lean/populate, upsert, response shaping and audit logic are unchanged. No explicit new:true remains in application controllers.

The isolated parity test compares legacy/new options on actual Mongoose/MongoDB: after-update fields, findByIdAndUpdate, projection/lean, upsert, scoped miss and validator rejection. It also asserts the new path emits no deprecated-new warning. Warnings printed by this test intentionally originate from its legacy comparison branch and are not remaining application usages.

## Validation

- Related Node regression command (19 backend test files + real frontend AuthProvider refresh test): 1005 passed, 0 failed; JWT/logout, user/role privileges, parent/child scopes, HR membership, audit/restaurant/approval/execution/template authorization, recruitment E2E, archives, lifecycle/notifications/catalog, rate/IP spoofing, PDF/DOCX extraction and worker limits included.
- Final parity test with warning assertions separately passed.
- New proxy tests: 7 passed. Trusted Render web chain, forged left XFF, independent nearest-client quota, IPv6 subnet, socket fallback, direct/local attribution, real synthetic JWT rejection/acceptance, localized standardized 429 and health path checked.
- Fresh production-only dependency installation: runtime module loads, synthetic DOCX extraction and actual XLSX ZIP export passed. Nodemon/chokidar/braces absent. No package versions changed.
- Backend syntax check: 179 source files, 0 failures. Backend has no build/lint script; targeted existing ESLint recommended Node checks were run on changed application JS with no-unused-vars at warning level: 0 errors / 10 existing warnings (auditAction 3, products 5, restaurants 2).
- Frontend TypeScript + Vite build passed. Existing frontend lint: 0 errors / 9 set-state-in-effect warnings, unchanged AuditDetail (3), SafetyAuditsList, RestaurantsList, DepartmentsList, RolesOverview, UserForm, UsersList.
- Full audit remains 7 findings; omit-dev audit remains 4. Nonzero audit exit reflects remaining findings, not test failure. No force fix or major upgrade.
- Diff whitespace/changed-path/targeted secret scan checked before commit. Only intended source, manifest/lock, tests and docs are staged; no env, credentials, uploaded files, DB files, images, generated packages or raw audit logs.

All DB tests own uniquely named localhost databases and clean only their own fixtures. Existing Mongo containers/volumes remain intact. Documents and JWTs are synthetic; server.js was never started with production environment values. Raw evidence lives outside Git at /workspace/work/backend-security. Workspace remains ~28 GB free, reused browser cache only; no cache cleanup.

## Release risks

The proxy's actual deployed hop/header chain is not observed; Render documentation does not guarantee an exact chain count. The prepared one-hop Render-web setting is bounded and has a fail-closed opt-out, but requires topology/private-path validation before deployment. No public IP diagnostic endpoint added. Multiple upstream hops may still group clients, and numerical trust is unsuitable if untrusted peers can reach the service directly. MemoryStore per-process quotas remain as before.

Runtime-only packaging omits the watcher chain in the Docker build; a native Render build needs npm ci --omit=dev when separately authorized. Full development audit findings remain. SheetJS and Mammoth's CLI transitive issues have no reviewed safe registry patch available in this audit; neither is declared fixed. Export-only SheetJS use and bounded DOCX workers reduce current reachability but do not erase the advisories. Future patched artifact/library replacement requires separate integrity/API regression review.

No production container build/deployment was performed. Local clean installation used --ignore-scripts; native image installation lifecycle scripts were not reproduced. Existing runtime/document regressions passed. A future approved backend release is needed for these source/packaging changes to affect production; no frontend release is required.
