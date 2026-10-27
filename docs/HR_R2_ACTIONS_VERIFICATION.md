# Manual GitHub Actions R2 verification — local preparation, NOT activated

## Actual read-only findings

- Repository is PUBLIC, personal owner isgandarovusal, default branch inop-main.
- Existing audit-release-gate.yml explicitly grants contents:read, pins actions,
  and runs ordinary CI on push/PR/manual dispatch. It is unchanged.
- Existing Preview and Production GitHub environments have no protection rules
  or branch policy; Production permits administrator bypass. Do not reuse them.
- Administrative Actions policy/default-token API and secret-name inventory API
  returned HTTP 403 Resource not accessible by integration. Their actual settings
  and current R2 secret presence are UNKNOWN, not absent or verified ready.
- Owner account metadata is readable, but plan is null/not exposed. Actual paid
  subscription, budgets/spend and secret configuration cannot be confirmed here.
- Public repositories support standard hosted-runner free execution and protected
  environment secrets/reviewers on current GitHub plans. No cache, artifact,
  larger runner, dependency installation or external service is needed here.
- No GitHub setting, environment, variable or secret was created/changed.

## Why this route

Manual GitHub Actions uses a standard ubuntu-24.04 runner and existing Node core
harness. Approval is workflow_dispatch by owner + typed retention phrase +
checkbox + exact reviewed commit SHA + required environment review. Secrets are
injected only in the final step after protected review, not as workflow/job env.
Existing CLI TTY confirmation is unchanged; a separate approval adapter supplies
confirmation only after platform/context and current protection checks pass.

Render startup avoids copying credentials into another secret store but requires
a special production startup mode, restart/replay safeguards and environment /
deployment changes. Actions requires one owner-managed GitHub secret setup, but
no Render deployment, no startup hook and no public endpoint. It is recommended
provided the owner explicitly approves GitHub as an additional credential-use
boundary. This proves runner-to-R2 adapter operations, NOT Render's PUT network
path or that the two environments contain identical credential values.

## Owner setup AFTER separate approval (do not do this yet)

1. Review/select only approved local commits for inop-main. Preserve unapproved
   6bf489b separately; do not silently push the local ancestor chain. The harness
   7199d632 and this workflow package are independent of that compatibility fix.
   Workflow must be on default branch for Run workflow to appear. This does not
   trigger its R2 job; the existing ordinary CI and Vercel may run on the push.
2. Settings -> Environments: create a GitHub approval environment named exactly
   r2-synthetic-verification (not a Render/cloud service). Required reviewer:
   isgandarovusal. Uncheck administrator bypass. Deployment branch policy:
   Selected branches and tags, ONLY branch inop-main, no tags/wildcards.
   For this single-owner flow, prevent-self-review must be off so the owner can
   explicitly dispatch AND then approve; if independent review is desired, add
   another trusted reviewer and check its availability before enabling.
3. Only with credential-handling approval, owner privately configures environment
   secrets R2_VERIFY_ENDPOINT, R2_VERIFY_ACCESS_KEY_ID, R2_VERIFY_SECRET_ACCESS_KEY.
   Optional R2_VERIFY_SESSION_TOKEN only for genuine temporary credentials.
   Use existing bucket-scoped credentials; do not share/export them into chat,
   repository, commands, logs or artifacts. Do not create repository-level copies.
   No Render or Cloudflare credential/configuration change is needed.
4. Settings -> Secrets and variables -> Actions -> Variables: after approval set
   repository variable R2_SYNTHETIC_ACTIONS_ENABLED=true. Absent/false is closed.
   Check Actions permits the pinned checkout/setup-node actions. No broader token
   write permission or new service is required. All workflow GitHub tokens have
   only contents:read and actions:read; no id-token/deployments/contents write.
