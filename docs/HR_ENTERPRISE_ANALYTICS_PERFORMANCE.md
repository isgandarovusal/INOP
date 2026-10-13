# HR analytics: local performance validation

The user observed roughly 4–5 seconds for analytics in their environment. That observation was not reproduced or measured against production. All measurements below use synthetic data in an owned localhost test database, existing Chromium, a reused Vite cache, and the same backend/browser process for both versions.

Dataset: 20 vacancies, 200 candidates, 4,000 unique candidate/vacancy applications. One scores API warmup per phase, five samples per API endpoint, and three client navigations per phase. Mongoose query/aggregation durations, browser request timings and payload sizes, and React Profiler commits were recorded without query arguments, credentials or record contents. The previous controller was loaded from the package 5 commit and swapped into the same fixture router; the optimized controller was then measured against the unchanged database. No concurrent test suite ran during this controlled comparison.

| Median measurement | Before | After |
| --- | ---: | ---: |
| Scores independent count query | 26.86 ms aggregation | 4.46 ms countDocuments |
| Scores API | 150.60 ms | 100.44 ms |
| Overview API (unchanged code path) | 51.98 ms | 35.54 ms |
| Navigation to primary KPI | 364.98 ms | 275.92 ms |
| Navigation to score content | 425.38 ms | 347.05 ms |
| React Profiler summed render cost | 95.80 ms | 90.10 ms |
| Initial analytics API requests | 2 | 2 |
| Overview payload | 3,287 bytes | 3,287 bytes |
| Scores payload | 389 bytes | 389 bytes |

Scores API ranges were 105.3–233.1 ms before and 92.3–107.7 ms after. These small local samples have noise and ordering/cache effects: improvement on the unchanged overview path must not be attributed to the count optimization. An earlier comparison overlapping test execution showed scores API increasing from 116.6 to 129.1 ms; it was retained as evidence of measurement variability, not used to claim a speedup. Navigation and React figures are development-fixture observations, not production benchmarks or a guarantee of equivalent improvement in the user's environment.

The measured unnecessary work was scores' totals aggregation: it computed summary grouping/brand mapping even though this endpoint only needs an independent total for score scan consistency. For up to 500 currently readable Job identities, a scoped countDocuments query now provides that total. Larger Job cohorts retain the existing indexed equality-join fallback. Candidate visibility, scoring freshness checks, deadlines, role/token revalidation, and response versions remain unchanged. No response cache, new index or dependency was introduced.

Validation: the new scope/filter/large-cohort regression and existing HR analytics backend suite passed all 18 checks. The full local timings are in the task's work directory as analytics-controlled.json; they contain timings, counts, endpoint paths and byte sizes only.
