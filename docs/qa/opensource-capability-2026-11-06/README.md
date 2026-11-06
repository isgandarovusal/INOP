# Open-source capability acceptance — 2026-11-06

Synthetic local acceptance only; no production access, messages, model activation or deployment.

## Delivered behavior

- Optional internal interview summary, strengths and concerns: authorized existing workflow mutation, bounded allowlisted input, revision protection, persisted before/after History, read-only handoff display. Feedback-only saves preserve schedule/result/ATS. Interview → Offered can atomically retain edited feedback. No new endpoint or initial requests.
- Fixed false reschedule delivery detection: equivalent ISO-string/Date instants previously differed when stringified; compare timestamps instead. Existing genuine notification policy and authorization remain unchanged.
- Audit corrective-action status/overdue/assigned-to-me filters, server-side count/pagination and first-page recovery. Previous UI stopped at 200 actions; integration retrieves 206 unique actions over five pages. Overdue uses Baku calendar-day boundary and excludes completed/verified work. Existing parent authorization, findings, independent closure verification and scoring remain authoritative. Paged calls add one bounded count query; legacy no-query response remains compatible.
- Project-local instructions under .agents/skills used for Recruitment, Audit CAPA, multilingual evidence and bounded delivery. These are clean-room instructions, not installed external agents.
- Local axe-core 4.14.0 dev-only integration; two declared new control regions tested, zero WCAG2A/AA violations. Not whole-product certification.

## Actual QA

- Backend/scoring integration: 41/41 PASS, including HR/Service/Standard/HSE contracts.
- Changed backend/evidence guards: 51/51 PASS.
- Final feedback/CAPA/selector regression: 42/42 PASS. Counts overlap; do not sum as unique coverage.
- Integrated real Chromium run: 22/22 PASS. Final changed CAPA controls rerun: 7/7 PASS.
- Real isolated native Mongo replica set, existing database on temporary filesystem; no new Docker volumes. UI → API → authorization → persistence → UI covered for feedback and CAPA.
- Feedback-only delivery and stage-plus-feedback regressions failed before fixes; now pass. A real accessibility-name issue in textareas was fixed with explicit localized labels. Fixture lookup was corrected to select its own action, without weakening server checks.
- Frontend build/lint PASS; frontend dependency audit: zero vulnerabilities including dev dependencies. Only axe-core added to Node lockfile.
- Final browser smoke: login, Dashboard/manual refresh, candidates/jobs/detail, logout/session isolation and Audit navigation. Four initial summary reads; explicit Refresh adds four. No unexpected console/API/websocket errors in that smoke.
- Screens at 1440/768/390/320, AZ/EN/RU. Opened and visually reviewed current feedback desktop/tablet/mobile/narrow images and CAPA narrow image: readable localized text, wrapping, no clipped/overlapping controls or horizontal page overflow. Existing date input native locale presentation retained. Existing Audit report ISO date display was not restyled.

## Real converter experiment (not semantic AI)

See converter-benchmark-final.json. Offline synthetic DOCX in EN/AZ/RU; all three tools preserved 12/12 tested literal markers. Only three small documents: no general accuracy or production speed claim.

| Tool | Median conversion ms | Peak RSS MiB | Structured table | Invalid DOCX rejected |
|---|---:|---:|---|---|
| INOP rules-2 | 424.39 | 132.33 | No | Yes |
| Docling-slim 2.148.0 | 23.53 | 149.95 | Yes | Yes |
| MarkItDown 0.1.9 | 254.49 | 149.67 | Markdown | No, fallback |

Docling initialization 1522.2ms, MarkItDown 654.81ms measured separately; INOP timings include its existing parser path. External converters had no DOCX page provenance. Incremental isolated Python experiment occupied 122 MiB, with hashed wheels and network-disabled conversion. Neither replaces the production parser. PDF/scanned OCR comparison not executed: additional verified layout/OCR artifacts are not prepared. Source hashes recorded; the deterministic guard is not contextual inference.

MarkItDown's bundled Magika 1.0.3 file-type classifier is not a qualification model. Its standard_v3_3 ONNX SHA256: fe2d2eb49c5f88a9e0a6c048e15d6ffdf86235519c2afc535044de433169ec8c. No multilingual hiring inference executed; official contextual artifact access/verification remains unresolved. Existing literal guards, ATS and human decisions unchanged.

## Reviewed projects and adoption

Public current metadata in repos.json; repository activity/stars do not establish security. Official URLs below. No GPL/AGPL source imported.

- https://github.com/adamperlis/openats (AGPL), https://github.com/opencats/OpenCATS (license unresolved), https://github.com/frappe/hrms (GPL): product-reference only, clean-room optional feedback.
- https://github.com/anirudhnshandilya/auditpilot: metadata unavailable; not adopted.
- https://github.com/coolstartnow/isms-builder and https://github.com/SUALBA/AuditSym (AGPL), https://github.com/jposluns/grc_library (CC-BY-SA): reference only, no scoring/catalog/source copied.
- https://github.com/docling-project/docling and https://github.com/microsoft/markitdown (MIT): actual isolated benchmark above. Optional experiment dependencies not shipped. Secondary cobble package has BSD classifier but complete license file was not established; production dependency approval remains unresolved.
- https://github.com/Unstructured-IO/unstructured (Apache-2.0): no extra parser dependency justified by this small benchmark.
- https://github.com/ollama/ollama (MIT), https://github.com/huggingface/transformers and https://github.com/srbhr/Resume-Matcher (Apache-2.0): no new runtime/model adopted; weight licenses, compute, privacy and quality are independent gates.
- https://github.com/anthropics/skills: reviewed webapp-testing guidance only; per-skill licensing not assumed. No external scripts installed/executed.
- https://github.com/microsoft/playwright (Apache-2.0): existing real browser infrastructure reused.
- https://github.com/dequelabs/axe-core (MPL-2.0): exact 4.14.0 local test-only package adopted, no runtime dependencies. Preserve its license notices.

Free software is distinct from model weights and quota-limited hosted services. Self-hosting still costs compute. No candidate data sent to third parties.

## Readiness and remaining gaps

Recruitment interviews and Audit CAPA are enhanced and locally verified, not complete product/production acceptance. Existing candidate comparison, scoped pipeline, follow-ups and attention queues are retained rather than rebuilt. Full parser PDF/OCR comparison, staging recovery, real fresh scanner signatures, private-storage restore acceptance and source-owner approvals remain open. Semantic qualification AI stays NO-GO until real grounded AZ/EN/RU quality/false-positive/latency/memory/license gates pass. No external invitation sending, new scoring policy, production offline storage or autonomous hiring introduced.

Raw local logs and optional Python artifacts remain temporary; selected sanitized screenshots, metadata and measurements here are durable after verified push. Original full workspace remains untouched.
