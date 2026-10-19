# INOP development workflow

INOP is in development/testing. Work directly on `inop-main`; use ordinary commits and pushes. Do not create branches/PRs or force-push unless the user changes this workflow. The operator performs Render deployments. Never start a deployment or change production DB/secrets as part of routine development.

## Daily work

1. Check `git status -sb`, HEAD and remote HEAD; preserve others' work.
2. Use Node 24 (`.nvmrc`) and `npm ci --prefix Backend` / `npm ci --prefix Frontend`.
3. Run `npm run build --prefix Frontend` and `npm run lint --prefix Frontend`. Run tests relevant to changes. Do not weaken or remove regression coverage.
4. Full backend: `INOP_AUDIT_TEST_PORT=27018 npm test --prefix Backend`. Full browser gate: `INOP_AUDIT_TEST_PORT=27018 node Frontend/tests/runAuditBrowserSuite.cjs`. These require an owned local MongoDB replica set on loopback 27018; never use a production connection. See the executable [CI workflow](../.github/workflows/audit-release-gate.yml) for reproducible setup, native OCR prerequisites and browser installation.
5. Review diff, commit and ordinary push. Vercel may deploy on push. Do not overlap an operator-started deployment: confirm its terminal status and SHA first. For this cleanup, the operator confirmed Render Live and Vercel Ready at `2b811d5`; `/version` independently returned the same full SHA.

## Evidence and cleanup

Keep Audit source maps, catalogues, business decisions, unique QA evidence and all protection tests. All 121 backend test files and all frontend tests/helpers are retained. The backend runner discovers every `.test.cjs`; the browser runner retains its eight integration groups. Helpers used by other standalone tests remain supported even when not in the browser smoke gate. No unused test/helper removal was justified in this cleanup.

Generate temporary output outside the repository under `/workspace/work/`, or in ignored root `work/` on CI. Delete only owned, inactive, reproducible output. Never delete source Excel uploads, unique reports, evidence files or another task's caches.

Cleanup inventory (2026-10-19):

- Removed 19 byte-identical screenshot copies within their original QA directories (1,909,469 bytes). Gallery/report links use the retained copies. [Alias/hash manifest](qa/duplicate-assets.json) preserves every old filename and SHA-256; no unique image was removed. Repeated measurements/JSON records and cross-stage images were retained, even where identical, to preserve provenance.
- Removed only the inactive historical compatibility checkout's `Backend/node_modules` installation under `/workspace/work/production-stage-3/live-code-compat/` (about 212 MiB). Its original lockfile/source, compatibility scripts, logs and export evidence remain; dependencies can be recreated with `npm ci` in that checkout. Current dependencies and active caches were untouched.
- Historical baseline checkouts, original Excel files, QA logs, source verifiers, provisioning/index dry-run scripts and all existing operator documents remain: they contain unique decisions/evidence or are still referenced. This document consolidates the current daily workflow without rewriting historical results.
- Corrected the unclosed project-tree code fence and obsolete Formik/SheetJS dependency claims in README. Ignored root CI `work/` output to prevent accidental log/artifact commits.

## Optional infrastructure activation

Storage provider activation, template/object/grant provisioning and index rollout remain separate operator actions. Nothing in this workflow activates them. Use the existing detailed references only when needed:

- [Storage requirements and smoke checks](PRODUCTION_STAGE_03_STORAGE_ACTIVATION.md)
- [Provisioning and historical revision protection](PRODUCTION_STAGE_03_PROVISION.md)
- [Backup, rollback and monitoring](PRODUCTION_STAGE_03_BACKUP_MONITORING.md)
- [Historical QA](PRODUCTION_STAGE_03_QA.md) and [release gate](PRODUCTION_STAGE_03_RELEASE_GATE.md)

Earlier package/stage documents are dated evidence, not additional approval requirements for ordinary development. Their old HEAD, deployment or push restrictions describe those tasks; the current user instructions govern new work.

Cleanup verification: frontend build PASS; lint 0 errors / 9 existing warnings; S3/runtime/cache tests 11 PASS / 0 FAIL / 0 skipped; alias hashes 19/19 and gallery references 332/332 PASS; `git diff --check` PASS. Backend, Frontend, test runners and CI contents are unchanged. The full backend/browser suites were not rerun for this documentation/artifact-only change; the unchanged code tree has hosted CI success at [39252810594](https://github.com/isgandarovusal/INOP/actions/runs/39252810594). A new hosted run must be checked after push; this note does not claim a new full-suite PASS.
