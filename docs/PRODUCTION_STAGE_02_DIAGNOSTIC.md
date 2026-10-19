# Production Mərhələ 2 — diaqnostika

19 oktyabr 2026, Azərbaycan vaxtı (UTC+4). Repository `isgandarovusal/INOP`, lokal `inop-main` başlanğıcı `517ba41231ae245df64320968840c4d596ba0174`; əvvəlki `5a18bc2` və `517ba412` commit-ləri saxlanıb. GitHub HEAD read-only yoxlamada `72b114fd1c193bfa2529f4569ecd35d7e5f2ee4d` olaraq qalıb. Reset/history rewrite/branch/PR/push yoxdur.

Operator Render Auto Deploy-un söndürüldüyünü bildirib; control-plane çıxışı ilə ayrıca təsdiqlənməyib. Vercel vəziyyəti məlum deyil. **Bu task-da hər halda push/deploy/production DB və secrets dəyişiklikləri qadağandır.**

## Faktlar və fərziyyələrin sərhədi

| Sahə | Fakt | Nəticə |
|---|---|---|
| Lokal runtime | Node v24.19.0; `.nvmrc=24`, hər iki package engines `>=24 <25` | Lokal major müqaviləsi uyğundur |
| CI | Node `.nvmrc`-dən; əvvəlki hosted run39212246965 success | Yeni lokal kod GitHub-a göndərilmədiyindən hosted yoxlanmayıb |
| Backend başlanğıcı | Backend/package.json `start:node server.js`; Docker CMD eynidir | Render-in faktiki start/build komandası UNVERIFIED |
| Lokal `/ready` | Şərtsiz, `/api` router və catch-all-dan əvvəldir | Env-dependent route qeydiyyatı və lokal mount-order xətası tapılmadı |
| Canlı read-only GET | 19.10.2026 11:29 AZT: `/health`200, `/ready`404, `/ready/`404, `/api/ready`401, `/version`404 | `/api/ready` auth cavabı həmin route-un mövcudluğuna sübut deyil |
| Deployment metadata | GitHub status/deployment qeydləri Vercel üçündür; yoxlanmış commit-də check-runs boşdur | Render canlı SHA, service root/image və runtime versiyası UNVERIFIED |
| Storage | Audit factory registry-si boş idi; Recruitment-də ayrıca S3-compatible HTTPS/SigV4 texniki transport var | Yeni dependency/vendor olmadan Audit üçün ayrıca versiyalı adapter və bootstrap hazırlandı |
| Provider qərarı | İstifadəçi S3-compatible adapter hazırlığını təsdiqlədi; real provider seçilməyib | Production endpoint/bucket/credentials seçilmir və aktivləşdirilmir |
| Provision | Dry-run və HR/Servis idempotent endpoint-i tarixi KFC revision-u current binding altında qəbul edə bilirdi | Cari source hash/versiya ayrıca yoxlanır; mismatch409/BLOCKED, tarixçə dəyişmir |

## `/ready` 404 üzrə əsaslandırılmış nəticə

404-ün dəqiq production kök səbəbi **UNVERIFIED** qalır. Lokal kod düzgün route-u həmişə qeyd edir; lokal actual native server eyni Node24/start komandası ilə `/ready`503 qaytarır, çünki production storage bağlıdır. API middleware health/ready-dən sonra mount edilir. Trailing slash probe da404-dür. Storage/DB konfiqurasiyası lokal handler-də503 yaradır,404 yaratmır.

Bu faktlar konkret “köhnə backend” hökmü verməyə kifayət etmir. Mümkün canlı səbəblər: fərqli artifact/entrypoint/root, edge/path yönləndirməsi və ya başqa release. Onları ayırmaq üçün Render service ID, faktiki deploy SHA/image digest, root/build/start command, Node runtime və proxy route metadata-sı lazımdır. Bunlara giriş olmadığı üçün service restart/redeploy və credentials axtarışı edilməyib.

Gələcək diaqnostika üçün `/version` yalnız təsdiqlənmiş formatlı `RENDER_GIT_COMMIT` və ya `INOP_BUILD_SHA`, Node major və contractVersion göstərir. SHA olmadıqda `null`dur; git tarixi, credentials, env dump və daxili yollar göstərilmir. Environment-provided SHA kriptoqrafik artifact attestation deyil; deployment metadata-sı ilə tutuşdurulmalıdır. Bu endpoint hələ production-a çıxarılmayıb.

Yekun read-only təkrar: 19.10.2026 15:12 AZT-də `/health` və `/ready` sorğuları12s timeout oldu, `/version`404 qaytardı. Yalnız bir bounded retry-də15:13AZT `/health`200, `/ready`404 təsdiqləndi. İlk timeout-lar gizlədilmir; bunlardan cold start, platforma problemi və ya SLA haqqında təsdiqlənməmiş nəticə çıxarılmır. Canlı SHA yenə UNVERIFIED-dir.

## Lokal real düzəlişlər

1. Optional S3 protocol bootstrap, strict env validation, private/versioned bucket probe, conditional write, version-specific GET/DELETE və receipt/hash yoxlaması.
2. Storage error code-u saxtalaşdırılsa da provider exception message/cause/stack ötürülmür; sabit sanitized error qaytarılır.
3. Node24, port və database/auth binding startup validasiyası; public minimal runtime metadata; actual operational route testləri.
4. Readiness configured storage ilə canlı read-only availability-ni ayrı göstərir. Probe failed/negative/timed-out olduqda503; `productionSmokeVerified:false` həmişə qalır.
5. Provision dry-run və HR/Servis current-binding idempotency yoxlamasında dəqiq current source version/hash guard-u; valid tarixi revision oxuma/scoring müqaviləsi dəyişmir.

Recruitment-in biznes kodu, Main Dashboard, dörd Audit scoring/source kataloqu, mövcud audit snapshot-ları və tarixçə dəyişdirilməyib. Recruitment storage modulunda yalnız təkrar istifadə olunan texniki signer/transport interfeysi genişlənib; əvvəlki known-answer HMAC və regressiya testləri saxlanır.
