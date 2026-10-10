# Application lifecycle and concurrency

An Application retains one independent Job/Candidate pair. Candidate-global status is a legacy profile property, not this recruitment decision. Normal server transitions:

| From | To |
|---|---|
| Applied | Screening, Shortlisted, Interview, Offered, Rejected |
| Screening | Applied, Shortlisted, Interview, Offered, Rejected |
| Shortlisted | Screening, Interview, Offered, Rejected |
| Interview | Screening, Shortlisted, Offered, Rejected |
| Offered | Interview, Hired, Rejected |
| Hired / Rejected | No ordinary transition; explicit reopen with reason and application.update all |

Fast tracking selection/interview/offer is preserved; hiring follows an offer. Identical status/metadata is idempotent. Neither scoring nor processing changes an HR decision. Closed/Draft Jobs refuse new Applications and CV pipeline links (409); existing applications remain reviewable. No existing record is reset.

## API

- Existing PATCH `/applications/:id/status` delegates to the same safe workflow handler.
- PATCH `/applications/:id/workflow` accepts status, compatible substatus, notes, interview, nextAction, reason, expectedRevision and commandId. Processing/provenance/event/actor fields are never trusted from the client.
- PATCH `/applications/:id/assignment` uses the same handler, with assignedTo and reason. Reassignment requires application.update all, an active independently readable target user (or self), and an application.read grant on its server role. Old assigned scope is immediately revoked under the existing JWT middleware.
- GET `/applications/:id/history?limit=50&offset=0` intersects Application read scope, with max limit 100. Raw internal events are excluded from normal Application list/detail DTOs.

Updates compare and atomically increment Application `__v` while appending an event to the **same document**. No cross-document transaction or new infrastructure is required. New clients send expectedRevision; stale commands are 409. Legacy clients omitting it still get an atomic compare against the server-read revision, protecting overlapping writes; they should upgrade for stale-draft protection. Stable commandId replays do not duplicate events; a different payload/actor under the same ID is 409. Status, interview, assignment and next action snapshots carry before/after, server actor/time/revision and bounded reason. Matching recalculation uses the same revision counter and records before/after version/score/fact-hash summaries. Score event contents are independently redacted when Candidate or Job read scope is denied.

Events are not silently truncated. A defensive 1000-event / 8 MiB history-growth limit refuses further changes with explicit HISTORY_LIMIT; archival/retention belongs to package 10. Legacy records begin history at their first new operation, without fabricated historical events or automatic migration. New generic ActivityLog entries gain server-set ownership/department snapshots; legacy missing snapshots remain denied to restricted scopes.

## Interview

Interview accepts localStart + IANA timezone, or startsAt with an explicit offset, duration 5–480 minutes, active interviewer, and result pending/passed/failed/no_show/cancelled. Unknown zones, invalid calendar dates, DST gaps and repeated wall times are rejected; ambiguous times require an explicit offset. Unknown/missing months are not scheduling dates. Self interviewer is allowed through authenticated identity; another user must pass independent user.read scope. Substatus is stage-specific; scheduled requires a saved interview date. Next action has a validated kind, optional explicit-offset dueAt and bounded notes.

Interview/offer events durably record delivery pending without blocking the status transaction. They do not prove an email was sent. The bounded retryable notification worker and UI delivery states are the following implementation increments; no SMTP success is claimed here. External calendar/provider integration is not implied by a saved interview.

## Application UI (06B)

`/app/recruitment/applications?view=board` uses Application IDs, accessible keyboard/mouse drag handles, scoped parent labels and the same trusted per-Job matching badge as the table/profile. Processing is a server-owned, non-droppable lane; it does not become a hire/reject decision. Candidate cards retain read-only legacy profile status and link to the Application board. Normal stage moves send expectedRevision and a commandId; optimistic changes roll back on failure and 401/403/404/409 refetch authoritative data. Late mutation responses cannot refresh or write a different auth context.

`/app/recruitment/applications/:id` provides workflow, scheduling, interview outcome, next action, global assignment/reopen with reason, Candidate quick edit and separately loaded paged history. Primary 401/403/404/500 states differ; roster/history failure leaves the primary record visible. GET `/applications/:id/interviewers` requires scoped Application read and independently scoped user.read (or authenticated self), returning only active id/name pairs, max 50. No server privilege is inferred from a UI selector.

Dates are entered in the selected IANA timezone, converted by the server and persisted in UTC with their timezone. Next action supports localDueAt + timezone as well as the legacy explicit-offset dueAt. Language changes do not refetch data or erase drafts. Permission/id changes cancel reads and clear the prior form immediately. Focus/visibility refreshes the detail from the server, including assignment revocation; unsaved Application workflow drafts are reset on that security refresh. Profile edit forms keep their existing draft policy.

Column membership is persisted; manual within-column ordering is not yet supported (AUD-064 remains OPEN for package 08). Sorting is explicit score/newest/name on the currently scoped dataset. Large-list paging/virtualization and notification delivery worker remain the subsequent increments. A pending delivery label does not imply SMTP success.

## Durable notification delivery (06C)

The existing Native Node backend starts a bounded in-process worker after Mongo connects. `HR_NOTIFICATION_WORKER_ENABLED=false` disables only the worker; status/history persistence continues. No external queue or hosting resource is created. Existing SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM/SMTP_SECURE configure SMTP at runtime; no secret value is stored or reported. Missing configuration changes an eligible event to blocked without falsely reporting sent, and configured restarts can resume it.

One worker handles at most 5 events per tick (5 seconds), with no overlapping ticks. Atomic per-event token/90-second lease prevents two workers from claiming one delivery; expired leases recover after restart. Each SMTP call has cancellation and a 30-second deadline, with transport connection/greeting/socket timeouts. A failed event retries after 1 minute then 5 minutes, max 3 send attempts; terminal failed requires a later explicit retry workflow (package 10). Stale decisions/reschedules, revoked/deactivated actors, inaccessible Candidate/Job parents and missing recipients are skipped with bounded diagnostic codes. Current actor server Role and independent scopes are used; the worker has no admin identity.

Delivery metadata never increments Application __v or changes workflow timestamps/status. History includes only state/attempts/code/times, excluding internal lock tokens and provider messages. Candidate email and original CV data are not logged. UI shows blocked/failed separately from a successful interview. Scheduled messages use the actual saved timezone/date; a missing date is not fabricated.

A stable per-event Message-ID and command replay guards reduce duplicates. SMTP remains **at-least-once**: a process crash after the provider accepts a message but before Mongo acknowledges it can resend. No distributed SMTP/Mongo exactly-once claim is made. SMTP credentials/reputation, actual receipt, bounce/webhook handling and company consent remain external/release setup; all delivery tests here use explicit mocks or missing configuration, not real email E2E. Event indexes/large-data processing and a broader retry/monitoring UI belong to packages 08/10.
