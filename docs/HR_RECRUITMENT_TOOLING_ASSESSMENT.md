# Recruitment tooling assessment — 2026-11-05

Research ran in parallel with signed-relay integrity and processing accessibility
work. No production service, candidate data or credentials were accessed. No new
runtime dependency, model, agent skill or external inference service was installed.
Stars and maintenance are a dated popularity/activity snapshot, not a security audit.

| Official repository | Stars | Latest push checked | License | INOP decision |
| --- | ---: | --- | --- | --- |
| [MarkItDown](https://github.com/microsoft/markitdown) | 193,937 | Oct 28 | MIT | v0.1.9 DOCX conversion uses Mammoth→HTML→Markdown. Existing JS Mammoth 1.13.0 already supplies extraction; no demonstrated parser defect justifies another runtime. |
| [Docling](https://github.com/docling-project/docling) | 70,126 | Nov 5 | MIT | v2.147.0 is a possible future layout/table comparison; model/native footprint and quality must be measured before replacement. |
| [Sentence Transformers](https://github.com/huggingface/sentence-transformers) | 19,259 | Nov 4 | Apache-2.0 | Mature embedding/cross-encoder option; Python/Torch/model footprint is not currently justified without an available reviewed artifact. |
| [FlagEmbedding](https://github.com/FlagOpen/FlagEmbedding) | 12,297 | Oct 27 | MIT | BGE-M3 and bge-reranker-v2-m3 are multilingual research candidates; no measured Azerbaijani Recruitment accuracy or hosting claim. |
| [FastEmbed](https://github.com/qdrant/fastembed) | 3,277 | Nov 4 | Apache-2.0 | CPU ONNX experiment preferred over a new service. No Qdrant deployment required; model/tokenizer still need provenance review. |
| [Transformers.js](https://github.com/huggingface/transformers.js) | 16,400 | Oct 30 | Apache-2.0 | Node-compatible alternative, not a reason to add unmeasured native/model dependencies. |
| [Playwright](https://github.com/microsoft/playwright) | 99,333 | Nov 5 | Apache-2.0 | Existing installed test infrastructure reused. |
| [Playwright CLI](https://github.com/microsoft/playwright-cli) | 14,966 | Nov 4 | Apache-2.0 | Official skill inspected read-only at f50f57905b9fd3dd355330719ddf0687000c9437; no skill/CLI installation necessary. |

All checked repositories were non-archived. Dependencies and model weights need
separate license/security review: a library license does not license every model.

## Applied findings

Role/name locators, keyboard activation, localized named regions, bounded request
counts and real screenshot review were applied using the existing Playwright
harness. The one-way processing-history command now identifies its controlled
region. It remains one-way; no pretend toggle/collapse or extra requests were added.

MarkItDown generic URL/path conversion can perform IO with host privileges. Its
normal DOCX extra also pulls Magika/ONNX Runtime/NumPy (a file-type classifier,
not semantic CV analysis). No replacement or dependency installation was warranted.
Any future parser comparison must preserve exact pre-scanned immutable bytes,
no-network/no-secret isolation, input/archive/output limits and private cleanup.

## Multilingual semantic inference: precise remaining blocker

Official Hugging Face metadata requests for multilingual E5-small, MiniLM, BGE-M3
and BGE reranker failed with proxy CONNECT 403. No policy/TLS bypass or alternate
mirror was used. FastEmbed's latest three GitHub releases had no model assets.
No reviewed multilingual weight/tokenizer bundle with a verified digest was
available during that assessment. Multilingual semantic inference was NOT RUN; mocked remote responses,
deterministic ATS and Tesseract OCR are not embedding inference.

The official FastEmbed registry at f91d9168c0291daeafb0a54cebc7c5b4b83f312f
lists multilingual MiniLM ONNX: 384 dimensions, 128-token limit, estimated 0.22 GB
weights, Apache-2.0 per registry (artifact/model-card verification still required).
E5-large's registry estimate is 2.24 GB and is not a reasonable first candidate in
the constrained QA workspace. These are weight estimates, not measured RSS.

Minimum next experiment: approved official offline bundle with exact revision,
license and SHA-256 for model AND tokenizer; bounded CPU runtime; synthetic
AZ/EN/RU professional query/evidence pairs with hard negatives and negation;
compare lexical baseline and actual semantic retrieval, startup, latency, RSS and
truncation. Rank only an already-authorized bounded shortlist, with no names/contact
or protected traits; do not modify deterministic ATS or infer unknown qualifications.
Similarity is retrieval evidence, not a hire/reject score. No vector store/schema,
external provider or production activation is justified before that measurement.

## Operational boundaries

Fresh official antivirus signatures/continuous scanner hosting, private-storage
retention/recovery verification, controlled index provisioning, worker continuity
and combined backend+scanner+OCR budget remain production dependencies. KFC and
Pizza Hut require first-party owner, notice/consent, secret custody, mapping and
outbox/retry approval. Synthetic local success does not establish production readiness.

## Follow-up: independently distributed English proof

The official Explosion GitHub model release subsequently enabled real local
English static-vector inference without bypassing Hugging Face policy. See
[the measured offline experiment](HR_LOCAL_SEMANTIC_EXPERIMENT.md). It is not
multilingual/contextual readiness: negated evidence ranked above a true paraphrase,
so no matching, qualification or Candidate-search activation was made.
