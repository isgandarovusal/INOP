# Paket 03 — HR Audit implementasiyası

Baza: `1238cc8207a9cebdf21157a85ab5abfdc2cd944b` (Blok 02). İş branch-i: `audit/package-03-hr`.

Git shell transport proxy bağlantısı səbəbindən işləmirdi. GitHub connector-un branch, commit, tree və base64 file oxumaları ilə orijinal obyektlər alındı; blob/tree/commit SHA-ları yoxlandı. `efe6a73…` və `1238cc8…` commitləri eyni orijinal SHA-larla lokal object store-a gətirildi, əvvəlki tarixçə saxlandı, baza fast-forward edildi. Yeni merge commit və history rewrite yoxdur. Blok 02-nin komponentləri, logo/asset-ləri və dizayn bazası qorunub.

## İşlək funksiyalar

- KFC 66, Pizza Hut 71, Simit Sarayı 35 meyar; mənbə bölmələri, original mətnlər, ardıcıllıq, qiymətləndirici təlimatları və sourceCell identifikatorları immutable mənbədə saxlanır. Ekran mətnləri ayrıca editorial-v1 qatında peşəkar AZ/EN/RU redaktəsində göstərilir. PH ikinci worksheet-in 48 dolu xanası yalnız mənbə istinadıdır; audit formasında və scoring-də yoxdur. Tam uyğunluq: `HR_AUDIT_PACKAGE_03_SOURCE_MAP.md`.
- HR üçün 0 / 0.5 / 1 / N/A cavabları. PH/SS scoring serverdədir; N/A numerator/denominator-dan çıxır, həqiqi sıfır saxlanır, all-N/A null-dır. Pass/fail threshold yoxdur.
- KFC forması və qeydləri işləyir; 47 böləni ziddiyyəti səbəbindən final/section/earned scoring null qalır. Nə 47 ilə nəticə sertifikatlaşdırılır, nə 66 ilə əvəz edilir.
- Mənbə şablonları serverdə yalnız ayrıca istifadəçi əməliyyatı ilə provision olunur. `admin`/`audit_manager` və explicit all-scope template create/update grants tələb edilir. Provision transaction-dır; source hash üçün `_id` binding idempotency verir. Mövcud custom template əvəz edilmir. Retired/draft/changed binding 409 qaytarır; avtomatik overwrite/backfill yoxdur.
- GFC → brend → mövcud restoran → HR audit. Restoran/brend yaradılmır və yenilənmir. Məhdud scope yeni audit üçün yalnız artıq icazəli HR parent-lərdən restoran seçir; yeni restoran səlahiyyətini təxmin etmir.
- Source-bound revision ilə audit/execution yaradılması, draft save/resume, explicit version conflict, sual/bölmə qeydləri, müdir/menecer sahələri, müşahidə və yekun rəy.
- Evidence həmin auditin mövcud private evidence mexanizmi ilə yüklənir və meyara bağlanır. Cross-parent evidence link rədd edilir. Production upload 503 qorunur; provider və storage konfiqurasiyası əlavə edilməyib.
- Hər draft/submit eyni transaction daxilində immutable HR save snapshot-u və mövcud activity provenance yaradır. Tamamlanmış cavabların redaktəsi 409-dur. Versiya tarixçəsi səhifələnir; raw DB admin müdaxiləsinə qarşı mütləq kriptoqrafik zəmanət iddiası yoxdur.
- Mövcud findings, independent approval və closure istifadə olunur. HR tamamlanması/closure üçün həqiqətən submit olunmuş source-bound execution tələb edilir. KFC workflow tamamlanması scoring təsdiqi deyil.
- HR corrective action UI-si: başlıq, təsvir, mövcud finding əlaqəsi, məsul şəxs, tarix, status və verification note. Məsul şəxs aktiv və həmin auditə çıxışı olan user olmalıdır. Directory axtarış/səhifələmə istifadə edir; heç bir yeni grant verilmir. Self-verification backend-də rədd edilir və frontend-də göstərilmir.
- HR list və analytics: tarix, brend, restoran, status; real parent-scope filtrindən gələn məlumatlar. Serverdə saxlanmış source-bound tamamlanmış nəticələr üzrə brend/restoran/bölmə/meyar və aylıq qruplar. N/A və unscored ortalamaya daxil edilmir. Köhnə nəticələr dəyişmir və fərqli kontraktlı legacy nəticələr yeni ortalamaya qarışdırılmır. Total bütün scoped HR auditlərini, submitted tamamlanmış source formalarını, unscored isə tamamlanmış source formaları içində balı olmayanları göstərir.
- Findings/action sayları öz resource read scope-ları ilə ayrıca intersect edilir; icazə yoxdursa null/restricted göstərilir. 0/0.5 cavab sayı ayrıca təsvir olunur; avtomatik finding, severity və ya action uydurulmur.
- HR auditoru analytics/report all grant-ı olsa belə özünə məxsus/təyin edilmiş HR parent-lərdən kənara çıxmır. Management və digər istiqamətlərin mövcud scope davranışı saxlanır. Profilin dəyişməsi, assignment revocation və permission konteksti nəzərə alınır.
- HR report authenticated API istifadə edir; HR üçün köhnə recalculate əməliyyatı 409 qaytarır və düymə göstərilmir. HR Excel exportuna `HR Criteria`, `HR Sections`, `HR Source` worksheet-ləri əlavə olunur. Bu, orijinal workbook-un byte-bərabər nüsxəsi deyil; mənbə/answer/note exportudur. Digər formatlar və digər istiqamətlərin export yolu saxlanır.
- AZ/EN/RU idarəetmə mətnləri; orijinal suallar mənbə dilində qalır. Mövcud SectionCard/FormSection, Audit navy/white CSS və confirmation davranışı istifadə olunur. Unsaved navigation warning, loading/empty/error və 409 conflict təqdimatı var.

