# Paket 03 — lokal QA nəticələri

Tarix: 15 oktyabr 2026. Node: 24.19.0. Baza: `1238cc8207a9cebdf21157a85ab5abfdc2cd944b`.

## Nəticələr

| Yoxlama | Faktiki nəticə |
|---|---|
| Orijinal Excel mənbə uyğunluğu | PASS: 3 workbook, 4 worksheet, 172 meyar; source SHA, bütün sual mətnləri/xanaları/ardıcıllıq, guidance, KFC 9 düstur, PH ikinci worksheet 48 xana |
| Yeni HR backend testləri | 7 PASS / 0 FAIL / 0 SKIP |
| Yeni HR real-browser testləri | 3 PASS / 0 FAIL / 0 SKIP |
| Yeni HR suite cəmi | 10 PASS / 0 FAIL / 0 SKIP: eyni qaçışda 7 backend və 3 real-browser testi |
| HR responsive matrisi | 3 brend × AZ/EN/RU × 1440/768/390/320 = 36 form yoxlaması; əlavə 8 list/analytics viewport yoxlaması; document overflow və 44px buttons assert olunur |
| Blok 02 vizual regressiyası | 1 scenario PASS; 25 route × 4 viewport = 100 geometry/screenshot yoxlaması, pagination/locales/error-retry/lazy-panels və HR isolation |
| Frontend production build | PASS: TypeScript + Vite |
| Frontend lint | 0 error / 9 əvvəlki warning |
| Dəyişən/yeni backend JS/CJS syntax | 23 fayl PASS |
| Dəyişən/yeni backend JS/CJS ESLint | 0 error / 0 warning; temporary Node/CommonJS config ilə |
| Geniş əvvəlki backend regression | 563 test: 519 PASS / 44 FAIL / 0 SKIP |
| Eyni regression ilkin 1238cc8 bazasında | Eyni 519 PASS / 44 FAIL; 44 uğursuz test adı eynidir, yeni fərqli uğursuzluq yoxdur |
| Recruitment, əsas Dashboard, HR CSS, role seed və dependency faylları | Bazaya nəzərən diff yoxdur |

Geniş suite **tam PASS deyil**. Köhnə hard-delete/approval/safety contract uyğunsuzluqları bu paketə aid dəyişikliklərlə gizlədilməyib. İki təkrar qaçışın logları və assertion müqayisəsi saxlanır. Hər 44 nəticənin adı, səbəbi, baza/current actual/expected dəyərləri və Paket 03 ilə əlaqəsi [ayrıca regression hesabatındadır](HR_AUDIT_PACKAGE_03_REGRESSION.md). Bu müqayisə bütün repository testlərinin yoxlanması demək deyil.

## Backend coverage

- PH/SS 0, 0.5, 1, N/A; denominator neytrallığı; all-N/A null; həqiqi sıfır; tam nəticə 100; yalnız HR source contract dispatch.
- KFC overall/section/earned null; orijinal 47 düsturu metadata-da saxlanır və icra edilmir.
- Duplicate/unknown/invalid answer, natamam submit, dəyişdirilmiş sual/required/order/section və əlavə subsection source fingerprint tərəfindən rədd edilir.
- Template provisioning idempotency; mövcud custom template-in saxlanması; restaurant/brand mismatch rəddi.
- Draft save/resume, 409 stale version, paralel iki save-dən birinin 200, digərinin 409 olması.
- Foreign evidence rəddi; öz parent evidence əlaqəsinin saxlanması.
- Real server scoring, immutable completion, immutable snapshot save/history, legacy nəticənin dəyişməməsi.
- HR auditorunun başqa istiqamətə çıxışının rəddi; all analytics grant olsa belə yalnız assigned/own HR parent-ləri; revocation sonrası 403/empty scope.
- Responsible user scope, literal directory search, finding/action əlaqəsi, incomplete action zamanı finding closure rəddi, self-verification rəddi, independent verification.
- Independent approval və closure; submit olmadan workflow complete 409; closed/completed HR answers 409.
- HR Excel source/criterion worksheet-ləri, HR report, recalculate 409.

