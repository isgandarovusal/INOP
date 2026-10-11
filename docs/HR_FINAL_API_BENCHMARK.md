# ATS-v2 local API benchmarks

## Historical13K sample

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


## Current14F sample

Bound source `fcceff65fdeb908a4eb41d92853b5e8e82356a7f`, same unchanged production code as14E;504frozen source/test/config hashes rechecked. Node24.19.0, owned loopback fixture per0/5,000/50,000, actual GET/Mongo after full runners completed, exit0. Artifact `/workspace/inop-hr14f-final-atsv2-benchmark.json`, log `/workspace/inop-hr14f-final-benchmark.log`. No .env/hosting/provider/production DB access or migration.

| Records | Endpoint | ms | JSON bytes | Rows | Backend timing ms |
|---:|---|---:|---:|---:|---:|
| 0 | `/applications` | 53.9 | 2 | 0 | 15.26 |
| 0 | `/candidates` | 10.8 | 2 | 0 | 6.50 |
| 0 | `/hr/v2/applications` | 16.4 | 102 | 0 | 12.41 |
| 0 | `/hr/v2/candidates` | 8.7 | 102 | 0 | 5.25 |
| 0 | `/hr/v2/application-board` | 18.4 | 1013 | 0 | 14.85 |
| 0 | `/hr/v2/application-board (selected Job)` | 19.2 | 1012 | aggregate / selected Job | 15.89 |
| 0 | `/hr/v2/application-ranking (selected Job)` | 21.4 | 102 | aggregate / selected Job | 17.16 |
| 0 | `/hr/analytics` | 19.4 | 2751 | aggregate / selected Job | 15.98 |
| 5000 | `/applications` | 853.3 | 16217265 | 5000 | 693.12 |
| 5000 | `/candidates` | 112.0 | 3564891 | 5000 | 90.09 |
| 5000 | `/hr/v2/applications` | 20.5 | 23749 | 30 | 17.42 |
| 5000 | `/hr/v2/candidates` | 12.6 | 14178 | 30 | 10.86 |
| 5000 | `/hr/v2/application-board` | 58.8 | 66687 | 80 | 55.40 |
| 5000 | `/hr/v2/application-board (selected Job)` | 37.6 | 65849 | aggregate / selected Job | 35.37 |
| 5000 | `/hr/v2/application-ranking (selected Job)` | 138.5 | 23677 | aggregate / selected Job | 136.63 |
| 5000 | `/hr/analytics` | 563.5 | 2847 | aggregate / selected Job | 560.35 |
| 50000 | `/applications` | 8156.3 | 162222693 | 50000 | 6772.82 |
| 50000 | `/candidates` | 1221.2 | 35698891 | 50000 | 951.37 |
| 50000 | `/hr/v2/applications` | 43.4 | 23744 | 30 | 39.82 |
| 50000 | `/hr/v2/candidates` | 59.5 | 14209 | 30 | 56.43 |
| 50000 | `/hr/v2/application-board` | 260.7 | 66689 | 80 | 256.96 |
| 50000 | `/hr/v2/application-board (selected Job)` | 129.4 | 65858 | aggregate / selected Job | 126.31 |
| 50000 | `/hr/v2/application-ranking (selected Job)` | 1149.6 | 23672 | aggregate / selected Job | 1146.26 |
| 50000 | `/hr/analytics` | 4771.9 | 2871 | aggregate / selected Job | 4768.22 |

All24endpoint calls200; all15scope totals equal expected counts. Separate scope-math fixtures explicitly simulate eligible HR departments in the owned DB; strict canonical dep_hr suite independently tests unmodified production membership. This benchmark does not admit extra production department IDs. At5k/50k the four sampled unhinted newest31row plans examine31keys/documents; they are not proof for every actual aggregate or archive filter plan.

At50k: legacy Applications8156.3ms/162222693bytes/50000rows versus paged43.4ms/23744bytes/30rows; legacy Candidates1221.2ms/35698891bytes versus paged59.5ms/14209bytes/30rows. Board260.7ms/66689bytes/80cards, ranking1149.6ms/23672bytes, analytics4771.9ms/2871bytes/213Mongoose method observations. Full body sizes include JSON serialization; candidate page adds archive metadata. Single samples are not controlled before/after latency regression proof or hosted p95. Analytics/ranking still scan scoped cohorts and are the main remaining measured performance risk. Archive-heavy workloads were not part of these all-active samples; their index selectivity/latency is unmeasured.

Query counters omit wire getMore; sampled explain plans apply only to their named queries. Client and API share one Node process: raw RSS/heap/GC deltas are not isolated server peak memory. Existing production-build UI baseline remains archived-source evidence, not a fake current CPU rerun. Current439frontend tests instead verify real bounded rendering/lifecycle, parallel authorized download and actual-shell mobile containment. No hosted, real storage or scanner PASS inferred.

## Current15 serialized comparison

Tested source7309cb72ca5f1f9d160a23bc3af66c30d4f500e5;527 input hashes rechecked. Complete frontend443/443 and backend1858/1858 finished before the benchmark; no overlapping build/test runner. Node24.19.0, newly owned loopback DB for each size, no .env/hosting/provider/production access. Artifact /workspace/inop-hr15-final-main-benchmark.json, exit0, all24 endpoint calls200/all15 scoped totals match. Original14F sample is retained for comparison.

| Records | Analytics ms | Backend timing | JSON bytes | Mongoose method observations |
|---:|---:|---|---:|---:|
| 0 | 22.2 | app;dur=19.63 | 2751 | 17 |
| 5000 | 308.5 | app;dur=305.48 | 2847 | 23 |
| 50000 | 2928.1 | app;dur=2925.98 | 2871 | 68 |

At50k:4771.9ms→2928.1ms (~38.6% lower),2871bytes unchanged,213→68 Mongoose-method observations (~68.1% fewer).5k563.5ms→308.5ms. Diagnosis: repeated heavy Job equality joins and200 Candidate score-batch reads; bounded500 scoped Job identity/brand prefetch eliminates repeated Job joins for this cohort, batches1000 reduce Candidate score reads to50 and individual unchanged ATS-v2 hashes avoid redundant work. Foreign projection-pipeline trial was slower(~8.9s) and reverted; investigations remain recorded. Golden ATS-v2 hashes, empty cohorts, current assignment/grant races, mixed scopes and >500Job no-truncation fallback are tested.

These are local single samples, not hosted p95 or isolated before/after confidence intervals. Different resource noise/GC remains possible; the cause and operation-count reduction are separately tested. Query observations omit wire getMore. Client and API share a Node process:50k analytics raw RSSdelta524288B/heapdelta90782472B/event-loop maximum47.3ms are not isolated server peaks or guarantees. Candidate join/scoring still scans the scoped cohort; more than500Jobs uses indexed fallback and is not claimed to achieve the same latency. Archive-heavy production workloads and current isolated React CPU remain unmeasured. No response contract, score version, PII projection, deadline, grant cache or hosted index/migration changed.
