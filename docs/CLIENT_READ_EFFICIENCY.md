# Client read efficiency and navigation privacy

Only Jobs and Applications dashboard numeric summaries may reuse a 10-second,
bounded in-memory response. Dashboard enables this only for all-scope readers
(and all relevant Application parent scopes). Payloads use strict allowlists;
unknown fields prevent caching. Candidate names, CVs, auth and Audit responses
are never settled-response cached. Default readJson behavior stays pending-only.

Keys include backend URL, JWT and the caller's permission fingerprint. Logout,
account/role/department/permission changes clear session memory. Relevant writes
invalidate before and after completion, including uncertain failures; late reads
cannot repopulate an invalidated epoch. 401/403 invalidate aggregates. Server-side
authorization remains authoritative; numeric summaries can be up to ten seconds
old, not mutation permission evidence. Focus revalidates Candidate/Audit data;
manual Refresh bypasses the aggregate cache. Auth hydration/deadlines are unchanged.

Jobs/Candidates/Applications search, filters, sorting and page position survive
same-document tab navigation in bounded memory. No candidate/search values are
written to URLs, localStorage, sessionStorage or IndexedDB by this mechanism.
Logout/account/permission changes clear it. Reload starts fresh. Existing URL
back/forward behavior and Application board selection remain intact. No offline
PII/draft cache or automatic synchronization is introduced.

## Synthetic local acceptance

Repeat Dashboard return within ten seconds: four summary GETs before, two after;
focus also two, manual Refresh four. Candidate/Audit reads remain fresh. Local
return timings were 109ms before and 618ms after in separate browser executions;
these are not comparable remote latency benchmarks and show no proven speedup.
There is no remote cold-start measurement or claim. Request count is the measured
improvement. Mutation, lost-ack, session reset, page/filter restoration, locale
switching and stale-account boundaries have focused browser/pure-module coverage.
Evidence: /workspace/work/coordinated-efficiency-evidence/ (logs and screenshots).
Typography/date utilities and ISO API/database semantics are unchanged; existing
date-format regression evidence remains applicable. No Audit scoring changes.

Session revocation follow-up (2026-11-06): memory preference writer identities
now include a monotonically increasing document-local generation. Logout and
reauthentication with the same token/user cannot reactivate an old asynchronous
writer. Regression: the old writer previously overwrote a new preference; now
zero stale writes are accepted. No HTTP, persistent storage, UI or cache TTL
change was needed. Existing cache isolation/refresh tests remain applicable.

CI execution follows focused local development: automatic push/PR runs keep the
existing workflow/check identity, locked install, four dependency security graphs,
pure safety regressions and frontend build/lint. Native replica-set/OCR and broad
browser/backend integration run only on explicit workflow_dispatch or schedule.
This changes coverage policy explicitly; it does not certify full release coverage
from a lightweight push result. Comprehensive runs retain all browser groups and
fail on timeout. QA processes own detached groups and reap only their descendants;
per-test5min, browser-group8min, full-browser40min and job55min bounds are enforced.
