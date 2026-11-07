# Owned real-provider acceptance

This QA runner is not an application deployment or a production provider binding.
It never enables processing gates. It refuses NODE_ENV=production, Render,
inherited MONGO_URI/storage endpoints and an unapproved Mongo test port.

## Resources and trusted artifacts

Use Node24, existing Backend dependencies, OpenSSL, at least 256MiB free `/tmp`,
and a transaction-capable owned local MongoDB on 127.0.0.1:27018. Start no
persistent Docker volumes. The standard fixture refuses existing databases and
cleans only its uniquely named owned database.

Obtain SeaweedFS4.52 from the [official release](https://github.com/seaweedfs/seaweedfs/releases/tag/4.52).
Apache-2.0 license; exact hashes are in the [fresh artifact receipt](qa/recovery-staging-2026-11-07/provider-artifact.json).
Verify archive SHA256 before extracting just the regular `weed` executable;
the runner independently verifies the executable SHA256. Do not run install scripts.

```
INOP_AUDIT_TEST_PORT=27018 INOP_QA_S3_BINARY=/absolute/verified/weed \
  node Backend/scripts/verifyRecruitmentStaging.cjs --preflight
INOP_AUDIT_TEST_PORT=27018 INOP_QA_S3_BINARY=/absolute/verified/weed \
  node Backend/scripts/verifyRecruitmentStaging.cjs --storage
```

Preflight is configuration-only. Storage mode starts a new loopback SeaweedFS
instance, with private generated credentials/TLS and a fresh bucket. Its private
S3 port is18443, HTTP18333; other mini components also bind loopback. It refuses
using arbitrary external endpoints. The test-only HTTPS transport pins physical
loopback and verifies the generated CA/SNI. Actual application SigV4, conditional
writes, size/hash verification, Express authorization and Mongo persistence run
unchanged. Production SSRF/DNS controls are never bypassed in application code;
production network topology is not accepted by this fixture.

The script restores two synthetic PDF/DOCX objects from in-memory byte backups to
the original immutable references after exact-key deletion. This is real provider
write/read/delete/restore, not a mock; it is not acceptance of a provider-native
versioned backup or disaster recovery system. Candidate revision/linkage remain
unchanged. It also verifies unsigned/cross-department/revoked access denial,
revocation during a delayed real read, corrupt-byte rejection and real provider
stop/restart persistence. It does not scan these fixtures or test full CV intake.

Only newly generated keys tracked in the run ledger are deleted for the restore
experiment. The provider process is stopped in `finally`; its private temporary
data/log/config directory is retained. Do not publish that directory: it includes
synthetic private keys and S3 credentials. Commit/export only sanitized receipts.
No unknown files, buckets, containers or volumes are cleaned.

Expected output: an optional owned-fixture cleanup message, then a JSON record
with `PASS_ISOLATED_STAGING`, provider identity, actual checks and
`productionReady:false`. Failures are nonzero with sanitized codes. Guard tests
are not substitutes for the real `--storage` run.

For a provider-owner acceptance, supply an approved isolated endpoint/bucket,
protected HR_CV_STORAGE_{PROVIDER,ENDPOINT,BUCKET,REGION,ACCESS_KEY_ID,SECRET_ACCESS_KEY}
bindings (optional SESSION_TOKEN), exact test namespace permissions
Put/Get/conditional writes plus owner-approved exact-key restore/delete or version
recovery. Do not point this loopback-only runner at a production endpoint. A
provider-specific approved procedure must prove restored bytes and authorization
on its own target before production activation.
