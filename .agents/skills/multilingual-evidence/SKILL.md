---
name: multilingual-evidence
description: Project-local multilingual evidence quality procedure.
---

# Multilingual evidence quality

Reuse the existing 42 AZ/EN/RU scenarios and safety slices. Distinguish deterministic parsing, mocks, file-type classifiers, embeddings and real contextual inference. Require official license/revision/artifact hashes and resource budget before models. Do not send CVs to third parties. Report false positives/negatives, grounded recall, per-language coverage, latency and memory honestly. Reject stale/revoked/unattributed evidence. Keep production semantic hiring disabled.

Use existing helpers: Backend/tests/helpers/auditFixture.cjs, Frontend/tests/helpers/browser.cjs and scripts/runQaProcess.cjs. Owned MongoDB port is INOP_AUDIT_TEST_PORT=27018. No production URI is permitted.

Do not confuse the synthetic PDF/OCR benchmark with contextual qualification inference: `INOP_PARSER_EXPERIMENT_PATH=/tmp/inop-approved-recovery/parser-experiment node Backend/scripts/benchmarkPdfOcr.cjs` needs the reviewed optional Python runtimes and hash-pinned test OCR models already prepared. It never installs packages or contacts providers. Read marker failures and attribution limits; do not rerun completed DOCX work or download large layout models to fill a report.

OCR confusable acceptance: `Backend/tests/hrCvOcrProcessing.test.cjs` and `Backend/tests/hrCvSourceOcr.test.cjs` use pinned real Tesseract AZ/EN/RU models. `Backend/tests/hrOcrAcronymSafety.test.cjs` proves explicit adverse text suppresses the narrow acronym draft alias; the original bytes/quotes are never rewritten. `ocr_acronym_review` is a localized human-review warning, not a verified qualification. This conservative guard can abstain on unrelated negative text; do not call it contextual inference or claim perfect recall. The production semantic hiring gate remains disabled.
