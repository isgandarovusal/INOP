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
