# Paket 08 — production readiness və operator runbook

Production status **BLOCKED**. Bu sənəd canlı mühitdə tətbiq edilib kimi təqdim edilmir. Production DB, secrets, provision və manual deploy bu task-da icra edilmir. Lokal funksional QA ayrıca sənəddədir.

## Gate

| Məcburi yoxlama | Status | Sübut / tələb |
|---|---|---|
| Lokal build/lint | PASS | TypeScript/Vite build; frontend 0 error / 9 əvvəlki warning; dəyişən backend 33 fayl lint |
| Lokal Audit backend/browser/RBAC/analytics/export | PASS | 55/55 backend, 21/21 browser; 36 center, 72 report, 100 visual hal; QA sənədi |
| Geniş legacy backend | BLOCKED | 519 PASS / 44 əvvəlki FAIL; yeni assertion fərqi 0; tam suite yaşıl deyil |
| Production storage adapter/credentials | BLOCKED | Bu mühitdə hazır provider/secret binding yoxdur |
| Real production upload/download + tenant ACL | NOT TESTED | Səlahiyyətli operatorun synthetic smoke-u tələb olunur |
| Published source template/revision/binding inventarı | BLOCKED | Canlı read-only inventory əlçatan deyil |
| HSE ofis/anbar obyektləri və grant-lar | BLOCKED | Production inventarı və təsdiqlənmiş canonical obyekt ID-ləri yoxdur |
| Auditor/brand/restaurant/direction grants | BLOCKED | Canlı assignment/profil inventarı yoxdur |
| Production transaction topology/index/validator uyğunluğu | NOT TESTED | Restore/staging-dən explain və transaction smoke; heç bir index avtomatik tətbiq edilmir |
| Monitoring/logging | NOT TESTED | Səlahiyyətli operator alert/trace/503/422/5xx izləməsini təsdiqləməlidir |
| Backup/restore/rollback | NOT TESTED | Versiyalı backup və restore rehearsal tələb olunur |
| Deployment prosedurunun real sınağı | NOT TESTED | Ayrı operator təsdiqi və staged rollout; manual deploy edilməyib |
| Production məlumat migration-u | NOT APPLICABLE | Bu paket migration və köhnə score rescore tələb etmir |
| GFC vahid HSE/Audit faizi | NOT APPLICABLE | Metodologiyalar birləşdirilmir; null qəsdən qorunur |

## Storage konfiqurasiyası və real smoke

Mövcud `auditEvidenceStorage.service` müqaviləsi:

- `NODE_ENV=production` və ya `RENDER=true` local write fallback-ını bağlayır.
- `AUDIT_EVIDENCE_STORAGE_PROVIDER` yalnız bootstrap-da əvvəlcədən qeydiyyatdan keçmiş provider ID-si olmalıdır.
- `AUDIT_EVIDENCE_STORAGE_ENABLED=true` ayrıca tələb olunur; factory adapter-i `credentialsReady=true` bildirməlidir. Konkret cloud provider seçilmədiyi üçün yeni uydurma secret adları yaradılmır. Provider-a aid credentials yalnız təsdiqlənmiş secret binding vasitəsilə verilməlidir.
- Private/durable/versioned/conditionalWrites capability-ləri, conditional put, version receipt və bounded get/hash/size verifikasiyası tələb olunur. Yeni keys `audit/evidence/<audit MongoID>/<UUID>` müqaviləsi ilə tenant/parent əlaqəsinə bağlanır. Legacy local reference-lər səbəbsiz dəyişdirilmir.
- Konfiqurasiya yoxdursa upload 503-dür; UI saxta uğur göstərməməlidir. Production provider PASS elan edilmir.

Səlahiyyətli smoke proseduru (bu task-da icra olunmur):

1. Backup və explicit synthetic restaurant/office/warehouse test obyektləri, scoped writer və müstəqil reviewer seçilir. Heç bir real audit nəticəsi üzərində sınaq aparılmır.
2. HR/Servis/Standart və üç HSE obyektində məlum SHA-256-lı kiçik PNG + üç ayrı sənəd yüklənir. Metadata/audit/version/slot sahələri və bytes download hash-i müqayisə edilir.
3. Başqa tenant, direction, brand, restaurant və HSE object istifadəçisi ilə ID dəyişdirilərək download/export 403/404 olmalıdır. Grant/account ləğvindən sonra təkrar giriş rədd edilməlidir.
4. Yanlış MIME, extension, ölçü, parent evidence, provider timeout, receipt/hash/version uyğunsuzluğu və unavailable credentials fail-closed olmalıdır. Provider-in public URL ilə bypass olunmadığı sübut edilməlidir.
5. Draft/resume/complete, proof, independent review/closure və altı XLSX-də evidence metadata yoxlanır. Error üçün request ID, status və redacted error code izlənir; bytes, token, provider key/credential loglanmır.
6. Provider retention/restore və synthetic cleanup ayrıca storage sahibi tərəfindən təsdiqlənir. Uğursuz smoke production gate-i açmır.

## Retention və silinmə

Yeni retention müddəti və avtomatik purge qaydası yaradılmır. Mövcud bağlanmış audit/history dəyişməzdir; audit soft archive orijinal evidence faylını silmir. Provider put-dan sonra DB nəticəsi qeyri-müəyyəndirsə orijinal silinmir; orphan araşdırması yalnız approved dry-run və metadata ilə aparılır. DB write başlamadan əvvəl dəqiq uğursuzluqda yalnız həmin owned upload təmizlənə bilər. Provider remove version-aware-dir. Restore-dan əvvəl DB metadata və storage object version-ları birlikdə inventarlaşdırılmalıdır.

