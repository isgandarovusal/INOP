# Authoritative Source OCR evidence for existing AI review

No new endpoint, permission, schema, provider, intake pipeline or activation flag.
The existing AI review remains opt-in/default-off and requires explicit HR approval
of every proposed fact. This work verifies input provenance; it does not prove
semantic truth, certificate validity or model quality.

## Separate approval paths

`hrAiCvReview.buildContext` retains its synchronous, conservative contract: OCR
without a source-bound processing-job receipt is rejected. The async server-only
`currentContext` additionally recognizes a distinct completed Source approval:

- Current Source is ready, supported intake version and explicitly approved for
  this exact Candidate; the receipt is completed and has a recorded actor.
- Source original metadata/SHA, private blob and Candidate's Source URL agree.
- Existing approval context hash still matches the canonical original/blob/scan/
  parser result/origin/intake context. The same hash recipe is reused from the
  approval service, not reimplemented or supplied by a client.
- Candidate review is confirmed/corrected; parser/provider and exact extracted
  field evidence agree with the Source's recorded result. Only supported rule
  extraction or Tesseract OCR can pass; unknown/recursive AI extraction cannot.

No processing-job receipt is fabricated for a Source approval. Existing later
processing-job approvals retain their existing path. Neither a client flag nor
plain source reference grants evidence trust or Candidate/Job/Source access.
The verifier produces the existing bounded professional evidence envelope only;
private paths, source IDs, hashes, name and contact data are not sent as facts.
This is conservative minimization, not a universal PII detector.

## Async boundaries and stale results

Existing Candidate read/update scope remains authoritative. Worker Source lookup
is followed by a current actor/role/Candidate/retry-actor check before provider
invocation. Source evidence is checked again after provider work. Completed
Source-derived job results are revalidated before returning/approving them; revoked
proof hides the result while authorized metadata stays readable. The read also
refreshes actor and Candidate scope after that asynchronous proof check.
The HTTP path checks before original IO, before provider invocation and before
returning results, with current token/role refresh after async verification.

Missing, substituted, incomplete or quarantined proof is fail-closed. Temporary
proof IO failure is unavailable/retry, not falsely classified as changed source
or permanently invalid model output. The same durable job recovers without a
second Candidate. No unfiltered exception is returned/persisted.

These checks are not a transaction spanning MongoDB and external inference.
There remains a final check-to-call/return race. No atomic revocation guarantee
is asserted. No proof cache is used across requests/attempts.

## Bounded cost and scanner compatibility

One `currentContext` Source proof uses one indexed `_id` read, maxTimeMS1000.
Source worker processing checks proof twice and adds current authority refresh;
reading its completed result adds one proof read and one authority refresh.
Legacy non-Source contexts add no DB reads. No additional HTTP call or polling.
An actual owned-local-Mongo HTTP measurement counted7Source reads:4existing
original-before/after checks plus3new provenance checks. This was about108ms for
one synthetic request, not production performance. Current authentication checks
remain intentionally uncached. No index/DDL/migration was added.

A Source scan receipt is provenance, not a new fresh-clean verdict. The existing
stored-Candidate worker still re-reads/hash-checks/re-scans every processing attempt
through the shared adapter (24h signatures,10sdeadline,twoactive scans). These
controls and intake/storage/worker/AI production gates remain unchanged.

## Validation and limits

`hrSourceAiProvenance.test.cjs` covers actual local Mongo Source approval,
queue+HTTP, substituted metadata/fields, missing/quarantined/incomplete receipt,
role revocation during proof lookup, stale cached results and outage recovery.
Its scanner/OCR/provider collaborators are synthetic, not inference evidence.
`hrCvSourceOcr.test.cjs` also executes real local Tesseract and verifies the new
Source-to-professional-evidence boundary before existing HR/ATS/search/Analytics.
No production CV, storage, DB or external inference service was accessed.

The existing durable AI profile can consume this verified Source context after
explicit configuration/approval; none was enabled. The legacy inline editor's
separate eligibility UX was not broadened by guessing a processing-job receipt.
For semantic quality, use `evaluateEvidenceQuality.cjs`:42syntheticAZ/EN/RUcases
bind source/context/parser and citations, distinguish missing/negative/conflicting
facts and certificate-name presence from current validity. Actual English static
vector baseline still has40–80%false-positive rate on10negativecases depending
on threshold; AZ/RU contextual inference is NOT RUN. Qualification/hiring use
remains NO-GO; deterministic ATS and human decisions remain unchanged.
