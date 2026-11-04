# Application record action eligibility

Existing Application list, board and detail responses include:

```json
{"actionEligibility":{"version":"application-actions-v1","applicationId":"<Application id>","revision":0,"update":false,"delete":false}}
```

These booleans describe only **action-specific resource scope eligibility** at
response construction. They are not a promise that a particular command will
succeed. Stage transitions, terminal reopen, assignment, independent parent
access, revision/CAS, notification state and retry rules remain separate.
Handoff context grants no parent access and does not itself grant update.

The server uses the same `directionalPermissions.scope` resolver used by
`requirePermission`, and the same `getDataScope` equality predicates used by
`authorize`. HR membership is required independently. Missing authority and
unrecognized scope predicates fail closed. No ownership/department fields are
added to public list or board records: these fields are privately selected in
the existing query, evaluated in memory and removed before serialization.
No database operations are added by eligibility calculation.

The frontend accepts only the supported version, matching Application id and
revision, and explicit boolean values. Missing/invalid metadata means unavailable.
Eligibility is never included in mutation payloads. Existing mutation endpoints
remain the final authority; the browser cannot grant permission by altering a flag.

List/board actions are unavailable during refresh. Detail refresh disables the
retained workflow draft rather than remounting it, and masks recalculation/retry
eligibility. Existing request cancellation/context keys discard superseded
responses. A new response or current client permission context replaces old
eligibility. 401/403/404 mutation refusals invalidate it through the existing
resource reload flow. No polling, automatic mutation retry or new endpoint is added.

Revocation between reads is not pushed to the browser. A response is advisory;
current authorization and scope must still be enforced on every mutation. The
new contract does not make authorization and subsequent external work atomic.

## Release compatibility

Old frontends ignore the additive contract. New frontends receiving old backend
responses remain readable but expose no mutation controls without eligibility.
Deploy/verify the backend contract before activating the frontend integration to
avoid a temporary editing outage. Backend Auto-Deploy is not enabled by this work.
No manual production deployment is performed by this package.
