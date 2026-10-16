# Paket 05 — yekun QA

Tarix: 16 oktyabr 2026. Baza `5948a7837a637e7d4f1f680a49ea80738c66c5c5`, yalnız `inop-main`.

**Lokal funksional status: COMPLETE.** Üç tam kataloq, Standart forması/lifecycle/hesabat modeli və dörd istiqamət üzrə təhlükəsiz ayrılıq icra olunan testlərlə təsdiqlənib. Bu status production storage və canlı production acceptance-in PASS olması demək deyil. Production DB/migration/manual deploy aparılmayıb.

## Son icra nəticələri

| Yoxlama | Nəticə | Lokal log |
|---|---|---|
| Standart backend + dörd istiqamətin RBAC testi | 10 PASS / 0 FAIL / 0 SKIP | `backend-closure.log` |
| HR/Servis backend regressiyası | 19 PASS / 0 FAIL / 0 SKIP | `hr-service-closure.log` |
| Standart/Servis real brauzer | 8 PASS / 0 FAIL / 0 SKIP | `browser-closure.log` |
| HR real brauzer regressiyası | 2 PASS / 0 FAIL / 0 SKIP | `hr-browser-closure.log` |
| Ekran regressiyası (100 route/ölçü halı) | 1 PASS / 0 FAIL / 0 SKIP | `visual-closure.log` |
| Geniş köhnə backend | 519 PASS / 44 FAIL / 0 SKIP | `legacy-closure.log` |
| Mənbə verifier | 384/384 standart, 6/6 kataloq vərəqi, 41/41 hesabat düsturu PASS | `source-verifier.log` |
| Frontend build | PASS | `build-closure.log` |
| Frontend lint | 0 error / 9 əvvəlki warning | `lint-closure.log` |
| Dəyişən/yeni backend JS/CJS ESLint | PASS, 0 error/warning | `backend-lint-closure.log` |

Geniş suite **PASS elan edilmir**. 44 əvvəlki uğursuz testin hamısı adı, səbəbi, baza/cari nəticəsi ilə `STANDARD_AUDIT_PACKAGE_05_REGRESSION.md`-də göstərilib. Yeni failing test adı yoxdur. Bir köhnə assertion-un actual-ı 4-dən 0-a enib: təyinatsız auditorun global analytics çıxışı Paket 05-in tələb etdiyi şəkildə bağlanıb. Dörd başqa köhnə fixture deny-then-grant tələbinə uyğunlaşdırılıb; təhlükəsizlik yoxlamaları zəiflədilməyib və test skip edilməyib.

## Mənbə, N/A və scoring

- KFC: 190 standart / 10 bölmə / QT + Ümumi Standartlar. PH: 123 / 10 / Pizza Hut QT + Лист1. SS: 71 / 10 / Brend Standartları + Audit Matrisi.
- Hər mənbə row/ID/order/original text/risk/metadata/hash dəqiq yoxlanır. Təkrarlanan kodlar saxlanır. KFC QT B148/6.24 mənbə riski null qalır.
- İstifadəçi bütün brendlər üçün `compliant / applicable × 100` düsturunu təsdiqləyib. Qarışıq Compliant/Critical/Major/Minor/N/A halında server/form/report/analytics/export eyni nəticəni verir. Üç brenddə bütün N/A null-dır; cavabsız və səbəbsiz N/A completion-u bloklayır.
- Mənbə riski ilə auditor nəticəsi ayrıdır. Heç bir severity çəkisi, universal avtomatik fail, SLA və shutdown əlavə olunmayıb.
- Bütün source kataloqu tam məzmun digest-i ilə yoxlanır; qismən kataloq, saxta score və source metadata qəbul edilmir. Sintetik arxiv versiyası testi köhnə draftın yeni versiya ilə yenidən yozulmadığını yoxlayır.

## Workflow, fayllar və məlumat bütövlüyü

