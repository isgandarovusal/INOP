# Bounded local document processing

The existing PDF/DOCX upload and review APIs retain their permission checks and original-file downloads. Multipart content validation, PDF/DOCX extraction and structured CV parsing now run in request-scoped Node worker threads. This is not the durable background-job/storage implementation planned for package 10.

## Limits and failure contract

- Existing multipart input limit: 5 MiB; Office ZIP validation still bounds entries to 512 and actual decompressed content to 20 MiB.
- Default pool: one active worker, at most eight waiting tasks, 15-second deadline including queue time. A terminated worker releases its slot only after exit.
- PDF: extract at most 50 pages, one page at a time. Extracted PDF/DOCX text is limited to 100,000 characters. `page_limit` and `text_limit` warnings appear in the parse response, persisted review and translated HR UI. HR must inspect the complete retained original before confirming a partial result.
- DOCX parsing still materializes the bounded document inside the worker. It is not streaming extraction.
- Worker V8 limits: 192 MiB old generation, 32 MiB young generation and 8 MiB stack. Native/external allocations and total process RSS are **not** a hard memory limit. Worker threads are not an OS security sandbox.
- Worker environment includes only `NODE_ENV`; DB, JWT, SMTP and provider credentials are not inherited as environment variables. Third-party stdout/stderr is discarded; errors use generic allowlisted codes. This does not make library vulnerabilities harmless.
- Overload/deadline: `DOCUMENT_BUSY` / `DOCUMENT_TIMEOUT`, HTTP 503, retryable without automatic retry storms. Invalid extraction returns the existing HTTP 422 failure; an image-only PDF remains `unsupported_ocr`, never fabricated text.
- Candidate create/update can retain the original and a failed/manual-review state when extraction fails; no automatic hiring decision or fake AI/OCR success is introduced.
- Internal callers can cancel active/queued work with AbortSignal. Network disconnection does not undo an accepted Candidate mutation; request-disconnect propagation, durable retry, orphan recovery and malware quarantine remain package 10.

## Evidence

`documentProcessing.test.cjs` checks CPU responsiveness, queue rejection, termination, cancellation, shutdown, sanitized failures, environment exclusion, real AZ/EN/RU DOCX, synthetic PDF, explicit text/page limits and malformed/scanned inputs. It also runs the structured parser in a child process with a two-second hard deadline against an unbroken 100k token and verifies it does not manufacture a suffix email. `cvReview.test.cjs` checks actual HTTP 503 overload and parse → persisted review → original download. `cvReviewUI.test.cjs` checks visible limit warnings in all three languages without language-change refetch.

One local warmed 40-page synthetic PDF run (29,106 input bytes, 94,438 text characters):

| Metric | Before | Worker |
|---|---:|---:|
| Extraction elapsed | 128 ms | 320 ms |
| Parent heartbeat ticks during extraction | 0 | 30 |
| Maximum event-loop delay | 139 ms | 28 ms |
| Maximum sampled HTTP health latency | no completed sample | 27 ms |
| Process RSS sample | 127,369,216 bytes | 170,561,536 bytes |

These are single local observations, not production benchmarks or isolated-worker memory measurements. Fresh-worker startup increases extraction latency and process memory; it keeps untrusted CPU work off the HTTP event loop. Package 08D carries the larger-data benchmark requirements. The old unbroken-token contact parser separately exceeded a two-second child-process deadline; the bounded-token regression passes. Durable storage, anti-malware and real OCR/provider readiness remain open in the tracker.
