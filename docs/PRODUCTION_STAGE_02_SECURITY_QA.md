# Production Mərhələ 2 — təhlükəsizlik və regressiya QA

19 oktyabr 2026. Lokal başlanğıc517ba412; Mərhələ1 commit-ləri qorunub. Nəticələr faktiki final loglardan çıxarılır; əvvəlki PASS nəticələri yeni test kimi təqdim edilmir.

## Yeni yoxlama əhatəsi

- `auditS3Adapter.test.cjs`: static/idempotent/no-I/O bootstrap; missing/invalid explicit bindings; HTTPS endpoint, bucket/credential header validation; private/versioning probe; version-specific signed query; conditional overwrite denial; malformed receipt/SSE/version, redirect, raw provider exception, tampered bytes, foreign key, unversioned access və cancellation.
- `auditS3Integration.test.cjs`: actual authorized Audit API, izolə Mongo və injected protocol transport; HR/Servis/Standart/HSE restoran/ofis/anbar; üç ayrı document slot, private authorized download, foreign/direction deny, current account revocation, report və Excel export; policy unsafe olduqda503. Production credentials/cloud endpoint istifadə edilmir.
- `runtimeConfiguration.test.cjs`: Node24, port/DB/auth binding validation; full40hex deployment SHA whitelist; actual Express operational routes/catch-all order; ready503 vs health200; provider failure/negative/hung probe üçün bounded readiness və redaction.
- `auditProvisionPlan.test.cjs`: current binding altında valid köhnə KFC revision current kimi təsdiqlənmir; no-op/idempotency/conflict/foreign object/approval prerequisites testləri saxlanır.
- `auditProvisionActivation.test.cjs`: HR/Servis real provision API-si current binding→historical KFC revision mismatch-də409 verir; template/revision/binding sayı və tarixi content dəyişmir. Normal təkrar provision idempotent qalır.
- `hrNativeReleaseGate.test.cjs`: actual `node server.js` Node24 startup, SHA metadata/version route, health/readiness; default-disabled worker, automatic DDL/provision/provider network işi yoxdur.
- Mövcud HR CV storage known-answer HMAC, SSRF/DNS pinning/TLS və bütün Recruitment testləri texniki protocol reuse-un geriyə uyğunluğunu yoxlayır.

## İcra mühiti və nəticələrin sərhədi

Yalnız task-a məxsus `inop-audit-p09-qa`, label `inop.task=audit-p09`, loopback27018 və random owned test DB-ləri istifadə edilir. Əlaqəsiz27017/`inop-cloud-mongo` dəyişdirilmir. Explicit `INOP_AUDIT_TEST_PORT=27018` qorunur. Browser helper yalnız öz generated cache-lərini proses bağlandıqdan sonra təmizləyir; digər evidence/checkpoint/build/source faylları silinmir.

Storage testlərindəki synthetically named values real credential deyil və production xidmətini aktivləşdirmir. Provider seçimi/secret store/real bucket/TLS/IAM smoke ayrıca BLOCKED-dir. Native transport security tests mocks ilə DNS/TLS seçimlərini yoxlayır; real production upload kimi təqdim edilmir.

İlkin yeni S3 integration testində deactivated account üçün401 gözlənmişdi; mövcud `auth.middleware` müqaviləsi403-dür. Test403 və bytes-ın verilməməsini tələb etməklə düzəldildi. Auth/security implementation zəiflədilmədi; son focused qaçış keçdi. İlkin lint control-character-validator qaydasına ilişdi; yeni version validator char-code ilə yazıldı, mövcud HR credential regex-i dəyişmədən intentional validation üçün lint izahı əlavə edildi.

Əvvəlki tam backend qaçışı2017PASS/0FAIL/0SKIP/0CANCELLED ilə tamamlandı. Bundan sonra current provision endpoint guard/test əlavə edildiyinə görə final full suite yenidən başladıldı. Əvvəlki2017 nəticəsi son kodun tam yoxlaması kimi təqdim edilmir. Bir ara shell yoxlaması automatic approval review usage-limit xətası ilə icra olunmayıb; ayrıca default sandbox spawn EPERM çıxışı da PASS sayılmayıb. Son hədəfli yoxlamalar normal approved QA execution-da təkrarlandı.

