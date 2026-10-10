# Versioned HR page API

New authenticated GET routes `/api/hr/v2/jobs`, `/api/hr/v2/candidates`, `/api/hr/v2/applications` preserve the original array routes. The page DTO's first schema version is `hr-page-v1`:

`{ version, items, page, pageSize, total, hasMore, nextCursor }`

Default pageSize 30, max 100; page 1–10000. Newest sort is createdAt DESC, _id DESC; Jobs/Candidates optionally support name ASC, _id ASC. A lookahead record determines hasMore. Scopes apply before count/sort/skip/limit, so counts include only the primary resource's authorized records. Lists support bounded escaped `q`, appropriate canonical status, Job brand/branch and Application jobId/candidateId filters. Invalid/inapplicable filters reject 400; database execution timeout is 503 with a retry/narrow-filter message.

An optional newest-sort cursor uses a creation-date/id tuple, avoiding duplicate records with equal timestamps. The opaque cursor is bound to user, current department/permissions, resource and filters/pageSize; stale or borrowed cursors reject 400. It is a pagination boundary, never an authorization token. Every request independently reloads current server authorization and intersects scope. Cursor mode uses page=1; ordinary page mode remains available, including legacy records without reliable creation dates. Changes to records during traversal can change the cohort; a cursor does not claim a transactional snapshot.

Projection excludes Job description/checklists, CV extraction evidence/history and raw Application events/notes. App parent DTOs contain only independently readable Candidate id/name/role and Job id/title/status/brand/branch, without Candidate contact fields. Foreign parents are null; derived scores remain restricted. Application matching list DTO is a trusted summary (`summary=true`, empty criteria); the original authorized detail endpoint remains the evidence source. Frontend summary/evidence integration is the next 08B increment, not yet switched in 08A. Labels and skill previews are bounded; full HR review fields remain available through authorized detail, preventing an edit based on a truncated list DTO.

Application jobId/candidateId filters require the independently readable parent; unreadable and nonexistent IDs both return 404, so cohort counts cannot reveal a hidden parent. Application search joins independently scoped Candidate/Job names. A hidden name cannot contribute to result counts or be used as a search oracle. Candidate lookup accepts excludeJobId only for an independently readable Job, and anti-joins independently readable Application links, using a bounded lookup instead of an unbounded candidate-ID exclusion array. Hidden links are not disclosed; the existing unique Job/Candidate constraint still rejects a duplicate create. This does not grant application.read to a create-only user.

## Local DDL inventory

Add non-unique `{ createdAt:-1, _id:-1 }` and `{ scopeField:1, createdAt:-1, _id:-1 }` for each scopeField createdBy/departmentId/assignedTo on Jobs, Candidates and Applications. Applications add Job/Candidate-specific newest-page indexes and delivery-state/next-attempt indexes. Jobs add brand/branch/status/newest traversal. Existing indexes, including unique Job/Candidate pairs, are preserved.

Tests create and explain these indexes only in an owned loopback test database. The scoped Candidate index is explicitly hinted to verify that it can satisfy filtering and sorting with two records examined and no collection scan/sort. Actual unhinted plans and 0/5000/50000 data measurements belong to 08D; no large-data/live performance claim is made from this small fixture. Production DDL is not executed. Release preparation must inventory existing indexes, estimate size/build impact and explicitly approve the non-unique additive builds; no collection drop or seed is needed.

## Transition and remaining work

08A exposes/tests the backend page contract and indexes; existing frontend services still use legacy arrays until 08B. Legacy unbounded list routes remain for compatibility and must be tracked until consumers migrate. The frontend will use scoped pages/search/lookups, lazy score evidence, cancellation and bounded rendering. Manual within-column order (AUD-064), parsing worker isolation and all benchmark evidence remain subsequent 08 increments. No item is declared complete solely because this contract exists.
