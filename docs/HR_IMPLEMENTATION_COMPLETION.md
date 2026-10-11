# GFC Recruitment & ATS — final local implementation report

## Result and scope

Branch `work`; tested implementation commit `0903b744127165448781d1605f9424b24610b07a`. All65 prior HR/checkpoint commits since release `c74c49f41bb3a8a54566324c8902576a48a88e8f` are preserved. This final increment changes reports/tracker only. Its actual commit SHA is reported after creation; no push/deploy/production branch update, hosting resource, secret change, production DB/reset/seed/migration was performed.

All currently independent local package work has evidence. External provider/hosting/legal-policy acceptance is not complete: **NO-GO for real CV intake / production activation**. There is no claim of hosted staging, real AI, scanner, object storage recovery, Graph mailbox, website integration or SMTP delivery.

## Final test evidence

| Gate | Current evidence | Outcome |
|---|---|---|
| Complete backend | `/workspace/inop-hr13-final-backend-isolated.log`,1819 tests,164013.10126ms | 1819/1819; exit0,0fail/cancel/skip/todo |
| Complete frontend | `/workspace/inop-hr13-final-frontend-corrected.log`,408 tests, concurrency2,200604.621001ms | 408/408; exit0,0fail/cancel/skip/todo |
| TypeScript app/node and production build | `/workspace/inop-hr-gates/inop-packagehr13j-validation.json` | PASS |
| Lint | Same validation; no new warnings | 0 errors /9 existing warnings |
| Existing smoke | Same validation, fresh owned loopback DB | 13/13 |
| Authorization matrix | Same validation/current suites | 632/632 |
| Source binding | `/workspace/inop-hr13-final-corrected-source-sha256.json` | All506 source/test paths unchanged after tests/benchmark; credential filenames excluded |
| Joined E2E | `Backend/tests/hrRecruitmentE2E.test.cjs`, included in full backend | Actual HTTP/Mongo/parser/review/score/workflow/analytics8/8; transport/AV/storage/SMTP synthetic |
| DB preparation | `Backend/tests/hrReleaseIndexes.test.cjs`, included in full backend | Owned local no-write dry run/idempotent additive DDL/conflict refusal/legacy snapshot6/6; no Atlas operation |
| Current large dataset | `/workspace/inop-hr13-final-atsv2-benchmark.json` | 0/5,000/50,000,24endpoint200 calls/15 scope comparisons; no hosted claim |
| Final Git/coverage/metadata checks | Report-only diff check, all131 AUD IDs and acceptance IDs retained | Reviewed before explicit report-only staging |

The first full runs are deliberately retained as **failed**: frontend399/408 identified missing translation in CandidateForm plus an obsolete raw-server-error assertion; backend1817/1819 overlapped a whole-directory upload snapshot with a valid frontend upload.13J fixed the actual JSX bug, strengthened three-language/no-PUT assertions and aligned the raw-error test with13E's privacy contract. Full runners were then serialized relative to each other; frontend suites still run concurrently2. Neither assertions nor filename validation were disabled, and no existing upload was deleted. Details: [HR_FINAL_REGRESSION_CORRECTIONS](HR_FINAL_REGRESSION_CORRECTIONS.md).

## Package completion and commits

Every local SHA and changed path is listed in [HR_LOCAL_COMMIT_LEDGER](HR_LOCAL_COMMIT_LEDGER.md). Every acceptance has a stable tracker ID and named evidence; original histories are preserved.

| Package | Locally verified scope | Remaining genuine gate |
|---|---|---|
|01|Independent candidate/application/Job parent scopes/projection/current authority|Hosted boundary smoke after separately approved deployment|
|02|CRUD normalization, Job details/ranking, preserved edit fields/CV replacement, safe errors and cancellation|No additional independent code item; actual workload remains hosting exercise|
|03|AZ/EN/RU rule extraction/raw+normalized phone/unknown provenance/HR editors; actual local OCR bridge|Hosted OCR/scanner/private provider and general real-CV accuracy review|
|04|KFC/Pizza Hut/Simit Sarayı catalog, branch/restaurant/non-restaurant relationship, filters; no guessed legacy brand|Actual company catalog/data review|
|05|Application+Job ATSv2 known facts/real0/missing/legacy/stale, reason/weights/version/explicit recalc|No automatic bulk score migration; lexical fairness guard is not universal semantic coverage|
|06|Application board, persistent scoped DnD/order/CAS409, events, Asia/Baku interview/decision/outbox UI|Actual SMTP receipt/bounce if enabled|
|07|Scoped brand/branch/source/funnel/score metrics, bounded aggregates and truthful provider configuration metadata|Actual hosted integration health and large-cohort resource monitoring|
|08|Bounded pagination/projection/indexes/lookup/search/dedup/cancellation/DOM/accessibility and named0/5k/50k measurements|Legacy array APIs remain heavy for compatibility; no production p95/WCAG certification claim|
|09|Real configurable AI adapter, schema/prompt/data minimization/timeouts/budgets/review UI with synthetic transport|P09-023 actual approved key/model/pricing/consent/live E2E|
|10|Private object adapter/read/hash/current scopes, retained manifest/per-record migration preparation; durable parsing/OCR/AI/email/Source queues, bounded operator retry and explicit reviewed approval/read-only Source UI|Actual durable provider/recovery/scanner/activation and AUD-030/051 deletion/retention decision; legacy path intentionally transitional|
|11|Approved fixed official Graph/client credentials/delta/token/attachments/receipts/current actor/native worker/review preparation|Approved GFC tenant/mailbox/least-privilege Exchange restriction/admin consent/live E2E|
|12|Default-off approved signed career relay, consent/idempotency/abuse bounds/pre-write scan/Source review interface|Real site/form/email/CSV/partner schemas and company administrator/API access; public attempts proxy403|
|13|Joined real local E2E/scopes/fairness/DDL/parallel download causal regression/complete suites/disposition/release matrix|Actual scanner/storage/tenant/providers/legal retention still blocked/open, never mock PASS|

