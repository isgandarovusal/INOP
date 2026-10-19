# Production Mərhələ 3 — Render diaqnostikası

19 oktyabr 2026. Başlanğıc lokal/GitHub HEAD `0d782d09fa70c8c44384e1aebda997427dcf3c95`, `inop-main`; checkout təmiz idi. Mərhələ 2-nin altı commit-i və əvvəlki tarixçə qorunur.

## Operatorun Dashboard/Events məlumatı

| Sahə | Sübut / status |
|---|---|
| Service | `inop-backend`, `srv-dafrn72d0e5s73dnnhbg`, Node Web Service, Free |
| Repository / branch | `isgandarovusal/INOP` / `inop-main` |
| Live commit | Operator `5d886cc` təqdim edib; lokal Git obyektində tam SHA `5d886ccf36cce0b67d25a12119663e00d4125ce9` |
| Son live deploy | Operator: 2026-10-16 16:43, manual; saat qurşağı göstərilməyib |
| URL / Auto Deploy | `https://inop-backend.onrender.com`; OFF operator tərəfindən təsdiqlənib |
| Root / build / start / Node / health-check path | **UNVERIFIED** — Render Settings-dən təsdiq tələb olunur |
| Mongo topology / env adlarının faktiki mövcudluğu / proxy | **UNVERIFIED** — secret dəyərləri tələb edilmir |

Bu task-da Render connector/API credential binding-i yoxdur; `api.render.com` şəbəkə allowlist-ində deyil. Control-plane məlumatı API ilə ayrıca attestasiya edilməyib. Operatorun məlumatı source-attribution ilə saxlanır; məxfi fayllar və env values axtarılmayıb.

## 404 səbəbinin kodla təsdiqi

- `git show 5d886cc:Backend/server.js`: `/health` var, `/ready` və `/version` yoxdur; API mount-dan sonra catch-all var. `readiness.service.js` həmin commit-də mövcud deyil.
- `/ready` ilk dəfə `c45773f` commit-ində `Backend/server.js`-ə əlavə edilib.
- `/version` ilk dəfə `4ee72d3` commit-ində `operationalRoutes.service.js` ilə əlavə edilib; `/ready` həmin modulda qorunub.
- 19.10.2026 12:05 UTC read-only GET: `/health`200, `/ready`404, `/ready/`404, `/version`404, `/api/ready`401. Sonuncu auth cavabı route-un mövcudluğunu sübut etmir.

**Nəticə:** operatorun bildirdiyi işləyən `5d886cc` kodunda bu iki route-un olmaması müşahidə olunan 404-ləri izah edir. Cari kodda env-ə bağlı qeydiyyat/mount-order xətası tapılmayıb: operational routes API/auth və catch-all-dan əvvəldir; lokal `/version`200 və dependency hazır olmayanda `/ready`503 testlə təsdiqlənib. Missing storage yeni handler-də404 yaratmır.

Settings parametrləri hələ də təxmin edilmir. Bunlar operator tərəfindən tutuşdurulmadan restart/redeploy və ya health-check konfiqurasiyası dəyişdirilməyib. GitHub/Vercel SHA backend-in live SHA-sı kimi istifadə edilmir.

Free plan operator tərəfindən təsdiqlənib. Bu task real production load/availability SLA-sını ölçməyib və plan dəyişikliyi təklifini avtomatik tətbiq etmir; qəbul edilən capacity/availability siyasətini operator təsdiqləməlidir.

Mərhələ 1/2 sənədləri əvvəlki icraların snapshot-udur. Həmin anda olan live SHA UNVERIFIED və push qadağası sonrakı operator məlumatı və şərti push icazəsi ilə qarışdırılmamalıdır. Cari qəbul üçün Mərhələ 3 gate-i və yeni GitHub/CI sübutları əsas götürülür; Render manual deployment qadağası qüvvədədir.
