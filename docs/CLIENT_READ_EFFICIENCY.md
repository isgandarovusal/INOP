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
