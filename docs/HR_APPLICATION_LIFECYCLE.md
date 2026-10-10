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
