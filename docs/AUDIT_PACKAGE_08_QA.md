# Paket 08 — yekun QA

16 oktyabr 2026. Baza `ac983548bda02cf11a3775f7ba94c85068942444`; yalnız `inop-main`. **Lokal funksional status: COMPLETE. Production readiness: BLOCKED.** Canlı DB/secrets/deployment üzərində əməliyyat yoxdur.

## Faktiki qaçışlar

| Yoxlama | Nəticə | Lokal log |
|---|---|---|
| Audit backend (əvvəlki 48 + yeni 7) | 55/55 PASS, 0 FAIL/SKIP/CANCELLED | `backend-release.log` |
| Audit Mərkəzi browser; 36 AZ/EN/RU × route/viewport halı | 2/2 PASS, 0 FAIL/SKIP/CANCELLED | `center-browser-delivery.log` |
| HSE browser | 3/3 PASS, 0 FAIL/SKIP/CANCELLED | `hse-browser-final.log` |
| Standart/Servis browser | 8/8 PASS, 0 FAIL/SKIP/CANCELLED | `standard-service-browser-final.log` |
| HR browser | 4/4 PASS, 0 FAIL/SKIP/CANCELLED | `hr-browser-final.log` |
| Altı yekun hesabat; 72 locale/viewport halı | 1/1 PASS, 0 FAIL/SKIP/CANCELLED | `report-browser-final.log` |
| HR sual/bölmə fotosu və AuditExportPanel altı real download | 2/2 PASS, 0 FAIL/SKIP/CANCELLED | `evidence-export-browser-final.log` |
| 100 route/viewport vizual yoxlaması | 1/1 PASS, 0 FAIL/SKIP/CANCELLED | `visual-final.log` |
| Geniş legacy backend | 519 PASS / 44 əvvəlki FAIL / 0 SKIP/CANCELLED | `legacy-release.log` |
| Build | TypeScript/Vite PASS | `build-final.log` |
| Frontend lint | 0 error / 9 əvvəlki warning | `lint-final.log` |
| Dəyişən/yeni backend 33 JS/CJS fayl | 0 lint error | `backend-lint-delivery.log` |
| Offline provision CLI, boş inventar | Gözlənilən exit 2; writes 0; 12 absent binding | `provision-cli.log` |

55 backend testi əvvəlki 48 + yeni 7 testdir; köhnə testlər iki dəfə toplanmır. Browser 21 testdir, report/visual matrisinin 72/100 halları ayrıca test sayı deyil. İlk yeni center browser qaçışı select-in accessible label-ının exact text ilə yanlış seçilməsi səbəbindən uğursuz olub; DOM-a uyğun prefix locator ilə düzəldilib, son tam 2/2 qaçışı yuxarıda göstərilib. Timeout və permission assertion-lar zəiflədilməyib. Əlavə auth-order testində təkrarlanan dəyişən syntax xətası lint ilə aşkarlanıb və düzəldilib; uğursuz qaçış `backend-release-initial.log` kimi saxlanıb. Backend-də ilkin yeni HR section filtri projection problemi də düzəldilib; son qaçışda bütün 55 test yaşıl olub.

Backend lint mövcud Node/CommonJS strict konfiqurasiya ilədir; `privateFiles.controller` daxilində əvvəlcədən mövcud 3 intentional control-character filename regex-i üçün əvvəlki `no-control-regex` istisnası saxlanır. Bu regex-lər dəyişdirilməyib. Frontend-in 9 warning-i əvvəlki bazadadır.

## 500+ audit: tamlıq və performans

| Ssenari | Audit | Meyar | Faiz | Weighted | Vaxt | Node RSS fərqi |
|---|---:|---:|---:|---:|---:|---:|
| 601 standard audits | 601 | 114190 | 33.333333 | null | 5656 ms | 393216 B |
| 701 hse audits | 701 | 13319 | 66.666667 | 72.72727272727273 | 2496 ms | 262144 B |

601 Standart auditində 190×601=114190 meyar, 701 ofis HSE auditində 19×701=13319 meyarın cəmi, applicable/N/A/compliant sayları və təsdiqlənmiş saxlanılmış nəticələr assert edilir. Hər istiqamətdə əlavə foreign-tenant context-li parent clone icazəli hesablamadan çıxarılır; restricted actor sıfır görür. Mərkəz bütün 1302 icazəli auditi hesablayır, overallPercentage null-dur. Bu, real production məlumatı deyil, task-owned test DB-də məqsədli synthetic böyük həcm sınağıdır. Vaxtlar və RSS before/after fərqi production SLA, Mongo peak memory və ya stress-load zəmanəti deyil.