## API xəritəsi

| Endpoint | İcazə / davranış |
|---|---|
| GET `/audit-hr/sources` | Audit read + HR direction; bundled source metadata və provision vəziyyəti |
| POST `/audit-hr/templates/:brandId` | Management + template create/update all; explicit source provisioning |
| GET `/audit-hr/restaurants` | Audit create; icazəli mövcud restoranlar |
| GET `/audit-hr/options`, `/analytics-options` | Müvafiq audit/analytics read scope |
| POST `/audit-hr/audits` | Audit create; brend/restoran/source revision yoxlaması |
| GET `/audit-hr/list` | Audit read; server pagination/filter |
| GET `/audit-hr/analytics` | Analytics read; HR/parent scope; yalnız real saxlanmış nəticələr |
| GET `/audit-hr/:auditId/action-people` | Action read + HR parent; minimal ad/ID, axtarış/səhifələmə |
| PUT `/audit-execution/:id/draft` | Execution update + parent; expectedVersion tələb olunur |
| PUT `/audit-execution/:id/submit` | HR source execution üçün server scoring, immutable completion |
| GET `/audit-execution/:id/hr-history` | Execution read + parent; immutable snapshot pagination |

Mövcud generic execution, template, lifecycle, finding, action, evidence, approval və export endpoint-ləri saxlanır. Yeni scoring yalnız `auditType=hr` və yoxlanmış `hrSource` snapshot-u üçün aktivdir. Servis/Standart/HSE kontraktları dəyişdirilməyib.

## Əməliyyat sərhədi və açıq hissələr

