# INOP Recruitment Cloud — Free-tier operational boundary

**Current actual state (2026-11-07):** Cloudflare Worker `inop-recruitment-api` is routed at `inop-recruitment-api.isgandarovusal.workers.dev`. Cloudflare D1 `inop-recruitment-db`, EU jurisdiction / EEUR, has migrations `0001_init.sql`, `0002_quarantine_quota.sql` and `0003_ai_proposals.sql` applied (schema **3**). Worker bindings: `RECRUITMENT_DB`, `PRIVATE_CV_BUCKET` (existing private R2 `inop-private-cv`), `AI`, and secret `RECRUITMENT_SERVICE_TOKEN`. The shared Render-side token was **not** installed; automatic secret exchange was blocked by a safety check. The main MongoDB `test` remains the authoritative source for hiring records.

## Behavior that is actually deployed

- Public `GET /health` reports disabled intake and disabled AI. Never treat this as malware/readiness certification.
- All `/v1/` endpoints require a private bearer token and have no permissive CORS. Absent secret returns 503; invalid token 401.
- `GET /v1/status` checks D1 schema 3 and reports scanner not verified, mandatory human review, 20/day upload-attempt cap and feature states.
- `GET /v1/sources?tenant=gfc` returns at most 30 metadata-only rows; no names, CV bytes, raw extracted text, object keys or AI output.
- `POST /v1/intakes` is **disabled by default** unless `RECRUITMENT_QUARANTINE_INTAKE_ENABLED=true`. The gate is currently NOT configured. If expressly activated after retention and consent reviews, it accepts only a server-to-server body up to **1 MiB**, PDF/DOCX signature and MIME, tenant gfc, current Mongo Candidate reference and a consent reference. A durable atomic D1 counter limits each UTC day's attempts to 20. Only a new random private R2 key is written; SHA-256 metadata, D1 pending/quarantine status and receipt are preserved. Unknown provider results do not count as success, never delete the object automatically or retry blindly. Nothing is declared virus-free.
- `POST /v1/ai/review` is **disabled by default** and requires BOTH `RECRUITMENT_CLOUD_AI_ENABLED=true` and `RECRUITMENT_PII_TRANSFER_APPROVED=true`. Independently, the referenced source must have `scan_status=clean`, `source_status=reviewable`, `storage_status=stored` in D1; there is currently **no scanner workflow allowed to mark a source clean**, so production inference cannot run. The payload accepts only bounded curated skill/evidence strings, never raw CV bytes. Cloudflare Qwen 3.8 returns requirement/evidence **index suggestions**, with at most one D1-reserved request per tenant/day and `max_tokens=192`, zero retries. The database stores only minimal index-level evidence and status `needs-human-review`; no hire/reject and no protected-trait inference is allowed. Model semantics and AZ/EN/RU quality have not been accepted.
- OCR, parsing, scanner approval, CV download, and automated hiring decisions are **not enabled**. Quarantined CVs are never exposed to Workers AI.
- Existing `inop-private-cv` has no public r2.dev or custom-domain access. A previously retained 64-byte synthetic object was left untouched. New upload tests use mocks only; they did not create real CV objects.

## Free usage bounds and unavoidable blocker

Cloudflare Workers Free permits 100,000 requests/day but only **10 ms CPU** per request and 128 MiB memory; PDF/DOCX extraction and signature-scanning cannot be assumed to finish in this budget. D1 Free currently includes 5M rows read/day, 100k written/day and 5 GiB; R2 Standard currently includes 10 GB-month, 1M Class A and 10M Class B operations/month. Workers AI Free provides 10,000 neurons/day. Actual quota/payment settings were not readable from our token and **no real model inference was sent**. The optional AI proposal path cannot run without a verified clean source and explicit two-flag approval. All quotas are shared with other account use: none is a guaranteed billing cap.

Cloudflare WAF malicious-uploads detection requires Enterprise + paid add-on. The open-source Cisco ClamAV scanner uses a native daemon/engine with maintained signatures and enough RAM/CPU; it is **not a service that Free Workers can host**. A free scanner is possible on an existing persistent owner-controlled machine with maintained ClamAV; a separate scanner host/credential/recovery and actual malware test are required to connect it. We will not upload private CVs to public malware APIs or use browser-only/unverified scans as a clean verdict. Do not change `scan_status` from pending without a verified scanner receipt for the exact immutable SHA.

## Source reviews and exact choices

