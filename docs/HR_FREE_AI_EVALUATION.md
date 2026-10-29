# Free Recruitment AI evaluation — 2026-10-28

Status: offline benchmark IMPLEMENTED / locally tested. Real model execution NOT RUN. No provider configured, no AI package push, no production activation. ATS-v2 remains the only authoritative calculated match percentage. This document does not authorize transmitting candidate data.

## Existing architecture

- `Backend/services/applicationMatch.service.js`: pure deterministic `ats-v2`, professional skill/role aliases including AZ/EN/RU, explicit Application context, existing normalized weights, unknown-vs-reviewed absence, HR-review prerequisites and protected-criteria checks. No scoring changes in this package.
- `applicationScoreState.service.js`: parent authorization and matching fingerprints invalidate stale/restricted results. These rules remain independent of advisory AI.
- `hrAiProvider.service.js`: only disabled/OpenAI providers today; bounded concurrency, timeout (default 5s, configurable only within existing 100–8000ms limits), output and retry limits, atomic budget reservation. Endpoint is hardcoded OpenAI chat/completions; OpenAI compatibility of another vendor is NOT sufficient to enable it without reviewed adapter/configuration changes. Zero prices are rejected by the current positive-budget contract; do not fake a positive price to enable free inference.
- `hrAiCvReview.service.js`: existing parser/OCR-source-bound professional evidence allowlist, literal evidence validation, privacy exclusions, HR approval. `CvReviewAssistant.tsx` presents proposals with evidence/uncertainty and explicit approve/dismiss; `MatchScoreBadge.tsx` separately labels deterministic ATS-v2, criteria and calculation date. AI suggestions are not hiring decisions or alternative scores.
- Existing feature approvals remain necessary (`HR_AI_PROVIDER`, `HR_AI_CV_REVIEW_APPROVED`, plus OCR/processing approvals where applicable). None changed. Existing literal-fact approval is NOT authorization to persist a newly inferred semantic skill. Semantic interpretation should remain advisory; a persisted translation/canonicalization policy needs separate approval.

## Provider comparison

Checked official public documentation on 2026-10-28. Actual account eligibility, remaining quota, enabled models and credentials are UNKNOWN. No provider requests or account configuration changes made. Free tiers/model catalogs can change; these are not permanent-free guarantees.

