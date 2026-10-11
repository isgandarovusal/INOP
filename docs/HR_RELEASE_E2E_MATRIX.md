# HR release E2E matrix and remaining gates

Development-branch implementation and push only. No production branch push/deploy, provider credential change, hosted resource, migration, real mailbox or private website CV access.

## Joined local evidence

`Backend/tests/hrRecruitmentE2E.test.cjs` uses actual loopback HTTP, fresh owned Mongo, generated PDF/DOCX in AZ/EN/RU and the real deterministic parser/ATSv2/workflow/analytics. Graph/token/attachment transport, private object map, malware verdict and SMTP failure are explicitly synthetic. Eight joined checks pass: approved source receipt → private original → extraction/pending review → explicit corrected HR approval → Candidate/Application → contextual trusted100/real0 → same person independent Job → revision409 → Asia/Baku interview → explicit Offered/Hired → scoped three-brand/branch metrics. No automatic hiring decision, guessed person merge, protected-trait score or PII analytics output.

| Scenario | Local implementation and passing test | Real/hosted requirement |
|---|---|---|
| Three brands/multiple branches/non-restaurant legacy | recruitmentCatalog/UI, joined E2E, hrAnalytics/scale | Actual organization catalogs reviewed; no automatic brand assignment |
| Same Candidate/different Job | applicationLifecycle/ordering, joined E2E | Real concurrency/workload smoke after approved deploy |
| Text PDF/DOCX/AZ/EN/RU phones | cvExtraction/review/concurrency and joined E2E | Accuracy review on lawfully approved varied corpus; no fabricated unknown values |
| Image-only PDF | hrCvOcr/SourceOcr plus browser OCR; actual local Tesseract/model checks | EXT-OCR-001 deployed executable/models/resources/restore, local OCR not hosted proof |
| Explicit HR corrections/provenance | hrCvApproval/SourceApproval/SourceScore, processing UI | Human review responsibility and lawful retention policy |
| Scores and fairness | applicationMatching/score state/ranking/fairness/UI | ats-v2 stored-v1 legacy hidden pending authorized explicit recalc; lexical guard not universal semantic fairness |
| Mixed all/own/department/assigned/current roles | hrResourceScopes, private storage/source/lifecycle/query tests | Hosted least privilege/boundary smoke; no client permission substitute |
| Original downloads | privateUploads, CV/Source browser tests, SourceDownloadRace | Actual private provider/legacy file recovery; fresh server denial still fail-closed |
| Retry/duplicate/lost ack/restart | Source retry/approval, manifests/tasks, Graph/source/relay receipts | Real provider conditional write/recovery, scanner outage drills |
| Native PDF focus/download race | SourceDownloadRace plus existing concurrent Source checks | Historical timeout lacks event trace; causal focus/revoke/canceled reproduced and fixed, no blanket timeout guarantee |
| Status/DnD/revision/interview/SMTP outage | applicationLifecycle/ordering/interviewers/notifications/UI | EXT-SMTP-001 authorized real receipt/bounce; failure never undoes status |
| Large cohorts/UI | hrPagination/board/analytics scale and benchmark reports | Local single samples only, not hosted p95/SLA/whole routed-shell peak memory |
| Private storage recovery | adapter/read/manifest/Source synthetic tests | P10-018/019 **BLOCKED_EXTERNAL**; true encrypted persistence/redeploy/restore/access evidence absent |
| Malware quarantine | strict native adapter synthetic executable plus Source/relay infected/unknown tests | EXT-AV-001 **BLOCKED_EXTERNAL**; real scanner/definitions/EICAR unavailable |
| Graph mailbox | fixed official transport, approved mapping/delta/receipts/worker local mocks | P11-003/020 **BLOCKED_EXTERNAL** tenant/mailbox/admin consent/access restriction/live E2E |
| Real AI | actual adapter/schema/cost/budget/timeout/injection guard and synthetic HTTP tests | P09-023 **BLOCKED_EXTERNAL** approved provider/model/pricing/consent; analytics never claims live PASS |
| Career websites/forms | approved signed relay interface/abuse/privacy tests | Site/form/email/export/partner schema unknown; approved company access, no unauthorized scraping |
| Archive/restore and retention | hrCandidateArchive + actual dialog/filter/history/recovery/race UI; original/Application retained, legacy DELETE reversible, revision409 and active exclusion | AUD-030 TESTED; AUD-051 OPEN only for lawful duration/basis and permanent-erasure authority. No permanent erasure enabled. |
| DB startup/DDL | schema inventory/owned local idempotent preparation/snapshot legacy fail-closed | Hosted backup/index compatibility and explicit production DDL approval; legacy HR repair separately approved |

