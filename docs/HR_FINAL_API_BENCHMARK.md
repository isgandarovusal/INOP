# Final ATS-v2 local API benchmark

Bound source `0903b744127165448781d1605f9424b24610b07a`, Node24.19.0. New owned loopback Mongo fixture per size; synthetic data, actual GET routes. Run after full frontend/backend runners finished, without overlapping validation. No .env/provider/production/hosting access, no seed/reset/migration on existing data. Artifact `/workspace/inop-hr13-final-atsv2-benchmark.json`; command `node --expose-gc Backend/scripts/benchmarkHr.cjs /tmp/inop-hr13-final-atsv2.json`, successful exit. Original report and log retained; only each runner-owned temporary database was dropped.

| Records | Endpoint | ms | JSON bytes | Rows | Backend timing ms |
|---:|---|---:|---:|---:|---:|
| 0 | `/applications` | 58.6 | 2 | 0 | 17.44 |
| 0 | `/hr/v2/applications` | 16.0 | 102 | 0 | 12.67 |
| 0 | `/hr/v2/candidates` | 8.4 | 102 | 0 | 6.05 |
| 0 | `/hr/v2/application-board` | 16.6 | 1013 | 0 | 13.11 |
| 0 | `/hr/v2/application-board` | 16.5 | 1012 | aggregate / selected Job | 13.24 |
| 0 | `/hr/v2/application-ranking` | 17.3 | 102 | aggregate / selected Job | 14.07 |
| 0 | `/hr/analytics` | 16.4 | 2751 | aggregate / selected Job | 13.10 |
| 5000 | `/applications` | 955.0 | 16217265 | 5000 | 800.96 |
| 5000 | `/hr/v2/applications` | 21.6 | 23749 | 30 | 19.34 |
| 5000 | `/hr/v2/candidates` | 10.8 | 13938 | 30 | 8.05 |
| 5000 | `/hr/v2/application-board` | 55.1 | 66687 | 80 | 51.56 |
| 5000 | `/hr/v2/application-board` | 41.0 | 65849 | aggregate / selected Job | 37.52 |
| 5000 | `/hr/v2/application-ranking` | 145.1 | 23677 | aggregate / selected Job | 142.15 |
| 5000 | `/hr/analytics` | 499.5 | 2840 | aggregate / selected Job | 496.44 |
| 50000 | `/applications` | 8267.8 | 162222693 | 50000 | 6833.27 |
| 50000 | `/hr/v2/applications` | 43.4 | 23744 | 30 | 39.57 |
| 50000 | `/hr/v2/candidates` | 32.3 | 13969 | 30 | 29.41 |
| 50000 | `/hr/v2/application-board` | 266.6 | 66689 | 80 | 264.19 |
| 50000 | `/hr/v2/application-board` | 147.2 | 65858 | aggregate / selected Job | 144.07 |
| 50000 | `/hr/v2/application-ranking` | 1321.4 | 23672 | aggregate / selected Job | 1310.12 |
| 50000 | `/hr/analytics` | 4956.0 | 2871 | aggregate / selected Job | 4952.84 |

The repeated board row is selected-Job board. All24 measured endpoint calls returned200. All15 Admin/HR/own/department/assigned scope checks matched expected counts. At50k: Admin/HR50000, own10000, department30000, assigned10000. All four unhinted31-row newest-page plans at5k/50k examine31 keys/documents and return31; separate lookup/aggregate/ranking scans remain cohort-dependent.

At50k, legacy Applications returns162,222,693bytes/50,000rows at8,267.8ms versus paged23,744bytes/30rows at43.4ms. Current board80cards/66,689bytes at266.6ms; analytics2,871bytes at4,956.0ms and213 Mongoose-method observations. Query counters omit wire getMore and are not query-plan proof; only the sampled plans are plans. The existing10s deadline is preserved. Analytics/ranking still scan scoped cohorts and need real workload monitoring; they are not constant-time or production p95. Legacy arrays deliberately remain compatible and heavy; current HR UI uses bounded contracts.

API latency includes local route/Mongo/client serialization; Server-Timing covers server handling. Same Node process contains measurement client and API: RSS/heap deltas are neither isolated server peak nor memory guarantees. Raw data retains negative GC deltas. No browser/hosted SLA follows from this benchmark.

Production-build browser comparison was already completed in08D2 and is not rerun or relabeled as current-HEAD isolated React CPU: see HR_PERFORMANCE_MEASUREMENTS. At5k historical baseline table rendered5000rows/16.2MB,6,809ms paint/2,516ms long task versus current paged30rows/23.7KB,368ms navigation→two-frame paint/54ms longest task;50k historical baseline FAILED_OR_TIMEOUT, not fabricated OOM/latency. Its archived source/single local sample limitations remain explicit. Current corrected full frontend408/408 separately verifies actual lifecycle/contracts/parallel download correctness.
