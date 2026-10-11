# Private CV source approval (10D3)

The existing Candidate/Application routes remain compatible. New authenticated
`/api/hr/cv-intake` routes are **disabled by default**, including when storage
credentials happen to exist. `hrCvIntakeProfiles.profile` is a server-only
dependency boundary; synthetic tests inject it. No worker or startup DDL is added.
Activation requires approved private storage, real malware scanning, explicit DDL,
recovery/backup evidence and retention/privacy policy. This is not live intake.

| Endpoint | Contract |
|---|---|
| POST `/hr/cv-intake` | One multipart `cv` + UUID-v4 `commandId`; independent Candidate read/create; 202 queued source DTO |
| GET `/hr/cv-intake/:id` | Current scoped Candidate read over server-owned source; private review facts only for ready current version |
| GET `/hr/cv-intake/:id/original` | Clean scan/hash + current scope before/after IO; no-store, sandbox, nosniff, attachment; quarantine never readable |
| POST `/hr/cv-intake/:id/approve` | JSON `confirmed:true`, exact `expectedHash`, `expectedUpdatedAt`, whitelisted editable `profile`, optional explicit `jobId`/notes |

Approval reserves fixed Candidate/Application IDs in a hidden server-owned source
receipt **before writing either resource**. The receipt binds normalized approved
facts, Job/notes, original/parser/scan context, actor, department and source time.
Same source/command replays those identities. Changed facts/job, another actor,
changed department or obsolete/changed source fail 409. A lost DB acknowledgement
is reconciled at the reserved identity; an uncertain missing write returns 503,
with no compensation/deletion, false success or second identity allocation.
Concurrent identical approvals produce one Candidate/Application. Subsequent
human edits are never overwritten by replay. No automatic reject/hire or protected
attribute scoring is introduced.

Independent current Candidate read/create and Job read/Application create are
checked after original IO and before child writes. Child access is checked using
the new Candidate's current scope too: reassignment/revocation prevents linking.
Create-only Application grants remain useful; its ID is returned only under an
independent current Application read grant. No blob key/private receipt/CV raw text
is returned. Scoring/creation event use the existing versioned services.

Candidate receives hidden `privateCvIntake` and existing `privateCvBlob`, verified
`cvOriginal`, and server-derived HR-reviewed `cvReview`. Legacy authorized download
paths remain compatible. Private readers verify source-parent/blob/scan proof
before and after IO; source quarantine blocks attached Candidate downloads.
Processing fingerprints append the receipt only when present (legacy identities
unchanged). CV replacement clears the current receipt/blob, retaining the immutable
original/source. This does not decide Candidate deletion/retention policy. Linked source reads also require current
Candidate scope; completed-but-deleted parents cannot be recreated through replay.

Synthetic storage/scanner tests are identified as `evidenceMode:test`; none proves
real S3 durability, antivirus, hosted recovery, legal retention or external source
readiness. Original source command deduplicates one actor/UUID, not the same person
across independent commands/files. Matching duplicate people remains an HR review
decision. Legacy parse-then-create UI is unchanged until the next gated UI package.

Evidence: owned loopback Mongo/real JWT, actual DOCX parsing, private HTTP download,
five scopes, foreign/mixed negatives, explicit confirmation/field validation,
lost Candidate/Application acknowledgement, child outage, current role loss,
parallel replay and preserved manual edit, reassignment and quarantine race.
Target run `/workspace/inop-hr10d3-target3.log`: 93/93 including inherited suites.
Build/typecheck PASS, lint 0 errors/9 baseline warnings, smoke13, authorization632.
Final full-run evidence is recorded in the tracker before commit.

Recovery: `POST /hr/cv-intake/:id/reconcile` accepts only `{confirmed:true}`.
It reuses the hidden server-approved profile/Job/notes under all current guards;
client payload/provenance is not a recovery authority. Source GET exposes only
`approvalState`, whitelisted `approvedProfile`, and completed Candidate ID after
current parent authorization, not hidden Job/Application pointers or notes.
Canonical sorted hashes make semantic JSON key order irrelevant. Parallel receipts
do not invalidate an unchanged original; original guards still compare bytes,
source/scan/parser/state/ownership and linked current Candidate scope. Completed
receipts never resurrect subsequently deleted Applications.

The POST route rejects disabled/unconfigured intake **before** multipart upload.
One bounded memory upload then the core performs one worker content validation;
no legacy filesystem write, duplicate middleware validation or parse/create upload.
