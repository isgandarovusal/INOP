# Persistent ClamAV synthetic QA — prepared, not executed

This extends `.github/workflows/clamav-synthetic-qa.yml`; it is not a production
scanner or another CV ingestion path. It depends on the preserved Step 7D patch
`5c2d0838bd842797b8f7f20c7d6e257516edac0f`. No production adapter, deadline,
permission, storage, database, ATS-v2 or CV gate is changed by this QA package.

## Explicit execution boundaries

Existing native QA remains selected by default, with the original explicit
`run_native_qa=false` default. The new `persistent-unix` mode additionally requires
repository variable `INOP_CLAMD_UNIX_QA_ENABLED=true`; absent or false blocks it.
The safe initial value is **false**. This variable has not been configured here.
Only isgandarovusal may dispatch/trigger it, only on inop-main, at the exact full
reviewed SHA. Only the first run attempt is accepted: GitHub's rerun operation is
rejected. Each separately approved new dispatch is a new execution; the variable
is not a persistent one-time authorization token. Workflow-wide concurrency
allows only one active run; it does not cancel an active run or retry a failed
fixture. Native QA behavior and its tests remain intact.

The job has contents:read only, no environment/secrets/OIDC/production access.
Actions are SHA-pinned and checkout credentials are not persisted. Docker build
uses a dedicated allowlist context; package lifecycle scripts and apt service
autostart are disabled. The container has a read-only root, no capabilities,
no-new-privileges, PID limit 128 and non-root uid 1000. Its processes receive only
fixed non-secret environment values. Nothing is mounted from the runner into the
container. No host network, exposed TCP port or public socket is used.

## One shared resource budget

The Node QA process, FreshClam and its database tests, clamd, fixture generation
and offline regression subprocesses all run in **one** 4 GiB / 2 CPU cgroup,
with no swap. The harness checks cgroup v2 limits before download; unsupported
hosts fail closed. Memory/CPU counters must be readable; OOM events fail QA.
The /qa tmpfs (2 GiB cap) contains signatures, protected config/socket and daemon
scratch; its memory counts toward the same 4 GiB budget. /tmp has a 64 MiB cap.
Image build and dependency installation are setup outside that measurement;
they are not presented as 4 GiB runtime measurements.

FreshClam runs once (MaxAttempts 1, five-minute command cap), using the official
`database.clamav.net` source and normal TLS verification. No mirror, cached stale
fallback or freshness override is permitted. `sigtool --info` must verify main,
daily and bytecode database integrity; the verified daily build timestamp must
be at most 24 hours old (existing five-minute future-clock tolerance). Main and
bytecode builds naturally have different publication intervals. Loaded daemon
VERSION must remain fresh via the existing adapter and each fixture must report
the same engine/database version as the verified metadata. Version inspection
of an unrelated default DB directory cannot substitute for downloaded metadata.

Numeric results include cold daemon startup-to-readiness, restart-to-readiness,
idle shared-cgroup memory, cumulative cgroup peak memory, sampled CPU peak
(100 ms intervals, percent of one core), CPU time, individual fixture latency and
two-request concurrent latency. FreshClam elapsed/CPU and cumulative peak through
the initial database-download phase are included. This is initial download
cost, not a measured incremental-update cycle. Idle memory is the whole QA
cgroup after readiness, including signatures/tmpfs, not scanner RSS alone.
These short synthetic measurements do not prove sustained production capacity.

## Evidence levels and scope

Real-engine: clean PDF/DOCX, raw harmless EICAR and EICAR embedded as a standalone
DOCX ZIP member, hash-bound verdicts, incorrect hash, missing socket, stopped
daemon, restart, paused-daemon ten-second timeout, two overlapping calls and
third-call rejection. No fixture is automatically retried. Startup watches only
for socket creation (90-second cap), then requires one successful adapter
readiness check including a synthetic scan. Restart must satisfy it again.

