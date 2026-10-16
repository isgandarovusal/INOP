# Paket 06 — Əməyin mühafizəsi auditi implementasiyası

16 oktyabr 2026. Repository `isgandarovusal/INOP`; yalnız `inop-main`; təmiz başlanğıc və remote baza `93c0165f07d9831fc879afce292910df75189d6a`.

## Mənbə və versiyalar

Üç real HSE blankı: universal restoran 6 bölmə/52 meyar, ofis 5/19, anbar 6/29. Dörd vərəq, bütün 308 düstur, risk/çəki, validation, hidden sətir/sütun, birləşmə və conditional-format XML/style metadata-sı izlənir. Ətraflı xəritə `HSE_AUDIT_PACKAGE_06_SOURCE_MAP.md`-dədir. Orijinal workbook, doldurulmuş auditor adı və nümunə nəticələr repoya və yeni auditə köçürülmür.

Versiya `hse-source-v1`; restoran `hse-simple-v1`, ofis/anbar `hse-weighted-v1`. Tam sual/bölmə digest-i və mənbə hash/version yoxlaması qismən və ya dəyişdirilmiş məzmunu rədd edir. Hər obyekt növü üçün ayrı source binding/template/published immutable revision var. Yeni versiyada registry-də arxiv giriş saxlanmalı, yeni versiya son giriş olmalıdır. Köhnə revision və nəticələr overwrite/rescore edilmir; sintetik arxiv versiyası testi bunu təsdiqləyir.

## Obyektlər və giriş modeli

Restoranlar mövcud `Restaurant` kolleksiyasından istifadə edir: GFC → mövcud KFC/Pizza Hut/Simit Sarayı → restoran. Üç brend eyni restoran HSE revision-unu alır, brand/restaurant audit metadata snapshot-unda qalır. Excel-dəki hazır adlar seed edilmir.

Mövcud `RecruitmentBranch` HR məkanları office/warehouse növü saxlasa da GFC tenant/HSE grant provenance-ı daşımır; HR inventory və səlahiyyətləri səssiz HSE-yə çevrilmir, Recruitment məlumatları dəyişdirilmir. Ofis və anbar `HseObject` modelində ayrı `office`/`warehouse` növləri ilə saxlanır. Onlar üçün saxta Restaurant qeydi və saxta brand yaradılmır. `Audit.restaurantId` yalnız bu iki real HSE obyekt növü üçün məcburi deyil; bütün köhnə auditlərdə əvvəlki tələb qalır. AuditContext-də immutable objectType/objectId var, restoran konteksti əvvəlki brand/restoran qaydasını saxlayır.

Səlahiyyətli profilsiz GFC admin/audit_manager və real `audit.assignment` icazəsi olan mərkəzi idarəçi UI/API-dən ofis/anbar əlavə edə, aktiv HSE profilinə obyekt grant-ı verə və ya ləğv edə bilər. Auditor ad siyahısından seçilir; sərbəst ID texniki giriş sahəsi deyil. Avtomatik grant, restoran və ya istifadəçi yaradılmır. `HseObjectGrant` serverdə təyin olunan `{userId}:{objectId}` `_id`-si ilə unikal olduğuna görə ayrıca production unique-index migration-a arxalanmır. Grant dəyişiklikləri və source save/create grant write-version-u vasitəsilə transaction yazı konfliktinə daxil olur.

Ofis/anbar üçün aktiv object grant və owned/assigned parent scope hər əməliyyatda birlikdə tələb edilir. Grant ləğv ediləndə hətta özünün yaratdığı auditə read/export/history çıxışı profilli auditor üçün bağlanır. Rolu adminə yüksəltmək mövcud HSE profilinin məhdudiyyətini götürmür. Real auditor assignment endpoint-i də ofis/anbar üçün məhz həmin obyektin aktiv grant-ını tələb edir; grant-sız auditor namizəd siyahısına daxil edilmir və POST təyinat 403 olur, grant-dan sonra 201-dir. Açıq foreign tenant obyekt və kontekst mərkəzi GFC adminindən də gizlədilir. Profilsiz və all-scope səlahiyyətli GFC nəzarəti saxlanır. Digər istiqamətlər office/warehouse parent-lərini görə bilmir.

