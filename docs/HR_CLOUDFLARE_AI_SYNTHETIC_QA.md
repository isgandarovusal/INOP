# Cloudflare Workers AI synthetic QA — prepared, NOT authorized to run

Code delivery approval is separate from inference approval. No token created, secret/variable/environment configured, workflow dispatched, inference sent or manual deployment performed during this package. Existing Applications/offline-benchmark/planning commits remain separate ancestors. This package does not enable a production AI provider and does not import/modify the existing OpenAI adapter, ATS-v2, intake, R2, scanner or MongoDB.

## Current explicit execution modes

One existing workflow/runner, two explicit execution modes, no new provider or pipeline. Workflow input `mode` defaults to **DISABLED** (no jobs/inference). The repository variable must still explicitly be true for any execution. Absent/invalid mode also fails closed; no compatibility fallback to BENCHMARK.

| Input / control | CANARY | BENCHMARK |
|---|---|---|
| mode | CANARY | BENCHMARK |
| confirmation | RUN ONE FICTIONAL AI CANARY | RUN UP TO 36 FICTIONAL AI REQUESTS |
| approve_synthetic_transfer | true, after separate approval | true, after separate approval |
| canary_budget_approved | true: confirm Free plan and approve one bounded attempt even if remaining quota UNKNOWN | not a substitute for quota_confirmed |
| quota_confirmed | false if remaining quota is unknown; not required for CANARY | true: existing Free/model/6100-unused-neuron confirmation |
| approved_sha | exact reviewed current remote HEAD | exact reviewed current remote HEAD |
| Maximum inference attempts | **1**, even after success | existing **36**, first schema canary included |

CANARY has a separate return boundary before the benchmark loop. It uses only the existing first `az-exact` fictional fixture, model, request builder, schema/reflection checks and shared bounded transport. Every success/failure/timeout terminates after at most one attempt; no second diagnostic/model request, fallback or retry. Eight-second deadline and 512 output-token limit unchanged. The request is never sent without owner/SHA/branch/environment approvals and closed QA CV gates.

CANARY success artifact has a distinct strict `cf-ai-single-canary-v1` allowlist: mode/model/execution provenance, attempted=1, authentication=CONFIRMED, modelAccepted=true, httpCategory=2XX, schemaValid=true, withinDeadline=true, bounded latency, productionReady=false, benchmarkCompleted=false, quotaRemaining=UNKNOWN. No prompt, output text, score, inferred qualification, identifier or credential is retained. This proves protocol access only, NOT semantic accuracy, available batch quota or production readiness. Schema-valid incorrect semantics does not falsely become matching evidence.

CANARY failures emit only fixed sanitized HTTP/auth/schema/timeout/error categories and publish no artifact; thus unsafe/partial reports cannot upload. Any successful publication still requires final serialization/reflection checks, atomic write and artifact_safe=true plus successful workflow/step. Encoded secret protection is unchanged. Public successful canary artifact retention is one day.

One request's planning cost at 4096 input/512 output tokens is about34.55 neurons; the loose full-context allowance is about167.16 neurons. These are estimates/bounds under the documented rates, not verified account usage; quota can still be exhausted and return429. Free plan must be confirmed. Do not enable billing or claim unknown remaining quota is6100. CANARY approval never authorizes the BENCHMARK.

### First CANARY operator sequence — only AFTER separate execution approval

1. Code delivery and CI are separate from activation; keep CF_AI_SYNTHETIC_ENABLED=false until specifically authorized. No new token/secret/environment changes are required by this code change.
2. Obtain explicit approval to temporarily enable the repository variable and send **one** fictional request, with the512-token/8s limits and one-day public-safe artifact retention. Confirm the account is on Free; acknowledge remaining quota may be UNKNOWN. Do not expose secrets in chat.
3. Only after that approval, enable the variable and open Actions → Manual Cloudflare fictional AI evaluation → Run workflow, branch inop-main. Choose mode=CANARY, approved_sha=the exact separately reviewed current remote HEAD, confirmation=RUN ONE FICTIONAL AI CANARY, approve_synthetic_transfer=true, canary_budget_approved=true. Leave quota_confirmed=false when remaining quota is unknown. Do not select BENCHMARK.
4. Manual dispatch is a distinct approved action. Secrets-free preflight runs first; the protected environment then requires its reviewer approval before the inference step receives secrets. Do not bypass it. If HEAD moved or any guard fails, stop; no automatic retry.
5. Inspect sanitized codes/success metrics. A successful CANARY stops at one request and does not launch the batch. Return the enable variable to false with operator authority. A full BENCHMARK requires a separate approval and its original quota confirmation/phrase/explicit mode.