Real-engine plus synthetic persistence/authority: the actual intake runOnce
service must scan again before a parser stub; no MongoDB, R2 or real records are
used. The real legacy controller must return 503 without calling its parser when
the daemon is stopped. These checks do not replace HTTP authorization, real
storage or DB integration tests.

Explicit simulations: stale-clock rejection uses a future test clock only to
force rejection, never to accept old signatures. Malformed/incomplete protocol,
unsettled stream capacity and additional failure cases run the existing mock
Unix regression tests. They are not claims that clamd itself generated malformed
responses. Two DB-dependent integration tests are excluded from this database-
free job; their previous isolated evidence remains separate. Native transport,
profile fail-closed behavior, worker scheduling and legacy parser unit tests
are also run unchanged.

## Public output and cleanup

The container suppresses daemon/process output and emits only a validated
allowlisted success JSON report: fixed test IDs/PASS, engine version, timestamp,
bounded numeric metrics, resourceLimit PASS and productionReady false. No raw
fixtures, process output, paths, explanations, environment values or credentials
are published. A failure exposes only a validated fixed stage ID/FAIL or generic
failure marker. Build/runtime logs and partial reports are never uploaded.

The host validates the complete success report before renaming it into the one
artifact path. Upload occurs on success only, retention one day. `always()`
cleanup verifies the exact run/attempt label before removing only that container
and image and its explicitly named temporary logs/reports. No global prune,
bucket cleanup or DELETE API exists. Runner teardown is the fallback if the job
is forcibly terminated before cleanup can run. No database, signatures or scratch
files are cached between runs.

## Operator procedure — future approval required

1. Separately approve delivery of Step 7D and this QA commit; prerequisite CI and
   final reviewed remote SHA must be checked before delivery. No push occurred.
2. Separately approve one synthetic real-engine execution. No production
   credentials or GitHub environment secrets are required.
3. Set repository Actions variable `INOP_CLAMD_UNIX_QA_ENABLED=true` for that
   approved run only. Keep every CV gate unchanged/disabled.
4. Actions → Manual ClamAV synthetic QA → Run workflow: branch `inop-main`,
   `run_native_qa=true`, `mode=persistent-unix`, `reviewed_sha=<exact approved
   40-character current remote HEAD>`. A mismatch fails before checkout.
5. Inspect only that run. Do not use Re-run jobs; any new dispatch requires
   another explicit approval. FreshClam access/rate limits remain runtime
   uncertainties. On failure do not bypass freshness, TLS, limits or verdicts.
6. Restore `INOP_CLAMD_UNIX_QA_ENABLED=false` after the approved run, including
   after failure. Download the one-day sanitized artifact on success.

No real-engine run, workflow dispatch, token/configuration change, scanner/CV
activation or deployment is authorized by preparation. Production hosting,
updates, supervision, privacy/retention and target-host load testing still need
separate review even if this QA succeeds.

## Hosted failure 40882757615 — offline fixture correction

The reported failing stage was offline_protocol_regression. The same selected
36-test group reproduced 35 PASS / 1 FAIL with a read-only root and noexec /tmp:
the native subprocess smoke test attempted to execute its generated shell fixture
from document scratch. AV_UNAVAILABLE was the expected fail-closed result of
that environment restriction, not evidence of a malware-detection regression.
The smoke executable is now immutable, tracked test code in the read-only image;
its environment-stripping, stdin and hash assertions remain unchanged. Both /tmp
and /qa remain noexec, and the production scanner is unchanged.

At the reviewed original SHA, reaching this stage required the earlier FreshClam,
integrity/freshness, real fixture, restart, timeout, concurrent scan and synthetic
worker checks to return successfully. This is control-flow evidence, not a saved
metrics artifact: exact engine/signature/resource measurements were not retained,
and final resource/report validation was not reached. A separately approved new
hosted run must still complete successfully; productionReady remains false.