1. **KFC scoring BLOCKED:** 47-nin mənası və tətbiq olunan meyar dəsti üçün əlavə mənbə/təsdiq lazımdır. Hazırkı build KFC yekun balını sertifikatlaşdırmır.
2. Production DB/migration/index, merge/deploy və Render/storage konfiqurasiyası yoxdur. Yekun QA mərhələsində yalnız iş branch-inə adi push və inop-main hədəfli PR istifadəçi tərəfindən icazəlidir. QA yalnız task-a məxsus loopback replica set və təsadüfi owned DB-lərdədir.
3. Mövcud production storage, restore, topology, validator/index, ingress və dependency gate-ləri qüvvədədir. `xlsx`/DOCX dependency riskləri bu paketlə patch edilməyib. Native PDF font/Unicode məhdudiyyətlərinin aradan qaldırıldığı iddia edilmir.
4. Analytics bir sorğuda maksimum 5000 audit/execution pəncərəsini qəbul edir; daha geniş sorğu saxta/truncated nəticə əvəzinə 422 və daha dar tarix filtri tələb edir. Bu, ölçülmüş production performans iddiası deyil.
5. Source-bound template əl ilə dəyişdirildikdə avtomatik source binding yenilənmir. Növbəti source/policy versiyası ayrıca reviewed release olmalı, köhnə snapshot-lar saxlanmalıdır.
6. Digital imza və avtomatik tarixi migration/rescore yaradılmayıb. Header-dəki blank imza sahələri uydurulmayıb; existing independent approval və actor provenance tətbiq olunur.
7. Geniş köhnə backend suite tam yaşıl deyil: baza və dəyişiklik branch-i eyni 519 PASS / 44 FAIL verir. Köhnə hard-delete/approval/safety gözləntiləri bu task-da scoring və təhlükəsizlik qaydalarını geri çevirməklə “düzəldilməyib”. Yeni HR QA ayrıca təqdim olunur.

QA nəticələri: `HR_AUDIT_PACKAGE_03_QA.md`.

## Dəyişən fayllar

- `Backend/config/hrAuditSources.json`
- `Backend/controllers/auditAction.controller.js`
- `Backend/controllers/auditExecution.controller.js`
- `Backend/controllers/auditExport.controller.js`
- `Backend/controllers/auditReport.controller.js`
- `Backend/controllers/auditScore.controller.js`
- `Backend/controllers/audits.controller.js`
- `Backend/controllers/hrAudit.controller.js`
- `Backend/middleware/auditScope.middleware.js`
- `Backend/models/auditExecution.model.js`
- `Backend/models/auditTemplate.model.js`
- `Backend/models/hrAuditSave.model.js`
- `Backend/models/hrAuditSourceBinding.model.js`
- `Backend/routes/auditExecution.routes.js`
- `Backend/routes/hrAudit.routes.js`
- `Backend/routes/route.js`
- `Backend/scripts/verifyHrAuditSources.py`
- `Backend/services/auditAssessment.service.js`
- `Backend/services/auditLifecycle.service.js`
- `Backend/services/auditTemplateRevision.service.js`
- `Backend/services/hrAuditAssessment.service.js`
- `Backend/services/hrAuditExecution.service.js`
- `Backend/services/hrAuditPeople.service.js`
- `Backend/tests/hrAuditAssessment.test.cjs`
- `Backend/tests/hrAuditWorkflow.test.cjs`
- `Frontend/src/Pages/Audit/AuditExecution/AuditExecutionPage.tsx`
- `Frontend/src/Pages/Audit/AuditReport/AuditReportDetail.tsx`
- `Frontend/src/Pages/Audit/Audits/AuditDetail.tsx`
- `Frontend/src/Pages/Audit/ChecklistBuilder/AuditTemplateBuilder.tsx`
- `Frontend/src/Pages/Audit/HRAudit/HRAuditActions.tsx`
- `Frontend/src/Pages/Audit/HRAudit/HRAuditExecution.tsx`
- `Frontend/src/Pages/Audit/HRAudit/HRAuditPage.tsx`
- `Frontend/src/Pages/Audit/HRAudit/HRAuditVersions.tsx`
- `Frontend/src/Routes/Routes.tsx`
- `Frontend/src/Services/auditExecutionService.ts`
- `Frontend/src/Services/auditReportService.ts`
- `Frontend/src/Services/hrAuditService.ts`
- `Frontend/src/Styles/audit-workspace.css`
- `Frontend/src/Types/Audit/template.ts`
- `Frontend/src/Types/audit.ts`
- `Frontend/src/i18n/locales/az.json`
- `Frontend/src/i18n/locales/en.json`
- `Frontend/src/i18n/locales/ru.json`
- `Frontend/tests/auditVisualUnification.test.cjs`
- `Frontend/tests/hrAuditWorkflow.spec.cjs`
- `docs/HR_AUDIT_PACKAGE_03_IMPLEMENTATION.md`
- `docs/HR_AUDIT_PACKAGE_03_QA.md`
- `docs/HR_AUDIT_PACKAGE_03_SOURCE_MAP.md`


