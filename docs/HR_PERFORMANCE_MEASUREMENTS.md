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

Production-build browser, request-count, paint, long-task and browser-memory
measurements remain the next 08D increment. Existing development-browser
regressions prove bounded cards and lifecycle correctness; they do not by
themselves establish production-build rendering time. No acceptance criterion
for browser performance, whole-module accessibility or responsive behavior is
closed by these API results.

## Current authority during expensive reads

The old controller at d337755 returned 200 after role-read revocation, account
deactivation and department change during a gated aggregate. The preserved
baseline test log is `/tmp/inop-hr08d-authority-baseline.log` (three failing
negative assertions). Current code rechecks JWT, current account and server role
after all asynchronous lookups: revoked JWT=401, removed grant/inactive=403,
changed authority=409 ANALYTICS_CHANGED with no aggregate values. It does not
weaken scope, implement a transaction or automatically retry with old grants.
