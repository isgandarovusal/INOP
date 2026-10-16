# Paket 06 — yekun QA

16 oktyabr 2026. Baza: `93c0165f07d9831fc879afce292910df75189d6a`, yalnız `inop-main`.

**Lokal funksional status: COMPLETE.** Üç real HSE forması, düzgün ayrı qiymətləndirmə, dörd analitika, source export və obyekt/RBAC ayrılığı icra edilən testlərlə təsdiqlənib. Production readiness ayrıca açıqdır; canlı storage, DB rollout/provision və deployment PASS elan edilmir.

## Son nəticələr

| Yoxlama | Faktiki nəticə | Lokal log |
|---|---|---|
| HSE backend (mənbə/scoring + workflow/RBAC) | 9 PASS / 0 FAIL / 0 CANCELLED / 0 SKIP | `hse-backend-final.log` |
| Birgə HSE + HR/Servis/Standart/RBAC backend | 38 PASS / 0 FAIL / 0 CANCELLED / 0 SKIP | `backend-delivery.log` |
| HSE real browser | 3 PASS / 0 FAIL / 0 CANCELLED / 0 SKIP | `hse-browser-final.log` |
| Standart/Servis real browser regressiyası | 8 PASS / 0 FAIL / 0 CANCELLED / 0 SKIP | `standard-service-browser.log` |
| HR real browser regressiyası | 2 PASS / 0 FAIL / 0 CANCELLED / 0 SKIP | `hr-browser.log` |
| 100 ekran/ölçü vizual halı | 1 PASS / 0 FAIL / 0 CANCELLED / 0 SKIP | `visual-final.log` |
| Geniş backend | 519 PASS / 44 FAIL / 0 CANCELLED / 0 SKIP | `legacy-final.log` |
| Mənbə verifier | 3/3 workbook, 4/4 vərəq, 17/17 bölmə, 100/100 meyar, 308/308 düstur PASS | `verifier.log` |
| Build | TypeScript/Vite PASS | `build-delivery.log` |
| Frontend lint | 0 xəta / 9 əvvəlki warning | `lint-delivery.log` |
| Dəyişən/yeni backend JS/CJS ESLint | PASS | `backend-lint-final.log` |

38 testlik birgə backend icrasına HSE-nin 9 testi və əvvəlki Standart/RBAC 10 + HR/Servis 19 testi daxildir; bunlar iki dəfə toplanmır. Son HSE report summary düzəlişi ayrıca fokuslu 9/9 qaçışla yenidən yoxlanıb. Geniş suite **PASS deyil**: 44 əvvəlki FAIL açıq qalır. Adlar və bütün actual/expected assertion-lar Paket 05 ilə eynidir; yeni failing test və assertion fərqi 0-dır. Hər uğursuzluğun müqayisəsi REGRESSION sənədindədir.

## Mənbə və biznes qərarları

- Restoran 6 bölmə/52; ofis 5/19; anbar 6/29. Universal restoran revision-u KFC/PH/SS-nin hər birinə eyni 52 meyarla bağlanır; həqiqi brand metadata-sı ayrıca qalır. Ofis/anbar Restaurant kolleksiyasında yoxdur.
- Bütün meyarların orijinal mətni, sıra/kod, source row/cell/sheet, risk/çəki və hash yoxlanır. Birləşmələr, gizli sətir/sütunlar, validation, conditional rule XML və differential styles də müqayisə edilir. Verifier orijinal faylları dəyişmir.
- Restoran A4/D13 real meyar olduğu üçün itmir; boş Excel bal düsturu istifadəçinin bütün meyarlara təsdiqlədiyi 1/0/N/A müqaviləsini ləğv etmir. Cover-in köhnə 57 sabiti, əl ilə sıfır və yanlış G23 istiqaməti sənədləşdirilib, runtime-a köçürülməyib.
- İstifadəçi **yalnız restoran üçün ≥85% keçid həddini bu icrada təsdiqləyib**. Testlər 80%, dəqiq 85%, 90% sərhədlərini yoxlayır. All-N/A/incomplete nəticəsi null-dır; ofis/anbar `passed=null`, restoran həddi onlara ötürülmür.
- Restoran 1/0/N/A sadə faiz, ofis/anbar adi və çəkili faiz ayrıdır. 5/3/1 risk çəkiləri mənbə düsturları ilə təsdiqlənib. N/A həm ədədi baldan, həm çəkili denominator-dan xaricdir; all-N/A/sıfır denominator null-dır. 0.5 kimi xarici cavab, duplicate/foreign/partial source məzmunu qəbul edilmir.
- GFC vahid faiz metodologiyası təsdiqlənmədiyindən API və UI-də ümumi faiz yoxdur/null-dır; üç obyekt növünün faizləri birlikdə ortalanmır. Yeni SLA, shutdown, cərimə və ofis/anbar keçid həddi yoxdur.

