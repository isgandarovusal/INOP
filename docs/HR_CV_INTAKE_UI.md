# One-upload private source UI (10D4)

`VITE_HR_DURABLE_INTAKE_ENABLED=true` opts new Candidate forms into the additive
private source API. It is **absent/off by default**. Do not enable it until the
server source profile, actual private storage, malware scan, worker, explicit DDL,
retention/privacy and recovery gates are approved. Enabling the frontend flag alone
does not enable the default-disabled backend. No hosted configuration was changed.
Existing edit/CV replacement and default legacy create routes remain compatible.

The new path sends one multipart source command/UUID then bounded status reads.
It never sends that file to parse-CV or Candidate-create again. Source status and
test-only storage/scanner evidence are visible; `test` never claims live durability
or antivirus. Fields remain editable drafts; an unchecked HR confirmation prevents
Candidate/Application writes. Approval sends only whitelisted facts and source
identity as JSON, with optional explicitly selected Job. Zero and unknown remain
distinct. No automatic hire/reject or contextual score outside Application occurs.

File change/route/auth cleanup aborts outstanding reads and rejects old responses.
Language changes only translate current state, with zero new data requests.
`?intakeId=...` resumes the same server source without re-upload; primary
401/403/404/500 states stay distinct. Pending/blocked/quarantined sources cannot
create through an ordinary fallback. Processing is bounded to 30 status polls;
its server lease/retry state survives the browser. A pending resume has an explicit
status-check action, not a falsely completed parsing claim.

Lost enqueue acknowledgement has an explicit retry using the **same UUID and
same File**: a transport retry can resend bytes but does not create a second
source or object PUT. Lost approval keeps the captured approved draft and blocks
ordinary submit/file replacement. Its recovery action repeats that exact command.
After browser restart the server-approved payload is recovered with explicit
`reconcile`; the editable draft is frozen. Reconciliation uses the previously
approved Job/notes, not changed URL/form context. Completed sources link to the
existing authorized Candidate rather than creating again. Parent/scanner/source
authorization remains entirely server-side.

Original download sends Bearer auth, verifies size/SHA before creating an object
URL, aborts on route/auth cleanup and revokes/removes the temporary URL/link.
No private path, blob key or raw provider error is displayed. Metadata/list/history
guards prevent malformed parser/approved facts from crashing the review UI.

Evidence uses actual loopback HTTP/Mongo/JWT and actual DOCX parsing, synthetic
private object store/scanner plus a test-only source worker driver. Feature flag
is enabled only in the test compiler overlay. There is no real provider E2E claim.
`cvIntakeUI` proves normal single upload, explicit HR approval, three locales,
lost approval, child outage + browser restart, same-command upload retry,
401/403/404/500, private SHA/download/objectURL cleanup and permission revocation.
Combined current targets `/workspace/inop-hr10d4-ui-fourth.log`: 57/57.

The default legacy path still parses then uploads again. AUD-073 is IN_PROGRESS,
not fully fixed for hosted/default intake, until durable activation/migration gates
allow that path to be retired. Native legacy files remain ephemeral; new flags and
synthetic tests do not solve real storage/recovery/antivirus or legal retention.
