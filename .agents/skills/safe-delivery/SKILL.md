---
name: safe-delivery
description: Project-local safe delivery and resource-efficient qa procedure.
---

# Safe delivery and resource-efficient QA

Use the existing independent /tmp clone; preserve original full workspace and prior evidence. No new Docker volumes, unknown-volume/workspace/evidence cleanup, extra agents or production access. One bounded browser process at a time; close browser/Vite and stop owned MongoDB only. Use role locators, actual App styles, current screenshots and local axe-core for declared contexts. Do not suppress genuine errors. Reuse unaffected passing tests. Review git diff and lockfile changes, commit logical packages, fetch and fast-forward push; never force-push or start a comprehensive CI gate without explicit request. Store only sanitized durable evidence.

Use existing helpers: Backend/tests/helpers/auditFixture.cjs, Frontend/tests/helpers/browser.cjs and scripts/runQaProcess.cjs. Owned MongoDB port is INOP_AUDIT_TEST_PORT=27018. No production URI is permitted.