- [Cloudflare Workers SDK](https://github.com/cloudflare/workers-sdk) — official deployment tooling; existing Cloudflare API update was used instead of installing tooling.
- [Mozilla PDF.js](https://github.com/mozilla/pdf.js) — licensed JavaScript PDF parsing, but processing untrusted input within 10 ms Free Worker is not established. Adopt only in a separate approved worker process after scanning.
- [mwilliamson/mammoth.js](https://github.com/mwilliamson/mammoth.js) — BSD-2-Clause, existing INOP Node stack already uses Mammoth for DOCX extraction; reuse rather than introduce Python services.
- [Microsoft MarkItDown](https://github.com/microsoft/markitdown) — optional Python conversion pipeline; unsuitable as a drop-in Worker runtime.
- [Cisco-Talos/clamav](https://github.com/Cisco-Talos/clamav) — GPLv2 engine appropriate for a private trusted scanning host, subject to definitions, resources and operator health checks.
- [cloudflare-pdf-rag](https://github.com/jcampod/cloudflare-pdf-rag) — MIT example for AI/evidence retrieval, but extracts files with **external Python** and is NOT a real on-Worker CV scanner.
- [attachmentAV R2 example](https://github.com/widdix/attachmentav-example-cloudflare-r2-virus-malware-scan) — uses a separate commercial attachmentAV API and sends customer files outside our approved boundary. Reject for INOP Free/private CVs.
- [exav](https://www.exav.org/) — interesting Rust/WASM scanner, but still beta; not audited or verified to fit Free Worker CPU/memory and signature updates. Do not certify as malware defense.

The previous `@cf/qwen/qwen3-30b-a3b-fp8` model is scheduled to stop responding **2026-11-20**. Cloudflare recommends the newer `@cf/qwen/qwen3.8-27b`, present in our account catalog. It is a possible bounded AZ/EN/RU test candidate, **not** yet a confirmed accurate recruitment model. Production inference stays disabled until privacy consent, benchmark and budget controls are approved.

## Free and low-memory alternative review (2026-11-07)

No new runtime dependency, model weight, signature download, R2 test object, Mongo collection, storage directory, or paid service was installed for this selection.

- **Preferred: existing INOP ClamAV adapter** (`Backend/services/hrClamScan.service.js`): private stdin-based scan; strict hash and signature age; no shell, temp CV, or package installation. It still requires a separately available, adequately sized trusted native host with current full definitions. Not runnable on Workers Free or Render Free reliably.
- [pompelmi/pompelmi](https://github.com/pompelmi/pompelmi) is a zero-runtime-dependency Node ClamAV wrapper. It **still requires** ClamAV native engine/daemon, so it would duplicate the existing more restrictive adapter and not solve RAM/hosting. Not installed.
- [sylvinus/exav](https://github.com/sylvinus/exav) aims for a bounded, memory-safe ClamAV-compatible scanner, but is explicitly **beta** and has no demonstrated production signature/corpus acceptance on Workers Free. Not installed.
- [gleicon/spotter](https://github.com/gleicon/spotter) does structural and threat-intelligence checks of PDFs/Office files but uses additional feeds, and ClamAV is optional; this is defense in depth, not an independent certified clean verdict. Not installed.
- [Cloudflare Queues Free](https://developers.cloudflare.com/changelog/post/2026-02-04-queues-free-plan/) permits up to 10,000 operations/day and 24h retention. **Do not create a queue yet**: the private scanner consumer does not exist, and unattended messages cannot turn pending files clean.
- Existing INOP `mammoth` and `pdf-parse` dependencies handle source extraction in the separate Node runtime once bytes are verified clean. No second parsing runtime is installed; Workers Free's 10 ms CPU budget is not used for DOCX/PDF extraction.

An additional independent Worker activation gate `RECRUITMENT_VERIFIED_SCANNER_ENABLED=true` now guards `/v1/ai/review`, **in addition to** existing AI and transfer opt-ins and the exact source's clean status. It is intentionally unset. Merely modifying D1 `scan_status` cannot activate AI. A future reviewer must verify actual scanner service, hash-bound fresh receipts, tenant consent, and private transport before enabling it. A flag on its own is not scanner proof.

## Operational QA and release

The pure HTTP boundary tests are `Backend/tests/cloudflareRecruitmentBoundary.test.cjs` and `Backend/tests/cloudflareRecruitmentIntake.test.cjs`, plus `Backend/tests/cloudflareRecruitmentAiGuard.test.cjs`. They check default disabled, tenant and MIME restrictions, private SHA receipt, D1 quota failure, no AI on unscanned bytes and sanitized storage failures. They make **zero** real R2 writes or Workers AI calls. All three tests are now in the routine GitHub CI security gate.

Before real CV intake:
1. Provision and verify a persistent **private ClamAV scanner**, updated signatures, encrypted transport, malware test, and exact-byte/hash scan receipt.
2. Define consent/retention/erasure and backup/restore; verify R2 private IAM + D1 migration recovery; prove end-to-end object reconciliation when R2/D1 acknowledgement fails.
3. Bind a controlled service credential in the Render server secret store by authorized operator, never browser/GitHub; default-off bridge code already exists.
4. Implement current-authority Candidate ownership and signed consent verification; metadata-only Candidate refs from an authenticated backend are not themselves proof of lawful intake.
5. Provide bounded scanner-verified extraction (PDF.js/Mammoth), AI proposal evaluation on synthetic AZ/EN/RU examples, human-approved review in INOP with fairness, provenance, no autonomous decisions.
6. Only then activate limited real CV intake and verify hosted HTTP authentication, scanner, R2 receipt, recovery, AI candidate retrieval and explicit human decision. No background polling or paid resources are required for the current disabled foundation.

Current designation: **isolated Cloudflare foundation deployed, safe quarantine intake coded but disabled, full production CV/AI not certified**.
