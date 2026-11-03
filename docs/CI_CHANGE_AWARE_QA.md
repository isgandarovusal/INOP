# Conservative change-aware CI

The workflow remains **Audit local release gate**, with the same single required
job identity **local-qa**, `contents: read`, 60-minute deadline and non-cancelling
per-ref concurrency. No test assertions or existing full runners were changed.

## Selection

| Changed range/event | Browser coverage | Backend/security/build |
| --- | --- | --- |
| Explicit existing Recruitment page paths and selected Recruitment tests only | 7 Recruitment groups / 29 files | All backend files, four dependency audits, build/lint |
| Existing AZ/EN/RU JSON changes confined to string leaves under `hrCandidateFilters`, `hrWorkflow`, `hrMatch`, `hrHandoff`, `hrDelivery` | Recruitment groups | Same full backend/security/build |
| Any backend file, including Recruitment queries, catalog and scoring/fairness | Original full 15 groups / 33 files | Full |
| Frontend service/decoder, shared UI/CSS, auth/security, dependency, workflow, unknown or mixed changes | Original full groups | Full |
| Renames, copies, deletes, invalid/missing history, unreadable JSON, unknown/reserved locale keys, malformed/missing/stale plan | Original full groups | Full |
| Manual dispatch or weekly Sunday 03:20 UTC | Original full groups | Full |

The initial optimization deliberately does **not** narrow backend coverage:
all 157 existing backend test files remain; the new selector regression makes
current discovery 158. This preserves all authorization/security regressions
and targets the dominant measured browser cost first. No unknown new feature
path becomes eligible simply because it is inside the Recruitment directory.

Checkout fetches complete history. Push detection compares event `before..after`
across all commits; PR detection compares the event base SHA to the checked-out
merge SHA. Missing/non-ancestor history or checkout mismatch means full. Locale
selection compares parsed JSON leaves on both ends, never just the filename;
removed, non-string or reserved prototype keys are full. Workflow-level
`paths-ignore` was removed, so docs-only/unknown pushes also produce the existing
check rather than leaving it absent.

Both selected and full suites execute inside the same always-present job. A
failed selected group remains failed even if later groups pass. Missing plan
or selector-process failure uses full, not an empty/skipped gate. Selector unit
regression failure itself fails the job. Backend installation, four security
checks, native prerequisites, owned replica-set setup, backend tests, build/lint,
browser installation, cleanup and artifact retention are unchanged.

The focused groups retain existing auth/intake, metadata, workflow and handoff
coverage and add matching, Candidate filters/archive/actions, Job lifecycle,
scoped pagination/ranking/analytics and request/session regressions. Existing
standalone `applicationWorkflowKey` also remains. The portable Candidate filter
root is selected by name: the historical premium screenshot root writes to an
operator-owned absolute path and was never in the original full 33-file gate.
No original full-gate test is removed or weakened.

## Measured baseline and estimate

Successful run **41455480131**, exact Step 9C SHA, job **125310955775**:

- Total job: **43m40s**.
- Browser: **35m43s**; backend serial: **6m25s**.
- Replica startup: **17s**; locked installation **7s**; four audits **2s**;
  build/lint **23s**; browser runtime install **15s**; native preparation **9s**.
- Original retained browser groups 1, 2 and 12: **13m42.8s**.
- Other original browser groups: **22m0.1s**. The focused mode adds dedicated
  Recruitment regressions; this duration cannot simply be subtracted.

Forecast for eligible frontend-only packages: approximately **25–35 minutes**
versus this 43m40s baseline, low confidence until a real selected hosted run.
This is a planning estimate, not a measured improvement or a file-count ratio.
Backend/shared/security changes deliberately retain full duration. The first
workflow-change delivery also selects full.

Current owned Vite caches are released only after browser/Vite shutdown and
identity verification. Historical accumulation explains the need for resource
care but was not established as the cause of this successful hosted run's
35-minute browser gate. No caches or protected evidence were deleted here.

## Validation and rollout

Builtin-only selector tests run before npm installation. They cover real temporary
git repositories with multi-commit ranges/PR merges/renames, exact path and JSON
scope, failure fallback, and child-process failure propagation. Existing full
runner/cache ownership/database-isolation regression remains unchanged.

Full hosted execution of the new selected manifest is still required before
claiming actual runtime or portability success. No manual workflow dispatch or
push is part of this local preparation. One exploratory legacy
`enterpriseLocalization.test.cjs` (not in the original full runner or new
manifest) fails on an obsolete existing localization key; it was left unchanged
and its failure is recorded separately, not counted as PASS.

Branch-protection metadata returned HTTP 403 with the current integration:
configuration is **UNKNOWN**, not absent. The existing workflow/job identity and
failure propagation are preserved; operator verification of required checks
remains prudent before delivery. The default branch is verified `inop-main`,
so the scheduled full run targets the existing default-branch workflow.

Rollback: revert this one CI commit to restore the exact original unconditional
browser invocation and trigger configuration. Full manual QA remains immediately
available without enabling a separate variable or changing security settings.