## Browser coverage

Browser quraşdırılmış `/usr/bin/chromium` istifadə edir; yeni browser/dependency download yoxdur. HR testləri real lokal JWT/permission/API ilə işləyir. Bütün xarici browser sorğuları bloklanır.

- Bütün üç brendin meyar sayları real server snapshot-u ilə yoxlanılır.
- Source mətnləri və UI locale-ləri; 1440/768/390/320 ölçülərində document overflow yoxdur.
- Dəyişiklikdən sonra navigation confirmation, cancel, draft save, reload və qeydin saxlanması.
- Real submit və server nəticəsi 50%; completed form controls dəyişməzdir.
- HR list/analytics, başqa istiqamət auditorunun HR səhifəsindən rəddi.
- 320px-də real corrective action yaradılması/status dəyişməsi və authenticated HR report; HR recalculate düyməsi yoxdur.
- Real `/auth/me` HR direction metadata-sı ilə auditorun yalnız assigned HR sətirini və analitikasını görməsi; başqa istiqamət linklərinin gizlənməsi və direct URL rəddi.
- Browser page errors: 0. Mobile PH form və desktop HR analytics screenshot-ları ayrıca vizual nəzərdən keçirilib.

Blok 02 mock fixture-ləri yeni `/audit-hr/*` read API-lərinə uyğunlaşdırılıb. Başlıq və primary error selector-ları eyni mətnli section title və ayrıca source-error vəziyyətindən ayrılıb; route/overflow/state assert-ləri zəiflədilməyib. Əvvəlki sınaqda bu selector-lar strict-mode failure verirdi, tətbiqdə page error yox idi.

## Təkrar icra

```bash
INOP_AUDIT_TEST_PORT=27018 node --test --test-isolation=none \
  Backend/tests/hrAuditAssessment.test.cjs \
  Backend/tests/hrAuditWorkflow.test.cjs \
  Frontend/tests/hrAuditWorkflow.spec.cjs

npm --prefix Frontend run build
npm --prefix Frontend run lint
```

Blok 02 browser testi üçün ayrıca:

```bash
INOP_PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright \
INOP_BROWSER_EXECUTABLE=/usr/bin/chromium \
node --test --test-isolation=none Frontend/tests/auditVisualUnification.test.cjs
```

Backend fixture yalnız `127.0.0.1:27018` task-a məxsus `inop-hr-audit-p03-qa` replica set-də təsadüfi `inop_audit_test_*` bazalarını yaradır və öz bazasını silir. Mövcud `inop-cloud-mongo` konteyneri və onun məlumatları dəyişdirilmir. QA container istifadədən sonra ayrıca dayandırılıb silinir; bu test nəticələri container-in daimi saxlanmasına bağlı deyil.

## Artifaktlar və təhvil statusu

- `/workspace/work/hr-audit-source/`: source verification, HR final, backend/frontend lint/build, baseline/current regression logları və failed-name comparison.
- `/tmp/inop-hr-audit-p03-screens/`: HR formaları, list/analytics screenshot-ları və geometry JSON.
- `/tmp/inop-p03-block02-regression/`: 100 route/viewport screenshot-u və nəticə JSON.

**PARTIAL:** PH/SS source scoring və təsvir olunmuş HR funksiyaları implementasiya/QA olunub; KFC final scoring açıq mənbə blokeridir. Production readiness, real provider, production topology/restore və əvvəlki dependency/legacy test borcları bu lokal QA ilə PASS sayılmır. Production DB/migration, remote merge və deploy edilməyib. İş branch-inə adi push və `inop-main` hədəfli PR bu yekun QA mərhələsində istifadəçi tərəfindən icazəlidir; merge/release təsdiqi deyil. Orijinal workbook-lar və real şəxsi məlumatlar commit edilmir.


## Yekun QA / GitHub hazırlığı — 15 oktyabr 2026

