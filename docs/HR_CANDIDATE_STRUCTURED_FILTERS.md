# Candidate structured filters

The existing `GET /hr/v2/candidates` accepts optional `skills` and `certificates`
JSON string arrays, and `skillsMode=and|or` (default `and`). Empty arrays do not
filter. Certificates always use AND; groups, text search, profile status, archive
visibility and existing Candidate authorization are combined with AND.

## Field-level provenance

An active group requires all of:

1. The corresponding top-level field is an array containing only strings.
2. `reviewedFields` is an array containing that field name.
3. The selected literal labels match the field according to the group mode.

The existing Candidate create/update controller writes `reviewedFields` from
professional fields explicitly supplied by authorized HR, in the same save as
those values. Candidate processing approval uses that controller; durable intake
approval likewise writes approved fields and `reviewedFields` together. CV
replacement clears inherited review markers unless the field is explicitly
supplied again. No filter writes or backfills Candidate data.

Array presence, a profile-wide confirmed review, certification history, and a
processing receipt alone do not substitute for the field marker. Legacy records
without it are excluded from active groups; unfiltered reads remain unchanged.
Reviewed empty arrays cannot match a selected label. Exclusion is not a negative
qualification or hiring decision. HR-recorded certificate names do not establish
issuer authenticity, expiry or current validity.

## Input and matching

Each group has at most 10 original values, each at most 120 JavaScript string
code units. The combined UTF-8 byte length of decoded `skills`, `certificates`
and `skillsMode` parameter values must not exceed 2048. Other query limits remain
unchanged. Invalid JSON, objects/nested arrays, nonstrings, blank/control-character
labels, duplicate query parameters and unsupported modes return HTTP 400.

Labels are trimmed; identical labels are deduplicated. Fully escaped, anchored,
case-insensitive regular expressions compare complete stored labels, not
substrings. Skills AND uses `$all`, OR uses `$in`; certificates use `$all`.
No ATS-v2 aliases, accent removal, Unicode normalization, internal-whitespace
rewriting or credential equivalence is introduced. Unicode case behavior follows
the MongoDB regex engine, not a new multilingual taxonomy.

The same predicates run before normal pagination/counting and before the existing
`excludeJobId` anti-join facet. Scope, ordering, cursor binding, page limits,
5-second query limits and `hr-page-v1` response projections remain unchanged.
No catalog/facet endpoint, indexes or additional DB round trips are introduced.

## UI

The Candidate page reuses TagInput in a native expandable panel. Enter commits a
label; typing an uncommitted label and opening/closing the panel do not request
options or refetch results. A committed filter resets pagination through the
existing page hook and participates in action-context invalidation. Clear-all
resets text, status, archive and structured groups; search-clear remains separate.
Existing request cancellation and stale-response protection are reused.

The current Excel export contract is unchanged; this package does not introduce
filtered-export semantics. Production throughput/index suitability has not been
established by the small synthetic fixtures.
