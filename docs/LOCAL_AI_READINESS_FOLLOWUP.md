# Local contextual AI: bounded follow-up

Semantic qualification/hiring remains NO-GO. Existing 42 AZ/EN/RU scenarios and
real English spaCy baseline are retained: unsafe similarity false-positive rates
were 40–80%. Literal guards, mock providers and embedding cosine are not contextual
inference. No new model was downloaded or inference executed in this package.

Reviewed official repositories (2026-11-05 GitHub metadata):
- https://github.com/huggingface/transformers — Apache-2.0, active, suitable Python
  runtime ecosystem; model artifact/license/security and task quality are separate.
- https://github.com/huggingface/transformers.js — Apache-2.0, active; potentially
  useful local ONNX runtime, but browser model memory/download/privacy costs and
  per-model AZ/RU/EN evidence quality need measurement before integration.
- https://github.com/TanStack/query — MIT, active; unnecessary dependency for two
  numeric cached endpoints. Existing request infrastructure was reused instead.
- https://github.com/microsoft/playwright — Apache-2.0, active; existing synthetic
  browser infrastructure reused for navigation, request counts and screenshot review.

No unreviewed agent skill was installed. Repository activity is not a security
certification. Runtime licenses do not establish model-weight/training-data rights.
Free hosted tiers have quotas and require privacy/provider approval; self-hosted
inference still costs RAM, CPU, disk and operations. No candidate data was sent.

Prior official-path assessment found approximately 1GiB XLM-R PyTorch artifacts
reachable, but a base encoder is not an NLI verifier. Archived TorchText support,
checkpoint format/digest review and ABI compatibility remain unresolved. With only
about 1.5GiB workspace disk free, downloading this encoder has no justified value.
Retain current caches and deterministic ATS; do not substitute untrusted mirrors.

Next useful experiment: a small legitimately distributed multilingual contextual
NLI model with verified artifact/license, tested against all 42 cases plus source
attribution, contradiction/negation, experience and certificate counterexamples.
Measure false positives, cold/warm latency and peak memory before any activation.
Production scanner/storage/worker owner approvals and operational verification
remain separate from synthetic success. No new architecture or activation here.

## 2026-11-06 bounded continuation

Current runtime probe: torch/transformers/onnxruntime/spaCy are not installed in
system Python; prior /tmp model/runtime directories are absent in this recovered
environment. Their previous inference evidence remains historical evidence, not
current executable inference. Workspace free disk ~1.5GiB, RAM ~9.5GiB available;
/tmp has ~4.9GiB free. A small ONNX NLI experiment might fit, but this alone is
not permission to fetch an unverified artifact or install a large runtime.

Task candidate (not an approved model):
https://huggingface.co/MoritzLaurer/multilingual-MiniLMv2-L6-mnli-xnli
Its official config HEAD returned proxy CONNECT 403. No weights were fetched.
The exact weight revision/digest, distribution license/commercial terms and AZ
quality could not be verified here. Do not assume the Transformers Apache-2.0
license also licenses these weights, or that multilingual pretraining proves AZ
NLI. No mirror, access-control bypass, model script or alternative untrusted
binary was used. Retained official TorchText route remains an unsuitable base
encoder, with the already documented lifecycle and artifact-review blockers.

Implemented lightweight alternative: evaluation now reports false negatives,
recall among tested supported cases, full-corpus coverage recall, missing positive
cases and expected/tested positive counts. Invalid/stale-source or misattributed
support is not a true positive. Missing cases lower coverage recall, not tested
recall; no tested positives yields null tested recall. This is an additive offline
metric change, not ATS or model behavior. A deterministic all-abstain fixture over
42 cases has zero FP but 12 FN, recall0 and precision null: zero FP alone does not
establish useful inference. This is SIMULATED_NOT_MODEL_EVIDENCE, with no invented
latency or memory metrics. Existing English static-vector results are not rerun.

Next priority remains a pinned, legitimately licensed small contextual verifier
with actual AZ/EN/RU execution, grounded citations, negation/conflict/experience
checks and measured RSS/latency. Free APIs remain quota/privacy dependencies,
not a substitute for local evidence. Production semantic decisions remain NO-GO.
