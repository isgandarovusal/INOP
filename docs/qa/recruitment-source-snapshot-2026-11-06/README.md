# Recruitment functional and source-snapshot acceptance

Date: 2026-11-06. Base e3b4384f5bca5b818af059107be1a9b4f05f9aca. Single main agent; independent temporary clone; original full workspace preserved. Synthetic fixtures only, no production service access, configuration or deployment.

## Delivered functionality

- `6c714c3`: Vacancy create/update rejected malformed text, skill/education/certification elements and nonnumeric experience types. Previously object/array values could become strings and booleans/arrays could become numeric requirements. Focused regression failed before implementation. Invalid requests now return400 and leave record/revision/count unchanged. Legacy CSV skill input, numeric strings, zero and fractional years remain accepted. No ATS algorithm or HR policy change.
- `787fc82`: Intake workers compared lease/authorization but did not compare the claimed source snapshot after asynchronous IO. Real Mongo regressions showed substituted filename/blob/evidence mode could publish old facts. Existing guard reads now compare source identity including evidence mode. Publication matches the original/blob/routing/owner/approval/scan/result snapshot in the same atomic update as lease ownership and expiry. No additional database read or new index. If replacement occurs after the final guard, no old result is written; the retained lease can expire and a new worker revalidates/reprocesses the current source. Detected source replacement during IO cancels the attempt without publishing facts. Objects and manual records are retained.

## Focused verification

| Scope | Result |
|---|---|
| Real local Mongo: intake, approval/reconciliation, private-storage authorization, original archive recovery, vacancy validation/archive; plus pure lease fixture | 111/111 PASS, 34.10s |
| Final real Chromium: actual App/login/Dashboard/Jobs/Candidates/Audit, session efficiency, AI review, intake repair | 15/15 PASS, 37.55s |
| Changed JS/CJS syntax and diff whitespace | PASS |

The final run covers acceptance and rejection, independent worker instances, expired leases/restart, uncertain PUT/DB acknowledgement recovery, corruption, current scope/revocation, archive timeouts, no destructive cleanup, malformed vacancy rejection and valid updates. Two independent intake instances contend for one real Mongo source: one claim/attempt/scan, second processes0. Publication-race replacement leaves result absent; forced lease expiry recovers at attempt2 with new metadata. No actual scanner engine or provider storage was used: scanner protocols and object IO here are synthetic adapters. Database claims/CAS/indexes are real isolated MongoDB operations using the existing local replica set. No new Docker volume.

Before-fix tests reproduced source replacement and publication failures, and malformed input acceptance. One intermediate test run exposed retained capacity from the newly added interrupted-source fixture; the fixture now explicitly exercises expiry/recovery before subsequent cases. Original lost-ack and capacity assertions remain unchanged. Final run is fully passing.

Frontend implementation/dependencies did not change, so previously passing build/lint were reused rather than rebuilt. All affected backend code passed syntax checks. No Audit scoring, typography/date representation, permission policy or deterministic ATS changes.

## Final browser and measurements

Used existing corrected loopback HTTP harness and bounded browser runner. Real application smoke reports initial total Dashboard summary reads4, manual Refresh adds4, unexpected console/API/request/websocket errors0; expected navigation abort1. Numeric RAM-cache subset remains2 reads across repeat navigation/focus and4 cumulative after explicit Refresh. Search/filter/pagination return, logout and role/account isolation remain verified. No added initial HTTP requests or DB queries; source snapshot comparison adds predicates to existing reads/writes only. No remote cold-start or production latency improvement is claimed.

Current screenshots were captured and actually opened at1440/768/390/320px across AZ/EN/RU. No observed page overflow or overlapping controls in inspected states. Existing narrow native-select labels truncate at mobile width; no new truncation or styling change introduced. AI review screenshot was also inspected locally and explicitly labels the provider MOCK TEST; it is not real model inference. Screenshot manifest hashes cover the four durable representative captures. Full temporary evidence is under `/tmp/inop-approved-recovery/operational-next-evidence` and remains ephemeral; no raw sensitive logs are committed.

## AI and operational gates

Real multilingual inference: NOT RUN. No new officially accessible, license/revision/digest-verified checkpoint is available in this environment; the previous official model-host403 restriction is unresolved. No repeated download, unofficial mirror, dependency installation or third-party candidate transfer attempted. Existing42 AZ/EN/RU scenarios and safety corpus remain intact. No deterministic or mock result is promoted to semantic success; production semantic hiring stays disabled and human decisions remain authoritative.

Real fresh scanner signatures, private-storage restore against approved staging infrastructure, source-owner approval and production worker recovery/load remain external acceptance gates. Local synthetic acceptance is not production readiness.

Existing comprehensive run42188889485 was IN_PROGRESS at the single pre-delivery check, against base e3b4384; routine42188864929 was SUCCESS. No new comprehensive run was started and no CI gate was weakened. New routine CI is automatic after the coordinated push; its result is not preclaimed.
