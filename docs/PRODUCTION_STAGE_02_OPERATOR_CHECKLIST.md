# Production Mərhələ 2 — təhlükəsiz aktivləşdirmə checklist-i

**Heç biri bu task-da production-da icra edilməyib.** Push, deployment, DB/secrets/hosting ayarları dəyişiklikləri üçün ayrıca icazə lazımdır. Render Auto Deploy-un bağlı olduğu operator tərəfindən bildirilib; Vercel vəziyyəti təsdiqlənməyib. Lokal commit-lər saxlanır.

## 1. Runtime identity

- Render service ID, live deployment SHA/image digest, root directory, build/start command, actual Node major, branch/proxy metadata-sını values/secrets olmadan təqdim et.
- `/ready`404-ü local route və actual artifact ilə tutuşdur; service restart/redeploy-ni bu mərhələdə icra etmə.
- Approved release zamanı Node24 engines/.nvmrc/lockfile uyğunluğunu saxla; `MONGO_URI` və ya `CS`, production `JWT_SECRET`, port binding-i secret store-da valid olsun. `RENDER_GIT_COMMIT` metadata-sını və optional full SHA `INOP_BUILD_SHA`-nı reviewed deployment receipt ilə bağla.

## 2. Provider seçimi və uyğunluq

- Konkret S3-compatible vendor/endpoint/region/bucket seç və owner approval receipt-i ver. Bu task yalnız protokol hazırlığı təsdiqidir; real vendor/credentials seçilməyib.
- Private bucket: all4 block-public-access flags true, Versioning Enabled, conditional PutObject, version-specific GET/DELETE, AES256 SSE receipt. Unsupported API üçün guard söndürülmür; ayrıca uyğunluq işi lazımdır.
- Ən az səlahiyyət: yalnız approved bucket audit/evidence prefix-i üzrə PutObject/GetObjectVersion və reviewed cleanup üçün DeleteObjectVersion; bucket policy/versioning **read** API-ləri üçün səlahiyyət. Account-wide admin/public ACL və list-all-object səlahiyyəti verilməməlidir. Provider-in öz IAM modeli üzrə owner review tələb olunur.
- Backend secret store-da tələb olunan adlar STORAGE sənədindədir; values repo/chat/artifact-a daxil edilmir. Production-u aktivləşdirməzdən əvvəl uyğun staging-də private/version/conditional-write/receipt/hash/timeout/IDOR smoke keçirilməlidir.
- `PRIVATE_BUCKET_APPROVED=true` təkbaşına smoke deyil; read-only probe faktiki bucket konfiqurasiyasını da yoxlayır. Runtime bootstrap register edir, enable/credentials yaratmır.

## 3. 12 ailə və real inventar

Mərhələ1 `PRODUCTION_STAGE_01_TEMPLATE_INVENTORY.json` hash/version xəritəsi qalır: HR66/71/35,Servis94/79/61,Standart190/123/71,HSE52/19/29. KFC HRsource-v2/Servisservice-source-v2; cəmi12family/890meyar. Real template/revision/binding active statusu UNVERIFIED-dir.

Approved snapshot: templates/revisions/bindings(hr/service/standard/hse), mövcud restaurants, office/warehouse registry, users/profiles, assignments və grants. GFC parent-dir; brand IDs kfc/pizza-hut/simit-sarayi. Real ad/obyekt/user uydurulmur. HSE object və restaurant ayrı saxlanır. Matrix tenant×direction×brand×restaurant/object×operation ölçülərində owner tərəfindən təsdiqlənir.

```bash
node Backend/scripts/auditProvisionDryRun.cjs --snapshot APPROVED_INVENTORY.json
node Backend/scripts/auditIndexDryRun.cjs --snapshot APPROVED_INDEX_INVENTORY.json
```

CLI-lər offline/writes0/apply-disabled-dir. Dolu sintetik inventar real production mövcudluğunu sübut etmir. Missing/conflict exit2 safety gate-dir. Cari binding-in revision hash/versiyası effektiv current source-a uyğun olmalıdır; valid tarixi KFC revision-u current versiya kimi yenidən sertifikatlaşdırmaq olmaz.

Production apply yalnız inventory digest + backup receipt + change ticket/operator approval + reviewed rollback planı ilə mövcud authorized provision endpoint-lərindən ayrıca əməliyyatdır. Admin/audit-manager və all-scope template management permission saxlanır. Yaradılmış template/revision/binding IDs, actor createdBy/publishedBy və timestamps, request ID, returned hash/version və no-op təkrar nəticəsi change log-da saxlanır. Current-binding mismatch409 manual review-dir; köhnə revision/answers/history overwrite/delete/rescore edilmir. Provision üçün yeni avtomatik seed və ya apply CLI yoxdur.

## 4. Indekslər, backup və rollback

- Mövcud7nonunique plan dəyişmir. Live listIndexes/model mapping, staging explain/result equality/selectivity/write-capacity baseline və change approval tələb olunur; runtime autoIndex/autoCreate false qalır.
- Rolloutdan əvvəl immutable encrypted DB+evidence-version consistency manifest, integrity hashes və izolə staging restore olmalıdır. Lokal15collection45doc rehearsal production backup deyil.
- Index rollout bir-bir, yalnız approved yeni adlar üçün; rollback yalnız həmin newly-created nonunique indeksləri drop edir. Əvvəlki/unique constraint-lər silinmir.
- Template rollback istifadə edilmiş revision/history-ni silmir; app rollback seçilmiş snapshot formatını oxuyan compatible SHA tələb edir. DB və evidence uyğunsuz versiyalara ayrı qaytarılmır.

## 5. Smoke və monitoring

- Ayrı icazədən sonra altı report ailəsində question/section/final foto, üç sənəd, finding/action evidence, authorized byte/hash/version read, report və XLSX istinadlarını yoxla.
- Cross-tenant/direction/brand/restaurant/HSE object, changed evidence ID və revoked account/grant üçün deny; MIME/size/timeout/hash mismatch/public URL bypass yoxla. Upload success və ya `/ready`200 təkbaşına release PASS deyil.
- Health200, ready200/503, minimal version identity; DB connectivity, storage/export errors, auth denial, slow analytics və fatal restart üzrə approved collector/dashboard/owner/retention təsdiqi.
- `API_REQUEST_LOG_ENABLED` yalnız reviewed operational config ilə aktivləşdirilir. Raw query/body/token/PII/provider key loglanmır; yeni SLA/alert threshold yaradılmır. Bucket readiness probe API xərci və polling intervalı qiymətləndirilir.
- Mandatory production gate-lər tamamlanmadan production-ready PASS, push/deploy yoxdur. Bu checklist-in mövcudluğu əməliyyat icazəsi deyil.
