# Application board ordering — 08C5A

This is an additive **server** contract. Board pagination and drag-and-drop clients
are subsequent increments; AUD-064 remains OPEN until browser persistence tests pass.

## Request and authority

Existing PATCH `/api/applications/:id/workflow` and `/:id/status` accept optional
`placement: { before: { id, expectedRevision } | null, after: ... | null }`.
`expectedRevision` of the moved Application is mandatory for placement. Optional
`status` uses the existing transition/reopening rules. The server generates
`boardOrder`; clients cannot set it directly. Old calls without placement retain
their contract and permission behavior.

Placement requires independent Application **update and read**, plus readable
parent recruitment Job. Candidate read is not required for moving an already
readable Application; parent profile/score data retain their independent redaction.
Actor, active role and department are loaded from the server, including on command
replay. Hidden/missing target, Job or anchors produce indistinguishable 404.
Anonymous/missing update permission remain 401/403. Neighbors must belong to the
same Job and destination lane and be adjacent in the caller's readable cohort.
Foreign invisible records are neither disclosed nor counted as neighbors.

## Persistence and concurrency

One target revision CAS atomically stores status/order and its before/after event.
Same-stage reorder does not change stageEnteredAt, score, AI processing or send mail.
Command replay is actor/payload-bound and does not duplicate an event. Neighbor
revision/adjacency changes return 409 ORDER_CONFLICT; target changes return
REVISION_CONFLICT. Query deadlines return 503 ORDER_TIMEOUT. Processing lane is
server-managed. Terminal records may be reordered without reopening a decision.

Fractional keys use pinned `fractional-indexing` 4.0.0 (CC0-1.0, no production
dependencies) with an Application ObjectId suffix and strict bound verification.
Binary/simple collation is required, rather than localeCompare. Key length is
limited to 512; an exhausted narrow gap returns 409 ORDER_LIMIT without automatic
compaction or rewriting foreign records. New documents get a stable id-derived
default; missing legacy keys use the identical fallback. No legacy backfill,
production migration or new environment variable is executed/required here.

A non-unique `{ jobId: 1, status: 1, boardOrder: 1, _id: 1 }` simple-collation index
is declared. Release preparation must inventory/apply it under the existing DDL
approval process. Computed legacy fallback sorts are not claimed to use that index.

Neighbor checks are not a multi-document serializable transaction. Independent
cards inserted concurrently into one gap may both succeed with distinct keys and
a deterministic resulting order. Target CAS prevents lost updates to the same
Application. Later board cursors must detect observed cohort changes. No MongoDB
transaction support, new cluster or strict cross-record lock is assumed.

## Evidence

`Backend/tests/applicationOrdering.test.cjs` reproduces missing support on 08C4,
then covers persistent state/events, compound transition, replay/revocation,
independent mixed grants, own/department/assigned/all, foreign/other-Job/wrong-stage
anchors, neighbor/target conflicts, current old-JWT assignment checks, concurrent
target writes, processing/terminal behavior, legacy fallback and malformed input.
Pure key tests exercise 50,000 appends, prepends, simultaneous-gap uniqueness and
bounded exhaustion. All records are synthetic in uniquely owned loopback DBs.