## Qiymətləndirmə

Cavablar `compliant`, `noncompliant`, `na`, cavabsız isə `''`-dır. Uyğun=1, Uyğunsuz=0, N/A həm numerator, həm denominator-dan çıxarılır. Bütün N/A və sıfır denominator → null. Cavabsız meyar və səbəbsiz N/A completion-u bloklayır. Uyğunsuzluğun təsviri tələb olunur, yeni məcburi foto tələbi yoxdur.

- Restoran: `compliant / applicable × 100`. İstifadəçi bu icrada **yalnız restoran üçün ≥85% keçid həddini təsdiqləyib**. `passed` true/false serverdə saxlanır; incomplete/all-N/A üçün null. Bu nəticə workflow-u bağlamır, corrective action SLA və obyektin avtomatik dayandırılması deyil.
- Ofis/anbar: adi faiz ayrıca; çəkili faiz `uyğun cavabların mənbə çəkilərinin cəmi / uyğun və uyğunsuz cavabların mənbə çəkilərinin cəmi × 100`. Kritik=5, Mühüm=3, Kiçik=1. N/A çəkisi denominator-a girmir. Ofis/anbar `passed=null`: restoranın 85%-i onlara tətbiq edilmir.
- GFC vahid HSE faizi təsdiqlənməyib: həmişə null, səbəbi UI/API-də göstərilir. Üç metodun faizləri birlikdə ortalanmır.

Frontend, analitika, report və export eyni serverdə saxlanmış nəticə/assessment-dən istifadə edir. Analitikada bölmə/risk filtri saxlanmış cavab və sabit mənbə çəkiləri üzrə ayrıca qruplar yaradır; sonradan başqa scoring qaydası tətbiq olunmur. Severity ilə corrective action prioriteti eyniləşdirilmir: mövcud action default-u qalır, risk ağırlığı ona avtomatik köçürülmür. Restoranda mənbə riski olmadığından uydurma severity yoxdur (null).

Restoran Cover-in köhnə 57 sabiti, A4 sətirində çatışmayan bal düsturu və ziddiyyətli Cover bölmə düsturları source map-də açıq göstərilib. Təsdiqlənmiş 52 meyarlıq 1/0/N/A müqaviləsi serverdə əsasdır; səhv Excel cache/düsturları runtime sabitinə çevrilmir.

## Lifecycle, evidence və tədbirlər

Mövcud Audit/Execution/transaction/status/revision mexanizmləri genişləndirilir. Draft/resume və `expectedVersion` CAS var; paralel save-lərdən biri 200, digəri 409 alır. Tamamlanmış formanın cavabları, source revision-u və immutable HSE save history-si adi update ilə dəyişmir. Generic rescore və legacy safety-details mutation source HSE üçün 409-dur. Legacy /5 auditləri oxunur, nəticə və tarixçəsi dəyişmir; `/safety/legacy` keçidi və köhnə detail URL-ləri qorunur. Yeni source-audit legacy edit/detail URL-ləri doğru detail-a yönləndirilir.

Hər sualda qeyd, foto/evidence və bir neçə ayrıca müşahidə; root cause, nümunə sayı və mənbədəki Bəli/Xeyr/boş repeat sahəsi saxlanır. Bölmədə sağ notes/photo paneli var. Sonda ümumi müşahidə, yekun rəy, bir foto və üç sənəd slotu var. Obyekt/HSE meneceri və növbəti audit tarixi optional metadata-dır. Mövcud private evidence/storage sistemi təkrar istifadə edilir; real upload/download, MIME/size, parent ownership və fresh role/object scope yoxlanır. Failed upload uğur kimi göstərilmir.

Yalnız `noncompliant` source cavabı finding yaradır. N/A və Compliant yaratmır. Bir standartdakı çoxsaylı müşahidələr ayrıca unikal finding koduna malikdir; uyğunluqda meyar bir dəfə sayılır. Finding source criterion/version/risk/evidence-ə bağlıdır. Source HSE üçün müstəqil manual finding injeksiyası rədd edilir. Mövcud corrective action owner, due date, status və proof işləyir; yeni SLA/cərimə yoxdur. İcra edən öz action-unu verified edə bilmir; linked action verified olmadan finding bağlana bilməz.