## Funksional və təhlükəsizlik sübutları

- Real lokal API ilə üç növdə create/draft/resume/submit, incomplete 422, stale/concurrent save 200/409, completed edit/rescore/draft 409, immutable HSE save və published revision yoxlanır. Sintetik arxiv catalogue versiyası yeni nəşrdən sonra yenə verifikasiya olunur.
- KFC, PH, SS ayrıca restoran obyektində universal eyni revision-u istifadə edir. Başqa obyekt növünün ID-si və ya icazəsiz warehouse ilə create rədd edilir; hər forma yalnız öz suallarını alır.
- Real ofis auditor təyinatı API-si grant olmadan 403 verir və namizəd siyahısı boşdur; active grant-dan sonra eyni POST 201, reviewer/candidate uyğunluğu və source access işləyir. Grant ləğv ediləndə read/export/history/analytics bağlanır. Ayrı forged/legacy assignment fixture-i və adminə role promotion object grant-ını bypass etmir.
- Parent/child read, update, complete, approval, close, report/export/history/evidence əməliyyatları ungranted obyekt üçün 403/404 olur. Test hər GET route-nun mərkəzi admin üçün real 200/409 cavabını da yoxlayır; missing route 404-ü təhlükəsizlik PASS kimi sayılmır. Explicit foreign tenant obyekt adminə də göstərilmir. Digər HR/Servis/Standart source-ları HSE auditoruna 403-dür.
- Hər üç obyekt növündə real PNG və üç TXT byte-ı upload/download edilib, audit/version əlaqələri history-də təsdiqlənib. Cross-parent evidence və dördüncü sənəd 400-dür. Sual/bölmə foto, final foto və üç document slotu browser-də də yoxlanıb.
- Yalnız noncompliant finding yaradır; N/A/Compliant yaratmır. Source metadata/severity, unikal kod, description və evidence saxlanır. Source manual finding injection 409-dur. Corrective action active/scoped responsible, explicit due date, proof, self-verification 403, independent verification, finding close, approval və closure keçir. Risk çəkisi mövcud action prioritetinə çevrilmir, due date avtomatik yaradılmır.
- Actual submit actor-u və immutable save iştirakçıları approval request/resolve/directory-də yoxlanır. N/A səbəblərini müstəqil reviewer `naConfirmed=true` ilə təsdiqləyir; cavab digest/version-u closure-a bağlanır. All-N/A audit də düzgün workflow ilə bağlana bilir.
- HSE report-un ümumi passed/failed meyar sayları real compliant/noncompliant saylarından gəlir; yeni HSE üçün legacy status-field sıfırları göstərilmir.

## Analitika və Excel

Dörd görünüş: restoran, ofis, anbar və GFC. Obyekt/brand/ərazi/date/auditor/status/section/risk/action-status sorğuları real saxlanmış məlumatla yoxlanıb. Office 100% simple/weighted nəticəsi, yanlış auditor/section/brand/ərazi/future-date üçün boş nəticə, real open və overdue action sayı və verified filterində boş nəticə testdən keçir. Restoran passed/failed/unassessed sayları saxlanmış canonical nəticədəndir.

