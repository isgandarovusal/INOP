# HR 08D3 UI stability contract

This increment changes frontend presentation and render behavior only. Backend
grants/scopes, API payloads, matching rules, routes and existing record data stay
authoritative. No hosting, migration, seed, provider or secret change is needed.

* Shared HR loading state announces its existing translated title, marks the
  region busy and shows exactly four decorative skeleton rows. Skeletons are
  aria-hidden, contain no invented Candidate data and disappear with the loading
  state. Reduced-motion preference disables skeleton/spinner animation.
* Jobs/Applications filters and Job detail's Candidate selector have translated
  accessible names. Job description is named. Candidate card/table buttons
  announce their names and pressed state. Catalog selection still grants no
  authorization.
* Wide HR tables and board lanes scroll inside named focusable regions, with a
  visible focus outline. Filters wrap; content stays inside the page width.
  Existing drag handles and native keyboard ordering remain intact. No cards or
  rows are silently truncated by CSS to appear responsive.
* The Candidate CV input is visually clipped rather than display:none: native
  keyboard focus and the file chooser remain available, with a visible outline
  around its label. File acceptance, size bounds, server access control and
  sequence-bound parsing are unchanged. A keyboard test opens the native chooser
  without selecting/uploading a file.
* Score badge uses React's normal shallow memoization for unchanged Application
  and callback props. It continues to subscribe to language and auth context,
  keeps its existing revision/permission key and lazy evidence behavior, and
  never caches server permissions. Tests instrument actual Badge render calls in
  an isolated Vite source overlay: an unrelated stable-context parent update has
  zero extra Badge renders; language/permission updates still render. Production
  application source contains no instrumentation.
* CV history date names translate Start/End and Year/Month for AZ/EN/RU rather
  than embedding English field names. Stored date keys/values are unchanged.

`Frontend/tests/hrAccessibility.test.cjs` mounts actual components with real
local HTTP/Mongo fixtures, full App CSS, StrictMode and isolated synthetic users.
It covers loading completion, named controls in three languages, keyboard
regions/file chooser, reduced motion, 320/390/768/1280px list/board/form/details,
and the memoization/context boundary. Existing board/page/CV/matching/lifecycle
suites protect refresh, old responses, permissions, scoring evidence, edits,
original previews and actual persisted keyboard drag. Test-only source overlays
do not rewrite files or bypass server authorization.

These are concrete workflow regressions, **not a WCAG certification**, testing
on every physical device, or a claim that a complete routed hosting shell has
been measured. Production-build workload evidence remains in
`HR_PERFORMANCE_MEASUREMENTS.md`. Wider upload/provider error localization
AUD-047 and external/storage/OCR/Source concurrency findings retain their tracker
entries until their corresponding work has evidence.