Faktiki submit actor-u (yaradan menecerdən ayrı) serverdə saxlanır. HSE save iştirakçısı öz auditini təsdiq edə bilmir: reviewer directory, request və approval resolve yoxlanır. N/A səbəblərinə müstəqil açıq təsdiq, cavab digest-i və template version-u approval-da saxlanır. Closure eyni completed execution-a aid review və bitmiş finding/action-ları tələb edir. Audit/history/approval/closure real obyektə bağlıdır.

## Dörd analitika görünüşü

`/app/audit/safety/analytics` GFC nəzarətidir; `?objectType=restaurant`, `office`, `warehouse` ayrıca görünüşlərdir. Create/list axınları da obyekt növü ilə ayrıdır. Restoranda brand/obyekt/ərazi/date/auditor/status/section; ofis/anbarda obyekt/date/auditor/section/risk/action-status filtrləri var. Yalnız icazəli real parent-lər və completed source execution-ları hesablanır.

Saylar/statuslar, audit əhatəsi, completed sayı, ayrı adi/çəkili göstəricilər, Critical və digər uyğunsuzluqlar, təkrarlanan meyarlar, aylıq trend, açıq/gecikmiş/verified tədbirlər verilir. Restoran keçdi/keçmədi sayları saxlanmış `passed` nəticəsindəndir. Məlumat yoxdursa empty, infrastruktur/API xətasında error göstərilir. Filtrlənmiş pəncərə 500 auditdən böyükdürsə 422 qaytarılır; səssiz natamam göstərici yoxdur. Müxtəlif obyekt növləri üzrə bir vahid faiz yoxdur.

## Excel export

Mövcud exporter və endpoint genişləndirilib. Restoran `COVER`, ofis/anbar `Results Summary` alır; nəticə yerləşimi eyniləşdirilmir. `HSE Criteria`, `HSE Observations`, `HSE History`, `HSE Applicability` source-specific vərəqlərdir. Mövcud Findings/Actions/Approvals/Closures saxlanır; finding/action/version/evidence istinadları verilir. Adi/çəkili faiz, restoran passed və 85% həddi, N/A səbəbləri, root cause/sample/repeat, menecerlər, tarixçə, section photo/notes, final foto/üç sənəd çıxır.

Tarixçə və N/A approval review-ları ayrı sətirlərə açılır; 32,767 simvolluq Excel hüceyrəsinə böyük JSON yığılmır. HSE finding-in action-ları ayrıca Actions/FindingId əlaqəsi ilə çıxır. Boş imza sahələri var; uydurma əl/elektron imza və Excel-dəki dolu auditor adı yazılmır. Draft export 409-dur, completed source export saxlanmış server nəticəsini istifadə edir.

## UI, ayrılıq və uyğunluq

Premium SectionCard/FormSection, navy/white workspace, ServicePhoto, HRFinalEvidence, history, actions və approval/closure komponentləri təkrar istifadə edilir. Yeni paralel storage/export sistemi və geniş CSS qatı yaradılmır. Source HSE ayrıca executor/page/assessment alır; HR/Servis/Standart scoring dəyişdirilmir. Recruitment, Main Dashboard və branding/backup fayllarında dəyişiklik yoxdur.

AZ/EN/RU controls/nəticələr, 320/390/768/1440 ölçüləri yoxlanır. Mənbə meyarları orijinal AZ və minimal typo redaktəsi ilə source map-də izlənir; biznes mənası dəyişdirilmir. Restoran, ofis və anbar sualları qarışdırılmır. Dörd istiqamət üzrə create route və API scope ayrılığı saxlanır. Tarixi /5 HSE forması yeni source forması kimi göstərilmir.

## Production sərhədi

Production DB, secrets, migration, template provision və manual deploy icra edilməyib. Yeni kolleksiyalar/provider/grant-ların production ACL/topology və canlı rollout-u yoxlanmayıb. HSE template provision ayrı səlahiyyətli mərkəzi əməliyyatdır; real ofis/anbar inventory və auditor grants bu task-da production-a yazılmır.

