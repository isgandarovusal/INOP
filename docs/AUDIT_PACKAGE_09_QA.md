# Paket 09 — yekun QA

> Cari final closure: **PARTIAL** (lokal texniki). Production readiness: **BLOCKED**. Əvvəlki nəticələr tarixidir; aşağıdakı final closure bölməsi cari vəziyyətdir.


19 oktyabr 2026. Repository `isgandarovusal/INOP`, branch `inop-main`, baza `5d886ccf36cce0b67d25a12119663e00d4125ce9`. Əvvəlki dəyişikliklər davam etdirilib, sıfırdan başlanmayıb. Production DB/secrets/deploy əməliyyatı yoxdur.

**Paket statusu: PARTIAL.** Lokal funksional testlər aşağıda göstərilir; açıq dependency advisories səbəbindən bütün texniki/release işlərinin COMPLETE olduğu iddia edilmir. Production readiness **BLOCKED**.

## Faktiki final qaçış

| Yoxlama | Nəticə |
|---|---|
| Bütün backend: 115 fayl, Node test/subtest sayımı | **2005 PASS /0 FAIL /0 SKIP /0 CANCELLED**, 388092 ms |
| Əvvəlki 44 məlum failure | **44/44 həll edilib**, ilkin 519/44 və son legacy 564/0 müqayisəsi ayrıca sənəddə |
| Audit source/scoring/lifecycle/RBAC/report/export | Bütün-backend qaçışına daxildir; FAIL yoxdur |
| Browser delivery | Audit Mərkəzi 2/2 (36 locale/viewport), HSE 3/3, Standart/Servis 8/8, HR 4/4, final report 1/1 (72 matrix), evidence/export 2/2, vizual 1/1 (100 matrix); Recruitment UI 20/20. Cəmi 41/41, 0 FAIL/SKIP/CANCELLED. |
| TypeScript/Vite production build | PASS |
| Frontend lint | 0 error /9 əvvəlki warning |
| Dəyişən/yeni backend 56 JS/CJS lint | 0 error |
| Offline provision CLI: dolu sintetik inventar | 12 source family PASS, exit 0, writes=0 |
| Offline provision CLI: boş inventar | 12 NOT PROVISIONED, exit 2, writes=0 — gözlənilən təhlükəsiz nəticə |
| Offline index CLI: dolu sintetik inventar | 7 PASS/no-op, exit 0, writes=0 |
| Offline index CLI: boş inventar | 7 NOT TESTED, exit 2, writes=0 — production PASS deyil |
| Production dependency audit | Backend **1 high /3 moderate** açıq; frontend 0 |
| GitHub-hosted yeni CI workflow | NOT TESTED; lokal ekvivalent yoxlamalar ayrıca icra edilib |
| Local compose yeni replica-set init | YAML yoxlanıb; compose up və mövcud volume dəyişməsi NOT TESTED |

## Scoring və geriyə uyğunluq

- HR: 66/71/35 meyar; 0/0.5/1/N/A; NA məxrəcdən xaric, all-NA null. KFC yeni confirmed applicable denominator, köhnə blocked revision null; Recruitment məlumatı qarışmır.
- Servis: 94/79/61 scored meyar; Orta=0.5 bütün brendlərdə; KFC B79 non-scored reference, B67 versioned positive conformity və legacy exclusion qorunur.
- Standart: 190/123/71; distinct noncompliant standard applicable denominator, N/A reason, unanswered completion guard, source risk boşluğu və immutable catalog.
- HSE: restoran 52 /ofis 19 /anbar 29; simple/weighted 5/3/1 ayrı; restoran ≥85%; office/warehouse pass-fail null; GFC overall null; köhnə /5 snapshot dəyişmir.
- Altı real source report/XLSX family; N/A/null, notes, evidence, 3 ayrı sənəd, findings/actions dueDate/priority mapping, independent approval/closure və history yoxlanır. Formula injection və private credential/path redaction testləri keçir.
- Tenant/direction/brand/restaurant/HSE object scope, child-parent IDOR, mass assignment, revoked token/profile/assignment və mid-flight analytics release guard keçir. Scope dəyişəndə data verilməyən 401/403 saxlanır.

## Böyük həcm və performans

Bunlar owned Mongo7 replica set /127.0.0.1:27018-də lokal nümunələrdir, production SLA/stress/peak-memory sertifikatı deyil. RSS delta GC-dən təsirlənir.