Hər üç obyekt export-u real XLSX kimi parse edilir, bütün meyar sayı və saxlanmış faizlər yoxlanır. Restoran `COVER`, ofis/anbar `Results Summary`; `HSE Criteria`, `HSE Observations`, `HSE History`, `HSE Applicability`, mövcud Findings/Actions/Approvals/Closures var. N/A səbəbləri, adi/çəkili nəticə, restoran keçid həddi, version/hash, notes/photo/docs/root cause/sample/repeat və audit action/review bağlantıları çıxır. History və N/A review ayrıca sətirlərdir, böyük JSON hüceyrəsinə yığılmır. Auditor adı və hazır nümunə nəticələri originaldan köçürülmür. Draft export 409-dur.

## Browser, dillər və responsive

HSE matrisində 3 növ × AZ/EN/RU × 1440/768/390/320 = **36 real forma**; list/create və dörd analitika görünüşü üçün **24 əlavə viewport yoxlaması** var. Bütün sual sayları və yalnız boş/Uyğun/Uyğunsuz/N/A seçimləri görünür. Horizontal root overflow və 44px-dən kiçik görünən action düyməsi yoxdur; pageErrors boşdur. Office draft/resume və mixed completion real UI-dən icra olunur.

Real auth/me HSE profili ilə UI yalnız granted ofisi create seçimində göstərir, ofis auditini yaradır və start execution-dan 19 meyarlıq formaya keçir. Digər üç direction create route unauthorized-dır. Legacy source detail/edit route-ları generic doğru detail-a yönlənir; köhnə auditlər `/safety/legacy` vasitəsilə qalır. Desktop section note/photo sağ paneldədir; mobile 320-də real question/section/final photo və üç document işləyir.

100 ümumi route/viewport vizual yoxlaması ayrıca keçir. Restaurant AZ 320 və Office AZ 1440 screenshot-larına əl ilə də baxılıb. Bütün 100 screenshot-a əl ilə baxış iddia edilmir. HR/Servis/Standart real-browser regressiyaları yuxarıdakı nəticələrlə qorunub.

İlkin HSE test harness-də router readiness funksiyası çatışmırdı; test harness düzəldilib. Sonrakı çoxsaylı paralel Chromium qaçışında Service testi 240s və ümumi visual 180s limitinə çatmışdı; həmin qaçışlar PASS deyil və logları saxlanır. Timeout-u və assertion-ları zəiflətmədən ayrıca ardıcıl təkrar qaçışlar 8/8 və 100/100 keçib. Bunu backend-in 44 məlum uğursuzluğu ilə qarışdırmırıq.

## Açıq məhdudiyyətlər

1. **External infrastructure blocker: production storage provider/credentials.** Production-mode 503 fail-closed və UI failed-upload/no-fake-success lokalda yoxlanıb. Real production upload/download icra edilməyib; PASS deyil. Yeni credentials, provider və təhlükəli lokal fallback yoxdur.
2. Production HSE template provision, real ofis/anbar inventory və auditor grants bu task-da yaradılmayıb. Rollout üçün səlahiyyətli mərkəzi operatorun ayrıca əməliyyatı lazımdır. Production DB ACL, topology, provider və canlı release yoxlanmayıb; migration/deploy yoxdur.
3. GFC vahid faiz metodologiyası yoxdur; düzgün nəticə null-dır. Bu tələbə uyğun məqsədli davranışdır, saxta yekun faizlə örtülmür. 500-audit analytics pəncərəsində böyük interval 422 tələb edir; production performans benchmark-ı aparılmayıb.
4. Geniş backend-in 44 köhnə uğursuzluğu qalır; ayrıca REGRESSION sənədində tam ad/səbəb/müqayisə var.
5. Mövcud `RecruitmentBranch` office/warehouse növləri tenant/GFC HSE icazəsi kimi avtomatik qəbul edilmir. HR məkan qeydləri dəyişmir; HSE inventory ayrıca təsdiqlənir. Köhnə /5 HSE nəticələri rescore edilmir.

## Təkrar icra

