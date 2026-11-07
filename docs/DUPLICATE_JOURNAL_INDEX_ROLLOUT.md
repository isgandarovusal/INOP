# Duplicate review journal: reviewed index rollout

This procedure changes index metadata only. It never merges candidates, rewrites decisions, reassigns applications or deletes journal entries. No production database operation was performed for this implementation.

## Preconditions

Use an explicitly owner-approved environment/connection. The CLI reads `MONGO_URI` from the operator environment, never prints it, and does not load credentials itself. Obtain a verified backup/export and maintenance approval before any production DDL. Pause all duplicate-review writers and confirm the pause; `--writers-paused` is an operator attestation, not an automatic maintenance switch. Do not pause unrelated services through this script.

## Inspect first (default is read-only)

From the repository root:

```
node Backend/scripts/duplicateJournalIndex.cjs
```

Inspect requires no write flag. The exact target is the existing CandidateDuplicateReview collection in the explicitly selected database. It reports unique-index readiness, incompatible index definitions, malformed identity fields and at most 100 conflict groups (hashed group identifiers and counts, never notes/candidate data). Truncation blocks apply. Inspection does not create a missing collection or index.

Required contract: `actor_1_commandId_1`, ordered keys `{actor:1, commandId:1}`, unique, nonsparse, no partial predicate, TTL or nonbinary collation. A matching name alone is insufficient. The endpoint fails closed with 503 when this contract is absent. Existing valid journals and frontend consumers remain compatible; evidence references are additive and historical rows are not backfilled with invented evidence.

## Apply and verify

Only after clean inspection, reviewed backup and confirmed paused writers:

```
node Backend/scripts/duplicateJournalIndex.cjs apply --writers-paused /approved/operator/path/new-index-receipt.json
```

The receipt path must not already exist; it is opened with mode 0600. Apply refuses malformed data, duplicate `(actor,commandId)` groups, incompatible indexes and ambiguous alternative definitions. MongoDB also enforces uniqueness during index construction. No conflict is resolved automatically. Review/export conflicts separately; do not delete, coalesce or relabel historical commands merely to pass migration.

Apply returns a receipt identifying the database/collection, exact index definition and whether this procedure created it; verify a subsequent inspect reports ready before resuming writers. If an interruption occurs before a verified receipt is saved, inspect the actual index and obtain operator review; do not fabricate a rollback receipt.

## Reversible metadata rollback

With writers paused again, only the original created-index receipt can authorize rollback:

```
node Backend/scripts/duplicateJournalIndex.cjs rollback --writers-paused /approved/operator/path/new-index-receipt.json
```

Rollback refuses a pre-existing-index receipt, wrong namespace, changed key definition or different index properties. It drops only the exact index created by this procedure, never records. Duplicate-review writes remain safely unavailable (503) until the valid index is restored. Preserve the backup and receipt. Normal reads and existing History are not deleted.

## Executed acceptance

`INOP_AUDIT_TEST_PORT=27018 node --test Backend/tests/duplicateJournalIndex.test.cjs`

Real isolated MongoDB: conflict refusal preserves both entries; clean rollout enforces concurrent uniqueness; wrong-namespace rollback is denied; valid rollback preserves every document; a same-named nonunique index blocks rollout. Application regression additionally proves that such an index cannot authorize review writes. These are local acceptance results, not production migration evidence.

## Recovery regression — 7 November 2026

The CLI now validates connection/data/index prerequisites before reserving a receipt.
If a later failure leaves its own receipt empty, it removes only that exact file
(device/inode checked); partial or replaced artifacts remain for operator review.
A failed run is never a rollback authorization: inspect the actual index after any
interruption. Existing receipts are never overwritten. The scalar BSON type check
uses aggregation `$type`; array elements cannot masquerade as scalar actor/command
identities. Arrays block rollout rather than being rewritten or deleted.

Fresh real-Mongo CLI acceptance:
`INOP_AUDIT_TEST_PORT=27018 node --test Backend/tests/journalRolloutRecovery.test.cjs`.
See [recovery evidence](qa/recovery-staging-2026-11-07/journal-after.txt).