| Ssenari | Tamlıq/nəticə | Vaxt | RSS delta |
|---|---|---:|---:|
| HR 5001 audit | 175035 meyar, average=50, scope/revision/NA dəqiq | 3201 ms | +2228224 bytes |
| Servis 5001 audit | 305061 meyar, average=50, scope/revision/NA dəqiq | 6585 ms | -362475520 bytes (GC) |
| Standart 601 audit | 114190 meyar, 33.33333333333333% | 3945 ms | +1835008 bytes |
| HSE 701 audit | 13319 meyar, simple 66.66666666666666%, weighted 72.72727272727273% | 1268 ms | +131072 bytes |
| 190 standart +250 action report/export | 1079148 bytes, 46 query, evidence metadata 1 query | 117 ms | +16617472 bytes |

HR/Servis source lookup explain-də `audit_source_latest_v1`, docsExamined=1. Bu bütün aggregation pipeline üçün 1 document iddiası deyil. 5000 cap yoxdur; 15s/resource budget aşılarsa explicit 422/no partial. Digər təklif indekslərin production explain/overhead ölçməsi NOT TESTED-dir.

## Operational testlər

Real mongodump/mongorestore: **15 collection /45 sənəd**, canonical data digest, index key/name/unique və copied evidence hash PASS. Yalnız label-confirmed owned QA konteyner/random DB-lər; live production backup deyil.

Isolated in-memory production-mode provider bütün 6 source report ailəsində real API upload/download, receipt/version/hash, 3 slot, foreign denial və corruption 409-dan keçir. Real production provider/credentials/smoke **BLOCKED** qalır. Missing storage təhlükəsiz 503, `/ready` configured topology/storage yoxlaması, `/health` liveness, fatal nonzero+redacted log və bounded request telemetry keçir. `/ready` həmişə productionSmokeVerified=false göstərir.

Test DB helper artıq explicit 27018-only opt-in tələb edir; missing/27017/foreign input connection-dan əvvəl rədd edilir. Browser/Vite cache yalnız cari task mkdtemp ownership təsdiqlənib proseslər bağlandıqdan sonra silinir. Digər task source/cache/evidence/checkpoint və mövcud Mongo konteyneri silinmir.

## Təkrar icra

Owned Mongo replica set 127.0.0.1:27018, Node24, npm lock dependencies, Docker, tesseract/fonts, SHA-pinned AZ/EN/RU modellər və Chromium tələb olunur. Production URI/secrets tələb edilmir.

```bash
node Backend/scripts/prepareOcrTestModels.cjs
INOP_AUDIT_TEST_PORT=27018 npm test --prefix Backend
npm run build --prefix Frontend
npm run lint --prefix Frontend
INOP_AUDIT_TEST_PORT=27018 node Frontend/tests/runAuditBrowserSuite.cjs
```

Cloud external runtime ilə browser üçün INOP_PLAYWRIGHT_MODULE və INOP_BROWSER_EXECUTABLE açıq verilib; CI pinned Frontend Playwright dependency-ni istifadə edir. Backend hər faylı serial process, test deadline ilə işlədir. Browser qrupları da serialdır. Heç bir test skip/todo/only ilə gizlədilmir.

## Sübutlar

Lokal log kökü `/workspace/work/audit-p09/final-2026-10-19/`; original uğursuz/intermediate qaçışlar `/workspace/work/audit-p09/` altında qorunur. Loglarda generated test məlumatları var; original Excel/secrets repoya daxil edilmir.

| Fayl | SHA-256 |
|---|---|
| backend-delivery.log | d345c02e604e3942857679486ed80d69eb821d48611a692616c49dd1d12f0371 |
| build.log | c39a46cfc5d67a5dfacf387815cd5d1394480ff02bbf1c3754dfc6c63e329b36 |
| lint.log | 82c15b11f1d2f0cc82b230bbba08f8c15700d0470f18f8cb9de3ec4b42bd150f |
| backend-lint-delivery.log | 0a82d97cbf9e8adf854021726596a905b1d5030c24fac82995980ffbe20331a3 |
| offline-cli-results.json | ad93e04a1cad95a588bcefc43f3b2bbf6b64a0ae2794bd89af9639154551cc02 |
| backend-dependency-audit.json | 591a4ab02e892b23d26fbaa01ed170501edaa0e787576f838affcdc6cd198f62 |

Final Git commit/push nəticəsi bu sənədləri ehtiva edən commit və GitHub branch HEAD ilə yoxlanmalıdır; sənəddə öz commit SHA-sını özünə yazmaq üçün süni commit yaradılmır.

