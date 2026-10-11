# Disabled per-record original attachment preparation

This internal service is not an HTTP endpoint, migration command, startup job or environment activation. It is disabled by default. It preserves every old filesystem original, object and manifest. No production migration, deletion, retention policy, provider/scanner activation or secret change is performed.

`createAttachment` requires a trusted server approval callback and explicit storage dependency. The callback must reflect separately approved backup/recovery, scanner/provider and per-record migration gates; client request fields cannot approve these gates. A technical local mock callback does not prove actual backup or durability. Require the migration inventory and immutable archive procedure first, then explicit per-record approval with exact manifest ID, source SHA, revision and context fingerprint.

The service freshly checks independent Candidate read/update scopes, current active User/Role, assignment/department/ownership, exact verified provider-mode manifest and source before and after awaited readback. Readback must have the expected size and SHA. A single Candidate CAS installs a hidden original pointer and hidden archive receipt; it cannot write profile facts, decisions, scores or Applications. No new schema defaults, backfill, automatic indexes or TTL. The deadline is bounded; an ignored cancellation retains its process slot until the underlying task settles. An uncertain database acknowledgement returns a fixed uncertain code; reconcile the exact current receipt rather than blindly repeating the write. Replays retain historical attachment evidence and always report `recoveryVerified:false`.

The original reader checks any new archive receipt against its current owning verified manifest before and after object IO. Quarantined, missing, foreign or changed manifests fail closed with the existing CV_CHANGED contract and cannot fall back to the filesystem. Existing legacy private references without this optional receipt retain the earlier scoped read behavior. Receipt-bearing processing fingerprints include the receipt; absent receipts keep the previous fingerprint byte-for-byte so existing parse jobs remain compatible. Replacement removes only the current private pointer/receipt and retains old objects/originals/manifests for later approved recovery/retention work.

The existing explicit AI review endpoint now refreshes JWT, current role/grants and exact parent/source after its first original read and before provider submission. Existing post-provider checks remain. Local tests use real owned loopback DB/HTTP and synthetic provider transports; they verify zero provider submissions after first-read revocation and do not claim live AI or object-provider durability.

## Release gates still required

- Approved private provider configuration, real conditional writes, scan engine and storage recovery tests.
- Recoverable backup, separately approved DDL and per-record migration activation.
- Approved retention/deletion policy; no original/object cleanup is automatically authorized.
- Native upload durability, source drafts/ingestion and real provider/mailbox/web-source E2E remain separate.
- No push/deploy is authorized by these local preparations.
