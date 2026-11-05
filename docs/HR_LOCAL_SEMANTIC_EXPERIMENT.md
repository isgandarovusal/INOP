# Local semantic evidence experiment — explicit, offline, English only

This is a synthetic QA adapter, not an activated Recruitment API, new search
pipeline or replacement for ATS-v2. It is never imported by server startup,
processing profiles or routes. No Candidate/Job/Application data is read or
written. Existing scope checks remain mandatory for any future application use;
this helper grants no authorization. No production env flag or provider was added.

## Verified distribution and runtime

Official publisher: [Explosion spaCy models](https://github.com/explosion/spacy-models/releases/tag/en_core_web_md-3.8.0).
Release ID 177486834, asset ID 195734413; `en_core_web_md-3.8.0-py3-none-any.whl`
is 33,480,380 bytes, MIT, English, 300-dimensional learned static word vectors.
SHA-256: `5e6329fe3fecedb1d1a02c3ea2172ee0fede6cea6e4aefb6a02d832dba78a310`.
The official HTTPS publisher and wheel RECORD were verified before deriving eight
resource hashes embedded in `localSemanticVectors.py`. The publisher supplied no
asset digest/signature: the local pin is not an independently signed attestation.
No Hugging Face block, TLS rule or proxy restriction was bypassed.

The optional QA runtime is spaCy 3.8.8, CPU-only, Linux x64/Python 3.12. The 41
exact official PyPI wheel URLs/SHA-256 values are retained in
`Backend/scripts/fixtures/localSemanticRuntime-linux-x64-py312.txt`. This is NOT an
npm/runtime dependency manifest: nothing installs on backend startup/build or
normal Node tests. Use a separate virtual environment and pip `--require-hashes`
if reproducing. An explicit Click 8.1.8 pin was necessary: the then-current Typer
metadata allowed a resolved environment that passed pip check but spaCy could not
import. Source/hash provenance is not a comprehensive third-party security audit.
The isolated model/runtime occupied about 379 MiB, excluding the retained pip cache.

## Reproduce without activating anything

1. Obtain only the exact official wheel above, verify SHA-256 and wheel RECORD.
2. In a new private local directory, copy only `config.cfg`, `meta.json`,
   `tokenizer` and `vocab/{key2row,lookups.bin,strings.json,vectors,vectors.cfg}` from
   the wheel's `en_core_web_md/en_core_web_md-3.8.0/` subtree. Do not execute model
   package code or copy pipeline components. The runner rejects extra files,
   missing/changed hashes, symlinks and nonregular resources. Do not point it at
   production storage or modify an existing cache/directory.
3. Prepare the isolated reviewed runtime; no global install or production secrets.
4. Run only synthetic fixtures:

```sh
node Backend/scripts/evaluateLocalSemanticEvidence.cjs --python /absolute/qa-venv/bin/python --model-dir /absolute/private-model-directory
```

The Node adapter reuses `hrAiCvReview.context`'s bounded professional-field,
contact/protected-trait exclusions (not a general PII detector). It admits only
English locale, max24 facts, max500 characters each, strict300d finite vectors;
zero vectors remain unavailable. Locale admission is not language detection.
Output includes only evidence IDs/similarities and numeric runtime metadata.
The child gets a minimal environment, `-I`, CPU-library thread hints set to one, 20s hard-kill
and 1MiB output bound. The runner checks model hashes on every invocation,
excludes all spaCy pipeline components and blocks Python socket operations.
This is not an OS/cgroup/no-network sandbox or full-system capacity claim.
Only a trusted, operator-owned local model directory is supported; no guarantee
against another process concurrently rewriting verified artifacts is asserted.

## Actual results and go/no-go

Actual parent adapter + pinned Python runner, ten synthetic texts in one batch:
startup/import/load 1,419.937 ms, embedding 0.922 ms, process peak RSS 340,936 KiB
(about333 MiB). This excludes backend, ClamAV, OCR, signature updates and browser.
No production throughput or hosting-sufficiency claim follows.

- Customer-service positive paraphrase cosine0.60146 vs unrelated repair0.28968.
- Negated customer-service evidence cosine0.85484, HIGHER than positive paraphrase.
- Inventory paraphrase0.40698 vs staff-shift distractor0.40487: weak separation.
- Out-of-vocabulary query yields null/unavailable, not a fabricated zero qualification.
- Existing deterministic ATS scores remain0 for these exact-label-missing examples.

Decision: **real semantic retrieval proof PASS; production matching/qualification
activation NO-GO**. Static means do not resolve negation, verify certificates or
infer missing qualifications. Never use these numbers as suitability probabilities,
automatic hiring/rejection, ATS weights or proof of a claimed skill. This experiment
does not enable semantic Candidate search. AZ/RU and a contextual multilingual
model/reranker still require an independently reviewed available artifact, hard
negative/negation evaluation, privacy/scope tests and combined resource measurement.

## Tests and remaining boundaries

Node preparation/math/protocol tests use synthetic vectors/runner doubles, not
real-inference evidence. The report above came from executing the actual verified
model. Stdlib Python rejection tests need no spaCy/model installation:

```sh
node --test Backend/tests/localSemanticEvidence.test.cjs Backend/tests/localSemanticEvaluation.test.cjs
PYTHONDONTWRITEBYTECODE=1 python3 Backend/tests/localSemanticRunner.test.py
```

No scanner/storage/worker activation, source-owner approval, SMTP or production
access is implied. Source-approved OCR and stored-Candidate OCR have distinct provenance receipts.
The async authoritative Source verifier now supports the existing opt-in durable
AI path without fabricated processing-job metadata; see
[Source provenance](HR_SOURCE_AI_PROVENANCE.md). Production gates remain disabled;
provenance verification does not certify semantic model quality.