## Yekun QA əlavəsi

`24230f3` üzərində tətbiq koduna yeni düzəliş tələb edən regression aşkarlanmadı. `Backend/tests/hrAuditWorkflow.test.cjs` all-N/A və qarışıq cavabları PH/SS üçün DB, parent/history, analitika, report və real Excel export səviyyəsində yoxlayan əlavə testlə genişləndirildi. Yekun yeni suite **10 PASS / 0 FAIL**. Geniş legacy suite hər iki checkout-da **519 PASS / 44 FAIL**; hər ad/səbəb/actual/expected müqayisəsi `docs/HR_AUDIT_PACKAGE_03_REGRESSION.md`-dədir. QA əlavəsinin dəyişən faylları: həmin test, üç Paket 03 sənədi və yeni regression hesabatı. Yeni runtime dəyişiklik yoxdur. KFC scoring mənbə blokeri qalır.


## Son dil və əlavə məlumat implementasiyası

- `Backend/config/hrAuditEditorial.json`: 20 başlıq, 172 meyar, 75 təlimatın original mətn → AZ/EN/RU təqdimat xəritəsi. Source JSON, SHA, template/revision content və köhnə auditlər dəyişdirilmir. Yeni HR save-lər təqdimat versiyasını `hrDetails.editorialVersion`-da qeydə alır; cavab və attachment tarixçəsi həmin execution/templateRevisionId/auditId ilə saxlanır. Bu, source revision əvəzi deyil.
- Form, HR section detail/report və criterion/section analytics mətnləri həmin təqdimat qatından istifadə edir. Excel original sütunları saxlayır və ayrıca redaktə edilmiş AZ/EN/RU meyar sütunları əlavə edir; köhnə nəticələr hesablanmır.
- PH `Лист1` paneli formadan çıxarılıb. Əsas forma 8 bölmə/71 meyardır; müsahibə mərhələsi yaradılmır. İkinci worksheet yalnız source metadata və sənədlərdə qalır.
- KFC əlavə vəzifələr `kfc-r78..r81`: mövcudluq seçimi yoxdur vəziyyətində cavabı N/A edir. Server absent+numeric və present+N/A uyğunsuzluğunu 422 ilə rədd edir. Köhnə draft-lara avtomatik mövcudluq və ya cavab backfill edilmir. Klikun/Skaut adları saxlanır; Skaut/brend-şef təlimatlarında xostes istinadı istifadəçi təsdiqinə uyğun düzəldilib. KFC overall/section/earned yenə null-dır.
- Bütün formalarda vahid son bölmə: müşahidələr/qeydlər, auditor rəyi, bir foto və üç əlavə sənəd slotu. Mövcud `/audit-evidence` upload/download istifadə olunur; ayrıca storage sistemi yoxdur. Əlaqələr draft/save tarixçəsinə daxil olur. Server maksimum üç sənəd, unikal evidence ID-ləri, parent audit uyğunluğu və foto MIME tipini yoxlayır.
- Lokal real upload/download PASS; production provider konfiqurasiyası yoxdur və 503 BLOCKED davranışı qorunub. Upload davam edərkən save/complete bloklanır; gecikmiş upload cavabı digər qeydləri köhnə state ilə əvəz etmir. Yeni uğurlu upload olmadan slot doldurulmur.

Tam mətn xəritəsi: `HR_AUDIT_PACKAGE_03_EDITORIAL_MAP.md`. Son QA aşağıdakı QA sənədindədir.


Paketləmə düzəlişi: Backend Dockerfile indi `config` qovluğunu da image-ə köçürür; əvvəl source-bound HR config-i runtime image-də çatışmırdı. Frontend eyni editorial xəritənin `Frontend/src/i18n/hrAuditEditorial.json` nüsxəsindən istifadə edir; backend testi iki faylın tam eyniliyini yoxlayır. Beləliklə hər layihə öz build context-i daxilində işləyir, repository-dən kənar import yoxdur. Docker build və network/DB olmadan runtime smoke testi PASS.
