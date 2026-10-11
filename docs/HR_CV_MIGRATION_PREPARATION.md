# P10C6 — bounded metadata inventory and migration gate

This is local preparation, **not an executed migration or real backup/storage verification**. The internal `hrCvMigrationInventory.service.inventory(req,{limit,after})` has no HTTP/CLI/worker activation. An eventual server caller must authenticate with existing JWT middleware before supplying the actor ID. The service independently loads current active User/Role and intersects Candidate read/update. An inventory is not permission to apply a migration; production/bulk apply needs separate explicit authorization.

## Read-only contract

- Default 50, maximum 200 metadata rows plus one for keyset pagination. Mongo queries have a 1s execution bound. Two bounded Candidate queries per page, no per-row lookup/provider/file read. ObjectId cursor, exact known input keys; no `apply`, actor override or automatic startup execution.
- Current actor/permissions/department and source identity are rechecked after reads. Assignment/ownership/source change rejects the entire stale page (409); role/grant loss is 403. No old counts/cursor/private data are returned. Retry from the caller's original cursor.
- Response identifies only candidate ID, server revision, source hash/context when metadata supports it, locator kind and fixed reason codes. Page-scoped counts are not global totals. No name/contact/raw CV/extraction/file display name/URL/blob key/credential/actor ID.
- `metadataOnly:true`, `bytesVerified:false` **always**. A valid-looking hash does not prove the file exists, a native upload survives redeploy or an object is private/durable/recoverable. Unknown metadata, unsupported locator and conflicting/invalid object references stay review-only. Presence of an object reference never implies native fallback.
- There are no DB writes, new collection/index/DDL/seed/secret changes, filesystem reads/deletes or provider calls. Stable unchanged data yields repeatable pages; a cross-page global point-in-time inventory is not claimed. Obtain an approved backup/snapshot before any actual migration.

## Required apply sequence (future, disabled)

1. Approve storage provider/container, residency/processing terms, private bucket policy/encryption/versioning/recovery, least-privilege credentials, malware scanning and retention/deletion policy. No default legal retention duration or new paid resource is assumed.
2. Obtain and verify an encrypted backup of existing DB, metadata and known originals; restore to an authorized isolated recovery target and check hashes/access. Do not treat this inventory as a backup.
3. Generate a fresh scoped dry-run page and resolve missing/ambiguous identities manually. Do not infer file ownership from a filename, autoassign a hash/brand/role, repair unknown sources or migrate orphan files automatically.
4. Reserve one durable server-owned original manifest/key for parent + complete source context before a write. Proposed lifecycle: reserved → quarantined → scanned → stored → verified → explicitly attached; blocked/failure/cancel states remain visible. No real intake until that implementation and its access/recovery tests pass.
5. Read only the exact authorized private original, enforce size/type/structure bounds and approved malware scan. Recheck current scope/source. Scanner/provider unavailability is blocked, not clean/ready. Original content is not logged or sent to AI implicitly.
6. Conditional immutable private write to the reserved key; exact SHA/size readback and provider private access/encryption check. Reconcile uncertain acknowledgements only via the same manifest/key, not an unconditional duplicate upload or delete.
7. After separate migration approval, recheck actor/current source and atomically attach `privateCvBlob` with full-source/revision CAS. A same-revision timestamp change or assignment loss refuses attachment. Never accept the object pointer from a client request body.
8. Preserve known old original bytes and the manifest. Validate authorized preview/download and restore again before any separately approved retention cleanup. No automatic native/object deletion, TTL, seed or role migration.
9. Rollback disables new intake/attachment/worker activation and keeps authorized private reads for verified references. It must not restore public uploads, old permissions, force history or overwrite current source metadata. Preserve both copies and recorded context for reconciliation.

Legacy HR role migration remains a separate existing dry-run/approval plan. No role is modified by CV inventory/migration preparation.

## Outstanding evidence

Real storage durability/recovery, backup status, scanner integration, source-manifest/writer/draft implementation, retention/deletion policy and hosted runtime/private storage are **not verified**. P10-003/006/018/019/020 and AUD-030/048/050/051/067/073 keep their remaining work. OCR/AI/ingestion jobs and Graph/external adapter access are not closed by this inventory.

Tests use owned loopback Mongo with synthetic source metadata only; not actual files/provider recovery. Five authorized scopes, independent mixed grants, no/department-missing actor, bounded pagination, input rejection, unknown/conflicting legacy metadata, no writes/provider access, current actor/source/ownership race rejection are covered by `Backend/tests/hrCvMigrationInventory.test.cjs`.
