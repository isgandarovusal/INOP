# Production Mərhələ 1 — operator məlumatları və icra planı

Bu sənəd **icra icazəsi deyil**. Production DB/secrets/provision/index/backup/deployment əməliyyatı aparılmayıb. İnventar təsdiq edilənədək values deyil, adlar, opaque ID-lər və receipt-lər təhlükəsiz kanalda təqdim edilməlidir. Şəxsi məlumatlar və snapshots repo/artifact-a commit edilmir.

## Operatorun təqdim etməli olduğu konkret məlumatlar

| Resurs | Tələb olunan metadata və sübut |
|---|---|
| Hosting | Render service ID, Vercel project/team ID, production branch, root/build/start command, region, live backend SHA, frontend alias→deployment SHA; hər iki platformada auto-deploy disabled sübutu |
| Domains/CORS | Approved frontend/custom domain origins (scheme/host/port), API base path, DNS/TLS owner, non-browser/mobile integrations, CORS preflight və credential policy |
| MongoDB | Provider/cluster ID və region, DB adı, server versiyası/FCV, replica set/mongos topology, TLS/network allowlist, application user privileges, read-only export səlahiyyəti; connection secret-in dəyəri yox |
| Storage | Approved provider/SDK, bucket/container ID və region, private/versioning/conditional-put imkanları, bootstrap/credential-binding owner, key/version retention siyasəti; credential values yox |
| Templates | Hər 12 family üçün template ID/status, publishedRevisionId, revision state/content, binding ID, source hash/version; metadata observedAt, release SHA və export digest |
| Brendlər/restoranlar | Mövcud canonical restaurant ID, organizationId=`gfc`, brandId=`kfc`/`pizza-hut`/`simit-sarayi`, aktivlik/ərazi; master-data owner təsdiqi. GFC ayrıca brend deyil |
| Ofislər/anbarlar | Mövcud canonical object ID, organizationId, objectType=`office`/`warehouse`, approved name/location/active, registry owner. Restoran kimi yaradılmır |
| Auditorlar | Opaque user ID, cari role/isActive, auditor profile `_id`/organizationId/direction/directions/active/version və təsdiqlənmiş direction-change provenance. Password/email/token təqdim edilmir |
| İcazələr | Approved user×tenant×direction×brand×restaurant/object×operation matrisi; GFC admin/manager istisnalarının əsası; audit assignment ID/auditId/auditor/status. HSE grant `_id=userId:objectId`, userId/objectId/active/writeVersion/grantedBy |
| Indekslər | Model→real collection mapping, sanitized current `listIndexes` JSON, explain executionStats, cardinality/write-load/capacity/replication baseline, export timestamp/digest |
| Backup | Encrypted immutable backup receipt/UTC/source SHA, DB+evidence version consistency manifest, integrity hashes, RPO/RTO/retention owner, izolə staging restore target və nəticə |
| Monitoring | Collector/dashboard ID, redacted event schema, access/retention owner, health/readiness monitor paths, approved alert routing və thresholds; real müşahidə nəticələri |

GFC kataloqunun brend ID-ləri kodda təsdiqlənib; canlı restaurant, office, warehouse və user sayları **məlum deyil**. Boş/çatışmayan inventar “0 real obyekt var” kimi göstərilmir. Real production inventarı bu task-da alınmayıb.

## Storage: əvvəl adapter, sonra credential və smoke

`Backend/services/auditEvidenceStorage.service.js` factory registry-si boş başlayır. `registerProvider` çağırışları yalnız testlərdədir; server bootstrap konkret production adapter qeyd etmir. **Sadəcə iki environment variable və credential əlavə etmək production upload-u açmayacaq.** Approved provider seçildikdən sonra ayrıca reviewed adapter/bootstrap implementasiyası və bütün storage/IDOR/report testləri tələb olunur. Bu seçim hazırda BLOCKED-dir.

Qəbul şərtləri:

1. Private, durable, versioned və conditional-write provider; `credentialsReady=true` yalnız yoxlanmış binding ilə. `AUDIT_EVIDENCE_STORAGE_PROVIDER` adapter ID-si ilə eyni, enable explicit olmalıdır. Credentials backend secret store-dadır; `VITE_*` sahəsində deyil.
2. Object key `audit/evidence/<auditId>/<UUID>`, serverdə parent audit ownership və cari tenant/direction/brand/restoran/HSE object icazəsi. Eyni bucket tenant isolation-un əvəzi deyil; private bucket və API authorization birlikdə tələb olunur.
3. `put(ifAbsent:true)`; private receipt və bounded 1–128 simvolluq version; bounded `get` ilə SHA-256/size uyğunluğu. Maximum fayl ölçüsü 5 MiB; mövcud MIME/signature və Office ZIP decompression guard-ları qorunur. Metadata audit, criterion/section/finding/action və üç müstəqil document slot ilə bağlı qalır.
4. 8 saniyəyədək provider timeout/AbortSignal, maksimum 2 aktiv əməliyyat; gecikmiş əməliyyat dayandığı sübut olunmayınca slot saxlanır. Unknown receipt/failure 503/409 olur; uğurlu upload görüntüsü və local production write fallback yoxdur.
5. Sonradan ayrıca təsdiqlənən real smoke: altı audit ailəsində question/section/final photo, üç sənəd, finding/action evidence; authorized download və hash/version; foreign tenant/direction/brand/restaurant/HSE object, revoked user/grant və dəyişdirilmiş evidence ID üçün deny. Private keys/credentials hesabat və Excel-ə çıxmamalıdır.
6. Failed upload/orphan cleanup blind retry/delete ilə deyil, reviewed reconciliation ilə; retention/purge siyasəti owner tərəfindən təsdiqlənməlidir. Köhnə local evidence istinadları silinmir/yolları dəyişdirilmir.

