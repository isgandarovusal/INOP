---
name: recruitment-acceptance
description: Project-local recruitment acceptance procedure.
---

# Recruitment acceptance

Use synthetic fixtures and the current loopback MongoDB only. Prove UI → scoped API → persistence → updated UI. Preserve per-record eligibility, handoff parent isolation, manual drafts, source hashes/revisions, ATS and human authority. Use existing browser helpers; do not spawn agents. Run changed feature, lifecycle and affected scope tests; test stale/denied responses. No real messages or production data.

Use existing helpers: Backend/tests/helpers/auditFixture.cjs, Frontend/tests/helpers/browser.cjs and scripts/runQaProcess.cjs. Owned MongoDB port is INOP_AUDIT_TEST_PORT=27018. No production URI is permitted.

Current product regression commands: `INOP_AUDIT_TEST_PORT=27018 node --test Backend/tests/candidateDuplicateReview.test.cjs Backend/tests/recruiterWorkload.test.cjs`. Browser coverage is `Frontend/tests/productStabilizationUI.test.cjs` with the safe-delivery environment. Duplicate decisions are append-only review, never a merge; both profiles require independent update scope and matching revisions. Missing unique idempotency index must fail closed. Workload is assigned-to-me within the existing authorized analytics cohort; unknown review facts are excluded, terminal stages are not productivity scores.
