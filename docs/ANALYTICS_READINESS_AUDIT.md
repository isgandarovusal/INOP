# Analytics readiness audit

This package measures and preserves existing progressive readiness. No new backend query/cache/DTO change was justified or introduced. Production proxy access is blocked, so no Render cold-start or hosted timing is claimed. Local source-only production **profiling** bundles compare published 318f60d with source 39cf45f, same process and same owned localhost fixture: 3 jobs, 5,000 candidates, 5,000 applications. Five cold-context and five warmed-SPA samples per phase, 20 valid samples, all API requests awaited. Profiling adds overhead.

| Metric median ms | Cold before → after | Warm before → after |
|---|---:|---:|
| Analytics shell | 858.2 → 858.9 | 37.5 → 17.7 |
| KPI placeholder visible | 858.2 → 858.9 | 37.5 → 17.7 |
| KPI real-data ready | 1014.2 → 1159.6 | 232.2 → 181.6 |
| Scores real-data ready | 1375.4 → 1424.3 | 498.5 → 507.5 |
| Overview API | 112.1 → 110.8 | 138.6 → 123.7 |
| Scores API | 442.3 → 383.6 | 405.1 → 432.9 |
| Auth API | 57.0 → 35.1 | not requested |
| Slowest individual observed query | 58.9 → 68.1 | 73.7 → 97.0 |
| React render CPU | 137.1 → 100.1 | 33.7 → 25.4 |
| Any tracked resource/route loader visible duration | 814.6 → 915.3 | 461.0 → 491.7 |

Cold KPI ranges: 921.7–1173.8 → 1059.1–1177.6 ms; warm 164.3–272.1 → 167.7–253.3 ms. Query timing includes other concurrent queries, not a production query plan benchmark. Brand/branch filter data stays in the real overview envelope; existing server catalog branch reads run independently of application aggregation. Overview/scores request starts were a median 1.6–6.1 ms apart. Requests: cold 3 (auth + overview + scores), warm 2, duplicates 0. Render commits: cold 5→4, warm 4→3. No warm auth skip: the existing current same-session grant is used; cold auth remains real.

Both phases show real KPI earlier than full score readiness. Score failures remain auxiliary; 401/403 still redact private data. Permission/filter context changes clear previous-context metrics before rendering; explicit same-context refresh retains a labeled refreshing result only. No loader was hidden early, no fake KPI or stale result inserted. Loader timing is observed DOM visibility, not paint duration.

A separate repeated-parent profile (20 jobs, 200 candidates, 4,000 applications) measured five Scores API runs: candidate fingerprint CPU 3.6–6.7 ms, 800 hashes per run, total API 104–254 ms. A proposed extra fingerprint cache was rejected: hashing did not dominate, and added cache complexity/freshness risk was unwarranted. Existing request batching already deduplicates parent reads within each batch.

No net Analytics speedup is established: cold KPI/data and warm score readiness were slower in this comparison. Backend code is identical between phases; timing differences cannot be called query gains. Accepted HR layout/tokens are unchanged. Production access and authorized hosted timing remain required to diagnose the user's residual wait fully. No production data, keepalive or deployment touched.

Raw evidence: `/workspace/work/critical-login/analytics-readiness.json`, `score-profile.json`. An earlier run used an h1 shell selector while the real PageHeader is h2; its shell timing fallback is invalid and was kept separately. The final selector measures the actual page title, placeholders and real data independently. Corrected metrics, not the earlier fallback, appear above.