## Provision: yalnız offline plan hazırdır

Read-only CLI Mongo-ya qoşulmur, apply yoxdur. Snapshot müqaviləsi:

`templates[]`, `revisions[]`, `bindings:{hr:[],service:[],standard:[],hse:[]}`, `objects[]`, `grants[]`, `profiles[]`, `users[]`, `restaurants[]`.

```bash
node Backend/scripts/auditProvisionDryRun.cjs --snapshot APPROVED_INVENTORY.json
node Backend/scripts/auditIndexDryRun.cjs --snapshot CURRENT_INDEX_INVENTORY.json
```

İlk CLI maksimum 32 MiB, ikinci 4 MiB lokal JSON qəbul edir. Snapshot-da yalnız validatorun tələb etdiyi təhlükəsiz metadata saxlanır; production URI/token/password/fayl bytes yoxdur. Hər iki CLI `writes=0`; exit 2 missing/conflict/unknown deməkdir, apply icazəsi deyil. Sintetik inventar PASS olması production snapshot-un təsdiqi deyil.

Operator mərhələsi: inventory timestamp/digest → integrity-verified consistent backup → reviewed plan və change ticket/approval → yalnız missing approved binding üçün mövcud provision endpoint → hash/version/published pointer/current grants verifikasiyası → təkrar dry-run no-op. Duplicate, köhnə revision və ya ziddiyyət manual review-dir; replace/seed/delete aparılmır. Source istifadə edən audit olduqda history/pointer kor-koranə geri çevrilmir. Obyekt və grant çatışmırsa uydurulmur; timeout zamanı blind retry edilmir.

## Yeddi indeks: ölçmə, rollout və geri dönüş

Əsas mənbə `Backend/config/auditOperationalIndexes.json`; aşağıdakılar hamısı **nonunique təklifdir**, canlı mövcudluq UNVERIFIED-dir:

| Ad | Query / key |
|---|---|
| audit_source_latest_v1 | auditExecution: auditId, templateRevisionId, status, updatedAt:-1, _id:-1 |
| audit_direction_date_v1 | audit: auditType, archivedAt, date |
| audit_restaurant_direction_date_v1 | audit: restaurantId, auditType, archivedAt, date |
| audit_hse_object_date_v1 | audit: hseObjectId, auditType, archivedAt, date |
| audit_action_status_due_v1 | auditAction: auditId, status, dueDate |
| audit_finding_status_v1 | auditFinding: auditId, status |
| audit_evidence_parent_v1 | auditEvidence: auditId |

Index plan key-sırasında uyğun full nonunique mövcud indeksə no-op verir; unique/partial/sparse/hidden/collation/name/key ziddiyyəti manual review/BLOCKED-dir. Bu indekslərdə yeni unique constraint olmadığından duplicate sənədlər silinmir; source identity duplicate-ləri ayrıca provision review-da qalır. Startup autoIndex/autoCreate false-dur.

Rollout ardıcıllığı: real snapshot/model mapping → eyni data distribution-a malik izolə staging restore → permissions aggregation-dan əvvəl qalmaqla nəticə equality/explain və write/storage/replication baseline → operator approval → **bir indeks** → build/CPU/disk/replica lag və query result verifikasiyası → növbəti indeks. Aşağı selectivity və write overhead ölçülmədən avtomatik bütün planı tətbiq etmək olmaz. Key-lər tenant field-i ehtiva etmir deyə tenant filter çıxarıla bilməz; indeks authorization mexanizmi deyil.

Rollback yalnız bu reviewed change log-da yeni yaradıldığı sübut edilmiş nonunique adlar üçündür. Əvvəldən mövcud/equivalent/unique indekslər silinmir. Lokal hinted explain/result equality/rollback PASS production optimizer/SLA sübutu deyil.

## Backup, monitoring və tətbiq rollback ardıcıllığı

1. DB və evidence versiyalarının eyni logical snapshot-a uyğun immutable encrypted backup receipt-i, integrity manifest və owner təsdiqi alınır. Quiescent QA mongodump real multi-writer production backup strategiyasını təsdiqləmir.
2. İzolə staging restore: document/revision/snapshot/approval/closure/evidence əlaqələri, hash və index yoxlanır. Production restore edilmir. Restore capacity, encryption/access və RPO/RTO ayrıca təsdiqlənir.
3. Compatible application SHA əvvəlcədən seçilir; yeni snapshot-u köhnə app oxuya bilmirsə rollback planı BLOCKED-dir. DB və storage ayrı-ayrı uyğunsuz nöqtələrə qaytarılmır. Template rollback istifadə olunan revision/history-ni silmir; index rollback yalnız yuxarıdakı yeni adlara aiddir.
4. `/health` yalnız liveness-dir; canlı `/ready` 404 problemi əvvəl live SHA/route/proxy müqayisəsi ilə müəyyən olunmalıdır. Düzgün ready handler DB connectivity+writable transaction topology+storage config yoxlayır; hətta 200 olsa `productionSmokeVerified:false`, provision və real upload sübutu deyil.
5. `API_REQUEST_LOG_ENABLED=true` yalnız təsdiqlənmiş collector/access/retention ilə planlaşdırılır. Request ID, method/group/status/duration; raw URL/query/body/PII/token/provider key loglanmır. DB connectivity, storage/export failure, API 5xx, authorization denial, slow analytics və fatal restart event-ləri izlənir. In-process counters durable monitoring deyil; approved thresholds olmadan alert/SLA aktivləşdirilmir.
6. Sonra ayrıca deployment təsdiqi və controlled rollout tələb olunur. Bu task provider ayarını dəyişmir, auto-deploy və manual deployment başlatmır.
