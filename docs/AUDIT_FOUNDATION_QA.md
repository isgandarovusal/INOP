# Audit packages 1–5: integration and release checklist

> Historical P1–5 record. Current P1–11 finding status: `AUDIT_FINDING_STATUS.md`; release gates: `AUDIT_PRODUCTION_RELEASE_PLAN.md` and `AUDIT_PACKAGE_11_RELEASE_REHEARSAL.md`. Latest QA: `AUDIT_PACKAGE_9_11_QA.md`.

Package 5 resumes the preserved Package 4 HEAD c6a6551; it does not recreate packages 1–4. Recruitment and Dashboard source/design files are unchanged. New navigation separates management and four audit directions. Existing detail, execution, report, finding, review, closure, template and history routes remain available under authorization.

## Verification scope

- Owned random loopback MongoDB databases only, port 27018, isolated replica set `inop_audit_qa`. No production migration, index, backfill or user-role update.
- Integration command: `INOP_AUDIT_TEST_PORT=27018 node --test Backend/tests/auditFoundation.test.cjs Backend/tests/auditCatalog.test.cjs Backend/tests/auditDirection.test.cjs Backend/tests/auditTemplateRevision.test.cjs Backend/tests/auditLifecycleSafety.test.cjs Backend/tests/auditDashboardScores.test.cjs Backend/tests/userPrivileges.test.cjs Backend/tests/hrDepartmentAccess.test.cjs`.
- Browser: installed Playwright CLI and `/usr/bin/chromium`; actual AuthProvider, actual local JWT/backend responses, synthetic data, non-loopback requests blocked. Twelve audit routes at 1440/768/390, AZ/EN/RU, forbidden direction, legacy detail, HR cancel token, logout/login, keyboard focus and overflow assertions. Screenshot review is additional to assertions.
- Backend has no compilation step. Changed backend JS is syntax/lint checked. Frontend production build includes TypeScript.
- Artifacts stay outside Git in `/workspace/work/audit-packages/` (logs, screenshots, browser cache). Production browser testing is unavailable in the effective managed network configuration; local results are not production evidence.

## Final local results

- Integration: 119 passed, 0 failed, 0 skipped.
- Focused immutable revision/execution concurrency rerun: 2 passed.
- Installed Chromium/Playwright: 1 scenario passed, 39 screenshots generated; includes synthetic finding creation/closure and all progressively loaded legacy detail modules. Zero uncaught browser page errors.
- TypeScript/Vite build passed. Frontend lint: 0 errors / 9 existing warnings. Changed-backend lint: 0 errors / 4 warnings. Backend syntax passed.
- Diff whitespace and credential-pattern scan passed; pattern scanning is not a formal security certification.
- Disk: approximately 26 GB free in /workspace and 4.8 GB in /tmp. Local QA replica-set container remains available; existing MongoDB container/volumes untouched.

## Diagnostic disposition

| Concern | Status / remaining work |
| --- | --- |
| GFC incorrectly treated as a brand, duplicate restaurants | Fixed canonical catalog: GFC parent, exactly KFC/Pizza Hut/Simit Sarayı. Optional links; only dry-run suggestions. Existing IDs preserved. Explicit reviewed mapping still required. |
| Multiple concurrent auditor directions, unknown aliases | Scalar canonical profile with provenance and transaction serialization. Unknown aliases fail closed. Explicit profile provisioning is required; no guessed production assignment. |
| Permission, organization, direction and child-resource isolation | Central scope intersection and parent-derived child filters; integration tests cover cross-direction, cross-organization and denied JWT/role requests. |
| Management account with a formerly active auditor profile | Existing conservative restriction retained. Automatic approval rejected a proposal to bypass that profile for management roles. Promotion/deactivation policy requires separate authorization; no bypass was implemented. |
| Immutable published template / server revision snapshot | Implemented and tested, including concurrent publishing and direction/brand mismatch. Approved Mongo validators/index migration remains pending; raw administrative DB writes are outside application enforcement. |
| Empty answers producing perfect scores / wrong denominator / yes-no-na | Bound revision completeness and service answer calculation tested. No new question, weight, threshold or invented scoring contract. Undefined contracts remain unscored. Historical results are not silently recalculated. |
| Trusted client score/status/approval, self-review, illegal transitions | Server-owned results, independent reviewer and state-machine enforcement tested. Completing an audit verifies the server-owned context/revision linkage. |
| Assignment idempotency/provenance, execution duplication | Serialized parent/profile writes and actor provenance; execution creation reuses the audit/revision execution under a parent transaction. |
| Finding closure / approval / audit closure races | Parent locking and transaction boundaries; unresolved finding and missing independent review block closure. |
| Persistent blob URL evidence | New local upload/download uses authenticated parent scope and real bytes. Render production upload deliberately returns 503 until a durable private storage adapter is approved. Old blob URLs cannot be recovered automatically. **Release blocker for production evidence uploads.** |
| Hard-delete orphans | Audits/restaurants archive rather than erase linked history. Legacy unsafe mutation expectations intentionally changed to rejection/archive; historical read contracts retained. |
| Legacy data / unknown direction / closure | Existing records preserved. Unknown directions and unbound legacy executions are not certified; explicit reviewed migration required. |
| Source document processing and audit action routes | Not completed by these packages. Existing processing limitations and unmounted action routes require their own functional package; no fabricated extraction/output. |
| Older analytics API behavior | New direction/overview endpoints distinguish unscored values and use scoped real data. Older analytics endpoints are retained; their null/zero and trend-window semantics need a separate compatibility review. |
| Unbounded lists / reviewer directory query costs | Functional authorization verified; pagination/performance work remains. No benchmark or speed claim is made. |
| Audit history/activity duplication | Existing records preserved; full event-stream consolidation remains future work. |
| AZ/EN/RU | New direction/navigation/workflow controls localized. Older legacy pages still contain some fixed text; full historical UI translation coverage is not claimed. |
| CSS consolidation | Audit center conflicting layers removed and rewritten against shared tokens. Other Audit styles namespaced, duplicate declarations consolidated; full removal of every legacy specificity rule remains future work. No HR selector override was added. |
| Production transactions/indexes | Replica-set transactions required and fail closed if unavailable. Production topology not verified. Validators/index provisioning and data migration require separate approval. |

## Release sequence after separate approval

1. Review dry-run restaurant/profile/template mapping and unresolved legacy records.
2. Confirm production transaction topology and explicitly approve required validators/indexes; do not run automatic backfill.
3. Provide durable private evidence storage before enabling production uploads.
4. Confirm frontend/backend coordinated release and smoke-test read scopes first, then synthetic authorized workflows in a staging environment.
5. Push/deploy remains outside this task. Retain local QA infrastructure until its disposition is approved.

## Packages 6–8 continuation

The baseline tests above describe Package 5. Updated disposition is in `AUDIT_FINDING_STATUS.md`; release/storage gates are in `AUDIT_PRODUCTION_RELEASE_PLAN.md`. Legacy analytics and mounted action routing, scoped pagination and real bounded PDF/DOCX extraction are now implemented and tested. A concrete durable provider, credentials, production transaction/index/validator evidence and approved legacy mapping are still absent. Production uploads remain disabled. No role-string management bypass was added.
