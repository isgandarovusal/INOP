# HR premium workspace and opening lifecycle — package 16

2026-10-11. Existing `work` checkout, baseline `8134e354864d7ead2972d85ae83c9bd76a6f40bf`, existing `inop-main` release target. No branch creation, role rewrite, API/schema change, database migration, seed overwrite or external-provider activation. Prior commits, all original tracker IDs and external blockers are retained.

## What changed

- HR requests have a finite 15-second UI deadline, cancellation, distinct timeout/error states, a three-second slow-response hint and manual retry. Old responses cannot restore data after route/permission changes. Other Audit resource timings are unchanged.
- Compact request feedback replaces nested generic state pages and four loading skeletons. Production baseline measured the old loading container at **538px**.
- Job detail starts the independently server-authorized Job and application-ranking reads in parallel. Secondary records remain hidden until the primary Job is readable. The candidate-linking lookup still requires a current readable, open, unarchived Job.
- Shared HR product navigation, restrained canvas/surfaces, readable typography, consistent controls, tables, profile cards, forms, board lanes, history and disabled source pages. Scoped CSS preserves other modules. Search fields retain icon/clear-button space, and Job ranking has a keyboard-accessible title control.
- Analytics uses the existing `hr-analytics-v1` response. KPI, funnel, source bars and bounded memoized SVG score histogram use real scoped counts. Missing values and genuine zero remain distinct; loading KPI placeholders are dashes, never fabricated statistics. Cohort details remain available in a disclosure. No synthetic trend is added when the API contains no time-series data.
- No settled private-response cache is introduced. Existing auth-context pending-request deduplication and per-consumer cancellation are retained, avoiding PII reuse across permissions. Language changes retain data without extra reads.

## Evidence and limitations

Production profiling uses actual lazy routes, protected HR routes, production CSS and a synthetic authenticated context; actual authenticated GETs reach a uniquely owned loopback Mongo fixture. Each tested cohort has three catalog Job fixtures plus 0 or 5,000 synthetic application/candidate records. No real CV or hosted database is read. Measurements are single local samples, not a hosted SLA or isolated React CPU benchmark. Navigation/response-to-paint includes DOM work and two animation frames. Auth bootstrap, hosted DNS/TLS, Render cold starts and production credentials are outside this measurement.

Baseline artifact: `/tmp/inop-hr16-baseline-production.json` (10/10 scenarios). The existing backend optimization and serialized 0/5k/50k evidence remain in `HR_FINAL_API_BENCHMARK.md`; this frontend-only package does not change backend queries or indexes.

The exact final full-suite, before/after, commit and remote evidence is recorded below after validation. Investigative failures remain in `/workspace/inop-hr16b-target.log` and `...-target-corrected.log`; the source-page presentation and legacy Job CSS causing them were fixed without deleting assertions.

## Release limits

Real CV ingestion, durable object storage, scanner/recovery and unverified AI/Outlook/partner integrations remain **BLOCKED_EXTERNAL / NO-GO**. Feature flags and backend authorization are unchanged. Lawful retention remains open. A normal existing-main push is authorized for the validated UI/core changes; it does not certify hosted deploy success. Render/Vercel status, served SHA, live login and private downloads must be reported separately and cannot be marked PASS through proxy errors.
