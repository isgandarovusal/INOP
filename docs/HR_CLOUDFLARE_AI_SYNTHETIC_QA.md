# Cloudflare Workers AI synthetic QA — prepared, NOT authorized to run

Preparation approval only. No token created, secret/variable/environment configured, workflow dispatched, inference sent, push or deployment performed. Existing Applications/offline-benchmark/planning commits remain separate ancestors. This package does not enable a production AI provider and does not import/modify the existing OpenAI adapter, ATS-v2, intake, R2, scanner or MongoDB.

## Fixed scope

- Existing `evaluateRecruitmentAi.cjs` exporter/evaluator and 12 AZ/EN/RU fictional fixtures reused unchanged. Gemini can later use the same provider-neutral result envelope; no Gemini implementation here.
- Fixed `@cf/qwen/qwen3-30b-a3b-fp8`, fixed account REST Chat Completions path, no deployed Worker/public endpoint.
- 12 cases × 3 sequential repetitions, at most **36 inference attempts**; the first `az-exact` repeat 1 is the schema canary and is included. No additional inference health check, retries, fallback model or automatic resume.
- `max_tokens:512`, `temperature:0`, `stream:false`, strict existing JSON schema requested, reject-if-busy. Exactly one in-flight request; deadline covers fetch + response body and cannot exceed 8s. Qwen schema/latency behavior remains unverified; timeout/schema incompatibility is reported, never concealed by relaxed validation.
- HTTP/schema/timeout/truncation/unverifiable usage or reflected secret stops the run. A schema-valid but incorrect semantic/evidence verdict is retained as a benchmark failure; no score rewrite or hiring decision. A complete batch with semantic errors exits nonzero. There is no composite AI score or new scoring threshold.
- ATS baseline actually runs locally; every stored report sets productionReady:false. Injected test transports are explicitly labeled SIMULATED, not real model evidence.

## Future configuration — separate approval required

Protected GitHub Environment, exact name: **`cf-ai-synthetic-evaluation`**.

| Setting | Required value |
|---|---|
| Required reviewer | User `isgandarovusal` |
| Administrator bypass | Disabled |
| Deployment branches/tags | Custom branch policy: `inop-main` only, no tag/wildcard policies |
| Prevent self-review | May be disabled to allow this owner-operated test; environment approval is still required |
| Environment secret `CF_AI_EVAL_API_TOKEN` | Dedicated short-lived Cloudflare API token, never in chat/source/repository variables |
| Environment secret `CF_AI_EVAL_ACCOUNT_ID` | Existing Cloudflare account ID; kept secret to avoid logging/exposure |
| Repository Actions variable `CF_AI_SYNTHETIC_ENABLED` | **`false`** initially; absent is also disabled |

Cloudflare token policy must grant **Account → Workers AI → Read and Edit**, scoped only to the existing account. No R2, DNS, Workers Scripts, billing, other account or production INOP permissions. Creating the token and proving this policy is an operator responsibility requiring approval; a bearer token alone cannot prove its granted scope to this runner. Do not broaden GitHub or Cloudflare permissions to bypass a denied metadata/API request.

No packages, SDKs or installation scripts are needed by the workflow: Node 24 built-ins plus existing pure benchmark/services. No production secret is loaded. The environment secrets are referenced ONLY on the single inference step after environment approval, not in preflight, checkout, setup or artifact steps. GitHub token is used only for GitHub metadata GETs, never Cloudflare. Cloudflare bearer is sent only to the fixed api.cloudflare.com account endpoint. No arbitrary URL, prompt, file or model inputs exist.

## Workflow guards

`.github/workflows/cf-ai-synthetic-evaluation.yml`:

1. `workflow_dispatch` only, repository/branch/first-attempt/default-off conditions. No push, PR, schedule or deployment trigger. No duplicate CI dispatch.
2. Owner actor and triggering actor must both be isgandarovusal. Typed phrase **`RUN UP TO 36 FICTIONAL AI REQUESTS`**, synthetic-transfer/one-day-retention checkbox and quota checkbox all mandatory.
3. Input approved_sha must be exactly 40 lower-case hex characters, equal both run SHA and workflow SHA. Checkout pins github.sha, disables persisted Git credentials. GitHub API verifies current inop-main HEAD still equals that SHA. New branch commits while approval is pending therefore deny execution rather than running stale code.
4. Secrets-free preflight reads environment metadata and branch policy, requiring the actual reviewer, no bypass and exact branch-only restriction. Missing/unsupported/403 metadata fails closed; account-plan/environment feature eligibility must not be assumed.
5. Inference job uses the protected environment. GitHub releases secrets only after its approval. Runner repeats the full preflight and CV gate checks, catching changed HEAD, environment policy or default-off variable between jobs.
6. All existing CV gates forced false in QA job environment and checked by runner; nothing writes Render settings. Top-level permissions contents:read; metadata jobs additionally actions:read, no repo write/OIDC permission.
7. Global non-cancelling concurrency group prevents simultaneous evaluation. GITHUB_RUN_ATTEMPT must be 1; re-run is rejected. An exclusive on-runner `.attempt` marker prevents a second process from repeating evaluation in the same workspace. Each new manual dispatch still requires all approvals; this is not an account-wide permanent lock or automatic-once-forever claim.
8. All actions pinned to full SHAs using existing INOP conventions. No dependency installation, secrets in arguments, shell interpolation of inputs, debug tracing, raw error logging or arbitrary script inputs. Only fixed sanitized status codes go to stdout.
9. Step deadlines, bounded response body, zero retries and max attempts hold even if responses are invalid. The local client cannot prove upstream work stopped after a timeout; stop and account for possibly consumed quota before considering a separately approved run.

