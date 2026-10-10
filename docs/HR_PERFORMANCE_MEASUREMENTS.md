# HR 08D measurements and limitations

All observations below use newly owned loopback MongoDB fixtures with synthetic
Candidates and Applications, three brands/branches and explicit independent
Application, Job and Candidate grants. No hosted database, credentials or upload
files are used. Reproduce with:

```sh
node --expose-gc Backend/scripts/benchmarkHr.cjs /tmp/inop-hr-new-measurement.json
node --test Backend/tests/hrAnalyticsScale.test.cjs Backend/tests/hrAnalytics.test.cjs
```

The script refuses existing report paths, non-loopback/non-fixture databases and
dataset sizes outside 0/5000/50000. Cleanup belongs to the unique test fixture.
It does not load `.env`, reset existing data, seed production, deploy, or create
hosting resources. Index creation is confined to the owned temporary database.

## API observations

Node 24.19.0, single sequential measurements, local route + MongoDB. Native
hosting's global rate limiter, TLS, proxy, network and concurrent production load
are **not** included. These are neither p95 nor hosted performance promises.
Legacy array APIs remain available for backward compatibility; current HR UI
uses the bounded v2 pages/board.

| Records | Endpoint | Elapsed ms | JSON bytes | Rows |
|---:|---|---:|---:|---:|
| 0 | legacy Applications | 60.9 | 2 | 0 |
| 0 | v2 Applications | 18.9 | 102 | 0 |
| 0 | v2 Candidates | 8.4 | 102 | 0 |
| 0 | board | 16.8 | 1013 | 0 |
| 0 | analytics | 22.6 | 2751 | aggregate |
| 5000 | legacy Applications | 871.0 | 16217265 | 5000 |
| 5000 | v2 Applications | 20.7 | 23749 | 30 |
| 5000 | v2 Candidates | 12.5 | 13938 | 30 |
| 5000 | board | 55.4 | 66687 | 80 |
| 5000 | analytics | 510.9 | 2840 | aggregate |
| 50000 | legacy Applications | 8397.8 | 162222693 | 50000 |
| 50000 | legacy Candidates | 1358.9 | 35698891 | 50000 |
| 50000 | v2 Applications | 47.7 | 23744 | 30 |
| 50000 | v2 Candidates | 43.3 | 13969 | 30 |
| 50000 | board | 251.5 | 66689 | 80 |
| 50000 | selected-Job board | 126.1 | 65858 | bounded lanes |
| 50000 | selected-Job ranking | 1202.6 | 23672 | 30 |
| 50000 | analytics | 4686.3 | 2864 | aggregate |

Raw observations: `/tmp/inop-hr08d-backend-fourth.json` and its `.log`. That run
measures the final query/score optimization; subsequent security review moved
the unchanged authority recheck after the final Branch await and added revocation
tests. It is not represented as a clean committed-HEAD run. The reproducible
script and committed scale tests exercise the final source.

The pre-fix run `/tmp/inop-hr08d-backend-first.json` reproduced **503
ANALYTICS_TIMEOUT** at 50k, 10149 ms, 419 ms maximum sampled event-loop delay.
Moving score facts to batches alone still timed out (second report). An indexed
lookup with an inner pipeline passed at 8795 ms (third), leaving little margin.
The final equality join, immediate independent parent filtering/projection,
250-record score batches, request-local 500-Job hash cache and cooperative yields
gave 200 at 4686 ms / 19 ms maximum sampled delay. The existing ten-second guard
was preserved. Metrics and score scans remain separate reads, not a transaction;
the DTO's scoreScanConsistent flag still hides mismatched score totals.

At 50k, 15 scope checks across dataset sizes return the expected board totals:
Admin/HR all=50000, own=10000, department=30000, assigned=10000. Parent metadata
and scores retain their separate grants; all totals are scoped. Existing mixed
parent-scope tests and the new cache/authority tests preserve denied-parent
behavior. The cache test uses 875 Job parents and 1000 Applications, including
previously cached parents in the same batch that triggers eviction.

Unhinted newest-page plans for all/own/Job Applications and own Candidates each
return 31 records and examine 31 keys/documents at both 5k and 50k. Local indexes
must be inventoried in release DDL before relying on them in hosting. Aggregate
metrics and current-fingerprint ranking still scan their scoped cohort; they
are not constant-time. Analytics at 50k records 213 Mongoose method invocations
(bounded batch lookups, not one network query per row); ranking records 83.
Those counters omit Mongo wire getMore operations and are not query-plan proof.

## Memory and browser evidence