## Provision: offline dry-run, idempotency və versiya yoxlaması

Yeni `Backend/scripts/auditProvisionDryRun.cjs --snapshot LOCAL_JSON` **MongoDB-yə qoşulmur**, apply/write seçimi yoxdur. 32MiB-dən böyük lokal faylı qəbul etmir. Metadata snapshot-un forması:

```json
{"templates":[],"revisions":[],"bindings":{"hr":[],"service":[],"standard":[],"hse":[]},"objects":[],"grants":[],"profiles":[],"users":[],"restaurants":[]}
```

Səlahiyyətli operator yalnız lazım olan metadata və source revision content-ni redacted inventory-də saxlamalıdır; password/token/secret/fayl baytları daxil edilməməlidir. Snapshot repoya commit edilməməlidir. Binding-siz, lakin eyni hash/version source revision-u artıq varsa avtomatik duplicate provision əvəzinə BLOCKED/manual reconciliation qaytarılır. Nəticə input SHA-256, 12 gözlənilən source family binding-i, hash/version, active published pointer, revision source digest uyğunluğu və no-op/provision/manual-review qərarı verir. Exit 0 yalnız təqdim edilən bütün template binding-ləri PASS olduqda; exit 2 unknown/missing/conflict deməkdir. Bu, production sertifikatı deyil və boş obyekt siyahısını “hazır” etmir.

Mövcud idempotent template endpoint-ləri qorunur: `/audit-{hr,service,standard}/templates/:brandId`, `/audit-hse/templates/:objectType`. Təsdiqlənmiş eyni hash/version təkrar icrada eyni template/revision qaytarır. Active pointer dəyişibsə və ya revision ziddirsə 409/manual-review; blind replace yoxdur. Yeni version yeni binding/revision yaratmalıdır; köhnə audit/source save dəyişmir.

Operator planı:

1. Read-only production inventarı + backup hazırlanır, local dry-run/əvvəlki release-plan analiz edilir. Bütün orphan/foreign/digest/pointer problemləri ayrıca həll edilir. Plan digest-i və operator təsdiqi arxivləşdirilir.
2. Yalnız absent və planla təsdiqlənmiş source key-lər mövcud endpoint vasitəsilə provision edilir. Hər addımdan sonra read-only pointer/hash verifikasiyası aparılır. Timeout-da POST-u kor-koranə təkrarlamaq əvəzinə binding inventarı yenilənir.
3. Real ofis/anbar master siyahısı və canonical ID registry-si təsdiqlənir. Mövcud HSE object ID yenidən istifadə edilir; yalnız adı oxşardır deyə Recruitment məkanı və ya restoran avtomatik çevrilmir. Object create random ID qaytardığı üçün ID registry-sinə yazılmamış və ya qeyri-müəyyən POST nəticəsi olan obyekt yenidən yaradılmır; operator reconciliation tələb olunur. Bu prosedur təkrar icrada duplicate obyekt yaratmır.
4. HSE grant `_id=userId:objectId` üçün mövcud PUT eyni əlaqəni yeniləyir, əlavə grant sətri yaratmır. Əvvəl snapshot/version, sonra scoped active auditor/object yoxlaması tələb olunur. Multi-direction dəyişikliyi explicit reason + expectedVersion ilə aparılır; yeni department/brand icazəsi təxmin edilmir.
5. Restoran/brand girişləri mövcud owned/assignment münasibətindən gəlir. Revoked assignment-u təkrar POST ilə avtomatik açılmış hesab etmə; returned status və scope ayrıca yoxlanır. Yeni assignment və revocation-lar approved matrix əsasında aparılır.
6. Read-only dry-run təkrar icra edilir və gözlənilən template-lər no-op/PASS olmalıdır. Obyekt/grant/assignment sayları əvvəlki approved registry ilə müqayisə edilir.

Rollback: DB/storage backup rehearsal və əvvəlki compatible application versiyası əvvəlcədən hazırlanmalıdır. Yeni auditlərin bağlandığı source revision/history silinmir; binding/published pointer geri dəyişdirilməsi yalnız ayrıca reviewed rollback planı ilə mümkündür. Aktiv yeni audit varsa kor-koranə köhnə frontend/backend-ə qayıtmaq olmaz. Bu task avtomatik rollback/migration etmir.

## Analitika və indekslər

Standart/HSE scope-first aggregation 500 audit pəncərəsini ləğv edir. `$match` tenant/direction/assignment/object filter-i `$lookup` və qruplaşdırmadan əvvəl gəlir. 15s server budget və Mongo facet/document memory limitində açıq 422/no-partial cavab verilir. HR/Servis 5000 audit qoruyucu pəncərəsi saxlanır və limitdə 422 qaytarır; bu istiqamətlər üçün səssiz truncation yoxdur.

Production explain üçün mövcud indekslər reviewed restore/staging-də yoxlanmalıdır: Audit filter/date/type/restaurant, Execution auditId/templateRevisionId/status, child auditId və status/dueDate. Bu paket createIndex, validator və production migration icra etmir. 601/701 audit lokal nəticəsi production SLA və ya production peak-memory zəmanəti deyil.
