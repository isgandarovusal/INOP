# Paket 09 — final production operator checklist

Bu prosedur production-da avtomatik icra edilməyib. Lokal QA/CI PASS production credentials, real smoke və deployment approval-u əvəz etmir. Məxfi values source/log/artifact-a yazılmır.

| Addım | Operatorun təqdim edəcəyi sübut | Gate |
|---|---|---|
| 1. Release/inventory | Approved code SHA, CI run URL, dependency audit timestamp; DB/provider/object inventory receipt | Təsdiqlənməmiş canlı inventarla write yoxdur |
| 2. Backup/restore | Encrypted immutable DB backup + evidence object versions, integrity manifest, staging restore nəticəsi | Lokal 15 collection/45doc rehearsal live production backup sertifikatı deyil |
| 3. Index dry-run | Current collection indexes JSON, offline plan SHA; staging explain/selectivity/write-capacity ölçməsi | Production create/drop yalnız reviewed approved planla |
| 4. Template provision | HR3+Servis3+Standart3+HSE3 source digest/version/published bindings inventarı | Məlumat yoxdursa create; identical hash/version no-op; conflict manual review |
| 5. HSE obyektlər | Canonical real office/warehouse IDs və registry owner təsdiqi | Saxta restoran/obyekt/ad yaradılmır |
| 6. Auditor grants | Approved tenant/direction/brand/restaurant/HSE object/user/operation matrix | Profil/rol/assignment uyğunsuzluğu, duplicate və revoked grant aktiv sayılmır |
| 7. Storage binding | Təsdiqlənmiş private durable versioned provider factory, credential binding, capability/receipt yoxlaması | Missing provider 503 qalır; public/local production fallback yoxdur |
| 8. Real storage smoke | Altı report ailəsində authorized photo+3documents, byte hash/version, download/ownership və denied-IDOR nəticələri | Real upload/download olmadan PASS yoxdur |
| 9. Monitoring | Health/readiness, API/export/storage/auth/analytics/DB redacted event toplama və operational dashboard sübutu | Təsdiqlənməmiş alert threshold/SLA avtomatik aktivləşdirilmir |
| 10. Rollback rehearsal | Compatible application SHA, new index names, provision log və restore procedure | Köhnə audit/snapshot/answers/history silinmir və yenidən score edilmir |
| 11. Deployment approval | Bütün mandatory gate-lər PASS və ayrıca istifadəçi təsdiqi | Bu task manual deploy etmir |

## Read-only plan əmrləri

```bash
node Backend/scripts/auditProvisionDryRun.cjs --snapshot APPROVED_INVENTORY.json
node Backend/scripts/auditIndexDryRun.cjs --snapshot CURRENT_INDEX_INVENTORY.json
```

Bu CLI-lər offline JSON oxuyur; production DB-yə qoşulmur/yazmır. Snapshot secrets, passwords, tokens, raw file keys və fayl bytes saxlamamalıdır. Plan digest-i, inventory tarixi, backup receipt, change ticket, operator identity və rollback istinadı qeyd edilir. Empty inventory production-ready deyil.

## Storage və monitoring konfiqurasiyası

Mövcud storage müqaviləsi `AUDIT_EVIDENCE_STORAGE_PROVIDER`, `AUDIT_EVIDENCE_STORAGE_ENABLED=true`, approved bootstrap registration və adapter-in `credentialsReady=true` təsdiqini tələb edir. Konkret provider seçilmədiyindən credential variable adları uydurulmur. `NODE_ENV=production` /Render zamanı local write fallback yoxdur.

Operator approved provider-də ifAbsent put, private/durable/versioned/conditional-write capability-ləri, bounded get, cancellation/timeout, versioned remove/receipt və byte SHA-256/size/MIME müqaviləsini yoxlayır. Bu konfiqurasiya yalnız hazırdır deyə real smoke PASS sayılmır. Dəyişdirilməmiş audit/evidence IDs və metadata qorunur.

`/health` liveness-dir. `/ready` DB connectivity, writable transaction topology və configured storage üçün 200/503 qaytarır, həmişə productionSmokeVerified=false göstərir. Template/object/grant provision ayrıca gate-dir. Readiness smoke/storage/provision sertifikatı deyil.

`API_REQUEST_LOG_ENABLED=true` redacted structured request event-lərini aktivləşdirir: request ID, method/group/status/duration. Collector, rotation, access/retention, dashboard və alert ownership operator tərəfindən təsdiqlənməlidir. Bounded in-process counters durable production monitoring sistemi kimi təqdim edilmir. Fatal event nonzero exit, DB startup failure, storage/export error, auth denial və slow analytics intervalı request ID ilə izlənir; raw URL/query/body/credential/PII loglanmır.

## Real smoke matrisi

HR, Servis, Standart, HSE restoran, HSE ofis və HSE anbar üçün ayrı approved synthetic audit seçilir. Question/section/final photo, üç müstəqil document slot, finding/action execution evidence; report və XLSX istinadları; byte hash/version; cross-tenant/direction/brand/restaurant/HSE object deny və revoked-token/grant deny yoxlanır. N/A/null və hər istiqamətin scoring-i dəyişdirilmir. Private key/provider credentials export və public URL-də görünməməlidir.

Production retention/purge/SLA siyasəti bu paketdə yaradılmır. Qeyri-müəyyən provider yazısında blind retry/remove deyil, reviewed orphan reconciliation lazımdır. Backup DB və evidence logical snapshot-larını birlikdə əhatə etməlidir.

## Rollback sərhədi

Yalnız bu approved release planı ilə yaradıldığı sübut edilmiş nonunique indeks drop oluna bilər; əvvəlki/unique indekslərə toxunulmur. Source revision-dan audit istifadə edirsə pointer/history silinmir. Application rollback snapshot formatını oxuya bilən compatible versiyaya olmalıdır. DB və storage geri dönüşü eyni approved consistency manifest-i ilə aparılır. Production restore və ya avtomatik data migration bu tapşırığın hissəsi deyil.