- Hər üç branddə create/draft/resume/submit, canonical counts/percentage, tam Excel-in parse edilməsi və immutable history yoxlanıb. Natamam formanın tamamlanması 422, draft export 409, completed update/rescore/draft 409 qaytarır.
- Eyni expectedVersion ilə iki paralel save-in yalnız biri 200, digəri 409 olur. Cross-audit fayl/observation evidence və dördüncü final sənəd rədd edilir.
- Hər üç branddə real PNG və üç real TXT byte-ları upload/download edilib; sual/bölmə/son foto, üç sənəd və müşahidə evidence əlaqələri versiyalaşdırılmış save-də qalır. Browser də real fayl upload edir; uğursuz production-mode 503 zamanı UI xəta göstərir və yeni evidence qeydi yaranmır.
- Bir standartda iki müşahidə ayrıca finding verir, lakin uyğunsuz standart nəticədə bir dəfə sayılır. N/A/Compliant finding yaratmır. Source Standartın manual finding injeksiyası 409-dur.
- Corrective action ownership, due date-in avtomatik uydurulmaması, başqa auditin evidence-inin rədd edilməsi, öz tədbirinin verification-ının 403 olması, müstəqil verification, finding close və audit closure yoxlanıb.
- Faktiki submit edən auditor yaradan menecerdən fərqli olduqda server actor ID/ad/tarix saxlayır. Auditor filtri və Excel Cover faktiki auditoru göstərir. Contributor reviewer directory-dən çıxarılır, approval request və hətta əvvəlcədən mövcud pending approval resolution-da özünü təsdiq edə bilmir. Sadəcə auditi planlaşdırmış menecer əsassız bloklanmır.
- N/A üçün müstəqil reviewer səbəbləri açıq təsdiqləyir; cavab digest-i və versiya approval-da qalır. Eyni completed execution-a aid approval olmadan closure mümkün deyil.
- Export Cover/Findings/Standards/Observations/Actions/Approvals/Closures/History saxlayır. Tam KFC cavabları və uzun qeydlərlə Excel history hüceyrə limitinə düşmədən açılır. Restoran/auditor tarixçəsi snapshot və actor provenance ilə qorunur; nümunənin hazır şəxsi məlumatları yoxdur.

## Dörd istiqamət və RBAC sübutu

`auditSeparation.test.cjs` dörd direction profili ilə KFC-owned, başqa KFC, PH, SS restoranlarını yoxlayır. Parent list/read/create/update/complete, approval/closure, analytics/export, history/evidence və template/source access assignment/direction/brand/tenant daxilindədir. All-scope grant və ya rolu adminə dəyişmək profilin restoran məhdudiyyətini aradan qaldırmır. Explicit foreign tenant context və restoran mərkəzi adminə də göstərilmir; səlahiyyətli profilsiz GFC admininin üç brandə nəzarəti saxlanır.

Real browser auth/me dörd auditor istiqamətini ayrıca yoxlayır: `/audits/new` yalnız öz create route-na yönləndirir; digər üç create route və dəyişdirilmiş direction query unauthorized olur. Brand seçimində yalnız assigned KFC görünür. Admin chooser dörd ayrı istiqamət verir və qarışıq range-score forması yoxdur. Legacy source edit URL-i təhlükəsiz detail-a yönlənir. HSE biznes refaktoru və Recruitment/Main Dashboard dəyişiklikləri yoxdur.

## Responsive, dillər və vizual yoxlama

Standart brauzer matrisində üç brand × AZ/EN/RU × 1440/768/390/320 = **36 real forma**, üstəgəl list/create/analytics üzrə **12 ekran** yoxlanıb. Bütün source standartları və altı cavab vəziyyəti (boş daxil) görünür; horizontal overflow yoxdur, yoxlanılan action düymələri ən azı 44px-dir, browser pageErrors boşdur. Bölmənin note/photo paneli desktop-da sağdadır; mobil 320-də final foto/üç sənəd sahələri işləyir. Sual/bölmə foto upload-ları da UI səviyyəsində yoxlanır.

Ümumi vizual suite **100 route/viewport halını** keçir. KFC AZ 320 və 1440 screenshot-ları ayrıca vizual baxışdan keçirilib. Bütün screenshot-lara əl ilə baxış iddiası edilmir. Standart AZ normativ mətnləri source map-də saxlanır, idarəetmə/result mətnləri AZ/EN/RU-dur. Servis browser 4/4 və HR browser 2/2 ayrıca regressiyası keçir.

## Açıq məhdudiyyətlər

