# Production Readiness — Mərhələ 1: sübutlu inventar

19 oktyabr 2026. Repository `isgandarovusal/INOP`, branch `inop-main`, başlanğıc lokal/remote HEAD `72b114fd1c193bfa2529f4569ecd35d7e5f2ee4d`. Başlanğıc iş qovluğu təmizdir.

**Hazırlıq nəticəsi: PARTIAL. Production readiness: BLOCKED.** Production control-plane, DB və secrets çıxışı yoxdur. Bu sənəd mövcudluq iddiasını kod imkanından ayırır. Production-da yazma, provision, indeks yaratma, backup/restore və deployment edilməyib.

## Git, CI və avtomatik deployment

`git ls-remote origin refs/heads/inop-main` başlanğıc HEAD-i təsdiqlədi. Son uğurlu GitHub-hosted run [39212246965](https://github.com/isgandarovusal/INOP/actions/runs/39212246965), tested SHA `1d8cc8871a0ca0849dd1f814d3095bc86c4d1384`, conclusion `success` olaraq yenidən API-dən yoxlanıldı. Tested SHA ilə `72b114f` arasında yalnız `docs/**` dəyişib. Cari HEAD üçün ayrıca backend qaçışı olduğu iddia edilmir. Əvvəlki hosted nəticə: backend 2007/2007, browser 41/41, build/lint və dependency audit PASS; bu mərhələnin yeni testləri QA sənədindədir.

GitHub Deployments API-də **Vercel Production deployment `7167842988`**, SHA `72b114fd…`, yaradılma `2026-10-19T07:11:54Z`, `vercel[bot]`, status `success` görünür. Hətta əvvəlki docs-only push production deployment yaradıb. Actions workflow-da deployment addımı olmaması Vercel/Render Git inteqrasiyalarını dayandırmır; `[skip ci]` və docs-only diff deployment təhlükəsizlik zəmanəti deyil.

Operator bu tapşırıqda **“Auto-deploy hələ dayandırılmayıb; lokal commit-ləri saxla”** qərarını verdi. Buna görə yeni commit-lər yalnız lokal saxlanılır; push edilmir. Bu, əvvəlki push tələbini dəqiqləşdirən cari göstərişdir. Provider auto-deploy ayarları dəyişdirilməyib. Gələcək push üçün operator hər iki platformanın branch/root/build-filter/auto-deploy ayarını təsdiqləməli, deployment başlamayacağını təmin etməlidir.

## Arxitektura: təsdiq səviyyəsi

| Sahə | Faktiki sübut | Status / çatışmayan sübut |
|---|---|---|
| Backend | `https://inop-backend.onrender.com/health` GET 200, `{success:true,status:"ok"}`; mənbədə Render proxy dəstəyi | Host HTTP səviyyəsində əlçatandır. Render service ID, region, plan, image/start command, canlı SHA və auto-deploy ayarı **UNVERIFIED** |
| Frontend | `https://inop-ruby.vercel.app/` GET 200; Vercel GitHub Production deployment qeydi, project link `vercel.com/inop/inop` | Vercel hosting/deployment sübutu var; custom domain, root directory/build env və aliasın dəqiq SHA əlaqəsi **UNVERIFIED** |
| MongoDB | Backend kodu `MONGO_URI` və ya `CS`; Mongoose, `autoIndex:false`, `autoCreate:false`; transaction-capable replica set/mongos tələb olunur | Production URI, DB adı, provider/region, TLS/network restrictions, replica topology, DB user privileges **UNVERIFIED**. HTTP health bunu sübut etmir; DB-yə qoşulunmayıb |
| Storage | Private/versioned/conditional-write müqaviləsi və təhlükəsiz 503 kodu mövcuddur | Provider/bucket/container, bootstrap adapteri, credentials və real upload/download **BLOCKED/UNVERIFIED** |
| Domen/CORS | İki yuxarıdakı host müşahidə olunub; `Backend/server.js` `cors()` istifadə edir | Canlı health-də `Origin:https://unauthorized.invalid` sorğusuna `Access-Control-Allow-Origin:*`. Approved origin siyahısı yoxdur; custom domains/DNS/TLS idarəetməsi **UNVERIFIED** |
| Health/readiness | Canlı `/health` 200; canlı **`/ready` 404** | Liveness müşahidəsi **PASS**, readiness müqaviləsinin canlı mövcudluğu **BLOCKED**; işləyən backend SHA/route/proxy operator tərəfindən müəyyən edilməlidir |
| CI | Pinned actions, contents:read, production secrets-siz Mongo 27018, QA; docs-only ignore | Hosted CI **PASS**, hosting deployment inteqrasiyasından müstəqildir |
| Monitoring | Redacted structured logging, opt-in telemetry, health/ready kodu | Real collector, dashboard, alert routing/retention/owner **UNVERIFIED** |
| Backup/rollback | Lokal isolated DB/evidence rehearsal yenidən keçirilib | Production backup ID, integrity, retention, consistent evidence snapshot, staging restore və app rollback **UNVERIFIED/NOT TESTED** |

Dockerfiles və `docker-compose.yml` alternativ lokal build/runtime konfiqurasiyasıdır; onların production-da istifadə edildiyi təsdiqlənməyib. Compose yalnız lokal replica-set init-i nəzərdə tutur, bu task onu işə salmayıb. `Frontend/vercel.json` yalnız SPA rewrite edir; deployment gate təyin etmir.

## Ətraf mühit dəyişənləri

Tam **ad və kod istinadı** siyahısı `PRODUCTION_STAGE_01_ENVIRONMENT_INVENTORY.json`-dadır. Production values və `.env` faylları oxunmayıb. Session-da dəyişənin olmaması production-da olmaması demək deyil. Bütün production presence statusları **UNVERIFIED**-dir.

| Ad | Məqsəd / operator yoxlaması |
|---|---|
| `MONGO_URI` / `CS` | Bir reviewed production binding; URI-ni hesabat/repo/loga çıxarmadan DB/topology/TLS və ən az səlahiyyəti təsdiqlə |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Managed secret binding və token policy; value deyil, mövcudluq/owner/rotation receipt |
| `NODE_ENV`, `PORT` | Production rejimi və platformanın listen portu |
| `RENDER`, `RENDER_SERVICE_TYPE`, `INOP_TRUST_RENDER_PROXY` | Dəqiq platforma hop-u; ümumi trusted XFF zənciri açılmır |
| `VITE_API_BASE_URL` | Frontend build-time public URL; production `/api` hədəfi. Client fallback localhost-dur; bu dəyişənə secret qoyulmur |
| `AUDIT_EVIDENCE_STORAGE_PROVIDER`, `AUDIT_EVIDENCE_STORAGE_ENABLED` | Provider ID və explicit enable; **qeydiyyatdan keçmiş adapter olmadan kifayət etmir** |
| `API_REQUEST_LOG_ENABLED` | Opt-in redacted request logging; collector/retention ayrıca təsdiq tələb edir |
| `HR_NOTIFICATION_WORKER_ENABLED`, `HR_CV_PROCESSING_ENABLED`, `HR_CV_OCR_ENABLED`, `HR_CV_AI_PROCESSING_ENABLED` | Mövcud default-disabled background jobs; bu task aktivləşdirmir |

Kodda configurable CORS origin allowlist yoxdur. Wildcard CORS bearer-token/tenant authorization-un bypass edildiyinə sübut deyil; yenə də approved browser origins və qeyri-browser client tələbləri verilmədən təsadüfi allowlist tətbiq edilmir. Bu dəyişiklik ayrıca compatibility testi ilə hazırlanmalıdır.

## 12 şablon ailəsi

`PRODUCTION_STAGE_01_TEMPLATE_INVENTORY.json` real assessment service-lərinin **effektiv** `sources`, `contentFor`, `verifiedSource` nəticələrindən çıxarılıb. Hər sətirdə source faylı/worksheet, source SHA-256, effektiv content SHA-256, binding key, versiya və say var. Excel source hash ilə redaktə edilmiş content hash ayrı saxlanır. Raw JSON-un köhnə KFC versiyasına əsaslanan yanlış provision inventarı istifadə edilmir.

| İstiqamət | Hədəf | Effektiv versiya | Bölmə / meyar | Production aktiv/provision |
|---|---|---|---|---|
| HR | KFC | source-v2 | 8 / 66 | UNVERIFIED |
| HR | Pizza Hut | source-v1 | 8 / 71 | UNVERIFIED |
| HR | Simit Sarayı | source-v1 | 4 / 35 | UNVERIFIED |
| Servis | KFC | service-source-v2 | 13 / 94 | UNVERIFIED |
| Servis | Pizza Hut | service-source-v1 | 11 / 79 | UNVERIFIED |
| Servis | Simit Sarayı | service-source-v1 | 10 / 61 | UNVERIFIED |
| Standart | KFC | standard-source-v1 | 10 / 190 | UNVERIFIED |
| Standart | Pizza Hut | standard-source-v1 | 10 / 123 | UNVERIFIED |
| Standart | Simit Sarayı | standard-source-v1 | 10 / 71 | UNVERIFIED |
| HSE | Restoran | hse-source-v1 | 6 / 52 | UNVERIFIED |
| HSE | Ofis | hse-source-v1 | 5 / 19 | UNVERIFIED |
| HSE | Anbar | hse-source-v1 | 6 / 29 | UNVERIFIED |

Cəmi 12 ailə / 890 meyar; bu, audit istiqamətlərinin birləşdirilməsi və ya ümumi scoring məxrəci deyil. Lokal `verifiedSource` 12/12 PASS canlı binding və aktiv revision mövcudluğuna sübut deyil. Production template/revision ID-ləri `null` saxlanır; köhnə revision/history dəyişməyib. Orijinal Excel-lər yenidən oxunmayıb və commit edilməyib; əvvəlki verifier/source map-lərə istinad qorunur.

## Real çatışmazlıqlar və həll sərhədi

| Prioritet | Məsələ | Bu mərhələdə nəticə / qalan operator işi |
|---|---|---|
| P1 | Docs push da production deploy yaradır | API sübutu sənədləşdirildi; operatorun göstərişi ilə push saxlanıldı. Auto-deploy dayandırılmadan release işi yoxdur |
| P1 | Canlı `/ready` 404 | Lokal düzgün handler/test təsdiqləndi; canlı SHA/route/proxy qeyri-müəyyəndir. Deploy etmədən 404-ü dəyişmək mümkün deyil |
| P1 | Production storage yalnız credentials işi kimi görünə bilər | Repository-də runtime `registerProvider` çağırışı olmadığının sübutu və adapter/bootstrap qəbul şərtləri əlavə edildi. Provider seçimi olmadan saxta implementasiya yoxdur |
| P1 | Canlı template/obyekt/icazə inventarı yoxdur | Effektiv 12-family hash/version manifest və konkret operator məlumat müqaviləsi hazırlandı |
| P2 | CORS wildcard, collector/backup/index real inventarı təsdiqlənməyib | Ayrı gate və operator sübutları təyin edildi; işləyən client və icazələr kor-koranə dəyişdirilmədi |

Bu mərhələdə runtime/business kodu dəyişməyib. Yeni mühitdə ilkin sandbox test qaçışının natamam nəticəsi PASS kimi sayılmır; eyni tam hədəfli suite owned QA mühitində yenidən icra olunub. Detallar QA sənədindədir.