No inference, activation, dispatch, secrets/settings change or manual deployment was performed while implementing this mode.

## BENCHMARK scope and common protections

- Existing `evaluateRecruitmentAi.cjs` exporter/evaluator and 12 AZ/EN/RU fictional fixtures reused unchanged. Gemini can later use the same provider-neutral result envelope; no Gemini implementation here.
- Fixed `@cf/qwen/qwen3-30b-a3b-fp8`, fixed account REST Chat Completions path, no deployed Worker/public endpoint.
- 12 cases × 3 sequential repetitions, at most **36 inference attempts**; the first `az-exact` repeat 1 is the schema canary and is included. No additional inference health check, retries, fallback model or automatic resume.
- `max_tokens:512`, `temperature:0`, `stream:false`, strict existing JSON schema requested, reject-if-busy. Exactly one in-flight request; deadline covers fetch + response body and cannot exceed 8s. Qwen schema/latency behavior remains unverified; timeout/schema incompatibility is reported, never concealed by relaxed validation.
- HTTP/schema/timeout/truncation/unverifiable usage or reflected secret stops the run. A schema-valid but incorrect semantic/evidence verdict fails the benchmark without publishing an artifact; no score rewrite or hiring decision. A complete batch with semantic errors exits nonzero. There is no composite AI score or new scoring threshold.
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

One fixed file `work/cf-ai-synthetic/report.json` is uploaded with **one-day artifact retention only after a completely successful run and safe publication**. The explicit `cf-ai-synthetic-metrics-v1` allowlist contains fixed case IDs, bounded repetitions, categorical verdicts, boolean checks, bounded token/latency numbers and the existing synthetic ATS baseline score/status. No model prose, explanation, raw response, full prompt, account, token, endpoint, headers or arbitrary provider metadata is published. Model outputs/evaluator intermediates remain in ephemeral process memory only.

Secret reflection is checked recursively in response strings, keys, nested JSON/arrays and bounded decoded Unicode/repeated escape forms; parsed model JSON is checked again. Final allowlisted serialized output is also checked against the three configured credentials/identifiers (Cloudflare token, account ID, GitHub token). Excessively deep/large or unsafe content is rejected. This is defense in depth, not a universal decoder/PII classifier: **no untrusted free text can enter the public artifact regardless of encoding**.

Failure diagnostics emit fixed codes only. Any request, validation, semantic, usage, persistence or publication failure exits nonzero and publishes **no artifact**, including previously valid partial responses. The report is serialized/validated before writing and atomically renamed from a temporary file. Only then does successful CLI execution set `artifact_safe=true` in GitHub step outputs. Upload requires `success()`, successful evaluation outcome and that exact safe output; there is no `always()` failure upload. A failed write/CLI output handshake cannot publish a partial or stale file.

Artifact access follows GitHub repository visibility. This repository is PUBLIC; reviewer protection does not make artifacts private. Approve one-day public-safe metric retention before dispatch. No text explanation quality is certified by this package: artifact marks `NOT_PUBLISHED_NOT_ASSESSED`. A later private, separately approved explanation-review path would be needed to evaluate full explanation quality; do not restore prose to public artifacts as a shortcut. Existing offline evaluator remains provider-neutral and unchanged; successful mock transport is still explicitly labeled SIMULATED. ProductionReady remains false.

Current documented rates for the selected model: 4,625 neurons/M input tokens, 30,475 neurons/M output tokens. For 36 requests with a conservative full 32,768 input-token context allowance plus 512 output tokens each, bound is **6,017.59 neurons**, below the required operator-confirmed **6,100 unused neurons**. Typical planning assumption of 4,096 input tokens/request gives **1,243.70 neurons**. These are arithmetic bounds/estimates, not observed billing. Existing account's Free eligibility and remaining shared 10,000/day quota must be confirmed by the operator; this code cannot reserve quota or configure billing. Free over-limit / 429 stops. No paid upgrade or hidden paid fallback.

Runner verifies returned prompt/completion/reasoning counts against caps before the next request. Its internal accounting covers validated responses only; failed/aborted calls may also consume quota. BillingUsageVerified is always false; failed runs publish no artifact. Check Cloudflare's account usage after an approved experiment. If current billing introduces categories outside the reviewed token rates, stop and review before running. Other account workloads can consume quota concurrently.

