---
name: performance-regression
description: Measure Login and Dashboard request and state lifecycles without changing approved design.
---

# Measured interaction and cache acceptance

Use the safe-delivery skill first. Start only the existing owned loopback Mongo fixture if required; do not create Docker volumes. Use one browser-heavy process at a time. Keep caches, logs and screenshots under /tmp when the original filesystem is full.

Run generated isolation tests with `node --test Frontend/tests/dashboardSnapshotProperty.test.cjs`. This uses pinned test-only fast-check and an explicit seed; preserve failing seeds/counterexamples. Never replace an assertion with a timeout increase.

Run real interaction tests with `INOP_AUDIT_TEST_PORT=27018 INOP_BROWSER_EXECUTABLE=/usr/bin/chromium INOP_BROWSER_CACHE_DIR=/tmp/inop-approved-recovery/vite INOP_QA_SCREENSHOTS=/tmp/inop-approved-recovery/stabilization-evidence/screens node --test Frontend/tests/productStabilizationUI.test.cjs`.

Use the bounded `scripts/runQaProcess.cjs` exported runner for grouped execution. Repeat only affected tests. Preserve actual timings and request counts separately from simulated clock advancement. A local delayed response is not a remote cold-start measurement.

Required invariants: a valid Login can submit while restoration is pending; only an actual submission locks the form; duplicate submissions do not start extra requests. Dashboard RAM data is session/token/permission/backend isolated, has per-section expiry and cannot cross logout or account changes. Background refresh preserves valid content and errors remain visible. Manual Refresh bypasses settled aggregate data. AuthProvider still independently rechecks permissions on focus. No persistent candidate/CV storage. Do not suppress real console/network errors.

Open current screenshots at 1440/768/390/320 across AZ/EN/RU. Use scoped axe checks and keyboard tests; report their scope, not global WCAG certification. Measure cache hits, expired revalidation and explicit refresh independently. Preserve design and existing Audit scoring.
