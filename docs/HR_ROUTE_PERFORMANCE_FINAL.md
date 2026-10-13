# HR route performance audit

Baseline: fccabbb19fbd4259c2a8e5fb83a42c356c8f1f0c. Local production **profiling** bundle, real AuthProvider, existing Chromium, one backend/browser process and one owned loopback database: 3 jobs, 5,000 candidates, 5,000 applications. Five fresh-browser-context document navigations and five warmed-route SPA navigations per route, before and after (180 valid samples). Cold describes browser/code/auth startup, not Render or MongoDB cold-start. No hosted/production performance measurement was possible; no real data accessed.

A partial interrupted run is retained separately and excluded. The final harness waits for pending backend requests in addition to browser network-idle. The candidate handler alone was reloaded in the owned fixture between phases through a brief localhost inspector connection; source/data and process were preserved. The inspector was not used to read credentials or record bodies. React production profiling instrumentation adds overhead; numbers are not production SLA claims.

## Navigation medians (milliseconds)

| Route | Cold primary UI before → after | Warm primary UI before → after | Cold primary/all-score data before → after | Warm primary/all-score data before → after |
| --- | ---: | ---: | ---: | ---: |
| analytics | 1615.5 → 2002.6 | 323.8 → 329.7 | 1956.3 → 2705.4 | 678.1 → 1067.4 |
| candidates | 1286.0 → 1249.5 | 135.6 → 143.9 | 1286.0 → 1249.5 | 135.6 → 143.9 |
| applications | 1338.0 → 1464.6 | 214.8 → 219.1 | 1338.0 → 1464.6 | 214.8 → 219.1 |
| kanban | 1893.7 → 1336.2 | 213.6 → 259.6 | 1893.7 → 1336.2 | 213.6 → 259.6 |
| vacancies | 1343.8 → 1206.7 | 109.3 → 120.7 | 1343.8 → 1206.7 | 109.3 → 120.7 |
| jobForm | 1233.5 → 1131.6 | 132.7 → 120.9 | 1233.5 → 1131.6 | 132.7 → 120.9 |
| applicationDetail | 1187.4 → 1102.2 | 84.3 → 104.0 | 1187.4 → 1102.2 | 84.3 → 104.0 |
| candidateDetail | 1103.6 → 1102.7 | 93.9 → 100.0 | 1103.6 → 1102.7 | 93.9 → 100.0 |
| jobDetail | 1033.2 → 1251.3 | 103.5 → 58.9 | 1033.2 → 1251.3 | 103.5 → 58.9 |

First meaningful DOM render equalled primary-usable markers in this sample set. Primary means the visible main table/form/facts/KPI envelope; Job Detail ranking and candidate-selection catalog are secondary reads and are measured separately below. Analytics all-score readiness waits for actual score content. No loader was hidden early to improve a number. DOM timestamps are not browser paint Web Vitals. The harness also records last-observed loading timestamps; these are lower bounds rather than exact skeleton lifetimes and are not used to claim gains.

## Warm response/render/query medians

| Route | API requests before/after | Duplicates | React commits before/after | React render ms before/after | Slowest query ms before/after |
| --- | ---: | ---: | ---: | ---: | ---: |
| analytics | 2.0/2.0 | 0 | 4.0/3.0 | 32.2/49.3 | 100.1/200.1 |
| candidates | 1.0/1.0 | 0 | 3.0/3.0 | 36.5/44.4 | 14.2/14.4 |
| applications | 1.0/1.0 | 0 | 3.0/3.0 | 56.1/62.9 | 16.5/26.7 |
| kanban | 1.0/1.0 | 0 | 3.0/5.0 | 67.9/70.1 | 64.4/64.4 |
| vacancies | 1.0/1.0 | 0 | 2.0/2.0 | 33.3/25.8 | 3.8/8.2 |
| jobForm | 2.0/2.0 | 0 | 2.0/2.0 | 30.0/19.4 | 6.6/22.8 |
| applicationDetail | 3.0/3.0 | 0 | 3.0/4.0 | 20.7/23.6 | 8.8/18.9 |
| candidateDetail | 2.0/2.0 | 0 | 3.0/3.0 | 22.7/14.5 | 7.3/11.9 |
| jobDetail | 3.0/3.0 | 0 | 6.0/6.0 | 43.0/39.2 | 975.2/700.9 |

## Proven bottleneck and change

Job Detail eagerly supplies its existing candidate picker. Its anti-join candidate API had a warm browser-fixture median of 1002.2 ms. A per-candidate correlated `$expr` lookup dominated the aggregate. The lookup now uses MongoDB concise localField/foreignField equality, while retaining the exact application permission predicate, target-job filter, one-link limit, parent authorization, candidate filters and count/pagination. Existing candidateId and unique jobId/candidateId indexes remain; no production DDL, cache or DTO change.

A separate **five-pair interleaved** API experiment (same process/database, no competing browser workload) compared both handlers and asserted complete response equality: 623.31 → 513.99 ms. This isolates the changed query better than whole-route startup. Scope/filter/pagination and existing ranking regressions passed 18 checks.

Other HR routes were not rewritten: bounded page reads, parallel overview/scores, lazy route modules, on-demand operations and pending read deduplication already work. Analytics primary warm KPI readiness was 323.8 → 329.7 ms. Its unchanged auxiliary score scan was slower in the second whole-route phase (678.1 → 1,067.4 ms readiness); this variability is explicitly retained, and no Analytics speedup is claimed. Freshness/scope checks and prior independent-count optimization are intact. Production cold-start/network correlation remains unmeasured.

## Bundle inspection

All nine routes remain dynamic imports. The actual build already emits hr-route-manifest.json; an early incomplete config read incorrectly suggested it was missing, and that hypothesis was discarded without source changes. Hashed code prefetch contains no private response cache. Raw samples retain API durations/bytes, server timing, model/operation durations, render events and loaded public asset bytes; they contain no credentials or production records.
- analytics: initial uncompressed public assets 656,151 JS bytes / 198,787 CSS bytes (local transfer, not gzip).
- candidates: initial uncompressed public assets 669,051 JS bytes / 198,787 CSS bytes (local transfer, not gzip).
- applications: initial uncompressed public assets 681,466 JS bytes / 198,787 CSS bytes (local transfer, not gzip).
- kanban: initial uncompressed public assets 780,524 JS bytes / 198,787 CSS bytes (local transfer, not gzip).
- vacancies: initial uncompressed public assets 668,614 JS bytes / 198,787 CSS bytes (local transfer, not gzip).
- jobForm: initial uncompressed public assets 664,582 JS bytes / 198,787 CSS bytes (local transfer, not gzip).
- applicationDetail: initial uncompressed public assets 665,697 JS bytes / 198,787 CSS bytes (local transfer, not gzip).
- candidateDetail: initial uncompressed public assets 687,291 JS bytes / 198,787 CSS bytes (local transfer, not gzip).
- jobDetail: initial uncompressed public assets 668,086 JS bytes / 198,787 CSS bytes (local transfer, not gzip).
