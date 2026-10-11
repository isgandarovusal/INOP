# HR DB release preparation — local evidence, no production execution

## Inventory and rehearsal

`node Backend/scripts/hrReleaseIndexInventory.cjs` prints schema-defined collection,
index name/key/uniqueness/partial filter/collation/TTL metadata only. It reads no
URI, environment secret or documents, opens no database connection, creates no
index and accepts no apply command. `hrReleaseIndexes.service` is not loaded at
server boot. Its dry run/apply functions refuse remote/unowned databases and
require the exact owned loopback fixture name. Tests rehearse additive preparation
twice: only missing indexes are created; conflicts fail before preparation and
no index replacement, syncIndexes, seed, role repair, document reset, collection
drop, CV deletion or department backfill exists in the helper.

The inventory covers AuditDepartmentSnapshot, Application, HR Brand/Branch,
AI usage budget, original manifest, CV processing tasks, private Sources, Graph
checkpoint/receipts and signed external command/rate metadata. Worker/receipt
unique and partial quota indexes are required before gated activation; absence
fails closed. Metadata rate/AI usage TTLs are the only TTL indexes. Originals,
Source results, approval receipts, applications/history and Graph checkpoints
are retained; no TTL implements a legal CV-retention policy.

`hrReleaseIndexes.test.cjs` uses fresh loopback Mongo: no-write dry run, deliberate
owned-fixture wrong unique index refusal, idempotent apply and legacy Audit
department fail-closed. Mongo omits default simple collation in returned metadata;
the comparison treats it as equivalent, without weakening unique/partial/TTL
checks. Production index compatibility/persistence is not asserted by these tests.

## Separately approved production procedure

1. Disable real Source/relay/Graph/AI/OCR ingestion until approved providers,
   privacy policy, private original recovery and runtime checks are complete.
2. Obtain a recoverable encrypted DB and original-file/object backup. Record
   metadata, restore drill and hashes into an approved isolated target; do not
   share URI/credentials/CV data in chat/logs. A local test is not Atlas backup.
3. Compare hosted indexes to source inventory using an approved read-only operator.
   Check duplicate/missing canonical identities before building unique indexes;
   do not automatically delete/merge records to make index creation succeed.
   Estimate index-build resources/window and preserve current index metadata.
4. After explicit production DDL approval, create only missing compatible
   collection/index definitions. Never drop/change a conflicting live index
   blindly. DDL is not transactional; record successfully created names if a
   later build fails, preserve documents, investigate and resume idempotently.
5. Verify unique/partial quota constraints, Source/Graph/signed-receipt replay,
   bounded page indexes and metadata-only TTLs. Audit snapshot needs unique
   auditId and departmentId index. A legacy client department field is not proof:
   no trusted snapshot means no automatic department-scope access.
6. Enable only verified runtime profiles with approved fixed actors/least privilege,
   exact frontend/backend URL and storage/scanner/OCR/AI/outbox health checks.
   Public relay/Graph/manual Source flags are independent and default disabled.

Existing legacy schemas, including Application, retain their previous Mongoose
auto-index defaults; new Source/task/manifest/Graph/external schemas explicitly
disable autoCreate/autoIndex. Thus this helper does not mean **all** application
startup DDL is disabled. Verify hosting index privileges/startup logs and schedule
legacy unique Application constraints; no new automatic startup migration is added.

## Legacy HR account repair is separate

Canonical new seed role is `hr_manager`; seed is idempotent and never rewrites an
existing account. Inventory only actual role keys and current grants in an approved
operator view. Any existing `hr` account must be reviewed individually for correct
identity/role/least privilege and backup before an explicit approved conditional
repair. Never mass rewrite every matching user, trust JWT role claims, assign admin
or weaken role.update/all checks. Verify login/current DB role and the old JWT
after a approved per-account change. Hosted account state remains unknown.

## Rollback

Prefer roll-forward or disable the new gated Source/provider functions while
keeping authorized private downloads and current JWT/resource scope guards.
Keep manifests/originals/approval identities/history/index metadata; no restore of
public uploads/foreign parent access/old privileged role-write holes. Restore a
backup only with explicit approval into an isolated target first and reconciled
new writes. No automated DB rollback/deletion or old insecure code deployment.

Candidate deletion/retention policy still awaits a genuine user decision
(dependency409 versus archive/restore). Existing linked deletion behavior is not
silently changed. Actual Atlas DDL/backup/HR repair/provider activation/storage
recovery require separate approval/access; none was performed by this program.
