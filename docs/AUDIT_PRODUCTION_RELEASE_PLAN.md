# Audit production readiness: packages 6–8

**Production release is not approved or claimed ready.** No production DB/index/backfill, push, merge, deployment or Render setting was changed.

## Private evidence storage

`auditEvidenceStorage.service` defines a server-only provider factory seam. No durable provider is registered by this release. `RENDER=true` or `NODE_ENV=production` without an explicitly approved registered factory returns 503 before multipart parsing; credentials alone cannot enable a provider. The concrete server factory must explicitly attest `credentialsReady:true` after validating its supported credential/identity binding; capability flags alone cannot enable uploads. Source uploads are likewise disabled in production until durable source storage is implemented.

A future provider must prove private/versioned/conditional-write capabilities, bucket Public Access Block/no public ACLs, server-side encryption, least-privilege prefix IAM, region/data residency, retention and backup. Use the isolated prefix `audit/evidence/<audit Mongo ID>/<UUID>`; no CV namespace, filename-derived key or user-supplied URL. The adapter must use the official provider SDK/configured identity, encode keys/versions, honor AbortSignal, reject redirects/SSRF/private endpoints, bound streams and avoid logging credentials, presigned URLs or document bytes. Provider credentials are not present in this task and have not been inspected.

The service snapshots bytes before asynchronous writes, validates size/MIME/reference, requires a private receipt, reads back and checks SHA-256/length before metadata is committed. Public APIs return only safe metadata and authenticated server download paths. Download authorization/direction is refreshed after I/O. Existing legacy filesystem references remain readable where the original exists; no silent checksum or storage backfill.

Local filesystem is development-only, UUID names, 0600, bounded O_NOFOLLOW reads. Type/magic/size checks remain in the existing upload parser. New metadata is immutable and server-owned. No public evidence-delete route is introduced.

Cleanup is custody-sensitive: a definitely uncommitted new original may be compensated by its exact minted key/version. Once a DB transaction is attempted, a failure may be an uncertain commit, so bytes are retained. Never automatically delete bucket objects by age or filename. Reconciliation must first enumerate the owned prefix, snapshot all live/archived evidence and audit attachments, detect uncertain transactions/duplicate references, and produce a read-only candidate list; actual cleanup requires separate approval. Provider timeouts and read-back failures can leave retained objects needing reconciliation.

## Offline migration preparation

`node Backend/scripts/auditReleaseDryRun.cjs --snapshot LOCAL_JSON` reads only a supplied local metadata snapshot. It has no Mongo connection/URI argument, no write/index command, no automatic name matching or alias backfill. Missing collections and unknown topology are blocked. The output includes proposed validators/index definitions, duplicate candidates and mapping/provenance issues. `productionVerified:false` remains explicit even for a complete synthetic snapshot.

Review canonical Restaurant organization/brand mapping, AuditorProfile identity/direction, template revision duplicates, versioned execution duplicates, active assignment duplicates and evidence custody. Preserve IDs and all history. GFC is the parent, not a brand; only KFC/Pizza Hut/Simit Sarayı are valid. Unknown legacy directions cannot be guessed and legacy scores cannot be silently recomputed.

AuditorProfile uniqueness uses the built-in User `_id`. Other proposed unique/partial indexes and Mongo validators require a separately approved migration after conflict review, replica-set/mongos transaction readiness and backup/restore rehearsal. Application immutable-revision protection is not a claim that a JSON-schema validator can prevent every administrative raw DB rewrite; DB privileges and audited operational controls remain necessary.

## Required release decisions and order

1. Confirm actual production build/start/runtime and transaction topology using authorized read-only evidence. Prior confirmed native Render: Backend root, `node server.js`; build should be reviewed for clean lockfile `npm ci --omit=dev`. Do not assume Docker build settings apply to native deployment.
2. Decide management promotion/deactivation policy. There is **no role-string bypass**: an active profile still constrains the account. Decide how to finish/revoke assignments, retain provenance and atomically deactivate a profile before changing grants; implementation needs separate approval.
3. Review offline mapping/conflict report and restore strategy; approve validators/indexes independently. Start moderate validation only if approved and legacy deviations are explicitly handled; no historical delete or forced backfill.
4. Choose and approve a private durable provider and credential binding. Implement/test a concrete adapter in staging, including aborts, immutable versions, read-back, isolation, cleanup uncertainty and retention. This seam alone does not make storage production-ready.
5. Check external analytics consumers accept nullable unknown averages and additive scoped pagination; bundled first-party adapters are updated. Deploy frontend/backend coherently only after separate release authorization.
6. Preserve Render ingress and dependency risks below; then use staged smoke tests for unauthorized/cross-direction/brand reads, actual uploads/downloads and reviewer workflows before production approval.

Legacy execution dashboard also intersects canonical parent filters with child scope and explicitly labels its unchanged score statistic `raw-points`. It is not a percentage; raw totals from different template maxima cannot be interpreted as normalized compliance.

## Existing backend security gates

- `trust proxy = 1` is safe only if every request reaches Node through exactly one trusted last hop and direct ingress is impossible. Additional proxies, spoofed forwarded chains or direct Node access require review; live Render topology is not verified here. Keep spoofed X-Forwarded-For/rate-limit regressions and do not use blanket trust proxy=true.
- Prior production audit had four affected package entries: `xlsx` high; `mammoth`, `argparse`, `sprintf-js` moderate inherited chain. XLSX is used for fixed exports; untrusted XLSX parsing remains prohibited. Source extraction uses bounded PDF/DOCX workers and does not invoke Mammoth CLI. These mitigations are not dependency patches. Use docs/BACKEND_DEPENDENCY_AUDIT.md for the exact paths/advisories and perform a fresh production-only audit before release.
- Raw production filesystem evidence is not durable on Render Free. Existing blob URLs cannot be reconstructed. No keepalive traffic, proxy bypass, false auth, fake template/question/KPI or automatic rollback is introduced.