Cloudflare's standard stateless inference policy excludes training and retention beyond processing except documented security/legal conditions; Gateway/stateful features have different rules. No Gateway, uploaded file API, external web tool, persistent model context or R2 access is used. Evaluation approval is not production-CV privacy approval.

## Future operator sequence — DO NOT perform yet

1. Separately approve code delivery. Safely deliver only approved packages, without implicitly including local Applications/other ancestry. After delivery, record the exact reviewed remote SHA. Push cannot execute this workflow.
2. Separately approve token creation and GitHub environment/secrets configuration. Use the exact environment, reviewer and branch settings above; keep CF_AI_SYNTHETIC_ENABLED=false. Confirm Actions environment protection is supported and metadata readable in this repository/account.
3. Confirm fixed model access, Free plan, at least 6,100 unused neurons, and no changed prices/billing categories. No billing changes. Do not share token/account values in chat/screenshots.
4. Obtain explicit approval for the fixed 36-request maximum, 512-token cap, fictional data transfer and public-safe metric visibility/one-day retention. Only then enable the repository variable, manually dispatch with reviewed SHA/typed phrase/both checkboxes, and approve the environment job. Do not rerun automatically on failure.
5. Inspect actual metrics by locale; free-text explanations are not published or assessed. Schema-validity is not factual accuracy; check unknown/negative evidence, invented qualifications, injected instructions and consistency. Preserve deterministic scores unchanged. Turn variable false and revoke the dedicated token after the approved run; these actions also need operator execution authority. No production activation follows automatically.

## QA evidence

Tests use mocked GitHub metadata and mocked Cloudflare responses, never network inference or real credentials. They cover default-off/auth context, exact SHA/current HEAD, reviewer/bypass/branch policy, preflight without Cloudflare secrets, canary/36-call sequential cap, no retry, malformed/oversize/redirect/auth/quota/timeouts, stalled body, schema/truncation/invented evidence checks, token/account reflection, bounded usage, duplicate attempts, report-write failure and workflow static guards. Existing benchmark and adjacent evidence/privacy/matching/protected-Actions tests remain unchanged.

No real model execution has occurred; AZ/EN/RU AI accuracy, latency and schema compatibility remain NOT VERIFIED. No live Cloudflare token scope, account quota, GitHub Environment or dispatch permissions were tested. Actual workflow execution needs the separate approvals above.

Historical preparation QA before this security correction: **36/36** runner + offline evaluator tests PASS; **56/56** unchanged adjacent matching/evidence/privacy/R2 Actions tests PASS; 0 failures/skips. YAML parse/manual-trigger checks, Node syntax and git whitespace checks PASS. Frontend build PASS (existing large-chunk warning unchanged), lint PASS with 0 errors/warnings. No full CI dispatched. No production/API execution or workflow dispatch performed. No new dependency, runtime provider or frontend change.

## Artifact security fix verification

Root cause in a6ee832: secret substring check preceded JSON.parse(message.content), while decoded free-form output was later stored as syntheticResults. A regression with invented credentials failed on the original runner (accepted=true), then passed after this correction. Cases cover all three configured secrets, single/repeated Unicode escapes, nested JSON, arrays/keys, later-response failures, final-schema injection and final secret collisions. No real credentials or inference used.

All original request/approval/deadline controls remain unchanged. No production file or offline evaluator changes. This fix only hardens the synthetic runner/publication workflow, tests and this document. Original commits preserved; no push.

Security-fix QA: runner/evaluator **40/40 PASS**; unchanged adjacent security/matching/protected-Actions **56/56 PASS**, 0 failed/skipped. Encoded-reflection regression: original runner FAIL (1 failing targeted test), corrected runner PASS. Workflow YAML/upload conditions, syntax, build and lint PASS. Existing build chunk-size advisory unchanged. No full CI, external inference or real credentials. This metrics-only publication contract supersedes the earlier execution-plan suggestion to retain fictional explanation prose; earlier reports remain preserved as historical evidence.

Single-canary package local QA: **104/104 PASS**, 0 failed/skipped, using mocked GitHub/Cloudflare transports and existing synthetic matching/evidence regressions. Existing BENCHMARK/encoded-reflection/publication tests preserved. New checks cover one-request success/failure/no-fallthrough, explicit disabled mode, separate approval phrases/budgets, missing config, owner/branch/SHA/environment rejection, schema/HTTP/timeout/no-retry, safe single-canary artifact and report-write failure. YAML, syntax, build and lint PASS. No full CI manually dispatched and no real model executed.
