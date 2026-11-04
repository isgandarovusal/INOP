# Local CV OCR operations and recovery

This is the existing CV processing/intake architecture, not another pipeline.
Production processing, OCR, scanner and intake remain opt-in; preparing QA models
or passing tests does not enable any gate.

## Real local inference, not an LLM

Image-only PDFs use the existing PDF renderer and Tesseract with official
`tessdata_fast` LSTM language models. This is genuine local neural OCR. Subsequent
CV field extraction, skill aliases and ATS-v2 scoring are rules/deterministic;
this does not provide semantic LLM matching or prove general CV accuracy.
No document needs to be sent to an external AI service for this path.

Reuse the installed, reviewed tools:

| Tool | Role | License |
| --- | --- | --- |
| Tesseract / tessdata_fast | Native OCR / language models | Apache-2.0 |
| mammoth | DOCX raw-text extraction | BSD-2-Clause |
| pdf-parse / pdfjs-dist | PDF extraction/rendering | Apache-2.0 |
| pdfkit | Synthetic QA documents | MIT |

Model quality is separate from software licensing. HR must compare recognized
facts against the original. Unknown facts stay unknown, OCR confidence remains
null, and only explicit authorized approval creates/updates reviewed facts.
No model output makes hiring decisions or changes ATS weights.

## Isolated QA preparation

Use the existing `Backend/scripts/prepareOcrTestModels.cjs`. It pins SHA-256 for
`aze`, `eng`, `rus` from official `tessdata_fast/4.1.0`, enforces size bounds and
refuses incompatible existing files. Models stay in the owned local test directory;
they are not committed, downloaded at application startup or treated as production
configuration. Where the environment requires its configured HTTP proxy, supported
Node `NODE_USE_ENV_PROXY=1` can be set for this preparation command only. Never
bypass proxy restrictions or disable TLS validation. No CV contents are involved
in a model download.

Existing model directory is exported by that script; production
`HR_CV_OCR_DATA_DIRECTORY` must separately reference an operator-approved model
installation. Default OCR expects all AZ/EN/RU models, not just system English.
Missing runtime/language data stays explicitly blocked. Do not silently substitute
another language or expose document contents/native diagnostics.

## Lifecycle and bounds

Existing bounds remain: 5 MiB PDF, three pages, bounded geometry, 1200px rendering,
4 MiB/page PNG, 100k output bytes, one OCR slot, 15-second maximum engine deadline
and one native OCR thread. The native environment excludes application secrets;
temporary files are private and removed after work settles.

A caller timeout/cancellation must not free capacity while an abort-ignoring
renderer or native collaborator still runs. The adapter now retains its shared
slot through actual work and one cleanup; a second request receives `OCR_BUSY`
until settlement. Late results cannot become facts. A permanently stuck
collaborator intentionally keeps the slot unavailable; operational restart may
be needed. This is fail-closed capacity control, not a stronger timeout guarantee.
The OCR deadline is separate from the unchanged 10-second antivirus deadline and
two-scan limit.

Worker V8 limits do not cap total native/renderer/backend RSS. Test on realistic
multi-page scanned documents in an isolated resource budget before hosting approval.
Measure combined backend, ClamAV, OCR and signature-update activity, startup/restart,
queue backpressure and recovery. Do not assume Render Free supplies continuous
workers or that small model files imply a low full-system memory peak.

## Acceptance and production dependencies

Focused existing tests: `hrCvOcrProcessing.test.cjs`, `hrCvSourceOcr.test.cjs`,
`hrCvOcrHttp.test.cjs`. They distinguish actual local OCR from injected race/error
collaborators. Include missing languages, cancellation/deadline, post-timeout busy,
late directory creation/cleanup, quarantine, source/role revocation, pending review,
explicit approval and no automatic person creation.

Scanner signatures/hosting, storage retention/recovery, authorized source-owner
contracts and production activation remain separate operator dependencies. Real
OCR success does not establish fresh ClamAV signatures, production readiness or
external website integration. Semantic/generative AI requires its own reviewed
model/runtime, privacy boundary, resource and AZ/EN/RU factual/evidence evaluation;
no external provider is activated by this work.