Private/durable production storage provider və credentials əlçatan deyil. Mövcud production-mode 503 fail-closed saxlanır; lokal fallback və saxta credentials yoxdur. Lokal upload/download PASS canlı production storage PASS demək deyil. Detallı faktiki QA və geniş backend müqayisəsi ayrıca sənədlərdədir.

## Dəyişən fayllar

- `Backend/config/hseAuditSources.json`
- `Backend/controllers/hseAudit.controller.js`
- `Backend/models/hseAuditSave.model.js`
- `Backend/models/hseAuditSourceBinding.model.js`
- `Backend/models/hseObject.model.js`
- `Backend/models/hseObjectGrant.model.js`
- `Backend/routes/hseAudit.routes.js`
- `Backend/scripts/verifyHseAuditSources.py`
- `Backend/services/hseAuditAssessment.service.js`
- `Backend/services/hseAuditExecution.service.js`
- `Backend/services/hseAuditExport.service.js`
- `Backend/services/hseObjectAccess.service.js`
- `Backend/tests/hseAuditAssessment.test.cjs`
- `Backend/tests/hseAuditWorkflow.test.cjs`
- `Frontend/src/Pages/Audit/HSESource/HseAuditExecution.tsx`
- `Frontend/src/Pages/Audit/HSESource/HseAuditPage.tsx`
- `Frontend/src/Pages/Audit/HSESource/HseCover.tsx`
- `Frontend/src/Services/hseAuditService.ts`
- `Frontend/tests/hseAuditWorkflow.spec.cjs`
- `docs/HSE_AUDIT_PACKAGE_06_IMPLEMENTATION.md`
- `docs/HSE_AUDIT_PACKAGE_06_QA.md`
- `docs/HSE_AUDIT_PACKAGE_06_REGRESSION.md`
- `docs/HSE_AUDIT_PACKAGE_06_SOURCE_MAP.md`
- `Backend/controllers/auditAction.controller.js`
- `Backend/controllers/auditExecution.controller.js`
- `Backend/controllers/auditExport.controller.js`
- `Backend/controllers/auditReport.controller.js`
- `Backend/controllers/auditScore.controller.js`
- `Backend/controllers/audits.controller.js`
- `Backend/controllers/occupationalSafetyDetails.controller.js`
- `Backend/middleware/auditScope.middleware.js`
- `Backend/models/audit.model.js`
- `Backend/models/auditContext.model.js`
- `Backend/models/auditExecution.model.js`
- `Backend/models/auditFinding.model.js`
- `Backend/models/auditTemplate.model.js`
- `Backend/routes/auditExecution.routes.js`
- `Backend/routes/route.js`
- `Backend/services/auditAssessment.service.js`
- `Backend/services/auditLifecycle.service.js`
- `Backend/services/auditPeople.service.js`
- `Backend/services/auditTemplateRevision.service.js`
- `Backend/services/auditorProfile.service.js`
- `Frontend/src/Pages/Audit/AuditExecution/AuditExecutionPage.tsx`
- `Frontend/src/Pages/Audit/AuditReport/AuditReportDetail.tsx`
- `Frontend/src/Pages/Audit/Audits/AuditDetail.tsx`
- `Frontend/src/Pages/Audit/Audits/AuditEdit.tsx`
- `Frontend/src/Pages/Audit/ChecklistBuilder/AuditTemplateBuilder.tsx`
- `Frontend/src/Pages/Audit/HRAudit/HRAuditActions.tsx`
- `Frontend/src/Pages/Audit/OccupationalSafetyAudit/SafetyAuditDetail.tsx`
- `Frontend/src/Pages/Audit/ServiceSource/ServiceFollowUp.tsx`
- `Frontend/src/Routes/Routes.tsx`
- `Frontend/src/Services/auditExecutionService.ts`
- `Frontend/src/Services/auditReportService.ts`
- `Frontend/src/Types/Audit/template.ts`
- `Frontend/src/Types/audit.ts`
- `Frontend/src/i18n/locales/az.json`
- `Frontend/src/i18n/locales/en.json`
- `Frontend/src/i18n/locales/ru.json`
- `Frontend/tests/auditVisualUnification.test.cjs`