Bütün DB/browser yoxlamaları yalnız task-owned MongoDB 7 replica set-də 127.0.0.1:27018, təsadüfi owned `inop_audit_test_*` bazaları ilə icra edilib. Production-a qoşulma yoxdur; başqa 27017 konteynerinə toxunulmayıb.

```bash
INOP_AUDIT_TEST_PORT=27018 node --test --test-isolation=none Backend/tests/hseAuditAssessment.test.cjs Backend/tests/hseAuditWorkflow.test.cjs
INOP_AUDIT_TEST_PORT=27018 node --test --test-isolation=none Backend/tests/standardAuditAssessment.test.cjs Backend/tests/standardAuditWorkflow.test.cjs Backend/tests/auditSeparation.test.cjs Backend/tests/serviceAuditAssessment.test.cjs Backend/tests/serviceAuditWorkflow.test.cjs Backend/tests/hrAuditAssessment.test.cjs Backend/tests/hrAuditEditorial.test.cjs Backend/tests/hrAuditWorkflow.test.cjs
INOP_AUDIT_TEST_PORT=27018 node --test --test-isolation=none Frontend/tests/hseAuditWorkflow.spec.cjs
INOP_AUDIT_TEST_PORT=27018 node --test --test-isolation=none Frontend/tests/standardAuditWorkflow.spec.cjs Frontend/tests/serviceAuditWorkflow.spec.cjs
INOP_AUDIT_TEST_PORT=27018 node --test --test-isolation=none --test-name-pattern='HR detail action|HR auditor UI' Frontend/tests/hrAuditWorkflow.spec.cjs
INOP_PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright INOP_BROWSER_EXECUTABLE=/usr/bin/chromium node --test --test-isolation=none Frontend/tests/auditVisualUnification.test.cjs
npm --prefix Frontend run build
npm --prefix Frontend run lint
```

Geniş suite əmri REGRESSION sənədində; source verifier üç original workbook-un lokal yollarını qəbul edir, openpyxl yalnız QA dependency-dir. Backend lint mövcud scratch config ilə bütün dəyişən/yeni JS/CJS fayllarını yoxlayır. Backend runtime Excel və Python-dan asılı deyil, verified JSON kataloqları istifadə edir.

## Lokal sübut loglarının SHA-256 dəyərləri

Loglar repo xaricində `/workspace/work/audit-p06/` altındadır; original workbook-lar, screenshot-lar və böyük QA logları commit edilmir.

- `hse-backend-final.log`: `a1cfa74338e5fbeead1d345acd6eecd976810cbc1ce08825bbd77455ead6d6f0`
- `backend-delivery.log`: `f8ea02d77169c457c803f4bc79e380e33df3dff9b9be7fd452b5f8f29677ab8b`
- `hse-browser-final.log`: `58d0667e58769d6b129190dbac09feeb57dcf363029784042e974e75e262b4c7`
- `standard-service-browser.log`: `6875a5d6a2695bcdf9f398607bb284a5c3582ad592553b508f870a0d8d9afa18`
- `hr-browser.log`: `9c3fc9d293e5aa06e6f82547a6b5f624ee1ee484f816017181be58adf5e8c92f`
- `visual-final.log`: `1bb7fa8c2ce740964931c63b21d40ff8dd4561641bfdde45530e92eb0da0e011`
- `legacy-final.log`: `03eacad3c3d060172b976fbecb8347ed8e98b283876cf7dc9e2c514b6c3e0b8c`
- `verifier.log`: `32910e2985a8c0734d585deb417505e837250716109cb845f753a833ccefd485`
- `build-delivery.log`: `5a913a6d1146eedb27de035bc4c1ae866a7e02b71157fc657e89cf6f4b4de12a`
- `lint-delivery.log`: `82c15b11f1d2f0cc82b230bbba08f8c15700d0470f18f8cb9de3ec4b42bd150f`
- `backend-lint-final.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `legacy-comparison.json`: `cd424b808cafbb943aa982ab88b00f9e7a9412d837708777dbe124b11f079a59`
