# Paket 05 — Standart Auditi implementasiyası

Tarix: 16 oktyabr 2026. Repository `isgandarovusal/INOP`, yalnız `inop-main`. Başlanğıc commit: `5948a7837a637e7d4f1f680a49ea80738c66c5c5`.

## Əhatə və mənbə

Üç brendin tam versiyalaşdırılmış kataloqu: KFC 190/10, Pizza Hut 123/10, Simit Sarayı 71/10 standart/bölmə. Hər kataloqun hər iki vərəqi, mətnin orijinalı, AZ redaktəsi, sətir/kod/risk və əlavə metadata saxlanır. Mənbə xəritəsi `STANDARD_AUDIT_PACKAGE_05_SOURCE_MAP.md`-də hər 384 standart üçün verilir. Şəxsi məlumatları və hazır nəticələri olan nümunə audit yeni formaya köçürülmür. Workbook-lar repoya daxil edilmir.

Kataloq versiyası `standard-source-v1`, cavab kontraktı `approved-standard-contract-v1`-dir. Registry versiya/hash ilə mənbə seçir; tam məzmun digest-i qismən kataloq və saxtalaşdırılmış snapshot-u rədd edir. Hər brend üçün ayrıca binding, template və immutable published revision yaradılır. Yeni versiya köhnə binding/revision-u əvəz etmir; köhnə versiya registry-də saxlanmalıdır. Sintetik arxiv-versiya testi köhnə draftın sonrakı nəşrdən asılı olmadığını yoxlayır.

Production-a heç bir seed, provision, migration və ya DB yazısı edilməyib. Aktivləşdirmə səlahiyyətli menecerin mövcud məlumatları silmədən ayrıca `POST /audit-standard/templates/:brandId` əməliyyatı ilə aparılır. Əvvəlki versiya dəyişibsə, səssiz əvəzləmə deyil, 409 qaytarılır. Provision UI/API template idarəetmə icazəsi tələb edir.

## Forma, lifecycle və nəticə

`/app/audit/standard`, `/standard/new`, `/standard/analytics` ayrıdır. Forma bütün kataloqu göstərir, auditor özbaşına standart çıxara bilmir. Standartın mənbə risk dərəcəsi ilə audit nəticəsi ayrı sahələrdir: `critical`, `major`, `minor`, `compliant`, `na`; boş cavab ayrıca vəziyyətdir.

İstifadəçinin təsdiqlədiyi düstur serverdə hesablanır:

```
applicable = compliant + critical + major + minor
percentage = applicable > 0 ? compliant / applicable * 100 : null
```

Cavabsız standart yekunlaşdırmanı bloklayır. N/A səbəbi və tətbiqedilməzlik əsası məcburidir; heç bir avtomatik applicability qaydası uydurulmur. Bütün N/A olduqda null qalır. Draftda tamamlanmamış ümumi faiz null-dır. Severity çəkisi, avtomatik fail həddi, restoranın avtomatik dayandırılması və universal SLA yoxdur; `passed=null`. Nümunədəki Critical/48 saat/7 gün izahı təsdiqlənmiş ümumi siyasət hesab edilmir.

Draft/resume, optimistic concurrency (`expectedVersion`), submit, müstəqil approval, closure və immutable save history mövcud transaction/revision infrastrukturu ilə işləyir. Parent audit və execution eyni server nəticəsini saxlayır; client score və metadata injection-u qəbul edilmir. Tamamlanmış Standard auditin cavab və əsas məlumatlarını adi update/rescore ilə dəyişmək olmaz.

Faktiki submit edən auditorun ID-si, adı və vaxtı serverdə `standardSubmission` kimi saxlanır; hesabat və auditor filtri həmin şəxsi istifadə edir. Audit yaradan menecer ayrıca qalır. Approval reviewer kataloqunda və request/resolve API-lərində formanın hər hansı draft/save iştirakçısı müstəqil reviewer ola bilmir. Təkcə auditi planlaşdırmış, cavabları daxil etməmiş menecer əsassız bloklanmır. N/A varsa, reviewer səbəbləri açıq təsdiqləyir; approval-a cavab digest-i, versiya və səbəblər yazılır. Closure həmin təsdiqin tamamlanmış execution-a aid olduğunu yoxlayır.

## Müşahidə, evidence və düzəldici tədbirlər

Hər standart üçün qeyd, foto/evidence və bir neçə ayrıca müşahidə; hər bölmənin sağ panelində qeyd və foto var. Sonda ümumi müşahidələr, yekun rəy, bir foto və üç ayrıca sənəd sahəsi mövcuddur. Mövcud özəl evidence/storage, fayl növü/ölçü və audit ownership yoxlamaları təkrar istifadə edilir. Hər bağlantı audit/restoran/revision-a bağlı immutable save içində saxlanır.

