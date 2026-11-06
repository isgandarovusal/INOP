---
name: audit-capa-integrity
description: Project-local audit capa integrity procedure.
---

# Audit CAPA integrity

Preserve HR/Service 0/0.5/1/N/A with N/A excluded; Standard full catalog with explicit severity/compliance and justified N/A; distinct HSE aggregation. Test finding/action/evidence all belong to one scoped Audit; owner cannot verify own work; closure remains immutable. Due dates are calendar dates, not UTC deadlines. Use a local replica set for transactions. Never substitute ISO/GRC scoring or alter catalogs based on external examples.

Use existing helpers: Backend/tests/helpers/auditFixture.cjs, Frontend/tests/helpers/browser.cjs and scripts/runQaProcess.cjs. Owned MongoDB port is INOP_AUDIT_TEST_PORT=27018. No production URI is permitted.

Focused local commands: `INOP_AUDIT_TEST_PORT=27018 node --test Backend/tests/capaInputIntegrity.test.cjs Backend/tests/auditActionQueue.test.cjs`; real browser persistence/closure checks are `Frontend/tests/opensourceCapabilityUI.test.cjs`. Rejected → in-progress → completed → independent verification is supported. Do not require a new attachment or rating policy that the product has not approved.