Recent implementation increments after13B:

| Increment | Full SHA | Evidence |
|---|---|---|
|13C native scanner preparation|`ff450ae94b6123b5acd9f4db06d97aac15fb1399`|Synthetic native scanner14 and full backend1789; real scanner unavailable|
|13D private Source OCR|`7f4f5068028482fc2c4601ebd133a6a46f50ca18`|Real local OCR/Source tests, Source UI15 + Candidate OCR4; all gates|
|13E safe localized HR errors|`8ec6ae10b1261f904a074e69c42ad2c1ff7472d0`|Final browser51; all gates; final13J later corrects uncovered branch|
|13F joined E2E/local indexes|`087f19a5ab483a6aee7ad08ca49fabfc43fca765`|Targets103 including E2E8/DDL6/hrSeed/userPrivileges; all gates|
|13G Source retry/read-only review|`47c41321f3320de0ebc96f1e5682fda3953fc2e7`|Backend69/browser26; all gates; no retry reupload/lifetime reset|
|13H PDF preview/download race|`5ec33144fdf6d76b9edb1b4bebd439913c2fd22b`|Causal baseline ordinaryPASS/focus canceled; concurrent final28/prior61; all gates|
|13I truthful AI status|`2f246042873cf95156c95ed7cbbf742091cbed35`|Backend78/browser13; all gates; zero provider calls|
|13J final validation correction|`0903b744127165448781d1605f9424b24610b07a`|Targeted45/all gates, final backend1819/frontend408 bound to this code|

## Finding disposition / download investigation

[HR_AUDIT_FINDING_DISPOSITION](HR_AUDIT_FINDING_DISPOSITION.md) contains **all131 IDs:122 TESTED locally,7 BLOCKED_EXTERNAL,2 OPEN**. No original finding is omitted or silently DONE. External findings include actual hosted HR account inventory, native scanner, durable storage, safe retirement of legacy uncertain/double-upload paths and approved private ingestion/website gates. The two OPEN findings are AUD-030/051: linked Candidate DELETE currently orphans an Application/original and lawful deletion/retention policy is undecided. Owned reproduction is retained; no policy change was inferred.

AUD-090 was investigated, not closed on a serial pass. The Source editor's focus read transitions ready→loading and correctly revokes its preview URL; the native PDF anchor reused that URL. Forced focus before native default produced a canceled download while the ordinary control passed. Download now uses a fresh Bearer-authorized `/file` request, separate short-lived URL, current-context cancellation, late-response suppression and401/403/404 preview disposal. Full parallel Source/native bytes/current-role tests pass. Historical timeout lacks event traces, so exact retrospective attribution is not claimed. [HR_SOURCE_DOWNLOAD_RACE](HR_SOURCE_DOWNLOAD_RACE.md) retains the limitation and failed baseline.

## Performance

Fresh current ATSv2 local API samples, after complete suites finished:

| Records | Applications page ms /bytes /rows | Board ms /bytes /cards | Analytics ms /bytes |
|---:|---|---|---|
|0|16.0 /102 /0|16.6 /1,013 /0|16.4 /2,751|
|5,000|21.6 /23,749 /30|55.1 /66,687 /80|499.5 /2,840|
|50,000|43.4 /23,744 /30|266.6 /66,689 /80|4,956.0 /2,871|

At50k legacy Applications remains162,222,693bytes/50,000rows/8,267.8ms. Page queries examine31keys/documents; all15 role/scope comparisons agree. Ranking/analytics still scan the scoped cohort; analytics remains about5seconds in this one local sample, with its10s deadline preserved. This is neither hosted/p95 nor isolated server peak memory. Exact Server-Timing/query/memory/limitations: [HR_FINAL_API_BENCHMARK](HR_FINAL_API_BENCHMARK.md).

