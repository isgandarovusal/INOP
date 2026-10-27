# Temporary R2 operator diagnostic (default OFF)

No live operation is performed by adding this code. No frontend UI, dependency,
DB write, intake activation or automatic cleanup is added.

POST `/api/hr/storage-diagnostic` is behind existing JWT verification (current
user/session validity), `user.update` permission and an additional exact active
`admin` role with global `all` scope. Other administrator-like custom roles are
intentionally denied. Request logs must never capture headers/body; existing
operational telemetry records only method/group/status/duration.

## Separate activation approval

After review, pushing/deploying and changing production environment each require
operator approval. Do NOT change any intake/scanner/OCR/processing/worker gate.
Before activation, require all six existing HR CV gates to be false or unset.

Operator generates a random 32-byte activation secret privately. Never put it in
chat, a URL, browser history, scripts committed to Git, or terminal command-line
arguments/logs. Store only its SHA-256 hex digest as
`HR_R2_DIAGNOSTIC_TOKEN_SHA256`. Keep the original in the operator's secret manager
for request-header injection by an authorized local API client. Do not export
Render/R2 credentials. Use the current administrator's existing bearer session.

Temporary Render controls (all absent means disabled):
- `HR_R2_DIAGNOSTIC_ENABLED=true`
- `HR_R2_DIAGNOSTIC_EXPIRES_AT`: UTC ISO timestamp, strictly future and at most
  15 minutes after process startup; expired/malformed values fail closed.
- `HR_R2_DIAGNOSTIC_TOKEN_SHA256`: digest above.
- `HR_R2_DIAGNOSTIC_ORIGIN`: exact approved HTTPS frontend origin, without path.
- For configuration only leave both following approvals unset/false:
  `HR_R2_DIAGNOSTIC_SYNTHETIC_APPROVED` and
  `HR_R2_DIAGNOSTIC_RETENTION_APPROVED`.

The adapter remains scoped to official R2 account endpoint, region `auto`, and
bucket `inop-private-cv`. Config validation does NOT contact R2 and does NOT prove
that credentials have access or the bucket is private.

## Request sequence

Each POST requires `Authorization: Bearer <existing session>`, exact approved
`Origin`, `Content-Type: application/json`, and
`X-INOP-Diagnostic-Token: <operator-held activation secret>`.
Do not screenshot/save headers. No credentials in request body.

1. Send `{"action":"challenge"}`. A random one-use challenge is returned.
   Treat it as an ephemeral security value, not a storage verification result;
   do not include it in diagnostic reports. Lifetime 60 seconds, bound to user.
2. Send `{"action":"config","challenge":"<returned challenge>"}`.
   Only `CONFIG_OK`, `CONFIG_MISSING`, or `CONFIG_INVALID` is returned.
3. STOP for separate explicit approval before synthetic object creation AND
   indefinite retention. Set both synthetic/retention approval controls only
   with that approval. Do not enable upload/worker/scanner.
4. Obtain a fresh challenge and submit action `synthetic`. No key, file or
   provider URL can be supplied by the caller. Server creates one tiny synthetic
   PDF-like storage-protocol payload (not a CV/parser/antivirus test), one UUID
   `hr/cv/<UUID>` object, verifies readback/hash, and retries conditional PUT of
   identical bytes. Success requires `STORAGE_WRITE_CONFLICT` on the second PUT.
5. Report only result code and operation statuses. Do NOT loop/retry a failed or
   uncertain synthetic test: an object may already exist. No DELETE is provided.

Six activation-authenticated requests per process lifetime; synthetic attempted
at most once per process, marked consumed BEFORE PUT (including failure). Used
challenges cannot replay and process restart invalidates outstanding challenges.
Counters are intentionally not durable: restart/redeploy/multiple replicas can
permit a new separately challenged test. This mechanism is approved for one
operator/one existing instance only. Do not restart/redeploy while activated or
retry after restart. If cross-restart durable exactly-once authorization is
required, do not use this diagnostic; that would require a separately reviewed
persistent approval design. It does not silently add DB state.

## Stop/removal

After either failure or success, disable `HR_R2_DIAGNOSTIC_ENABLED` and remove
activation digest, expiry/origin and both approvals in separately approved
hosting change. Expiry automatically closes access even if operator forgets.
No cleanup of the synthetic object is performed; retention/deletion is an
independent later owner decision. Never grant/list/delete bucket content here.
Then remove the mount from `Backend/routes/route.js`, the temporary route,
service, tests and this temporary operator document in a separate reviewed
commit/deployment. Keep the existing S3 adapter and all permanent tests intact.
