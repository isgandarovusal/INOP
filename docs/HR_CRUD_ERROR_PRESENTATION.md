# Safe localized HR mutation errors

HR Job/Candidate/Application CRUD, linking, workflow and export actions translate
stable status keys instead of Axios/server/request messages. Unknown network,
timeout,429,400/422,409 and500 errors have AZ/EN/RU messages;401/403/404 retain
distinct access/resource states. Forms store translation keys, so language
changes preserve drafts without requests and translate an existing error.
Job mutation authority loss now removes the writable form, matching Candidate
and the existing server checks. Frontend checks never replace server grants.

The axios interceptor suppresses duplicate raw toasts only for relative HR paths
`/jobs`, `/candidates`, `/applications`, `/hr`. Other modules keep their behavior.
The old JobForm console dump of Axios/request errors is removed. Server API and
validation/status contracts are unchanged; a generic bounded invalid-fields
message is used when the API lacks a safe field code, rather than translating or
displaying arbitrary server diagnostics. A timeout/network error explicitly tells
HR to check the operation result before repeating an uncertain write.

Archived pre-patch JobForm/axios browser baseline fails9/10 checks; current
CRUD/lifecycle51/51, previous unchanged document/contracts22 checks pass. The
negative test asserts no raw private diagnostic in toast/DOM/log, preserves draft,
retranslates in three languages with zero refetch and checks hidden writable form
after401/403/404. Feature/provider/storage activation and retention remain gated.
