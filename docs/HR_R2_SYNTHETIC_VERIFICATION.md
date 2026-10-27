# Synthetic R2 verification — preparation only

No live PUT/GET/DELETE is authorized by this package. It adds only an explicitly
invoked CLI harness, focused tests, and this procedure. No production code paths,
startup hooks, endpoint, package scripts, gate or dependency changes are made.
Existing local 6bf489b remains separate and unapproved; this harness requires no
change from that commit. It uses only prepare/fromEnvironment/put/get already in
approved production df62a60, and deliberately retains its standard endpoint,
region auto, bucket inop-private-cv profile. Do not push the local ancestor chain
without separately resolving approval of 6bf489b; a later release must select
only the approved package change against the approved production baseline.

## Exact bound and retention approval

- Fixed payload: **64 bytes**, synthetic PDF-like storage-test bytes, no PII.
  This is NOT a CV/parser/antivirus test or permission to bypass CV scanning.
- Max newly created objects per invocation: **one**, at server-generated
  `hr/cv/<cryptographic UUID>`; no user key/file option.
- Max operations: first conditional PUT, one GET of that same key, second
  conditional PUT of identical bytes. No HEAD/list/other-object access.
- Max retained payload: **64 bytes per approved invocation**, plus provider
  metadata. At most one object remains even on uncertain write or failed GET.
- No automatic retry, including unknown PUT completion. Stop after ANY failure.
- No DELETE exists in the Recruitment adapter or harness. Object may remain
  indefinitely. R2 does not automatically remove it. No lifecycle is changed.
- 64 bytes is negligible against the stated 10 GB free storage allowance, but
  current bucket usage/remaining allowance is UNKNOWN. This is not a billing
  cap or a guarantee that the account remains within its allowance. Owner must
  check existing usage before execution; repeated invocations accumulate.
- Runner rejects a repeated/concurrent call in the same instance; every new CLI
  process requires a fresh typed retention confirmation. There is no durable
  cross-process approval record and no claim of globally exactly-once execution.

## Remaining approvals BEFORE any real execution

Owner must explicitly approve: (1) one retained 64-byte synthetic object in this
bucket; (2) two conditional PUT attempts and one GET of that same unique object;
(3) no automatic deletion/indefinite retention; (4) the specific trusted execution
location and credential-use scope. Push/code delivery or runtime changes, if
needed, require their own approval. Never send credentials in chat/commands/logs.

## Eventual operator procedure — NOT for execution yet

1. Confirm approvals above, adequate free allowance, intended code/package,
   existing private bucket and current gates unchanged/closed. Keep previous
   HTTP diagnostic disabled and HR_R2_VERIFY_ON_START off. Do not change env.
2. Use an **existing, separately approved trusted Node 24 terminal** where the
   approved R2 configuration already exists. Script reads only existing env;
   no .env loading, credential prompting, database connection or setup action.
   No keys/secrets in command arguments, shell history, logs or shared output.
3. From Backend, invoke exactly:
   `node scripts/verifyR2Synthetic.cjs --execute`
   Type the displayed phrase exactly to approve THIS single retained object:
   `CREATE ONE 64 BYTE SYNTHETIC OBJECT AND RETAIN IT`
   stdin AND stdout must be interactive terminals. Pipes and jobs cannot approve.
   Importing/running without the exact flag cannot perform storage operations.
4. Success (exit 0): CONFIG_OK, WRITE_OK, READBACK_OK, SHA256_MATCH,
   WRITE_CONFLICT_CONFIRMED. Record only these codes. No object key, hash, request,
   credentials, provider payload or file contents are printed or saved.
5. Any other result (exit 1): stop; no automatic rerun. The object might exist
   after WRITE_FAILED (uncertain completion) or any later failure. A new run
   needs separate owner approval and a fresh human confirmation, not a retry loop.

**Current Render Free execution blocker:** Free web services provide no Shell/SSH
and no one-off jobs. No approved terminal channel to its environment is currently
available. Therefore this harness cannot currently be invoked there under the
no-startup/no-deployment/no-endpoint requirements. Do NOT alter Build/Start/Deploy
commands, add a job/service, copy production secrets or enable the old diagnostic
as a workaround. Approve a feasible existing execution path separately, or keep
live execution BLOCKED. No paid resource or new service is proposed here.
Source: https://render.com/docs/free#other-limitations

## Failure codes

VERIFICATION_DISABLED / VERIFICATION_ALREADY_ATTEMPTED /
OPERATOR_CONFIRMATION_REQUIRED: no object operation started.
CV_GATES_NOT_DISABLED / CONFIG_MISSING / CONFIG_INVALID: no object operation
started. CONFIG_OK validates format, not actual remote credentials.
WRITE_FAILED: PUT rejected, collision, unavailable, access denied, timeout or
uncertain completion; no GET/retry/second PUT follows.
READBACK_FAILED: GET failed, invalid bytes or adapter integrity check failed.
SHA256_MISMATCH: returned bytes failed integrity. READBACK_OK alone is insufficient.
WRITE_CONFLICT_FAILED: second PUT succeeded unexpectedly or failed for a reason
other than STORAGE_WRITE_CONFLICT. Never claim verified on another error code.
VERIFICATION_FAILED: sanitized unexpected harness failure. Stop; inspect no raw
production error in output. Provider details are intentionally not returned.

## Cleanup / rollback

No automatic cleanup or lifecycle. Keep the one synthetic object retained unless
separately approved owner cleanup has positively established its exact identity;
never delete arbitrary hr/cv objects or enumerate real files via this harness.
The harness does not log the key, so it is not a cleanup/receipt mechanism.
Code rollback is removal of this unreferenced script/tests/doc in a later
approved change; that neither deletes objects nor changes backend behaviour.
No deployment/rollback or environment change is performed by this package.

## Local QA evidence (synthetic/mock only)

- Focused and related DB-free regression: 136/136 PASS, 0 fail, 0 skipped.
  Covers adapter compatibility, storage integrity/conditional writes, startup
  and previous diagnostic fail-closed behaviour, CV profile/worker/scanner,
  context/RBAC/session boundaries, matching, document handling, network/runtime
  and Audit S3 protocol tests. All remote transports are synthetic collaborators.
- Exact approved df62a60 adapter loaded from local Git snapshot into an isolated
  Node test process: harness/storage/Audit contract group 49/49 PASS, 0 fail/skip.
  No need to include or deploy the separate local compatibility commit 6bf489b.
- Real CLI subprocess tests deny default/unknown/extra arguments and non-TTY
  execution without any storage request. No live interactive approval was given.
- Frontend build PASS (existing >500 kB chunk warning), ESLint 0 errors/warnings.
- Backend/frontend npm audit: 0 known vulnerabilities; no dependency changes.
- Syntax and diff whitespace checks PASS.
- Full database-backed suite, full browser suite and real R2 PUT/GET/DELETE were
  NOT run for this package. No new test database/service/environment was created.
