# Stored Candidate processing antivirus boundary

The existing Candidate parse/OCR/AI-review queue now requires a new antivirus
scan for every processing attempt. It reuses `hrCvIntakeProfiles.scanner()`;
there is no new scanner, intake path, endpoint, permission, schema or index.

## Confirmed old gap

`hrCvProcessing.service` previously read a private original, compared its SHA-256
and refreshed role/source authority before the task, but never invoked the native
scanner. A stored hash, archive manifest or earlier intake scan is not a fresh
antivirus verdict for a new processing attempt. Focused failing tests reproduced
parse/OCR/AI task admission with no scanner or an unusable verdict. This was an
isolated synthetic reproduction, not a production penetration test.

## Current execution contract

1. Existing owner/retry-actor authorization and source fingerprint are checked.
2. The bounded original is copied; changed bytes fail before scanner admission.
3. The existing shared native scanner scans its own private copy against the
   job's exact SHA-256. Legacy MIME is inferred from the existing supported file
   extension only when original MIME metadata is absent.
4. Only a clean hash-bound verdict with bounded engine/version identifiers can
   proceed. The production native adapter enforces fresh definitions (24h), its
   existing 10s deadline and two-scan concurrency; a new call is made on each
   automatic/manual attempt. Earlier clean results are never reused as authority.
5. Existing primary and retry actor/source checks run again after scanner IO,
   before parsing/OCR or any AI-provider task. Late/cancelled work cannot proceed.
6. Existing post-task guards, HR-only result approval, attempt limits, leases,
   source fingerprints, command deduplication and Candidate status are unchanged.

The scanner factory remains server-internal. A trusted constructor collaborator
supports isolated tests just like existing `read`, `parse` and `task` options;
no HTTP input or environment bypass can supply a clean verdict. Positive tests
explicitly use the existing loopback-only synthetic scanner fixture. Those
fixtures do not establish real malware detection or fresh official signatures.

## Failure and retry behavior

- Disabled, missing, unavailable, timed-out, stale-definition, inconclusive,
  malformed or wrong-hash scan: existing `blocked` state, `SCAN_REQUIRED`, no
  extraction/provider task/result. After scanner repair, an authorized explicit
  retry uses existing CAS/command replay and remaining attempt budgets.
- Infected: existing `blocked` state, `SOURCE_QUARANTINED`, no extraction/result;
  manual retry is refused. Re-enqueue of the same immutable context only returns
  the same blocked job. No Candidate status, original or storage object is deleted
  or rewritten; this is a processing-job block, not a new storage-quarantine model.
- Changed source/authority: existing cancelled codes remain authoritative.
- Overall processing deadline: existing timeout/retry semantics remain; no late
  scan completion can start a task.

Metadata GET/list do not invoke scanning, so authorized read-only inspection
remains available under the existing processing-profile contract during an AV
outage. The durable intake metadata-off contract is unchanged. Reading an already
completed result is not a new processing attempt; no automatic reprocessing or
retroactive production data migration is introduced.

The UI explains both codes in AZ/EN/RU and offers scanner-repair retry only where
already-authorized, current-source and budget constraints permit it. It introduces
no polling, automatic retries or extra initial HTTP requests. Server authorization
remains the final enforcement layer.

## Compatibility and operations

An enabled Candidate processing/OCR/AI profile without a configured scanner now
blocks deliberately. Keep production gates unchanged until operators separately
verify scanner/storage/worker readiness. An older frontend safely shows its
unknown-code fallback and no scanner-specific retry; a new frontend with an older
backend remains compatible. No rollout/deployment is performed by this patch.

Measured local synthetic worker comparison retained identical Mongo operations;
one native scan per attempt is the required additional operation. Mock timings
are not real AV performance, full-system memory or production capacity evidence.
No new database index/query or initial HTTP request was introduced.

Tests: `hrCvProcessingScan.test.cjs` exercises all task kinds, unavailable/invalid/
infected scans, native stale-definition checks, changed bytes/revision/roles,
retry-actor revocation, immutable-buffer separation, delayed scanner, idempotent
manual repair and a fresh scan on automatic retry. Existing processing, HTTP,
OCR, AI-mock, approval, history and authorization tests retain their assertions
with an explicit test scanner. Browser tests cover messages, retry/no-retry,
source/privacy preservation, permissions and responsive AZ/EN/RU rendering.

Real ClamAV, production services, external AI and real candidate data are not
used by these synthetic security tests. Existing real local Tesseract evidence is
separate from the scanner collaborator and from mocked generative AI results.
