# QA execution review — run 40520396904

Evidence: remote 47babda3cf85fe477df8ac861b711f649386dbdb;
[complete CI run](https://github.com/isgandarovusal/INOP/actions/runs/40520396904),
job 122245601753. Times below use UTC elapsed differences, not host benchmarks.

## Actual failure

`node Frontend/tests/runAuditBrowserSuite.cjs | tee .../browser.log` returned 1
under bash `-e -o pipefail`. Group 2's child Node process failed after
`cvIntakeSourceReviewUI.test.cjs:14` timed out for 10 seconds waiting for the
`[data-existing]` navigation target following HR approval submission. Node counted
both the child subtest and its parent suite as failed: 37/39 passed in this group.
The runner correctly retained that failure while executing the remaining groups.
The last group passed all 25 tests; those tests did not cause the exit status.
Cleanup, artifact upload and final reporting succeeded. No job timeout/OOM/shell
failure is evidenced. The previous idle-request group passed 13/13.

The historical log does not include the failed approval's response status or
browser validation state. It cannot establish why navigation did not occur.
Repeated isolated source-review runs passed, including a delayed Job read; no
production defect or particular timing cause is established. Do not increase
timeouts, remove the navigation assertion or label this resolved merely because
local reruns pass. The CI failure remains open until explained/verified.

## Measured stage durations

| Stage | Elapsed |
|---|---:|
| Locked backend + frontend npm installation | 7.5 s |
| Four dependency audits (full + production graphs) | 2.1 s |
| Native OCR prerequisites / pinned models | 3m47s |
| Owned Mongo replica-set setup | 13.2 s |
| Full backend tests: 2117/2117 | 6m45s |
| Frontend build + lint | 21.6 s |
| Browser OS dependencies + Chromium setup | 10m47s |
| All 15 serial browser groups | 33m13s |
| Whole job, approximately | 55m29s |

Browser group totals: 174 counted tests, 172 passed, 2 failures (one failing
subtest plus its parent), zero skipped. Final visual group: 25/25 in 277.337 s.

The npm cache restored ~111 MB successfully; npm ci still correctly reinstalls
locked packages. Chromium/FFmpeg/headless-shell downloads took about 8 seconds.
Ubuntu packages consumed 10m26s (20.5 MB at 32.8 kB/s), including a retried font
package. A browser-binary cache alone would not solve that dominant setup delay.

## Coverage and isolation assessment

The existing runner has 15 groups / 32 distinct files, executed serially. The
observability change adds start/result/final summaries with files, duration,
exit status, signal and safe spawn-error code. Selection, ordering, Node flags,
working directory, inherited environment and final nonzero propagation remain
identical. No CI workflow, production code or timeout is changed.

No file occurs twice in the runner's manifest. Repeated focus/locale/idle checks
exercise different business screens and are not proven redundant. Keep them.
Each browser fixture creates an owned DB name, ephemeral HTTP/Vite ports and an
owned Vite cache. However, fixtures also share port 27018, default Mongoose
connection, process.env/JWT configuration, HR membership and profile monkeypatches
inside a child process. OCR, Chrome and Mongo contend for CPU/RAM. Existing
serial execution remains required until process/state/resource isolation is
validated; random DB names alone do not prove safe parallelism.

## Approval flow inspection and remaining uncertainty

CandidateForm.handleSubmit requires reviewed facts and explicit HR confirmation.
confirmIntake awaits approveCvIntake; the API client validates the result before
navigation. Abort/unmount prevents stale navigation. Rejections preserve the
existing error/recovery behavior rather than falsely navigating to success.

The server rechecks current authorization/scope, verifies original bytes, reserves
identities, validates/persists Candidate and Application, computes existing ATS-v2,
and marks approval complete. These are legitimate asynchronous operations. The
frontend API deadline is 40 seconds; the browser fixture's forwarded HTTP request
and final locator wait each have a 10-second deadline. A slow operation, rejected
approval, invalid response or canceled navigation could explain the symptom, but
the historical log cannot distinguish them. No cause is asserted without evidence.

[data-existing] is the correct destination marker in this test's candidate-detail
route. Its wait and subsequent database assertions remain unchanged. Failure-only
test diagnostics now record approval request count, numeric HTTP status if observed,
and elapsed time, then rethrow the original error. No IDs, URLs, values, payloads,
headers, errors from the provider, candidate facts or credentials are logged.
Production code, timeouts and the corrected 31-second idle test are unchanged.

## Package scope

There is no permanent QA policy or AGENTS.md change in this package. The repository
baseline 47babda had no tracked AGENTS.md; existing instructions outside that new
policy are untouched. The earlier local proposal bf2f942 is retained separately,
not included as an ancestor of this replacement diagnostics-only commit.
QA scope remains a per-task decision governed by user instructions and actual risk.

Only browser-runner summaries, their isolated regression tests, source-review
failure diagnostics and this evidence review are proposed. No workflow scheduling,
parallelism, cache, test selection, assertion or deadline change is proposed.
No CI speed improvement is claimed. npm caching already works; any future browser
cache alone could save at most the roughly 8-second download observed here, minus
restore cost. Combining OS prerequisite preparation may help, but has not been
implemented or measured. Parallel tests remain unsafe without verified isolation.

## Final diagnostics-only package validation

- Source review + adjacent queue/recovery browser scenarios: 24/24 PASS.
- Approval and runner regression tests: 25/25 PASS (including four runner tests).
- Synthetic negative control: forced HTTP 409 correctly retained the original
  10-second locator failure; failure diagnostic contained exactly code, request
  count 1, numeric status 409 and elapsedMs. This is diagnostic validation, not
  evidence that historical CI received 409. Injection removed immediately.
- Normal source-review rerun after removal: 8/8 PASS, zero skipped.
- All 15 groups / 32 files, flags, order and child environment compared with the
  baseline and preserved. Original 31-second zero-additional-request test unchanged.
- Syntax/diff checks PASS. No runtime/dependency/build input changes, so no full
  backend/browser/build/lint/security rerun was needed for this diagnostics-only
  diff. No push, CI dispatch, deployment or production interaction performed.
- Historical CI approval/navigation timeout remains unresolved. No production
  correction, assertion change or increased deadline is justified by current evidence.
