# Production Mərhələ 2 — runtime alignment və operational routes

## Versiya müqaviləsi

| Komponent | Lokal/kod sübutu | Production statusu |
|---|---|---|
| Lokal Node | v24.19.0 | Lokal PASS |
| Repository | `.nvmrc`24; Backend/Frontend engines `>=24.0.0 <25` | Uyğundur |
| GitHub Actions | setup-node `node-version-file:.nvmrc` | Əvvəlki hosted major24; yeni kod push edilməyib |
| Backend Docker | SHA-pinned Node24 Alpine, CMD `node server.js` | Production-da istifadə edilməsi UNVERIFIED |
| Frontend build | Node24 engines; lokal TypeScript/Vite build | Vercel faktiki build runtime UNVERIFIED |
| Native start | `npm start --prefix Backend` → `node server.js` | Render faktiki root/build/start/image/Node UNVERIFIED |
| Lockfiles | Dəyişməyib; yeni dependency yoxdur | Mövcud reproducible install müqaviləsi saxlanır |

`runtimeConfiguration.service.js` startup-dan əvvəl Node major24, valid port1–65535, Mongo URI binding shape, production/Render rejimində boş olmayan JWT secret tələb edir. `MONGO_URI` əsas, `CS` mövcud compatibility fallback-dır. Bu validation database/credential-in real işlədiyini iddia etmir. Exception yalnız sabit error və field-name olmayan enum issue code-ları daşıyır; secret values göstərilmir. Missing storage server-in liveness başlamasını bloklamır, readiness503 saxlanır.

`Backend/.env.production.example` boş təhlükəsiz template-dir, avtomatik load edilmir. Mövcud dotenv path və environment precedence dəyişməyib; Docker image local `.env` daxil etmir. Bu task Render/Vercel runtime ayarını dəyişmir.

## Route müqaviləsi

`operationalRoutes.service.js` `/api` mount və global404-dən əvvəl qeyd olunur:

- `/health`: 200, `{success:true,status:"ok"}`; liveness. Audit/provision/storage smoke sertifikatı deyil.
- `/version`: 200/no-store; yalnız contractVersion1, Node major, valid40hex deploy SHA və onun env adı. Əvvəl `RENDER_GIT_COMMIT`, sonra optional `INOP_BUILD_SHA`. Mövcud deyilsə SHA/source null; secret/branch/path/env dump yoxdur.
- `/ready`: DB connection + writable replica-set/mongos transaction topology + storage configuration tələb edir. Availability probe varsa onun uğuru da tələb edilir; timeout/failure503. Probe-u olmayan legacy/local adapterdə storageAvailable=null açıq göstərilir, mövcud davranış qorunur. `productionSmokeVerified:false` həmişədir.

Provider syntactically configured olsa da private/versioning API-si unavailable olduqda yeni S3 probe false503 edir. Readiness DB və storage mərhələlərinə hərəsi1500ms cavab büdcəsi verir; provider operation-un öz8s safety deadline-ı və slot guard-u ayrıca qalır. Late operation nəticəsi response-u sonradan success-ə çevirmir.

## Canlı fərqin operator tərəfindən ayırd edilməsi

Canlı GET `/health`200,`/ready`404,`/ready/`404,`/api/ready`401,`/version`404. Route registration-da env conditional yoxdur; actual lokal `node server.js` startup testində `/ready`503 və `/version`200 təsdiqlənir. Missing provider404 yaratmır. Root cause üçün bunları tutuşdurmaq lazımdır:

1. Read-only Render service/deploy metadata: live SHA/image digest, root directory, build/start command, runtime, service type, branch və proxy path.
2. Actual artifact-də `server.js`, operationalRoutes/readiness services və SHA-nın olub-olmaması. Başqa entrypoint/proxy ehtimalı metadata ilə təsdiqlənməlidir.
3. Code SHA ilə backend deploy SHA ayrıca, frontend Vercel SHA-sından ayrı tutulur. GitHub HEAD backend release sübutu deyil.
4. Yeni `/version` yalnız ayrıca approved release-dən sonra metadata ilə müqayisə edilə bilər. Bu task endpoint-i production-a çıxarmır.

Yekun15:12AZT read-only təkrarda health/ready12s timeout-dan sonra15:13AZT bounded retry health200/ready404 təsdiqlədi;version404-dür. Timeout səbəbi təxmin edilmir. Control-plane access yoxdur; canlı Node versiyası, entrypoint və SHA **UNVERIFIED** qalır. “Köhnə backend” fərziyyəsi təsdiq edilmiş kök səbəb kimi təqdim edilmir. Render auto-deploy disabled yalnız operator məlumatıdır; Vercel ayarı da təsdiqlənməyib və hər halda push qadağandır.