Standart/HSE üçün səssiz 500 truncation yoxdur. 15s/DB memory budget pozulanda açıq 422/no-partial qaytarılır. HR/Servis üçün mövcud 5000 audit həddi və explicit 422 qalır. Ekstremal facet memory və production explain real mühitdə NOT TESTED-dir.

## Qəbul matrisi

| Sahə | Faktiki sübut |
|---|---|
| Dörd istiqamət və çoxistiqamətli grants | Canonical explicit array, stale expectedVersion 409, active assignment removal 409; qaydasız array 403; menu/create/report/export API deny; primary direction order-dən asılı deyil |
| Tenant/brend/restoran/HSE obyekt RBAC | Source/create/parent/child/report/export/evidence IDOR; grant/account revoke; assigned + all-role promotion ilə object bypass rədd edilir; GFC mərkəzi scoped görünüş saxlanır |
| HR scoring/tarixçə | 66/71/35; 0/0.5/1/NA, all-NA null; KFC yeni applicable denominator, v1 nəticələri yenidən hesablanmır |
| Servis scoring/tarixçə | 94/79/61; Orta=0.5 üç brenddə; B79 istinad; B67 reviewed yeni versiya, köhnə negative/conformity qoruması |
| Standart | 190/123/71; NA reason, unanswered completion deny, blank source risk; bir standart/multiple findings score-a təkrar daxil edilmir |
| HSE | 52/19/29; restoran ≥85%; ofis/anbar 5/3/1 weighted ayrı; all-NA/zero denominator null; GFC overall null və köhnə /5 qorunur |
| Lifecycle | Real create/draft/resume/submit/finding/action/independent approval/closure/revision/history; source publication köhnə auditə tətbiq edilmir |
| Evidence + 3 sənəd | Real lokal foto bytes, sual/bölmə/final attachment; 3 independent slot; owner/version links; yanlış parent/file deny; production no-provider 503 |
| Altı report və Excel | HR, Servis, Standart Cover/Findings, HSE restoran/ofis/anbar; bütün brendlər, NA/null, owner/action/dueDate, approval/closure/history/evidence metadata |
| Excel təhlükəsizliyi | Formula injection literal text, uzun mətn overflow lossless, null zero deyil, private storage key/credential çıxmır; timeout/oversize 422 JSON/no partial file |
| Ümumi analitika | Real count/status/coverage/action/critical/recurrence; child scope null; object-kind/brand fərqi; organization=gfc ofis/anbarı saxlayır; mixed score null |
| UI/UX | AZ/EN/RU, 320/390/768/1440; real source matrices və 36 yeni center +72 report+100 vizual hal; loading/error/retry/empty, revocation cache invalidation |

Yeni center ekranlarının 320 və 1440 screenshot-u vizual olaraq da yoxlanıb: üfüqi overflow yoxdur, filterlər/KPI-lar mövcud premium scoped stil ilə oxunaqlıdır. Sınaq artefaktları `/tmp/inop-p08-center-screens`-dədir və repoya daxil edilmir. Recruitment və Main Dashboard business faylları dəyişdirilməyib. Mənbə Excel-lər və source kataloqlar dəyişdirilməyib; bu paketdə original workbook extraction yenidən icra edilib kimi təqdim olunmur. Source assessment/editorial/verifier regressiya testləri tam kataloq saylarını təsdiqləyir.

## Export performansı

190 standart +250 uzun action: 138 ms, 1079254 XLSX bytes, 46 query, 1 evidence metadata query; RSS fərqi 8601600 B. N+1 evidence sorğusu yoxdur; uzun mətnlər bərpa edilir.

## Geniş regressiya və açıq gate

Əvvəlki 44 failure adının və 42 actual/expected assertion-un hamısı Paket 07 ilə eynidir; 2 parent failure ayrıca assertion deyil. Yeni failure/changed assertion: 0. Tam legacy suite PASS deyil. Hər test/cause/before/after `AUDIT_PACKAGE_08_REGRESSION.md`-dədir. İki təsdiqlənmiş acceptance yenilənməsi (mixed avg=null və >500 analytics=200/full count) həmin sənəddə ayrıca göstərilib.

Production storage provider/credentials/real upload-download, live template/object/grant inventarı, approved backup/restore, monitoring, indexes/transaction topology və rollout canlı mühitdə təsdiqlənməyib. `AUDIT_PACKAGE_08_PRODUCTION_READINESS.md` tam gate və addımları verir. Lokal COMPLETE production-ready demək deyil.