The already completed production-build browser comparison is retained in [HR_PERFORMANCE_MEASUREMENTS](HR_PERFORMANCE_MEASUREMENTS.md), not rerun/rebranded as current isolated React CPU. Historical5k table:5000rows/16.2MB/6,809ms paint/2,516ms maximum long task → bounded30rows/23.7KB/~368ms navigation-to-two-frame paint/54ms task. At50k the old baseline FAILED_OR_TIMEOUT; no invented OOM/render number. Current full frontend408 proves current behavior/contracts separately.

## API/model/frontend additions

- Existing legacy list/CRUD contracts remain compatible; additive scoped v2 pages/board/ranking/analytics, contextual match status/version/hash/reasons and revision409 workflow/event/interview/outbox contracts.
- Canonical Brand/Branch relations and optional legacy-null brand; scopes remain independent of brand selection.
- Default-off Source/manifest/task/Graph receipt/checkpoint/signed-relay models and explicit local DDL inventory. Manual Source retries add bounded counter/private command hash only, no backfill/new automatic index.
- `POST /api/hr/cv-intake/:id/retry` exact hash/ISOrevision/UUID, current read+create/original-creator/linked-parent authority, replay without PUT/reset; readonly `/app/recruitment/cv-intake/:id` plus queue view and safe resume.
- Explicit Source approval preserves corrected confirmed facts/provenance; unknown/unreviewed facts remain missing, not real0. Original download/preview stays Bearer/current-scope/hash/no-store/private.
- Source OCR bridge reuses actual bounded native engine only if approved server bindings exist; null confidence/evidence/HR confirmation. No automatic OCR/AI/storage/worker startup or real new intake.
- HR errors store safe translation keys; raw backend/provider/axios diagnostics do not become user messages. Shared preview callback is additive; fresh Source downloads do not reuse revocable previews.

Full contracts and compatibility/rollback notes are linked from the tracker and [HR_RELEASE_E2E_MATRIX](HR_RELEASE_E2E_MATRIX.md).

## External setup / genuine decisions

1. **Storage / scanner before real CVs:** approved existing private object provider with prefix least privilege/public denial/encryption/residency/retention/versioned backups/redeploy+restore evidence. Exact optional `HR_CV_STORAGE_PROVIDER`, `HR_CV_STORAGE_ENDPOINT`, `HR_CV_STORAGE_BUCKET`, `HR_CV_STORAGE_REGION`, `HR_CV_STORAGE_ACCESS_KEY_ID`, `HR_CV_STORAGE_SECRET_ACCESS_KEY`, `HR_CV_STORAGE_SESSION_TOKEN` adapter names are in HR_PRIVATE_STORAGE_CONTRACT; do not send secret values in chat/repo. Actual clamscan executable/fresh definitions/clean+EICAR/outage/recovery and bounded Native runtime binding EXT-AV-001 remain unavailable. An env value alone does not wire the default-off Source profile.
2. **Retention decision:** choose dependency409 for linked Candidate deletion or explicit archive/restore with preserved scoped Applications/originals; define legal duration/basis/delete authority. No automatic CV/history TTL, mass migration or inferred destructive deletion. AUD-030/051 remains OPEN until this genuine policy decision.
3. **AI:** approved server key/model, truthful prices/budgets/consent/residency/minimized CV review authorization; `HR_AI_PROVIDER`, `HR_AI_MODEL`, `HR_AI_DAILY_BUDGET_USD`, `HR_AI_INPUT_USD_PER_MILLION`, `HR_AI_OUTPUT_USD_PER_MILLION`, server `OPENAI_API_KEY` and bounded limits per HR_AI_PROVIDER_CONTRACT. Real E2E not PASS. No key is configured/read into reports.
4. **Outlook:** approved single tenant/client/mailbox object IDs, secure credential, Mail.Read application consent, actual Exchange/Entra least-privilege mailbox restriction, fixed existing current-scope worker actor and live delta/attachment/revocation tests. Approved list alone is not tenant access restriction proof.
5. **Career sources:** company/partner/API/admin approval, actual KFC/Pizza Hut/JobSearch form destination/mailbox/GoogleForms/export schema and approved Job mapping. Default-off signed relay interface is ready for an approved owner integration, not proof of a first-party website API. No unauthorized scraping/login bypass/private CV collection.
6. **OCR / email / hosting:** actual deployed Native Tesseract/model directory/resources if OCR offered; authorized SMTP receipt/bounce evidence; approved worker bindings/DDL/quota/runtime. Actual hosting metadata/health/deployment is not verified here.
7. **DB:** [HR_DB_RELEASE_PREPARATION](HR_DB_RELEASE_PREPARATION.md): inventory, recoverable backup/restore, duplicates/index conflict preflight, additive DDL window/approval and no guessed legacy department snapshot. Legacy HR per-account repair remains separate, never mass role rewrite. New helper can apply only an exact owned loopback fixture, not production.

**Next point:** external evidence/setup and the explicit Candidate deletion/retention decision. Do not repeat completed packages or enable real ingestion prematurely. Roll-forward or disable gated new providers/ingestion while retaining current scoped/private reads; never roll back to public uploads/foreign parent/privilege-escalation holes. No production push/deploy authorization is implied by this local completion report.
