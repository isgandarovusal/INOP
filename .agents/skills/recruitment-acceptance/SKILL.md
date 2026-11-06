---
name: recruitment-acceptance
description: Project-local recruitment acceptance procedure.
---

# Recruitment acceptance

Use synthetic fixtures and the current loopback MongoDB only. Prove UI → scoped API → persistence → updated UI. Preserve per-record eligibility, handoff parent isolation, manual drafts, source hashes/revisions, ATS and human authority. Use existing browser helpers; do not spawn agents. Run changed feature, lifecycle and affected scope tests; test stale/denied responses. No real messages or production data.

Use existing helpers: Backend/tests/helpers/auditFixture.cjs, Frontend/tests/helpers/browser.cjs and scripts/runQaProcess.cjs. Owned MongoDB port is INOP_AUDIT_TEST_PORT=27018. No production URI is permitted.

Current product regression commands: `INOP_AUDIT_TEST_PORT=27018 node --test Backend/tests/candidateDuplicateReview.test.cjs Backend/tests/recruiterWorkload.test.cjs`. Browser coverage is `Frontend/tests/productStabilizationUI.test.cjs` with the safe-delivery environment. Duplicate decisions are append-only review, never a merge; both profiles require independent update scope and matching revisions. Missing unique idempotency index must fail closed. Workload is assigned-to-me within the existing authorized analytics cohort; unknown review facts are excluded, terminal stages are not productivity scores.

Final connected acceptance: `INOP_AUDIT_TEST_PORT=27018 node --test Backend/tests/duplicateReviewHistory.test.cjs Backend/tests/teamWorkload.test.cjs Backend/tests/recruiterWorkload.test.cjs`. Use `Frontend/tests/finalIntegrationUI.test.cjs` with the safe-delivery browser environment and `--test-concurrency=1`. History requires independently readable pairs, including archived profiles that remain readable; old revisions are historical only. Team reporting requires independent all-read Application, Recruitment and User grants. Completing a follow-up may retain kind=none and historical due/notes; neither work queue nor workload may count it as overdue. Denied or stale duplicate-review mutation must refresh record eligibility without an automatic retry.

Approved duplicate policy: review/confirm only, never identity merging. New decisions carry server-derived evidence/revision references; legacy entries are explicitly marked. Pending/current/renewed-review states come from the journal and current fingerprints. Run `Backend/tests/candidateDuplicateReview.test.cjs` and `Backend/tests/duplicateReviewHistory.test.cjs` against the owned loopback fixture. Browser acceptance: `Frontend/tests/approvedPolicyUI.test.cjs`. A correctly named nonunique index is NOT authority; writes require the exact unique command index. The default-read-only rollout procedure is `Backend/scripts/duplicateJournalIndex.cjs`; see `docs/DUPLICATE_JOURNAL_INDEX_ROLLOUT.md`. Never resolve historical index conflicts by silently deleting journal rows.
