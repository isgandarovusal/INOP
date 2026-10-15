# Paket 04 — Servis auditi və analitikası

İş branch-i yalnız `inop-main`. Baza `52474890289f02fd987cb9c0db9c47c152336f53` (Paket 03 bağlanışı). Yeni remote branch və PR yoxdur. Production DB, migration, storage konfiqurasiyası və manual deploy aparılmır.

## Implementasiya

- Üç reviewed source-bound Service şablonu: KFC 13/94 (+1 unscored summary), PH 11/79, SS 10/61. Original/edited text və source metadata tam xəritəsi ayrıca SOURCE_MAP sənədindədir.
- Şablon yalnız admin/audit_manager-in explicit create+update all-scope əməliyyatı ilə provision olunur. Ayrı Service binding collection və namespace, immutable published revision və source hash istifadə edilir. Mövcud şablon əvəz edilmir; dəyişdirilmiş/retired binding 409 qaytarır. Migration və seed icra edilmir.
- GFC → mövcud brand/restoran → Service audit. Source worksheet-dəki restoran adı seçim və ya seed kimi istifadə olunmur. Auditor üçün yeni Service endpoint-ləri assigned/own scope-a daralır; source-bound execution/report/evidence üçün də parent scope tətbiq edilir. Mövcud legacy Service grant-ləri öz əvvəlki kontraktında qalır.
- Yeni `/audit-service` list, source, provision, restaurant/options, analytics və action-people API-ləri; shared Audit execution altında `service-draft`, submit və `service-history`.
- Server yalnız reviewed `auditType=service + serviceSource` snapshot-u üçün 1/0.5/0/na kontraktını işlədir. HR, Standard/HSE və legacy yes/no/na kontraktları dəyişdirilməyib. Service assessment ayrıca `serviceAssessment`, detallar `serviceDetails`, CAS `serviceVersion` kimi saxlanır. Client score nəzərə alınmır.
- Draft save/resume, stale/paralel save 409, incomplete submit 422, immutable completed answers/history. Hər save audit/execution/revision/restaurant əlaqəsi ilə transaction-da history saxlayır. Completion/closure real submit tələb edir; generic calculate yeni Service nəticəsini yenidən hesablaya bilməz.
- Qeyd və foto sual səviyyəsində, bölmənin desktop sağında section note/photo; mobil/tabletdə yığılır. Final müşahidə/rəy, bir ümumi foto və üç sənəd slotu Paket 03-dəki private evidence endpoint-i və final uploader ilə işləyir. Section photo MIME və parent ID, unknown section/reference IDs, final max3/duplicate IDs serverdə yoxlanır. Əlavə müşahidələrin foto/sənədləri final evidence ilə eyni versiyaya bağlanır.
- Mövcud finding/action/approval/closure lifecycle istifadə edilir. Service findings və action completion üçün eyni parent evidence ID-ləri ayrıca saxlanır. Independent verification, self-verification denial və bağlı action yoxlanmadan finding closure denial qorunur. Yeni severity/cərimə balı yoxdur.
- Service list/analytics ayrıca route və API-dədir. Date/brand/restaurant/status filterləri, audit status sayları, stored average, brand/restaurant/section/criterion, aylıq trend, təkrarlanan 0/0.5 cavablar və finding/action statusları var. N/A nonconformity yaratmır. Empty/loading/error vəziyyətləri və pagination var. 5000 pəncərəsi aşılarsa 422 qaytarılır, saxta/truncated rəqəm göstərilmir.
- Mövcud Excel exporter yeni `Service Criteria`, `Service Sections`, `Service Source` və KFC üçün `Service References` worksheet-ləri ilə genişləndirilib. Original və edited meyarlar, cavab/canonical score, section/result, notes/photo/document IDs, audit/revision/source provenance çıxır. Existing Findings/Actions/Approvals/Closures saxlanır; Service üçün dueDate/severity və execution evidence əlavə olunur. Köhnə audit yenidən hesablanmır.
- Audit premium workspace, SectionCard/FormSection, action/history/final-evidence komponentləri təkrar istifadə edilir. HR action/history komponentlərinin yeni optional parametrlərinin default-u əvvəlki davranışdır; HR biznes və scoring dəyişmir. Recruitment və Main Dashboard fayllarında diff yoxdur.

## Texniki məhdudiyyətlər