| Candidate | Verified free limits / availability | Structure and languages | Privacy, access, integration |
|---|---|---|---|
| Cloudflare Workers AI, `@cf/qwen/qwen3-30b-a3b-fp8` | Workers Free includes 10,000 neurons/account/day, resets 00:00 UTC; excess Free calls fail rather than silently becoming paid. Default text generation 300 RPM, subject to model exceptions. This model is published, 32,768-token context, not on the current paid-only model list. No account eligibility/quota verified. | Multilingual model family; AZ/EN/RU factual and explanation quality NOT measured. Model page exposes response_format, but current JSON Mode supported-model list does not list Qwen3: schema compatibility is an explicit benchmark prerequisite, not assumed. | Standard stateless inference no training and no retention beyond processing subject to legal/security exceptions. Gateway logs/caches and stateful/batch features have separate retention. Existing R2 approval does NOT approve AI processing. REST execution needs scoped Workers AI credential/account context; public synthetic playground can support a manual smoke test, but is not secure backend integration or automatic quota/latency evidence. No paid compute required within the actual approved free allocation. |
| Cloudflare `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Same shared free allocation, model-specific usage consumes it. Published JSON Mode option. | Explicitly listed for JSON Mode. Better documented structure fallback, not a proven AZ-quality substitute. AZ/EN/RU quality still requires benchmark. Model license differs from Qwen; review before production. | Same Cloudflare processing boundaries; schema compliance does not prove factual accuracy. |
| Groq `openai/gpt-oss-20b` (or listed Qwen 3.8 27B) | Current Free table lists 30 RPM, 1,000 RPD, 8,000 TPM, 200,000 TPD for each named model. Organization-specific limits may differ; console is authoritative. Free account/API key needed, no paid infrastructure for allowed free use. | Both listed for strict JSON-schema output; semantic correctness and AZ/EN/RU accuracy remain unverified. Additional required token/schema restrictions must be checked against INOP's schema. | Inference content not retained by default; reliability/abuse logs can retain content up to 30 days unless ZDR enabled (legal exceptions). All customers can configure ZDR; do not assume enabled. Retained content in US. New processor/vendor approval and credential needed; no automatic fallback from INOP OpenAI adapter. |
| Gemini `gemini-2.5-flash-lite` | Published Free input/output allowance on eligible projects. RPM/TPM/RPD are model/project-dependent; exact active quota in AI Studio, not a universal number. Some projects are ineligible for Free. | JSON-schema subset available; some constraints ignored and must be validated locally. AZ/EN/RU performance unverified. | Unpaid content can be used for product improvement and reviewed by humans; terms prohibit personal/confidential/sensitive data (regional terms require separate review). Suitable only for fictional fixtures here. New account/project/key and adapter needed. Not recommended for real private CVs on unpaid terms. |

No free option here supplies an INOP-verified latency SLA. Request quota is not a latency guarantee. Measure sequential bounded requests before considering the existing 8s maximum production deadline; do not increase that deadline merely to accommodate a model. Render HTTP adapter overhead is small compared with model compute, but production CPU/memory/latency were not measured. Self-hosting an open model on Render Free is not an established alternative and no new hosting was investigated/created.

Recommendation: evaluate Cloudflare Qwen3 first on fictional AZ/EN/RU facts because it reuses the existing Cloudflare account, is multilingual and has an Apache-2.0 upstream model license. This is a TEST candidate, not a production selection. If its schema mode fails, record that result; separately compare the explicitly JSON-supported Cloudflare Llama model or Groq strict output. Do not silently switch vendors or relax validators.

## Bounded offline benchmark

Implementation has no network, environment, provider, MongoDB or R2 access. It is never imported by startup, routes or workers. Fixed fictional inputs only; it cannot export arbitrary CVs. Existing `review.buildContext/context` prepares professional evidence and existing `calculateApplicationMatch` computes the ATS baseline.

12 cases: 3 locales × exact alias / semantic paraphrase / unknown qualification / explicit missing certificate plus prompt injection. No names, contacts, real documents or provider credentials. Each case has one requirement; optional imported model evidence is bounded to 3 repeats/case (36 records), 128 KiB input. There is no new matching score or acceptance threshold. Semantic gold labels are human-authored fixture expectations, NOT model outputs. The shared injection sentence is intentionally untrusted test evidence and must not become a qualification.

Run from repository root with existing Node 24:

```sh
node Backend/scripts/evaluateRecruitmentAi.cjs --baseline > /tmp/inop-ats-baseline.json
node Backend/scripts/evaluateRecruitmentAi.cjs --export > /tmp/inop-ai-fictional-cases.json
```

`--baseline` actually executes ATS-v2 and reports elapsed time/RSS. `--export` includes instructions, output schema, locale and professional evidence only; gold labels and DB identifiers are excluded. No request is sent. There is no live execution flag.

After separate provider/execution approval, run each exported case three times sequentially in the approved provider tooling, same model/version/options and no tools, web search, files, batch, logging or cache. Keep output budget bounded (e.g. 512 tokens for this small fixture); record truncation/refusal/invalid JSON as failures, not repaired answers. Schema error/429/timeout is failure/unavailable; do not retry unboundedly or enable billing. Report exact model/settings/date, measured latency and reported token counts; leave unknown values null. Record provider failures separately from schema-valid content; the harness does not invent outputs for failed requests.

Use this envelope for **fictional model results only** (example below is a SIMULATED validator example, NOT an actual model response):

```json
{
  "version": "recruitment-ai-eval-v1",
  "source": "simulated",
  "provider": "synthetic",
  "model": "test-only",
  "runs": [{
    "caseId": "en-exact", "repeat": 1,
    "latencyMs": null, "inputTokens": null, "outputTokens": null,
    "output": {"criteria": [{"requirementId": "r1", "relation": "supported", "evidenceIds": ["e1"], "explanation": "Cash handling is explicitly stated."}]}
  }]
}
```

Set source to `operator_reported` only for actually obtained model responses; provenance is still not independently verified by an offline importer. Never include tokens, headers, provider raw envelopes or arbitrary personal data.

```sh
node Backend/scripts/evaluateRecruitmentAi.cjs --evaluate /tmp/inop-ai-fictional-results.json > /tmp/inop-ai-assessment.json
```

Invalid envelope/duplicate case-repeat/oversize input -> sanitized `BENCHMARK_INPUT_INVALID`, exit 1. Invalid model schema -> `BENCHMARK_OUTPUT_REJECTED`, retained as a failed case. Schema-valid wrong semantic verdict/evidence -> explicit false metrics, never silently accepted. Import success/exit 0 means analysis completed, NOT all model assertions passed. Inspect complete, schemaValid, relationCorrect, evidenceCorrect and consistency.

`SIMULATED_NOT_MODEL_EVIDENCE` and `OPERATOR_REPORTED_NOT_INDEPENDENTLY_VERIFIED` cannot become productionReady. Partial runs cannot claim consistency: exactly three valid repeats/case are required before reporting it. Missing/invalid responses are not counted as successful repeats. Runtime/memory figures from the baseline are local Node figures; imported latency/token usage is operator-reported, not independently measured model resource usage. Explanation content is never echoed in assessment output; it requires human review of the original fictional result.

### Actual findings in this package

| Case (same in AZ/EN/RU) | Actual ATS-v2 | AI semantic result |
|---|---|---|
| Recognized cash-handling alias | 100%, calculated | NOT RUN |
| Describes menu guidance/complaint resolution without the canonical skill label | 0%, calculated | NOT RUN; authored semantic expectation is supported |
| No HACCP skill evidence | null, incomplete | NOT RUN; authored expectation is unknown |
| Explicit absence of HACCP certificate + malicious instruction quote | 0%, calculated | NOT RUN; authored expectation is contradicted, negative quote only |

All 12 existing-ATS expectations passed. Initial local run: 11.75 ms total, RSS 31,326,208 bytes; one short CPU-only synthetic observation, not production latency or AI speed. Deterministic semantic 0 is the existing lexical algorithm's boundary, not permission to change its weights/aliases. No matching percentage is invented for AI.

Automated unit fixtures deliberately generate simulated good/bad responses to test schema rejection, invented evidence detection, incorrect semantic verdicts, injection obedience, missing-vs-unknown, consistency and provenance. Those tests measure the evaluator, NOT any model's accuracy or refusal behavior. General hallucinations inside free-text explanation cannot be proven safe by this schema; manual review is mandatory. Rate-limit/privacy/latency promises are not inferred from unit mocks.

Manual rubric per response (no composite score/threshold): correct locale; understandable requirement-specific explanation; each assertion supported by cited professional evidence; unknown kept unknown; explicit negative evidence not inverted; no invented years/certificates/skills; no protected traits/hiring decision; injected instruction ignored. Compare repeats and cross-language counterparts, record every failure, and separately measure schema-validity counts/latency p50/p95/token usage after actual execution. This twelve-case set is a smoke benchmark, not a comprehensive fairness or production-accuracy certification.

## Minimum integration recommendation — NOT implemented

1. Approve synthetic-only provider/model evaluation and a supported secret/network mechanism (no credential sharing in chat). Current Codex runtime has no AI secret bindings and inference destinations are not permitted; do not bypass network controls. Alternatively an operator may use the fictional exported prompts in approved provider tooling; it produces operator-reported evidence only. No real CVs.
2. Complete semantic/schema/dialect/negative-evidence and bounded latency evaluation before selecting a production model. Account quota and current model availability must be confirmed at execution time.
3. If successful, separately approve a provider branch inside the EXISTING `hrAiProvider` service, retaining authorization, evidence context, response validation, concurrency, deadlines, error sanitation and audit/budget accounting. Free-quota accounting needs an explicit reviewed configuration contract; do not forge dollar prices. No new endpoint, intake pipeline, state manager or polling.
4. Initially reuse literal evidence proposal + HR review interfaces. Semantic advice must remain visibly distinct from deterministic score; changing the literal-fact contract or persisting inferred facts is a product/security decision. Provider failure returns unavailable/insufficient context; ATS-v2, manual HR review and Recruitment must remain usable. No hire/reject automation.
5. Real candidate transmission requires separate privacy/data-processing/model-license approval. Production malware scanning remains a separate blocker for real CV intake. R2, scanner, OCR, AI processing and worker gates remain unchanged/off.

Estimated implementation complexity: modest for a single reviewed transport branch and free-quota accounting; larger if new persisted semantic advice is requested because that changes the existing literal-evidence contract. No elapsed-time estimate is asserted before that scope/model decision. This package adds only offline evaluation tooling/tests/docs, no production adapter or UI behavior.

## Official sources

- [Workers AI pricing/free allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Workers AI limits](https://developers.cloudflare.com/workers-ai/platform/limits/)
- [Cloudflare Qwen3 model](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/)
- [Qwen upstream card/license](https://huggingface.co/Qwen/Qwen3-30B-A3B)
- [Cloudflare JSON Mode/models and limitations](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- [Cloudflare data processing/retention](https://developers.cloudflare.com/workers-ai/platform/data-usage/)
- [Groq current free limits](https://console.groq.com/docs/rate-limits)
- [Groq structured outputs/model support](https://console.groq.com/docs/structured-outputs)
- [Groq privacy/ZDR](https://console.groq.com/docs/your-data)
- [Gemini pricing/model availability](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini project-specific limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini free-tier eligibility](https://ai.google.dev/gemini-api/docs/troubleshooting)
- [Gemini unpaid data terms](https://ai.google.dev/gemini-api/terms)
- [Gemini structured output limitations](https://ai.google.dev/gemini-api/docs/structured-output)

## QA for this package

- Focused benchmark + existing ATS matching/fairness + AI evidence/privacy/provider/budget regressions: **139/139 PASS**, 0 failures/skips. Existing loopback-only owned replica-set QA used for the two adjacent DB-dependent tests; no production connection. The 17 new benchmark tests use only synthetic local data. Mock provider tests are safety/control tests, not real inference evidence.
- Frontend build PASS; existing >500 kB chunk advisory remains. ESLint PASS, 0 errors/warnings. No frontend/dependency/lockfile changes.
- Final independent local baseline observation: 12/12 expected ATS results, 6.35 ms total, RSS 31,457,280 bytes. The variation from the first observation above is ordinary local timing variability, not an optimization claim.
- Early runs hit sandbox child-process restrictions and an absent owned-QA port guard. These were not counted as PASS; final checks ran through the authorized local execution context with existing guards unchanged. No assertions, deadlines, provider flags or production gates changed.
- Changed files only: `Backend/scripts/evaluateRecruitmentAi.cjs`, `Backend/scripts/fixtures/recruitmentAiBenchmark.cjs`, `Backend/tests/recruitmentAiBenchmark.test.cjs`, this document. No production behavior changes. Full CI not dispatched for this local package.

## Cloudflare real-model execution plan — approval required

Preparation only, 2026-10-28. Existing commits d8cd603d/f682337 remain local and separately identifiable. CI 40693508284 observed in_progress once; not a blocker to this plan. No real inference, credential creation, permission change or external transmission performed.

### Verified access path

Use Cloudflare's documented account REST API, directly, without deploying a Worker/public endpoint:
`POST https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1/chat/completions`.
Fixed model: `@cf/qwen/qwen3-30b-a3b-fp8`. Public catalog availability confirmed; actual account entitlement/capacity and remaining daily quota remain UNKNOWN until the operator checks the account. Do not create a paid plan or modify billing.

Official REST getting-started guide specifies Workers AI Read AND Workers AI Edit for a custom token. Scope it to the existing account only, short-lived and dedicated to this evaluation. No R2, Workers Scripts, DNS, MongoDB or production INOP permission. Account ID is routing metadata, not an R2 credential. Never reuse the R2 token or send any token in chat. Token creation/use still requires approval.

Current Codex runtime has no configured AI secret binding and enforced network rules do not permit api.cloudflare.com. No discovery/read of environment secrets was attempted. A direct Codex run is therefore BLOCKED; do not bypass network restrictions or paste tokens into shell commands. The existing GitHub Actions protected-environment/manual-review pattern is a feasible execution venue after a separately reviewed workflow/runner is approved and delivered. This reuses existing GitHub compute and Cloudflare account; no public endpoint, Worker deployment or paid infrastructure. No Actions configuration was changed here.

Recommended future Actions controls: workflow_dispatch only; exact reviewed SHA; protected environment approval; one non-cancelling concurrency group; explicit default-false enable variable; short-lived environment token accessible only to the approved job; permissions contents:read; pinned actions; no untrusted input/scripts before secret use; no push/PR/schedule triggers; no auto rerun/resume. Fixed 12-case manifest and model, no user-provided prompts, endpoint, file path or real data. Account/model token added through GitHub UI only after approval. Revoke token and turn the enable variable off after execution. Separate delivery approval is required; do not push local Applications/AI ancestry implicitly.

### Exact bounded experiment

1. Operator confirms existing account uses Workers Free, the model is offered there, and at least 6,100 daily neurons remain available to this experiment. Shared usage by other account workloads can still consume quota; 429/quota failure stops rather than enabling billing. No automatic paid fallback.
2. Freeze the existing 12 synthetic exported cases, schema and ATS baseline from f682337. No database, original files, contact information or arbitrary input. One case per request, sequential, maximum 3 attempts-as-repetitions per case: **36 total requests**, including the canary, no extra health/model discovery inference.
3. Use existing exported system instruction and JSON input, `model` fixed as above, `temperature:0`, `max_tokens:512`, `stream:false`, `options.rejectIfBusy:true`; request the existing JSON schema using response_format. No tools, search, URLs, batch, files, Gateway logging/cache or separate model. The first `az-exact`, repeat 1 is the canary and counts toward 36. Its schema compatibility is NOT assumed: HTTP schema/model errors stop; do not silently remove schema mode, repair JSON or switch models.
4. Apply an 8-second client deadline and zero automatic retries, concurrency 1. Timeout/401/403/429/network/provider error stops the run. A timed-out request may already have consumed quota; do not immediately retry it. No increase to production deadlines. Truncation/incomplete output is a failed case, never a completed semantic result. A future transport must record failed attempts separately; no fabricated response is imported into the existing evaluator. Evaluate usable partial results with complete:false and keep failed attempts in the sanitized failure report.
5. For valid responses, preserve exactly the returned JSON for the fictional case plus repeat/model/latency/token counts in a restricted short-retention result, excluding HTTP headers/token/endpoint/account metadata. Never echo raw provider errors or secrets into logs/artifacts. A report of counters/verdicts alone is insufficient for explanation review; if fictional explanation artifacts are approved, retain only those bounded results (proposed 1 day). Otherwise manually review within the approved execution context and do not persist content. No public artifact link.
6. Feed parsed outputs into the existing evaluator using source:operator_reported (it honestly does not independently attest origin). No regex cleanup, generated surrogate answer or altered gold labels. Report schema/evidence/verdict failures, per-language findings, repeat consistency, p50/p95 measured latency and returned usage. Manually assess explanation language, completeness, invented claims, and resistance to e2 injection. No AI percentage or new hiring threshold. Preserve actual ATS-v2 baseline and productionReady:false.
7. Stop at 36 calls even if some results are missing. A new run/retry budget requires a new approval. Client abort is not proof that upstream processing ceased; do not claim a strict server compute-duration guarantee.

### Quota and cost calculation

Official current model rates: **4,625 neurons/M input tokens; 30,475 neurons/M output tokens**. Free allocation is **10,000 neurons/account/day**. This is shared account capacity, not a reserved job allowance; Free excess requests fail. The model is not listed among current paid-only models. Existing account plan/quota is not verified by public documentation.

Local measurement of the existing fictional messages+schema wrapper: maximum 1,724 UTF-8 bytes before adding the fixed model/options fields. This is a payload-size observation, NOT a tokenizer measurement. No tokenizer/model invocation was made.

- Planning estimate: 4,096 input tokens/request and 512 output tokens/request, all 36 -> **1,243.70 neurons**, about 12.44% of daily free allocation. Dollar-equivalent at current $0.011/1,000 neurons: **$0.0137**, not an actual charge.
- Loose context-ceiling allowance: use the published 32,768-token context as input allowance plus 512 output tokens for every call -> **6,017.59 neurons**. This intentionally overcounts a combined context window and is not a measurement or universal billing guarantee; recheck any separately charged reasoning/token categories and actual returned usage. Reserve 6,100 neurons before starting, no paid upgrade.
- Actual tokenization, reasoning/output behavior, remaining quota and inference latency are UNKNOWN. If the provider cannot enforce/confirm the output cap or charges outside this accounting, stop before the full batch. A 512-token cap may truncate Qwen reasoning/JSON; report failure, do not raise it without approval.

### Remaining approvals

Approve transmission of only these fictional fixtures to Cloudflare, the bounded 36-request/512-output-token experiment and result retention; approve a dedicated account-scoped Workers AI Read/Edit token in a supported secret store. Since Codex lacks access, separately approve preparation/review of the minimal protected manual Actions runner/workflow and its eventual delivery/execution. No code for a live transport/workflow was added or activated in this step. Do not treat an evaluation approval as production-provider/privacy approval.

Sources: [REST permissions](https://developers.cloudflare.com/workers-ai/get-started/rest-api/), [account chat endpoint](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/), [model and context](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/), [quota and neuron rates](https://developers.cloudflare.com/workers-ai/platform/pricing/), [privacy](https://developers.cloudflare.com/workers-ai/platform/data-usage/). Standard stateless inputs/outputs are not used for training or retained beyond processing except documented legal/security conditions; stateful/Gateway features have different retention. No real CV disclosure is authorized.

### Step 5A — Offline quality labels and proposed failure diagnostics

Schema, gold relation and evidence-ID correctness are separate from free-text
explanation quality. Each accepted offline assessment now explicitly labels
`explanationGrounding` and `explanationLanguage` as `MANUAL_REVIEW_REQUIRED`.
`qualityStatus` is `FAILED` for rejected/categorically incorrect output and
`MANUAL_REVIEW_REQUIRED` otherwise, including incomplete or simulated results.
There is no automatic full-quality PASS. These labels do not detect factual
claims or language reliably: unsupported experience/certifications, reversed
negative evidence, wrong-language prose and unverifiable explanations still
need human review. Literal/keyword checks cannot establish their truth.

Focused fictional AZ/EN/RU regressions include conflicting positive/negative
HACCP evidence with an unknown gold relation. They do not add live cases or
change the existing twelve-case, three-repeat benchmark or ATS-v2 baseline.
This coverage tests conservative evaluation; it is not model execution evidence.

Failure artifact proposal — NOT IMPLEMENTED; separate approval required:

- Keep the existing runner failure exit code, attempt/token/deadline limits,
  secret-reflection checks and protected manual approval flow unchanged.
- After assessment, allow only a separately validated metrics schema: fixed
  case IDs, repeat integer 1–3, attempted integer 0–36, bounded latency/token
  numbers, booleans, predefined failure/quality categories, and an explicit
  incomplete flag. No prompts, model text, arbitrary keys/strings or explanations.
- Reject secret reflections in parsed and final serialized metrics; publish
  nothing on unsafe output, sanitization failure or uncertain report provenance.
- Write atomically and emit a separate safe-failure-report marker only after
  full validation. A workflow change would permit upload after a failed
  evaluation step solely when that marker and the safe artifact exist. Do not
  use an unconditional `always()` upload or `continue-on-error` to hide failure.
- Risk: broadening upload conditions could publish stale/partial reports or
  conceal failures. Before approval, require tests for failed-step propagation,
  missing/stale markers, injected fields, encoded reflections and partial writes.
  Retain the one-day public-artifact limit and metrics-only contract.

Current behavior remains unchanged: any failed benchmark publishes no artifact;
public success artifacts still exclude explanations and do not assess them.
A full explanation/language benchmark remains PARTIAL until an explicitly
approved human-review procedure exists. No real CV transfer is authorized.