## Final nəticələr

| Yoxlama | Faktiki nəticə |
|---|---|
| Final bütün backend,120fayl | **2018 PASS /0 FAIL /0 SKIP /0 CANCELLED**,438142ms |
| Əvvəlki2007test | Saxlanıb;11yeni Mərhələ2testi və mövcud native startup assertion-ları əlavə edilib |
| Audit/Recruitment browser | **41/41 PASS**:Audit21/21,Recruitment20/20;0FAIL/SKIP/CANCELLED |
| Browser qrupları | Center2,HSE3,Standart/Servis8,HR4,report1,export/photos2,visual1,Recruitment20 |
| Responsive/localization matrisləri | Center36/report72/visual100PASS;AZ/EN/RU,320/390/768/1440px |
| Frontend build | PASS, TypeScript/Vite; Frontend/src və lockfiles dəyişməyib |
| Frontend lint | 0error /9əvvəlki warning |
| Bütün dəyişən/yeni backend JS/CJS lint | 18fayl /0error |
| Dependency audit | Backend full0/production0;Frontend full0/production0; yeni dependency yoxdur |
| Source manifest preservation | 12effectivefamily contentSha256 Mərhələ1manifest-i ilə eynidir |
| Provision/index read-only CLI | Dolu sintetik12/7PASS/no-op,writes0;boş inventar üçün hər ikisi exit2 |
| Backup/restore | Final full suite-də actual owned15collection45doc,index/digest/evidencehash PASS |
| Hosted CI | Yeni lokal kod üçün NOT TESTED;push qadağandır,köhnə hosted nəticə yeni code proof deyil |

Final suite core əmri `INOP_AUDIT_TEST_PORT=27018 npm test --prefix Backend`; browser əmri `INOP_AUDIT_TEST_PORT=27018 node Frontend/tests/runAuditBrowserSuite.cjs`-dir. Lokal browser explicit Playwright1.62.1 və `/usr/bin/chromium` istifadə edir; module version lockfile-dəki1.62.1ilə uyğundur. İlkin2017qaçış və failed focused log saxlanır, yalnız final2018nəticəsi son kodun backend nəticəsidir.

Loglar `/workspace/work/production-stage-2/`-dədir. `PRODUCTION_STAGE_02_QA_EVIDENCE.json` log SHA-256-lərini və test edilən19product/test/template faylının hash-ini saxlayır; credential values və binary Excel-lər daxil deyil. Bütün19hash final qaçışdan sonra current source ilə yenidən müqayisə edilib. Mərhələ2 üzrə18JS/CJSfaylı və blank env template-i əhatə olunur. Son commit-tree uyğunluğu da ayrıca yoxlanır.

Paket09-da həll edilmiş44köhnə backend uğursuzluğu geri qayıtmayıb: əvvəlki2007test saxlanıb, final120faylda2018/0 nəticəsi alınıb. Test silinməyib, skip/only əlavə edilməyib və security assertion-ları zəiflədilməyib. Vizual100matris presentation-only synthetic state yoxlamalarıdır; real API/DB/report/workflow testləri digər browser qruplarında ayrıca keçirilib. Lokal timing və fixture provider testi production SLA/smoke sertifikatı deyil.

## Qorunan müqavilələr

HR0/.5/1/N/A; ServisBəli/Orta/Xeyr/N/A vəOrta=.5; Standart tam kataloq/severity-vs-result/applicable denominator; HSE restoran85%,ofis/anbar ayrı simple+5/3/1weighted,GFCoverallnull; all-NA null; old KFC/HSElegacy/5, immutable snapshot/revision/history, independent approval/closure, tenant/direction/brand/restaurant/HSE object RBAC və altı report/export qaydaları dəyişdirilməyib.

Actual production provision/index/backup/restore, provider activation, secrets və hosting ayarları dəyişdirilməyib; push/manual deploy yoxdur. Lokal commit SHA və remote-dan irəli say final hesabatda qeyd edilir.