5. Owner opens Actions -> Manual R2 synthetic verification -> Run workflow,
   branch inop-main, exact reviewed 40-character SHA of that branch version,
   confirmation CREATE ONE 64 BYTE SYNTHETIC OBJECT AND RETAIN IT, retention=true.
   Inputs contain NO secrets. Owner must separately Review deployments/Approve
   this specific job. GitHub's environment approval record does not deploy Render
   or Vercel. Do not enable debug logging or bypass environment review.
6. Run only once. Record status codes. No automatic retries or rerun: run_attempt
   must equal 1. If a provider write is uncertain, assume one object might remain;
   another dispatch requires fresh explicit approval and a fresh review.
7. After approved verification, disable the repository variable and remove these
   temporary GitHub environment secrets in a separately approved owner action.
   No bucket object is automatically deleted; later exact-object cleanup requires
   separate approval. Render environment/gates remain unchanged throughout.

## Bounds and replay controls

Exactly the existing 64-byte payload, one random UUID, at most two conditional
PUT attempts + one GET of that same newly created object per approved execution.
No list/DELETE/arbitrary key/file input. Existing fail-closed, hash/readback,
collision/timeout checks apply. No CV, MongoDB access, scanner invocation or
intake activation. A retained object is at most 64 payload bytes plus provider
metadata, indefinitely; owner must check total bucket usage against 10 GB.

Fixed workflow concurrency group serializes all runs; cancel-in-progress=false
never kills an in-flight PUT to start another. A new dispatch still requires
owner identity, full explicit inputs and separate environment review. This is
not a global one-run-ever lock. Queued runs are not approvals to create more
objects. Re-run jobs/workflow (attempt >1), forks, non-default refs, other actors,
push/PR/schedule/deployment events all fail closed before R2 access.

Before any secret-bearing job, preflight verifies the environment exists,
required owner review, no admin bypass and exact single-branch policy via bounded
GitHub metadata GETs. 403/404/malformed/timeout fails closed. The final step checks
that policy again before invoking storage. No R2 secrets are passed to actions,
preflight, npm/install scripts, caches or artifact upload. Pinned trusted code and
GitHub environment governance remain the trust boundary; a repository owner can
change workflow code, so review the exact SHA before releasing secrets.

Expected success: CONFIG_OK, WRITE_OK, READBACK_OK, SHA256_MATCH,
WRITE_CONFLICT_CONFIRMED. Failures are the existing harness's sanitized codes or
ACTIONS_CONTEXT_REJECTED / ACTIONS_APPROVAL_REQUIRED /
ACTIONS_ENVIRONMENT_UNPROTECTED / ACTIONS_PREFLIGHT_FAILED. No upstream error,
credential, signed request, full env, object key/content/hash is output.

## References

- https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow
- https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://docs.github.com/en/rest/deployments/environments

## Isolated QA (no Actions dispatch or live R2)

- Related synthetic regression: 144/144 PASS, 0 failed/skipped. Includes new
  approval/context/protection-policy/YAML checks and existing harness, adapter,
  HR/RBAC/session, scanner/worker, network/runtime and Audit storage contracts.
- Production df62a60 adapter snapshot with Actions/harness/storage/Audit group:
  57/57 PASS, 0 failed/skipped; no dependency on local unapproved 6bf489b.
- Final workflow YAML/policy-focused checks: 8/8 PASS. Trigger only manual,
  default-off variable, immutable checkout, read-only permissions, no cache /
  install / artifacts, successful preflight dependency and closed gates asserted.
- Frontend build PASS (existing >500 kB warning); ESLint 0 errors/warnings.
- Backend/frontend npm audit: 0 known vulnerabilities; no dependency changes.
- Syntax and diff checks PASS. An initial local sandbox subprocess EPERM was
  resolved by running the same synthetic tests with execution permission; no
  guards/assertions were changed.
- Live manual Actions job, environment review, secret injection and real R2
  operations NOT executed. Full DB-backed/browser suites NOT rerun locally.
