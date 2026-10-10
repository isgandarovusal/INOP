# Bounded Application board — 08C5B

GET `/api/hr/v2/application-board` is additive; existing lists, ranking, status
and workflow APIs remain available. This increment supplies the server API;
the next increment changes the client and proves manual drag/refresh persistence.

## Filters and response

Allowed filters: q (80 chars), status, brandId, branchId, jobId, pageSize, stage,
after. Search and brand/branch filtering consult only independently readable
Job/Candidate facts, as on `/hr/v2/applications`. A specific hidden/missing Job
filter returns indistinguishable 404. Default 10, maximum 30 rows **per lane**.

`version: hr-board-v1`, `total`, `manualOrder` and `columns` are returned. Initial
response contains Applied, processing, Screening, Shortlisted, Interview, Offered,
Hired, Rejected. Each column carries items, total, page, pageSize, hasMore,
nextCursor, before/after `{id,expectedRevision}` neighbor anchors. Count scope is
Application read; independently hidden profiles are null and scores restricted.
DTOs omit original CV, email/phone, notes, history, large criteria and Job text.
Lane counts include the entire filtered scoped dataset, not the loaded slice.
Processing means Applied + queued/running and is disjoint from the Applied lane.

With a specific Job, binary effective boardOrder is used, including legacy id
fallback. Without a Job, cards are newest first; cross-vacancy manual order is
disabled. `manualOrder` also requires cleared search/status/brand/branch filters
so position anchors refer to the same complete readable Job cohort as writes.
This is a positioning constraint, not a replacement permission policy.

## Cursors and current authority

Subsequent requests specify `stage` and its signed `after` cursor and return only
that column. Cursor binds current actor/role/department/permissions, filters,
page size and lane, expires after ten minutes, and retains boundary id/revision/
key/date. Forged/borrowed/changed-context cursors produce 400. A moved, changed,
hidden or deleted observed boundary produces 409 BOARD_CHANGED; restart the lane.
The actor/JWT/Role and specific Job are rechecked before final DTO construction.
Revoked read produces 401/403; changed grant context returns 409 without data.
Mongo query deadlines produce 503 BOARD_TIMEOUT, never an unbounded result.

Facet counts/page IDs share one aggregate observation, but this is not a
transactional whole-cohort snapshot. Offpage insertions/moves can appear on the
next refresh; already observed boundary changes cause restart. Target CAS and
neighbor checks are still authoritative for drag writes. Legacy computed sorts
and substring parent searches are not asserted to use IXSCAN; 08D measures them.

No new environment variable, backfill, hosted DDL or production action is run.
Evidence: `Backend/tests/hrBoard.test.cjs` owns only synthetic loopback data,
testing eight complete lane counts, bounded traversal/anchors, redaction,
independent scopes/search, signed cursor abuse/conflict, empty states, current
old-JWT changes and role revocation during an aggregate.
