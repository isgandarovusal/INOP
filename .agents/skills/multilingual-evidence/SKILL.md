---
name: multilingual-evidence
description: Project-local multilingual evidence quality procedure.
---

# Multilingual evidence quality

Reuse the existing 42 AZ/EN/RU scenarios and safety slices. Distinguish deterministic parsing, mocks, file-type classifiers, embeddings and real contextual inference. Require official license/revision/artifact hashes and resource budget before models. Do not send CVs to third parties. Report false positives/negatives, grounded recall, per-language coverage, latency and memory honestly. Reject stale/revoked/unattributed evidence. Keep production semantic hiring disabled.

Use existing helpers: Backend/tests/helpers/auditFixture.cjs, Frontend/tests/helpers/browser.cjs and scripts/runQaProcess.cjs. Owned MongoDB port is INOP_AUDIT_TEST_PORT=27018. No production URI is permitted.