Yalnız Critical/Major/Minor cavabları finding yaradır. Bir standartdakı bir neçə müşahidə ayrı unikal finding kodu ilə saxlanır, lakin həmin standart nəticədə yalnız bir dəfə sayılır. Compliant/N/A avtomatik finding və ya corrective action yaratmır. Source Standard üçün ümumi manual finding API-si uyğunsuz nəticə injeksiyasını 409 ilə rədd edir; finding formanın versioned submit-indən yaranır. Digər istiqamətlərin mövcud manual finding mexanizmi dəyişdirilməyib.

Mövcud corrective action, məsul şəxs, əl ilə son tarix, evidence, status, müstəqil verification və closure mexanizmləri işləyir. Başqa auditin faylı bağlana bilmir; işi icra edən şəxs öz tədbirini verified edə bilmir. Source risk auditorun finding severity-si ilə əvəz edilmir.

## Cover, Findings və Excel export

Cover real restoran/brand snapshot-unu, audit tarixi/statusu, faktiki auditoru, kataloq versiyasını, bütün standart və mənbə risk saylarını, tətbiq edilən/N/A/cavabsız/uyğun/uyğunsuz saylarını və bölmə nəticələrini göstərir. Nümunənin 175 və 96.57% rəqəmləri sabit deyil.

Mövcud exporter genişləndirilib: `Cover`, `Findings`, `Standards`, `Observations`, `Actions`, `Approvals`, `Closures`, `History`. Findings Sheet2 modelini standart ID-si, unikal kod, mənbə/audit risk sahələri, qeydlər, action/evidence və təsdiq/bağlanış istinadları ilə verir. Standards tam kataloq və cavabları, Observations çoxsaylı müşahidələri saxlayır. History böyük JSON hüceyrəsi əvəzinə cavab/bölmə/müşahidə sətirləri ilə verilir; Excel-in hüceyrə limitinə görə tarixçə itmir. Export yalnız tamamlanmış Standard forması üçün açılır və saxlanılmış server nəticəsindən istifadə edir. İmza sahələri boşdur; uydurma imza yoxdur.

## Analitika

Yalnız icazəli, real saxlanılmış Standart auditlərindən ayrıca analitika hesablanır. Brend, restoran, ərazi, tarix, faktiki auditor, status, kataloq versiyası, bölmə, mənbə risk dərəcəsi, nəticə və kateqoriya filtrləri mövcuddur. Saylar, tamamlanma/əhatə, bölmə və restoran müqayisəsi, aylıq dinamika, təkrarlanan meyar uyğunsuzluqları, action/finding statusları və məsul şəxslər göstərilir. Cavab sayı ilə finding sayı qarışdırılmır. Fərqli audit istiqamətlərinin faizləri birləşdirilmir.

Sorğu 500 auditlik pəncərə ilə məhduddur: daha böyük intervalda natamam statistika göstərmək əvəzinə 422 və filtrləri daraltmaq tələbi qaytarılır. Boş/loading/error vəziyyətləri var; demo rəqəmlər yoxdur.

## Dörd istiqamətin ayrılması və RBAC

Ümumi `/audits/new` artıq qarışıq forma deyil. Mərkəzi administrator üçün dörd ayrıca istiqamət keçidi verir; auditor öz istiqamətinin create ekranına yönləndirilir. HR, Servis, Standart və HSE-nin ayrı create/list/analytics URL-ləri var. HSE-nin geniş biznes implementasiyası bu paketə daxil deyil, mövcud təhlükəsiz forması qorunur. Recruitment və Main Dashboard dəyişdirilmir.

Backend bütün parent/child əməliyyatlarında aktiv profil, direction, GFC tenant, restoranın real brand-i, mövcud owned/active assignment və əməliyyat icazəsini yoxlayır. Profilə malik auditorun rolunu admin/audit_manager etmək onun restoran məhdudiyyətini aradan qaldırmır. Təkcə all-scope analytics/report icazəsi assignment olmadan restoran çıxışı vermir. Template/source və restoran siyahıları da eyni brand/restoran əhatəsinə endirilir. Profilə malik template meneceri başqa brand-i provision edə bilmir. Profilsiz səlahiyyətli GFC administratorunun ümumi nəzarəti qalır; açıq foreign-tenant restaurant/context-lər ondan da gizlədilir. Köhnə tenantı naməlum legacy auditlər səssiz silinmir.

Köhnə source-audit edit URL-ləri təhlükəsiz detail səhifəsinə yönləndirilir; köhnə tarixçə/report URL-ləri saxlanır. HR/Servis scoring, Standard-dan əvvəlki legacy audit nəticələri və HSE biznes kontraktları dəyişdirilmir.

## Vizual sistem və lokalizasiya

Mövcud premium ağ/açıq-mavi/tünd-göy Audit komponentləri, SectionCard, düymə/form/evidence/follow-up strukturları təkrar istifadə edilir; paralel CSS sistemi yaradılmayıb. AZ/EN/RU idarəetmə və nəticə mətnləri saxlanır. Normativ mənbə məzmunu izlənilə bilən Azərbaycan dilindədir; texniki məna təxminən tərcümə edilmir. 320/390/768/1440 ölçülərində real forma və route regressiyası icra edilib.

