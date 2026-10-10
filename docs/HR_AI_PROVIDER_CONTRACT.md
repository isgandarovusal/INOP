# HR AI provider — local adapter contract

Package 09A adds an adapter; 09B adds independently authorized HTTP/UI integration. Neither proves live-provider verification. Without approved configuration it returns AI_UNAVAILABLE; there is no static replacement. The former Job form hardcoded suggestions are removed in 09B.

## Configuration names and external prerequisites

Backend-only: `HR_AI_PROVIDER` (disabled/default, or openai), `HR_AI_MODEL`, `OPENAI_API_KEY`, `HR_AI_DAILY_BUDGET_USD`, `HR_AI_INPUT_USD_PER_MILLION`, `HR_AI_OUTPUT_USD_PER_MILLION`. Model, provider-approved pricing, data-processing/privacy approval and provider-side spending limits must be independently approved. Never put credentials into frontend variables or Git; no secret values are required in chat.

Optional bounded settings: `HR_AI_TIMEOUT_MS` (5000 default, 100–8000), `HR_AI_MAX_OUTPUT_TOKENS` (1200, 100–2400), `HR_AI_DAILY_ACTOR_REQUESTS` (30, 1–100), `HR_AI_RETRIES` (1, 0–1). Only the official HTTPS OpenAI chat-completions endpoint is supported; custom URLs, tools and runtime mock providers are not accepted. Models must support the strict JSON schema and max_completion_tokens. Real model/endpoint compatibility is BLOCKED_EXTERNAL, not inferred from mocks.

## Input, output and human control

Whitelisted bounded business context: title, description/responsibilities, brand/workplace, experience and existing required/preferred skills. No raw CV, actor credential, role, candidate or email fields are accepted. Description remains untrusted text serialized as JSON in the user message, separate from trusted system instructions. Callers must supply only professional vacancy context, not personal/contact/secret material. Lexical controls alone are not a general DLP or prompt-injection proof. CV-assisted extraction and minimization have separate acceptance criteria; this adapter does not send CVs.

Strict schema plus independent server validation produces required/preferred skill names, explanations, nullable confidence and uncertainty, or insufficient_context. Counts, lengths, control characters, duplicate skills and common AZ/EN/RU protected-trait criteria (including Unicode compatibility forms) are checked. Confidence is provider-declared, not calibrated factual accuracy. Unknown facts must stay unknown. This is a proposal requiring HR approval/edit, not a matching score or hire/reject decision; schema has no decision field. Human review remains necessary for semantic bias/hallucination not detectable by lexical validation.

Provenance includes provider/model, schema version and SHA-256 context identity; mock transport returns mock_test_only. Health never claims realE2EVerified. No proposal is automatically persisted by the adapter.

## Bounds and accounting

Two active requests per process, no waiting queue. At most one retry for 429/5xx with bounded delay; timeout/network/invalid output do not receive a hidden retry with unknown billing. Request and streamed response have deadlines; JSON bytes are capped at 128 KiB and skill payload lengths are independently bounded. Caller cancellation is distinct. Provider error bodies, keys and raw diagnostics are not returned or logged.

MongoDB HrAiUsage stores UTC-day global reservations and hashed-actor request counters. Actor quota and daily budget reservations use atomic conditional updates across processes. Reservation uses a conservative UTF-8-byte input token bound plus schema/envelope allowance, maximum output and all allowed attempts at approved configured prices. Failure or uncertain billing does not release the reservation. This may reject affordable requests conservatively; it does not measure an actual invoice or supersede provider-side budget caps. Usage totals are observed successful token counts, not an inference about failed-attempt charges. Accounting failure fails closed. Server MongoDB queries have maxTimeMS; client/server selection timeouts still follow existing DB configuration. Buffering is disabled for this model.

Collection is additive; no old HR records are changed. _id index is sufficient for budget safety. Declared expiresAt TTL index retains aggregate counters for 90 days and must be included in separately reviewed release DDL; local tests do not assert production DDL has run. No destructive migration or production operation occurs here.

## Evidence and remaining integration

Backend/tests/hrAiProvider.test.cjs uses injected synthetic transport and an owned loopback MongoDB fixture. It tests disabled configuration, validation, protected criteria, protocol/privacy boundaries, strict output, retry/timeout/cancellation, stalled stream cleanup, capacity, conservative budget, cross-instance reservation, actor limits and sanitized failure. These mocks are not a real AI E2E PASS.

## HTTP and Job form review (09B)

POST /api/hr/ai/job-skills requires recruitment.create for an unsaved draft. POST /api/jobs/:id/ai-skills requires recruitment.update and read with independently scoped parent queries. Business IDs are validated with the existing catalog; brand/branch names come from the server's independently scoped lookup. Neither endpoint changes a Job, Candidate or Application. The body accepts only professional title/description/brandId/branchId/workplace/experienceYears/skills. Actor, role, credentials, candidate or raw CV fields are rejected. Legacy/unset brand/workplace stay null; normalization is idempotent.

After provider latency, JWT/account/current role are refreshed, parent read/update and assignment are checked, Job updatedAt identity is compared with millisecond precision and catalog context is checked again. A final authority refresh follows parent awaits. Revoked JWT=401, inactive/removed permission=403, unavailable parent=404 and changed scope/Job/catalog=409, with no proposal. Client disconnect aborts the provider operation. Responses are private/no-store and unknown errors are sanitized. These are request-time checks, not a transaction spanning external AI and all database records.

The Job form retains manual entry when AI is disabled/outage/limited. Only explicit user clicks send POST requests. It previews editable required/preferred names, explanations, provider/model/version, nullable confidence, uncertainty and a visible mock-test label when applicable. Confidence is distinct from the ATS match score. Approval adds selected skills to the unsaved form; normal authorized create/update is still required to persist them. Language changes do not refetch. Professional draft, route or auth changes unmount/cancel the previous assistant, preventing late suggestions from becoming approvable. 401/403/404 mask the form; other failures preserve the primary draft and show localized AZ/EN/RU messages. The AI request suppresses duplicate generic toasts while retaining shared Bearer/401 handling for all services.

Current Job CRUD persists the HR-approved/edited criteria through its existing contract. Proposal explanations/provenance are displayed during review, not stored as an authenticated approval history on Job; durable AI processing/review history is retained for package 10, not claimed implemented here. Human review does not establish provider factual accuracy. 09C must implement the separately minimized CV review contract. Real provider setup and production readiness remain blocked until approved credentials, privacy/model/pricing configuration and real E2E evidence exist.