1. **External infrastructure blocker — production storage.** Bu mühitdə təsdiqlənmiş durable/private provider qeydiyyatı və credentials əlçatan deyil. Mövcud production-mode 503 fail-closed testi keçir; canlı production upload/download icra edilməyib və PASS deyil. Heç bir saxta provider/credential və ya səssiz fallback yoxdur.
2. Production-da yeni Standard template provision/seed icra edilməyib; səlahiyyətli menecerin explicit əməliyyatı lazımdır. Əvvəlki template/audit/restoran qeydləri dəyişdirilməyib.
3. Analitika 500 auditlik filtrlənmiş pəncərə ilə işləyir; böyük aralıq 422 qaytarır, səssiz natamam statistika göstərmir.
4. Nümunədəki avtomatik Critical fail və 48 saat/7 gün siyasətinin bütün brendlərə aid təsdiqi yoxdur. Faiz düsturu isə bu icrada istifadəçi tərəfindən təsdiqlənib və bloklanmır. KFC-də bir boş risk mənbəyə uyğun qalır.
5. Geniş backend-də 44 məlum legacy test uğursuzluğu qalır. Bunlar gizlədilmir və yeni direction-safety tələbi geri alınaraq yaşıl edilməyib.

## Təkrar icra

Bütün DB/browser testləri `INOP_AUDIT_TEST_PORT=27018` ilə yalnız bu task üçün ayrılmış MongoDB replica set-də, sintetik owned DB-lərdə icra edilib. Fixture yalnız öz təsadüfi test bazasını təmizləyir. Orijinal Excel-lərə yazı olmayıb.

```bash
INOP_AUDIT_TEST_PORT=27018 node --test --test-isolation=none Backend/tests/standardAuditAssessment.test.cjs Backend/tests/standardAuditWorkflow.test.cjs Backend/tests/auditSeparation.test.cjs
INOP_AUDIT_TEST_PORT=27018 node --test --test-isolation=none Backend/tests/serviceAuditAssessment.test.cjs Backend/tests/serviceAuditWorkflow.test.cjs Backend/tests/hrAuditAssessment.test.cjs Backend/tests/hrAuditEditorial.test.cjs Backend/tests/hrAuditWorkflow.test.cjs
INOP_AUDIT_TEST_PORT=27018 node --test --test-isolation=none Frontend/tests/standardAuditWorkflow.spec.cjs Frontend/tests/serviceAuditWorkflow.spec.cjs
INOP_AUDIT_TEST_PORT=27018 node --test --test-isolation=none --test-name-pattern='HR detail action|HR auditor UI' Frontend/tests/hrAuditWorkflow.spec.cjs
INOP_PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright INOP_BROWSER_EXECUTABLE=/usr/bin/chromium node --test --test-isolation=none Frontend/tests/auditVisualUnification.test.cjs
npm --prefix Frontend run build
npm --prefix Frontend run lint
```

Mənbə verifier əmri dörd əlavə workbook-un lokal read-only yollarını qəbul edir; workbook-lar və sintetik upload-lar commit olunmur. Geniş suite əmri REGRESSION sənədindədir. Backend ESLint mövcud scratch konfiqurasiya ilə bütün dəyişən/yeni backend JS/CJS fayllarına tətbiq edilib.

## Lokal sübut loglarının SHA-256 dəyərləri

Loglar repo xaricində `/workspace/work/audit-p05/` altındadır. Aşağıdakı hash-lər bu sənəddəki icra nəticələrinə aiddir; logların repoya daxil edilməsi tələb edilmir.

- `backend-closure.log`: `4b6ad4d3e5d5752576d8a2bee4f05c8d543f4c7a12096d2173229a9aa58dd8d1`
- `hr-service-closure.log`: `86ecc51dd1955969bd04809e88a5ada7df76a1e5b93ccb9fc747cb4b67f54a4e`
- `browser-closure.log`: `b1371cf388be554363106d5cbee23cb89fe1498dc115778b7880489a05c435d3`
- `hr-browser-closure.log`: `ad0b1c7dbb3afd31a9f19ab279108db7f88c80324fe0442130218ad682828fbe`
- `visual-closure.log`: `c9904621b37412168fd08088b0daae2c77551d5ca4de1b7e23e0efd3dbb0592a`
- `legacy-closure.log`: `f8aacd7cce0cba251ac8ed4530fba7ad413e28794f7753b34329343120392156`
- `source-verifier.log`: `ffedcb2eaae35aa6added052af99b966a48b6cdacb5518e5e7a7bebe171864e3`
- `build-closure.log`: `dc7cc54a84056231c8ecec9523eb4b354b18731e21c3f12bf6373c2684decca2`
- `lint-closure.log`: `28ccf20bd8e19649a3e62d39929f64ae123e4033a2098b5e63522d627a128337`
- `backend-lint-closure.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `legacy-comparison.json`: `8d3275156726ac5084d691e738505d2a1fd1e4b1e66aa1cbceedb31cf26e3607`