## Readiness

The local core HR CRUD/catalog/ATS/workflow/analytics and default-off provider/Source adapters can be reviewed and tested without external services. This does not authorize activation or release. Existing legacy CV storage/upload remains transitional: ephemeral files and legacy double upload are retained until actual private provider/scanner/recovery gates permit safe retirement. Explicitly approved Candidate archive/restore now retains linked Applications/originals/history; permanent deletion is disabled until lawful retention/erasure authority is approved.

**Real-CV/production readiness: NO-GO.** Required independent external evidence: private object persistence/access/encryption/backup/restore, real scanner/current definitions/clean and harmless infected fixture, deployed OCR where offered, approved source identity/tenant/channel/current worker actor, legal privacy/retention/deletion, AI consent/budget and actual email delivery if enabled. No additional cluster/staging or paid resource was created.

Rollback is roll-forward or disable gated new ingestion/providers while preserving current scoped/private reads and immutable identities/history. Never restore public uploads, parent-scope leaks or JWT/role privilege holes; never automatically delete objects/records/indexes or mass rewrite roles to make release pass. Refer to HR_DB_RELEASE_PREPARATION and provider-specific setup documents.

## Historical13K frozen local regression

Source/test binding: `0903b744127165448781d1605f9424b24610b07a`,506 SHA-256 paths unchanged after execution (credential filenames excluded). Frontend `/workspace/inop-hr13-final-frontend-corrected.log` **408/408**, concurrency2, exit0,200604.621001ms; backend `/workspace/inop-hr13-final-backend-isolated.log` **1819/1819**, concurrency1 after frontend completed, exit0,164013.10126ms. Both have zero failed/cancelled/skipped/todo tests. `/workspace/inop-hr13-final-exits.json` records both exits. Current13J typecheck/buildPASS, lint0 errors/9 baseline warnings, smoke13/13 and authorization632/632. Current source remains unchanged; only final documentation is pending commit.

The failed prior matrix is retained: frontend399/408 exposed the Candidate validation translation bug and old raw-error expectation; backend1817/1819 overlapped a valid frontend upload with an entire-directory snapshot assertion. Actual corrections and isolated serialization were verified; failures are never counted as PASS. The current parallel frontend still exercises Source/race validation, ordinary exact-byte download, forced focus/refetch, fresh denial and late permission revocation. No real scanner/storage/provider is implied by these counts.

## Renewed department/product matrix

| Scenario | Local test | Remaining limit |
|---|---|---|
| Canonical HR membership AND independent all/own/department/assigned grants | hrDepartmentAccess strict owned HTTP/Mongo production predicate, hrDepartmentAccessUI | No role/name inference; only dep_hr accepted. Existing account inventory/other ObjectId requires explicit confirmation. |
| HR private bytes/legacy files and worker revocation | Fresh department change during simulated IO, existing private upload/storage/source/background regressions | Real object storage/scanner recovery remains BLOCKED_EXTERNAL. |
| Generic activity privacy | hrActivityPrivacy parent read filter and non-HR Audit preservation | Admin retains historical logs; independent current parents filter before cap. |
| Archive/CAS/current profile | hrCandidateArchive, hrCandidateArchiveUI, candidateActions | History/original/Application retained; permanent erase disabled. |
| Actual AppShell/mobile/menu/data-bound metrics | hrWorkspaceUI20 plus prior responsive/accessibility targets62 | Local Chromium/synthetic records, not hosted latency or WCAG certification. |

Current complete-suite/source binding is recorded in HR_DEVELOPMENT_FINAL_REPORT after execution; the13K counts above remain historical. The initial renewed frontend run was incomplete because an obsolete native-confirm harness waited indefinitely, not PASS.14E updates the harness to the actual accessible archive dialog, adds15second start bounds and preserves late-response/no-download/no-navigation assertions. Public source research was retried during this continuation; curl still cannot establish the proxy CONNECT tunnel (403, HTTP000), so website/form/API capabilities remain unverified.

Current verified frontend439/439 at14E, backend1845/1845 at14F, both exit0/zero failure/cancel/skip/todo. Frontend/production/shared fixture input hashes are unchanged by the corrected backend-only lifecycle test; current504path binding retained. TypeScript/buildPASS, lint0/9, smoke13/13, authorization632/632. Actual local OCR/AZ/EN/RU and joined E2E are included, but real scanner/storage/tenant/provider acceptance remains BLOCKED_EXTERNAL. Newly reproduced AUD-135 linked Job DELETE orphan behavior is OPEN pending explicit dependency/archival policy; no permanent Job policy inferred.