## Təkrar icra

```bash
INOP_AUDIT_TEST_PORT=27018 node --test --test-isolation=none Backend/tests/auditCenterIntegration.test.cjs Backend/tests/auditAnalyticsScale.test.cjs Backend/tests/auditProvisionPlan.test.cjs Backend/tests/auditReportIntegration.test.cjs Backend/tests/auditReportSecurity.test.cjs Backend/tests/auditReportPerformance.test.cjs Backend/tests/auditWorkbook.test.cjs Backend/tests/hseAuditAssessment.test.cjs Backend/tests/hseAuditWorkflow.test.cjs Backend/tests/hrAuditAssessment.test.cjs Backend/tests/hrAuditEditorial.test.cjs Backend/tests/hrAuditWorkflow.test.cjs Backend/tests/serviceAuditAssessment.test.cjs Backend/tests/serviceAuditWorkflow.test.cjs Backend/tests/standardAuditAssessment.test.cjs Backend/tests/standardAuditWorkflow.test.cjs Backend/tests/auditSeparation.test.cjs
INOP_AUDIT_TEST_PORT=27018 node --test --test-isolation=none Frontend/tests/auditCenterIntegration.spec.cjs Frontend/tests/hseAuditWorkflow.spec.cjs Frontend/tests/standardAuditWorkflow.spec.cjs Frontend/tests/serviceAuditWorkflow.spec.cjs Frontend/tests/hrAuditWorkflow.spec.cjs Frontend/tests/auditFinalReport.spec.cjs Frontend/tests/hrAuditPhotos.spec.cjs Frontend/tests/auditExportPanel.spec.cjs Frontend/tests/auditVisualUnification.test.cjs
npm --prefix Frontend run build
npm --prefix Frontend run lint
```

Browser-lər resurs konfliktinin qarşısını almaq üçün ardıcıl icra olunub. Yalnız bu task-a məxsus `127.0.0.1:27018` Mongo replica set və random `inop_audit_test_*` DB-lər istifadə olunub; başqa lokal Mongo və production-a toxunulmayıb.

## Log SHA-256 sübutları

- `/workspace/work/audit-p08/backend-release.log` — `813ef8ef7fb1886a002527df4d742ac3db09005103ebc7115c4b3b1e27a3ac2a`
- `/workspace/work/audit-p08/center-browser-delivery.log` — `ed71e47aee9c5d8ac6a45b9293a29ccb0d99cb5f47f919c051cc7c0c60807aea`
- `/workspace/work/audit-p08/hse-browser-final.log` — `4692b6fda23fd0968be1e1ea852a523ed471a699e7a6013654fda5c60ed45637`
- `/workspace/work/audit-p08/standard-service-browser-final.log` — `c90add068987f001ac097addacd24f93e5b412d65b73e96e96ae2f6fcf1bf2b7`
- `/workspace/work/audit-p08/hr-browser-final.log` — `722485b54af1c31516a4fc88a11c1ca0a6a6262c7f8e6416a858b1e3d5d80214`
- `/workspace/work/audit-p08/report-browser-final.log` — `e819b164f61a637a6be16e13d52738b721de5967edf5ea2fe1862ce74665c33f`
- `/workspace/work/audit-p08/evidence-export-browser-final.log` — `b0846d0939a370f7dba693e615c059845d262206c181b53839f554c2310a8dc3`
- `/workspace/work/audit-p08/visual-final.log` — `3bca74c9c0ef1c192869ca28c2a5a13e0037e271478f4071d841afe2b394e489`
- `/workspace/work/audit-p08/legacy-release.log` — `b2ff3a0b94dadbe0e18254ad30ccdd4651c7b8d9520cf82bb62c3df2f093657c`
- `/workspace/work/audit-p08/legacy-comparison.json` — `cd424b808cafbb943aa982ab88b00f9e7a9412d837708777dbe124b11f079a59`
- `/workspace/work/audit-p08/build-final.log` — `21a98471cd35e09eb144618ba1bf532df6d1a8e74644a6fd080c6af8c6b1e71f`
- `/workspace/work/audit-p08/lint-final.log` — `82c15b11f1d2f0cc82b230bbba08f8c15700d0470f18f8cb9de3ec4b42bd150f`
- `/workspace/work/audit-p08/backend-lint-delivery.log` — `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `/workspace/work/audit-p08/provision-cli.log` — `033f67ae868554de85abc94f12ba0c5a16fca0b45591689c70434880bc599020`