The API script measures process RSS/heap deltas and event-loop delay. Its API and
measurement client share one Node process; buffered legacy response bytes affect
both. At 50k the legacy Applications RSS delta is +1107 MiB versus approximately
zero for a 30-row page. These are single-run **deltas**, not isolated server peak
RSS, hard bounds or a browser memory comparison. Negative deltas in other rows
reflect GC and must not be described as memory savings. Raw reports retain all
values, including failed attempts.

The 08D2 production-build browser measurements are recorded below. Existing
development-browser regressions prove lifecycle correctness; production paint
observations do not close whole-module accessibility or responsive behavior.

## Current authority during expensive reads

The old controller at d337755 returned 200 after role-read revocation, account
deactivation and department change during a gated aggregate. The preserved
baseline test log is `/tmp/inop-hr08d-authority-baseline.log` (three failing
negative assertions). Current code rechecks JWT, current account and server role
after all asynchronous lookups: revoked JWT=401, removed grant/inactive=403,
changed authority=409 ANALYTICS_CHANGED with no aggregate values. It does not
weaken scope, implement a transaction or automatically retry with old grants.

## Production-build Applications UI comparison (08D2)

`Frontend/scripts/benchmarkHrUI.cjs` builds archived source snapshots in new
owned `/tmp` directories. It copies only tracked `Frontend/src`, uses existing
installed dependencies and a production Vite/React build, and never copies
`.env`, credentials or uploads. Source baseline is package 07 commit
2e44f1321dad611c42677b88b2bade1f5b3fff8b; current source is backend increment
13b0245f9d9c552b5aa4a9d714ebec429fcdc680 (Frontend source unchanged since 08C5C).
Both frontends call the same current backend against owned synthetic fixtures.
This isolates the additive frontend transition, not an old-backend deployment.

The harness mounts the actual Applications table/board and real authentication,
translation, service and CSS modules. Bearer requests are checked, only GET is
permitted, external network is blocked, each view uses a new browser, and all
browser/request/server/DB cleanup completes before the report's completed flag.
No token, Candidate payload or contact values are written to measurement logs.

```sh
node Frontend/scripts/benchmarkHrUI.cjs /tmp/inop-hr-new-ui-comparison.json
node Frontend/scripts/benchmarkHrUI.cjs /tmp/inop-hr-new-ui-current.json --current-only
```

The first two comparative attempts produced all six passing current cases and
two failed 50k baseline cases, but retained tooling handles after baseline browser
closure. They were stopped **after** owned DB cleanup; neither is reported as a
clean successful process exit. Dedicated build children and an explicit CLI
exit after awaited cleanup/report writes address the benchmark lifecycle. Final
comparative evidence is `/tmp/inop-hr08d-ui-completed.json` / `.log`; the independent
final read-only/Bearer assertion run is `/tmp/inop-hr08d-ui-auth-verified.json`.

Final completed comparative run: six current cases PASS, four smaller baseline cases PASS, two 50k baseline cases FAILED_OR_TIMEOUT. Representative Bearer-checked current observations:

| Records/view | API GETs | JSON bytes | Rows/cards | Navigation → two-frame paint ms | Main data response → paint ms | JS heap MiB | Max long task ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| 0 table | 1 | 102 | 0 | 361.8 | 88.5 | 3.97 | 78 |
| 0 board | 1 | 1013 | 0 | 387.2 | 76.5 | 4.43 | 98 |
| 5000 table | 1 | 23749 | 30 | 367.8 | 138.0 | 4.57 | 54 |
| 5000 board | 1 | 66687 | 80 | 495.0 | 188.0 | 8.00 | 97 |
| 50000 table | 1 | 23744 | 30 | 322.1 | 112.9 | 4.54 | 0 |
| 50000 board | 1 | 66689 | 80 | 620.3 | 125.8 | 7.90 | 51 |

The comparable baseline at 5k rendered all 5000 rows/cards and downloaded
16217265 bytes with one request. Its table took 6809 ms to paint, had a 2516 ms
maximum long task and approximately 103.87 MiB observed JS heap; board took
5553 ms, 1913 ms maximum task and approximately 150.53 MiB heap. Raw reports also
retain DOM node/listener counts. At 50k both baseline browsers closed before
ready. Their outcome is FAILED_OR_TIMEOUT, with no fabricated latency, render
time or memory number; the root cause is not proven to be OOM.

Navigation/data-response → two-animation-frame paint includes normalization,
React commit and scheduling. It is **not isolated React render CPU**. CDP
JSHeapUsedSize is a post-ready browser heap sample, not peak/process RSS. Long
tasks are browser observations for startup/settling. This small harness excludes
the full routed shell, TLS/CDN/proxy/Native limiter, live data, device variability
and hosting. Single local samples, including runs alongside local validation,
are neither p95 nor a production SLA. Larger throughput/concurrency/peak-RSS
profiling remains a release workload exercise. No real-provider/storage or
whole-UI accessibility claim follows from these measurements.