Production private durable/versioned storage üçün mövcud adapter interfeysi saxlanır. Repository bootstrap-da real production provider qeydiyyatı yoxdur və bu mühitdən production credential/Render konfiqurasiyası əlçatan deyil. Lokal real upload/download yoxlanılır; production konfiqurasiyasız 503 testlə təsdiqlənir. Bu production storage-in işlək olması iddiası deyil. Production storage, retention/restore və production multi-tenant topology/identity sınaqları BLOCKED qalır.

Source meyarları AZ-dır, idarəetmə və cavab UI-sı AZ/EN/RU sistemindədir. Mənbədəki mənfi ifadə, naməlum göstərici və düstursuz summary üçün əlavə biznes qaydası uydurulmur; SOURCE_MAP-də ayrıca izah edilir.

QA və əvvəlki 44 failure müqayisəsi `SERVICE_AUDIT_PACKAGE_04_QA.md` və `SERVICE_AUDIT_PACKAGE_04_REGRESSION.md` sənədlərindədir.


## Dəyişən fayllar

- `Backend/config/serviceAuditSources.json`
- `Backend/controllers/auditAction.controller.js`
- `Backend/controllers/auditExecution.controller.js`
- `Backend/controllers/auditExport.controller.js`
- `Backend/controllers/auditReport.controller.js`
- `Backend/controllers/auditScore.controller.js`
- `Backend/controllers/audits.controller.js`
- `Backend/controllers/serviceAudit.controller.js`
- `Backend/middleware/auditScope.middleware.js`
- `Backend/models/auditAction.model.js`
- `Backend/models/auditExecution.model.js`
- `Backend/models/auditFinding.model.js`
- `Backend/models/auditTemplate.model.js`
- `Backend/models/serviceAuditSave.model.js`
- `Backend/models/serviceAuditSourceBinding.model.js`
- `Backend/routes/auditExecution.routes.js`
- `Backend/routes/route.js`
- `Backend/routes/serviceAudit.routes.js`
- `Backend/scripts/verifyServiceAuditSources.py`
- `Backend/services/auditAssessment.service.js`
- `Backend/services/auditLifecycle.service.js`
- `Backend/services/auditTemplateRevision.service.js`
- `Backend/services/serviceAuditAssessment.service.js`
- `Backend/services/serviceAuditEvidence.service.js`
- `Backend/services/serviceAuditExecution.service.js`
- `Backend/tests/serviceAuditAssessment.test.cjs`
- `Backend/tests/serviceAuditWorkflow.test.cjs`
- `Frontend/src/Pages/Audit/AuditExecution/AuditExecutionPage.tsx`
- `Frontend/src/Pages/Audit/AuditReport/AuditReportDetail.tsx`
- `Frontend/src/Pages/Audit/Audits/AuditDetail.tsx`
- `Frontend/src/Pages/Audit/ChecklistBuilder/AuditTemplateBuilder.tsx`
- `Frontend/src/Pages/Audit/HRAudit/HRAuditActions.tsx`
- `Frontend/src/Pages/Audit/HRAudit/HRAuditVersions.tsx`
- `Frontend/src/Pages/Audit/ServiceSource/ServiceAuditExecution.tsx`
- `Frontend/src/Pages/Audit/ServiceSource/ServiceAuditPage.tsx`
- `Frontend/src/Pages/Audit/ServiceSource/ServiceFollowUp.tsx`
- `Frontend/src/Pages/Audit/ServiceSource/ServicePhoto.tsx`
- `Frontend/src/Routes/Routes.tsx`
- `Frontend/src/Services/auditExecutionService.ts`
- `Frontend/src/Services/auditReportService.ts`
- `Frontend/src/Services/serviceAuditService.ts`
- `Frontend/src/Styles/audit-workspace.css`
- `Frontend/src/Types/Audit/template.ts`
- `Frontend/src/Types/audit.ts`
- `Frontend/src/i18n/locales/az.json`
- `Frontend/src/i18n/locales/en.json`
- `Frontend/src/i18n/locales/ru.json`
- `Frontend/tests/auditVisualUnification.test.cjs`
- `Frontend/tests/serviceAuditWorkflow.spec.cjs`
- `docs/SERVICE_AUDIT_PACKAGE_04_IMPLEMENTATION.md`
- `docs/SERVICE_AUDIT_PACKAGE_04_QA.md`
- `docs/SERVICE_AUDIT_PACKAGE_04_REGRESSION.md`
- `docs/SERVICE_AUDIT_PACKAGE_04_SOURCE_MAP.md`