Final browser delivery SHA-256 `5a0196ded31120e8068054cbf10d67c27d6d418e478a3e58b7c78c351c3ca35c`. Vizual 100 matrix presentation-only synthetic responses üzərindədir; funksional workflow/report qrupları real isolated API/DB ilə ayrıca keçir.


## Final closure — 19 oktyabr 2026

**Lokal texniki status PARTIAL; production BLOCKED.** Əvvəlki cədvəllər `66e67f7` icrasının arxividir.

| Final yoxlama | Faktiki nəticə |
|---|---|
| Backend,116 fayl | **2007 PASS/0 FAIL/0 SKIP/0 CANCELLED**,394883ms |
| Audit browser | **21/21 PASS**: center2,HSE3,Standard/Service8,HR4,report1,evidence/export2,visual1 |
| Recruitment UI | **20/20 PASS** |
| Matrix | Center36/report72/visual100 PASS; AZ/EN/RU və320/390/768/1440 |
| Build | PASS |
| Frontend lint | 0 error/9 əvvəlki warning |
| Bütün Paket09 dəyişən backend JS/CJS | 72 fayl,0 error |
| Clean npm ci | Backend/Frontend PASS; locked normal install |
| Dependency full+production | Backend0/Frontend0 advisory |
| Six real reports/XLSX | All brands,NA/null,3 slots,independent workflow,history və injection PASS |
| Large report | 190standards+250actions,75166bytes,150ms,46queries,evidence1query; text loss yoxdur |
| Provision/index offline CLI | Filled12/7 PASS,no-op/writes0; empty12/7 safe exit2 |
| 7-index local rehearsal | Result equality/explain/rollback PASS;production overhead NOT TESTED |
| Isolated restore | 15collection45doc,digest/index/evidencehash PASS |
| Hosted CI | **NOT TESTED**, `0543e04`, Yeni code üçün hosted run hələ təsdiqlənməyib |
| Signature/attestation audit | NOT TESTED: failed-to-download; npm ci SRI verification PASS-dan ayrıdır |

Mənbə Excel/catalog/verifier/scoring business kodu dəyişmir. Candidate exportda yalnız writer/await dəyişib; Recruitment/Main Dashboard UI və business logic dəyişdirilməyib. Worksheet History→Audit History migration fərqi ayrıca sənədləşdirilib. İlkin focused fail (History reserved-name) və 1ms date delta düzəldilib; loglar gizlədilmir. Final14/14 focused və full2007/2007 keçib.

Cloud browser explicit external Playwright1.62.1 və Chromium istifadə edib; CI installed pinned Playwright runtime-ı istifadə edir. Vizual100 presentation-only synthetic response matrix-dir; digər workflow/report qrupları real isolated API/DB ilə ayrıca işləyib. Original Excel faylları/credential/binary baseline commit edilməyib; synthetic golden JSON var.

Log kökü `/workspace/work/audit-p09-closure`. Əvvəlki failed/intermediate qaçışlar saxlanır. Final digest-lər:

| Log | SHA-256 |
|---|---|
| backend-final.log | d95a24e6eaf1e75f9b1a1b5f23f45ca1621151bf559ee000c70cab655f6b33e8 |
| browser-final.log | c069b2752b4d1aa1eee28704bad96ccf5300c30f5683bba9eedd3dd782d042a2 |
| build.log | 4bcf32004949ecf5560aae951dbd4005e55e03e4cfb9a3dc2be2850e019c5d52 |
| lint.log | 82c15b11f1d2f0cc82b230bbba08f8c15700d0470f18f8cb9de3ec4b42bd150f |
| backend-lint-all.log | 219d4bd7a30fdf3108c383866da16f56960ba4607bcb1d209162fa49c264f7fb |
| index-rehearsal.json | bb717dd42934bedbdd6662140cca6379e0e07c25aa97ddb419374c268fdd042f |
| dry-run-final.json | 951cea9bcd7b86055d017bd59b339731aa7714bbcc4cd565a2e1bbdfc2ce4632 |
| backend-audit-final.json | b20d9716a841e644aeb16231fdcff804ba0dd685bbd94d523a805a4f97cd4d5c |
| frontend-audit-final.json | e5620420bfbbc6a2b2e19f97194cdce6320b8bd52badcc78f882a217ab99c2ab |

Code/dependency commit `fb209ef`, CI/portability commit `0543e04`. Hosted run sonrası final evidence commit-i yalnız docs-dur; workflow docs-only push-ları ignore edir. Həmin final docs diff-i runtime/test/workflow dəyişmədiyi üçün hosted code nəticəsi ilə ayrıca əlaqələndirilir.
