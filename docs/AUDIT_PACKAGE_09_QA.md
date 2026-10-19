# Paket 09 — yekun QA

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