## Açıq xarici məhdudiyyət

Production storage provider/credentials bu mühitdə əlçatan deyil. Mövcud production 503 fail-closed davranışı saxlanır; səssiz lokal fallback və saxta upload uğuru yoxdur. Lokal byte upload/download, ownership və UI error yoxlanıb. Real production upload/download PASS deyil. Bu task production konfiqurasiyası, DB və deployment-i dəyişmir.

## Fayl xəritəsi

- `Backend/config/standardAuditReportSource.json`
- `Backend/config/standardAuditSources.json`
- `Backend/controllers/standardAudit.controller.js`
- `Backend/models/standardAuditSave.model.js`
- `Backend/models/standardAuditSourceBinding.model.js`
- `Backend/routes/standardAudit.routes.js`
- `Backend/scripts/verifyStandardAuditSources.py`
- `Backend/services/auditAudience.service.js`
- `Backend/services/standardAuditAssessment.service.js`
- `Backend/services/standardAuditExecution.service.js`
- `Backend/tests/auditSeparation.test.cjs`
- `Backend/tests/standardAuditAssessment.test.cjs`
- `Backend/tests/standardAuditWorkflow.test.cjs`
- `Frontend/src/Pages/Audit/StandardSource/StandardAuditExecution.tsx`
- `Frontend/src/Pages/Audit/StandardSource/StandardAuditPage.tsx`
- `Frontend/src/Pages/Audit/StandardSource/StandardCover.tsx`
- `Frontend/src/Services/standardSourceService.ts`
- `Frontend/tests/standardAuditWorkflow.spec.cjs`
- `Backend/controllers/auditAction.controller.js`
- `Backend/controllers/auditExecution.controller.js`
- `Backend/controllers/auditExport.controller.js`
- `Backend/controllers/auditReport.controller.js`
- `Backend/controllers/auditScore.controller.js`
- `Backend/controllers/audits.controller.js`
- `Backend/controllers/hrAudit.controller.js`
- `Backend/controllers/restaurants.controller.js`
- `Backend/controllers/serviceAudit.controller.js`
- `Backend/middleware/auditScope.middleware.js`
- `Backend/middleware/restaurantScope.middleware.js`
- `Backend/middleware/templateScope.middleware.js`
- `Backend/models/audit.model.js`
- `Backend/models/auditApproval.model.js`
- `Backend/models/auditExecution.model.js`
- `Backend/models/auditFinding.model.js`
- `Backend/models/auditTemplate.model.js`
- `Backend/routes/auditExecution.routes.js`
- `Backend/routes/route.js`
- `Backend/services/auditAssessment.service.js`
- `Backend/services/auditCreation.service.js`
- `Backend/services/auditLifecycle.service.js`
- `Backend/services/auditPeople.service.js`
- `Backend/services/auditTemplateRevision.service.js`
- `Backend/tests/auditCatalog.test.cjs`
- `Backend/tests/auditFoundation.test.cjs`
- `Backend/tests/auditIntegrationDebt.test.cjs`
- `Backend/tests/auditLegacySafety.test.cjs`
- `Frontend/src/Pages/Audit/AuditApproval/AuditApprovalPanel.tsx`
- `Frontend/src/Pages/Audit/AuditExecution/AuditExecutionPage.tsx`
- `Frontend/src/Pages/Audit/AuditReport/AuditReportDetail.tsx`
- `Frontend/src/Pages/Audit/Audits/AuditDetail.tsx`
- `Frontend/src/Pages/Audit/Audits/AuditEdit.tsx`
- `Frontend/src/Pages/Audit/Audits/AuditForm.tsx`
- `Frontend/src/Pages/Audit/ChecklistBuilder/AuditTemplateBuilder.tsx`
- `Frontend/src/Pages/Audit/HRAudit/HRAuditActions.tsx`
- `Frontend/src/Pages/Audit/HRAudit/HRAuditPage.tsx`
- `Frontend/src/Pages/Audit/ServiceSource/ServiceAuditPage.tsx`
- `Frontend/src/Pages/Audit/ServiceSource/ServiceFollowUp.tsx`
- `Frontend/src/Routes/RoleRoute.tsx`
- `Frontend/src/Routes/Routes.tsx`
- `Frontend/src/Services/auditExecutionService.ts`
- `Frontend/src/Services/auditReportService.ts`
- `Frontend/src/Types/Audit/approval.ts`
- `Frontend/src/Types/Audit/template.ts`
- `Frontend/src/Types/audit.ts`
- `Frontend/src/i18n/locales/az.json`
- `Frontend/src/i18n/locales/en.json`
- `Frontend/src/i18n/locales/ru.json`
- `Frontend/tests/auditVisualUnification.test.cjs`

Sübutlar və 44 köhnə uğursuzluğun müqayisəsi ayrıca QA/REGRESSION sənədlərindədir.