## Results, privacy and costs

One fixed file `work/cf-ai-synthetic/report.json` is uploaded with **one-day artifact retention**. Only fixed synthetic cases, bounded validated fictional explanations, ATS baseline, verdict/evidence checks, repeat consistency, measured latency/token usage and sanitized failures are retained. No request headers, token, account, endpoint or raw provider error body. Returned provider JSON is rejected if it contains the account ID, Cloudflare token or GitHub token, even in unexpected extra fields. Provider schema/semantic checks are reused; explanation quality still requires human review, never claimed automatically verified.

Artifact access follows GitHub repository/Actions visibility and permissions: **do not assume artifacts are private merely because an environment is protected**. The owner must approve visibility/one-day retention for fictional outputs before dispatch. Never add real CVs to this fixture/export/artifact path. Some invalid outputs are deliberately omitted rather than retained; the report records their failure code. Valid partial results remain complete:false. Offline evaluator source is operator_reported for real transport because it does not independently attest provenance; the surrounding runner report distinguishes real requests from test transport.

Current documented rates for the selected model: 4,625 neurons/M input tokens, 30,475 neurons/M output tokens. For 36 requests with a conservative full 32,768 input-token context allowance plus 512 output tokens each, bound is **6,017.59 neurons**, below the required operator-confirmed **6,100 unused neurons**. Typical planning assumption of 4,096 input tokens/request gives **1,243.70 neurons**. These are arithmetic bounds/estimates, not observed billing. Existing account's Free eligibility and remaining shared 10,000/day quota must be confirmed by the operator; this code cannot reserve quota or configure billing. Free over-limit / 429 stops. No paid upgrade or hidden paid fallback.

Runner verifies returned prompt/completion/reasoning counts against caps before the next request. report.reportedNeurons sums validated responses only; failed/aborted calls may also consume quota. usageComplete is false after failures; billingUsageVerified is always false. Check Cloudflare's account usage after an approved experiment. If current billing introduces categories outside the reviewed token rates, stop and review before running. Other account workloads can consume quota concurrently.

Cloudflare's standard stateless inference policy excludes training and retention beyond processing except documented security/legal conditions; Gateway/stateful features have different rules. No Gateway, uploaded file API, external web tool, persistent model context or R2 access is used. Evaluation approval is not production-CV privacy approval.

## Future operator sequence — DO NOT perform yet

1. Separately approve code delivery. Safely deliver only approved packages, without implicitly including local Applications/other ancestry. After delivery, record the exact reviewed remote SHA. Push cannot execute this workflow.
2. Separately approve token creation and GitHub environment/secrets configuration. Use the exact environment, reviewer and branch settings above; keep CF_AI_SYNTHETIC_ENABLED=false. Confirm Actions environment protection is supported and metadata readable in this repository/account.
3. Confirm fixed model access, Free plan, at least 6,100 unused neurons, and no changed prices/billing categories. No billing changes. Do not share token/account values in chat/screenshots.
4. Obtain explicit approval for the fixed 36-request maximum, 512-token cap, fictional data transfer and artifact visibility/one-day retention. Only then enable the repository variable, manually dispatch with reviewed SHA/typed phrase/both checkboxes, and approve the environment job. Do not rerun automatically on failure.
5. Inspect actual result and explanations by locale. Schema-validity is not factual accuracy; check unknown/negative evidence, invented qualifications, injected instructions and consistency. Preserve deterministic scores unchanged. Turn variable false and revoke the dedicated token after the approved run; these actions also need operator execution authority. No production activation follows automatically.

## QA evidence

Tests use mocked GitHub metadata and mocked Cloudflare responses, never network inference or real credentials. They cover default-off/auth context, exact SHA/current HEAD, reviewer/bypass/branch policy, preflight without Cloudflare secrets, canary/36-call sequential cap, no retry, malformed/oversize/redirect/auth/quota/timeouts, stalled body, schema/truncation/invented evidence checks, token/account reflection, bounded usage, duplicate attempts, report-write failure and workflow static guards. Existing benchmark and adjacent evidence/privacy/matching/protected-Actions tests remain unchanged.

No real model execution has occurred; AZ/EN/RU AI accuracy, latency and schema compatibility remain NOT VERIFIED. No live Cloudflare token scope, account quota, GitHub Environment or dispatch permissions were tested. Actual workflow execution needs the separate approvals above.

Local QA result for prepared package: **36/36** runner + offline evaluator tests PASS; **56/56** unchanged adjacent matching/evidence/privacy/R2 Actions tests PASS; 0 failures/skips. YAML parse/manual-trigger checks, Node syntax and git whitespace checks PASS. Frontend build PASS (existing large-chunk warning unchanged), lint PASS with 0 errors/warnings. No full CI dispatched. No production/API execution or workflow dispatch performed. No new dependency, runtime provider or frontend change.