- Başlanğıc branch `audit/package-03-hr`, commit `24230f35c1e3fffaf8c32288ebc570982dce87b7`, worktree təmiz. `git ls-remote` ilə remote baza `1238cc8207a9cebdf21157a85ab5abfdc2cd944b` təsdiqləndi; başlanğıcda remote iş branch-i yoxdur.
- Yeni inteqrasiya testi hər PH/SS brendində ayrıca all-N/A və 0/0.5/1/N/A ssenarisini real serverə submit edir. Client-in saxta `score:1` göndərməsinə baxmayaraq N/A persisted score `null` qalır; denominator 0/3, earned 0/1.5, nəticə null/50 olur. Parent cavabları və immutable save history N/A-nı saxlayır; avtomatik finding sayı 0-dır. Analytics nonconformities 0/2, N/A meyarlarının average-i null-dır; report və Excel də eyni nəticəni göstərir.
- Bu QA-da tətbiq kodunda yeni xəta aşkarlanmadı; dəyişiklik əlavə regression testi və sübut sənədləridir. Köhnə testləri yaşıl göstərmək üçün kontraktlar dəyişdirilmədi.
- Source verifier orijinal 3 workbook-u yenidən oxudu: bütün 172 meyar, 4 worksheet, mətn, sıra, bölmə, guidance, düsturlar və SHA uyğunluğu PASS. Raw Excel repoya əlavə edilmir.
- Yekun HR suite: `final-qa-hr.log` — 10 PASS, 0 FAIL, 0 SKIP. Build PASS; frontend lint 0 error / 9 əvvəlki warning; əlavə backend testinin syntax və ESLint yoxlaması PASS.
- Yekun Blok 02 regressiyası: `final-qa-block02.log` — 1 scenario PASS, 100 route/viewport yoxlaması, 0 FAIL / 0 SKIP; artifaktlar `/tmp/inop-p03-block02-final-qa/`-dadır.
- Təkrar legacy suite: `final-baseline-regression.log` / `final-current-regression.log`, eyni 563 test və eyni 42 assertion failure + 2 parent failure. Tam ad/səbəb cədvəli ayrıca regression hesabatındadır.

### Funksional əhatə və limitlər

| Sahə | Faktiki yoxlama | Status |
|---|---|---|
| Brend/restoran, template revision | real API create, mismatch denial, immutable source snapshot, köhnə custom template saxlanır | PASS |
| Draft/resume/complete/notes | browser save/reload, server validation, stale və paralel draft conflict, sual/bölmə/final qeydləri | PASS |
| Evidence | mövcud evidence record-u əlaqələndirilir, başqa parent evidence rədd edilir | PASS: lokal DB əlaqəsi |
| Foto/sənəd real storage provider upload/download | xarici provider və production storage sınağı aparılmayıb | BLOCKED: provider inteqrasiyası |
| Actions/approval/closure | real API, 320px action UI, independent verification/review, closure guards | PASS |
| History | model API update rəddi, submitted cavab dəyişməzliyi, legacy nəticə saxlanır | PASS; raw DB admin müdaxiləsinə dair zəmanət deyil |
| Analytics/export | stored source results, all-N/A və mixed, KFC null, real XLSX parse | PASS |
| AZ/EN/RU və responsive | 36 form kombinasiyası + 8 list/analytics ekranı, 1440/768/390/320px | PASS: browser geometry; hər ekranın insan vizual review-u deyil |
| Permission/isolation | actual auth, assigned HR parent, direction/revocation denial, foreign restaurant/evidence, scoped aggregates | PASS: lokal sintetik GFC təşkilatı |
| Ayrı tenant-lərlə production identity/DB topology | ayrıca multi-tenant production mühiti sınaqdan keçirilməyib | BLOCKED; lokal parent/direction scope testi bunu əvəz etmir |
| KFC final scoring | mənbədə 47 böləninin mənası təsdiqlənməyib; 8 bölmə/66 meyar, draft və workflow saxlanır | BLOCKED: final bal; forma/workflow PASS |
