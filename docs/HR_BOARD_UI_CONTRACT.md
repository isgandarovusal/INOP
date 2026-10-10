# Application board client — 08C5C

Applications table and board are separate read consumers: the selected view loads
its corresponding bounded API. StrictMode uses the existing pending-read sharing;
language changes do not refetch. The table retains page-local score/name/newest
sort and its explicit label. The board preserves server order rather than sorting
the loaded cards by score.

Each lane renders at most ten cards, its full scoped total, accessible next/back
controls and its page number. A lane page replaces that slice without growing the
DOM or replacing other lanes. Default total DOM cap is eighty cards. Empty lanes
are explicit. Parent profile restrictions and trustworthy/unknown scores remain
independent of Application access.

For one selected vacancy with other filters cleared, keyboard/mouse drag persists
within-stage order and sends compound status+placement for a permitted destination.
Neighbors include before/after page-boundary anchors with revisions. Processing
cannot be a drop destination; terminal cards can reorder within their decision
without reopening it. Overview drag retains legal status changes across separate
Applications but does not invent a global cross-vacancy order.

Optimistic ordering/status rolls back on failure; 409 reports conflict and refetches
server truth. Mutation requests have context-owned AbortControllers; late replies
cannot restore cards, feedback or requests in another actor/filter/view context.
Current backend scope and CAS remain authoritative. Cancellation cannot undo a
server write already accepted.

Secondary page outages keep authorized primary lanes and offer first-page retry.
Observed boundary changes also offer restart. Secondary 401/403/404 clear loaded
cards and parent filter data immediately; there is no hidden authorized-data cache.
Focus refresh rechecks server grants/assignments. AZ/EN/RU labels cover controls,
ordering constraints, empty states and reorder history events.

Evidence: `Frontend/tests/hrBoardUI.test.cjs` runs actual isolated HTTP/Mongo and
Chromium with StrictMode. It covers one board request/zero table requests, full
35/20 lane counts with bounded cards, independent next/back, keyboard ordering
and refresh, page-two boundary placement, CAS rollback, page 500 retention/retry,
boundary 409 restart, secondary 401/403/404 clearing, zero language requests and
late mutation permission revocation. Existing Application lifecycle and HR page
tests also pass. This is functional evidence; 0/5000/50000 production-build
performance, render/long-task/memory measurements are still package 08D.
