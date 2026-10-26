# Existing Render backend: CV runtime activation boundary

Repository start: `npm start` -> `node server.js`; Mongo connects before HTTP
listen and worker startup. No Render blueprint is committed. Live Render runtime,
build/start settings and instance RAM have not been inspected through a hosting API.
The backend Dockerfile installs npm dependencies only, not ClamAV/Tesseract/models.

## Required configuration (names only)

- `HR_CV_STORAGE_PROVIDER=s3`; HTTPS `HR_CV_STORAGE_ENDPOINT`, private
  `HR_CV_STORAGE_BUCKET`, `HR_CV_STORAGE_REGION`.
- Hosting-secret-store values: `HR_CV_STORAGE_ACCESS_KEY_ID`,
  `HR_CV_STORAGE_SECRET_ACCESS_KEY`, optional `HR_CV_STORAGE_SESSION_TOKEN`.
- Bucket must reject public reads and support the adapter's signed GET/conditional
  PUT, immutable key/readback contract. Credentials need only scoped object access;
  no public ACL or bucket administration. Recovery/retention approval is separate.
- `HR_CV_SCAN_ENABLED`, absolute `HR_CV_SCAN_BINARY` ending in `clamscan`;
  working executable and trusted definitions no older than 24h. Provisioning and
  signature updates are operator responsibilities, never runtime auto-installation.
- Optional `HR_CV_OCR_ENABLED`, `HR_CV_OCR_DATA_DIRECTORY`: Tesseract and
  AZ/EN/RU models must be available. OCR opt-in also starts the existing OCR worker.
- `HR_CV_DURABLE_INTAKE_ENABLED` and separately
  `HR_CV_INTAKE_WORKER_ENABLED`: both must be exactly `true` for the intake scheduler.
  All opt-ins remain false in the example. Frontend upload visibility is separately
  controlled by the existing `VITE_HR_DURABLE_INTAKE_ENABLED` build setting.

## In-process scheduling

The worker uses the existing profile `runOnce(1)` and Mongo leases/retry history.
It waits 10s after completion, 60s after failure; no overlapping tick or second
queue. Unavailable profiles cannot claim work. Errors are reduced to a safe health
state without raw logs. Normal process termination remains unchanged; abandoned
claims recover using existing leases. No work while Render is asleep/stopped.
`HR_CV_PROCESSING_ENABLED` is a separate Candidate worker, not an intake scheduler.

## Hosting blockers and next operator check

Render Free sleeps after 15 minutes without inbound traffic and loses runtime
filesystem changes on restart/redeploy/spindown. A timer is not a keep-alive.
Local CV persistence is unsuitable. Fresh signature updates also need a durable
or reproducible provisioning strategy. Official ClamAV recommends at least 3 GiB
RAM for standard definitions, plus headroom for other applications; a 512 MB
instance is unsuitable for this local scanner plan. Per-upload clamscan startup
must also fit the existing 10s scanner deadline under representative load; do not
increase deadlines or trim security signatures to hide an incompatible runtime.

Operator's next read-only action: Render Settings -> report runtime (Native/Docker),
build/start commands and instance RAM/tier, without environment/credential values.
Do not enable any gate. Existing service resizing/runtime packaging requires
separate approval; an extra service is not inherently required if this service
has adequate resources. No production readiness is claimed until synthetic scan,
storage and full intake E2E are verified in the approved runtime.

Sources: https://render.com/docs/free ; https://docs.clamav.net/ .

## R2 compatibility of the existing Recruitment S3 adapter

Use provider `s3`, the standard `https://<32-hex-account-id>.r2.cloudflarestorage.com`
account API endpoint and region `auto`. The existing bucket/key references and
SigV4 GET/conditional PUT contract remain unchanged; no new provider registry or
pipeline is introduced. R2 rejects the SSE-S3 request header, so it is omitted
only for this exact official endpoint pattern. R2 automatically encrypts objects
and metadata at rest with AES-256. Other S3 hosts retain the AES256 header.
Public r2.dev endpoints are rejected. A valid API endpoint alone does not prove
the bucket is private: the operator must confirm BOTH public-development access
and public custom domains are disabled. Only server-authorized download routes
may return file bytes; no public/presigned URL is put into the reference/DTO.

SHA-256 payload signing, metadata, hash/size readback and If-None-Match remain
mandatory. ETag is not treated as the CV checksum. The adapter does not delete
objects or provision retention policies. Existing bucket lifecycle/lock settings
and recovery arrangements must be inspected before activation; durability and
an immutable client write are not a backup. Do not assume S3 versioned restore
or the separate Audit storage contract is available on R2.

Scope an existing R2 token to the intended bucket. R2 Object Read & Write tokens
can include object deletion; the application's lack of a delete method does not
remove that token capability. Retention/lock and recovery controls need explicit
owner approval; no automatic expiration policy is proposed or installed here.
Existing account/bucket/token availability is UNKNOWN without an authorized
Cloudflare read-only channel or operator metadata. Never print credential values.

Standard R2 free allowances: 10 GB-month storage, 1 million Class A operations and
10 million Class B operations monthly, free Internet egress. This is not a billing
cap: excess usage can incur charges. No paid subscription or account was created.

Compatibility was tested with synthetic PDF/DOCX and a local injected protocol
transport, not a live bucket. Scanner and intake gates remain off. R2 does not
solve the Render Free ClamAV resource blocker.

Sources: https://developers.cloudflare.com/r2/api/s3/api/ ;
https://developers.cloudflare.com/r2/reference/data-security/ ;
https://developers.cloudflare.com/r2/buckets/public-buckets/ ;
https://developers.cloudflare.com/r2/api/tokens/ ;
https://developers.cloudflare.com/r2/pricing/ .

## Free-tier scanner alternatives reviewed (26 October 2026)

No replacement is activated. YARA/YARA-X are rule-driven pattern engines, not
evidence of equivalent maintained PDF/DOCX malware coverage. Hash lookups and
MIME/content validation do not substitute for scanning the submitted bytes.

VirusTotal Public: 500 requests/day, 4/minute, no commercial product/service use;
standard uploads enter the community dataset and must not include PII. Standard
upload endpoint accepts up to 32MB; the size allowance does not solve privacy.
Private Scanning is paid, typically retains content 24h (configurable), and does
not include partner multi-antivirus verdicts. Not selected.

Cloudmersive advertises 600 free calls/month, 1 call/second, one concurrent call,
3.5MB maximum file size and evaluation/lower-availability service. The virus API
page claims stateless in-memory processing without payload retention; this is a
vendor statement, not an approved INOP data-processing arrangement. It introduces
a new account/provider, CV transfer and credentials, and does not cover this
pipeline's 5MiB maximum. No client/account is created or integrated.

Sources: https://docs.virustotal.com/reference/public-vs-premium-api ;
https://docs.virustotal.com/reference/files-scan ;
https://docs.virustotal.com/docs/private-scanning ;
https://cloudmersive.com/pricing-small-business ;
https://cloudmersive.com/faq ; https://cloudmersive.com/virus-api ;
https://virustotal.github.io/yara-x/docs/intro/getting-started/ .

Under the fixed Free/no-new-provider/no-extra-service constraints, safe automatic
CV admission remains blocked. Do not enable upload, discard signatures to reduce
RAM, trust a user-supplied scan assertion or return a fabricated clean verdict.
