# Paket 08 — texniki inteqrasiya inventarı

Baza: Paket 07. Bu inventar route fayllarından çıxarılıb; authentication/authorization və parent scope endpoint daxilində də tətbiq edilir. Eyni shared route dörd istiqaməti qarışdırmır: immutable parent context konkret istiqaməti müəyyən edir.

## Backend route faylları

| Fayl | Lokal HTTP yolları |
|---|---|
| `Backend/routes/auditAction.routes.js` | `POST /`; `GET /audit/:auditId`; `PUT /:id/status` |
| `Backend/routes/auditActivity.routes.js` | `POST /`; `GET /:auditId/timeline`; `GET /:auditId` |
| `Backend/routes/auditAnalytics.routes.js` | `GET /summary`; `GET /type`; `GET /trend`; `GET /service`; `GET /standard`; `GET /safety`; `GET /center`; `GET /overview`; `GET /direction/:direction` |
| `Backend/routes/auditApproval.routes.js` | `POST /`; `GET /:auditId`; `PATCH /:id`; `GET /:auditId/reviewers` |
| `Backend/routes/auditAssignment.routes.js` | `POST /`; `GET /:auditId`; `DELETE /:id`; `GET /:auditId/candidates` |
| `Backend/routes/auditClosure.routes.js` | `POST /`; `GET /:auditId` |
| `Backend/routes/auditDashboard.routes.js` | `GET /` |
| `Backend/routes/auditEvidence.routes.js` | `POST /:auditId`; `GET /by-audit/:auditId`; `GET /:id/file` |
| `Backend/routes/auditExecution.routes.js` | `GET /`; `POST /`; `GET /:id`; `PUT /:id/submit`; `PUT /:id/draft`; `GET /:id/hr-history`; `PUT /:id/service-draft`; `GET /:id/service-history`; `PUT /:id/standard-draft`; `GET /:id/standard-history`; `PUT /:id/hse-draft`; `GET /:id/hse-history` |
| `Backend/routes/auditExport.routes.js` | `GET /:auditId/csv`; `GET /:auditId/excel`; `GET /:auditId/pdf` |
| `Backend/routes/auditFinding.routes.js` | `GET /:auditId`; `POST /`; `PATCH /:id/status` |
| `Backend/routes/auditModule.routes.js` | `GET /standard`; `GET /service` |
| `Backend/routes/auditNotification.routes.js` | `GET /`; `POST /`; `PATCH /:id/read` |
| `Backend/routes/auditPermission.routes.js` | `GET /check` |
| `Backend/routes/auditReport.routes.js` | `GET /:id` |
| `Backend/routes/auditScore.routes.js` | `POST /:id/calculate` |
| `Backend/routes/auditSourceProcessing.routes.js` | Shared router/factory — source/controller guard-ları |
| `Backend/routes/auditTemplateRevision.routes.js` | `GET /:id/revisions`; `POST /:id/` |
| `Backend/routes/auditTimeline.routes.js` | `GET /:auditId` |
| `Backend/routes/auditWorkflow.routes.js` | `PATCH /:id/status` |
| `Backend/routes/auditorProfile.routes.js` | `GET /me`; `GET /candidates`; `GET /:userId`; `PATCH /:userId/directions`; `PUT /:userId` |
| `Backend/routes/hrAudit.routes.js` | `GET /:auditId/action-people`; `GET /list`; `GET /options`; `GET /analytics-options`; `GET /sources`; `GET /restaurants`; `POST /templates/:brandId`; `POST /audits`; `GET /analytics` |
| `Backend/routes/hseAudit.routes.js` | `GET /analytics-sources`; `GET /analytics-options`; `GET /analytics`; `GET /auditors`; `POST /objects`; `PUT /object-grants`; `POST /templates/:objectType`; `POST /audits`; `GET /:auditId/action-people` |
| `Backend/routes/occupationalSafetyAudit.routes.js` | `GET /`; `POST /` |
| `Backend/routes/serviceAudit.routes.js` | `GET /:auditId/action-people`; `GET /list`; `GET /options`; `GET /analytics-options`; `GET /sources`; `GET /restaurants`; `POST /templates/:brandId`; `POST /audits`; `GET /analytics` |
| `Backend/routes/standardAudit.routes.js` | `GET /:auditId/action-people`; `GET /list`; `GET /options`; `GET /analytics-options`; `GET /sources`; `GET /restaurants`; `POST /templates/:brandId`; `POST /audits`; `GET /analytics` |

## API mount-lar

```js
router.use('/audit-analytics', auditAnalyticsRoutes);
router.use('/audit-hr', require('./hrAudit.routes'));
router.use('/audit-actions', require('./auditAction.routes'));
router.use('/audit-module', auditModuleRoutes);
router.use('/occupational-safety-audits', occupationalSafetyAuditRoutes);
router.use('/audit-workflow', auditWorkflowRoutes);
router.use('/audit-report', auditReportRoutes);
router.use('/audit-score', auditScoreRoutes);
router.use('/audit-execution', require('./auditExecution.routes'));
router.use('/audit-dashboard', auditDashboardRoutes);
router.use('/audit-notification', auditNotificationRoutes);
router.use('/audit-approval', auditApprovalRoutes);
router.use('/audit-closure', auditClosureRoutes);
router.use('/audit-export', auditExportRoutes);
router.use('/audit-permission', auditPermissionRoutes);
router.use('/audit-evidence', require('./auditEvidence.routes'));
router.use('/auditor-profiles', require('./auditorProfile.routes'));
router.use('/audit-templates', require('./auditTemplateRevision.routes'));
router.use("/audit-activity", auditActivityRoutes);
router.use('/audit-service',require('./serviceAudit.routes'));
router.use('/audit-hse',require('./hseAudit.routes'));
router.use('/audit-standard',require('./standardAudit.routes'));
```

## Audit frontend yolları

```tsx
{ path: "audit/restaurants", element: <RestaurantsList /> },
{ path: "audit/restaurants/new", element: <RestaurantForm /> },
{ path: "audit/restaurants/:id", element: <RestaurantDetail /> },
{ path: "audit/restaurants/:id/edit", element: <RestaurantForm /> },
{ path: "audit/audits", element: <AuditsList /> },
{ path: "audit/audits/new", element: <AuditForm /> },
{ path: "audit/audits/:id", element: <AuditDetail /> },
{ path: "audit/audits/:id/edit", element: <AuditEdit /> },
{ path: "audit/checklists", element: <AuditTemplatesList /> },
{ path: "audit/checklists/new", element: <AuditTemplateBuilder /> },
{ path: "audit/checklists/:id", element: <AuditTemplateBuilder /> },
{ path: "audit/service", element: <ServiceAuditPage /> },
{ path: "audit/service/new", element: <ServiceAuditPage createOnly /> },
{ path: "audit/service/analytics", element: <ServiceAuditPage analytics /> },
{ path: "audit/standard", element: <StandardAuditPage /> },
{ path: "audit/standard/new", element: <StandardAuditPage createOnly /> },
{ path: "audit/standard/:id", element: <StandardAuditDetail /> },
{ path: "audit/standard/analytics", element: <StandardAuditPage analytics /> },
{ path: "audit/safety", element: <HseAuditPage /> },
{ path: "audit/safety/legacy", element: <AuditDirectionPage direction="occupational-safety" /> },
{ path: "audit/safety/new", element: <HseAuditPage createOnly /> },
{ path: "audit/safety/:id", element: <SafetyAuditDetail /> },
{ path: "audit/safety/analytics", element: <HseAuditPage analytics /> },
{ path: "audit/auditors", element: <AuditorProfilesPage /> },
{ path: "audit/hr", element: <HRAuditPage /> },
{ path: "audit/hr/new", element: <HRAuditPage createOnly /> },
{ path: "audit/hr/analytics", element: <HRAuditPage analytics /> },
{ path: "audit", element: <AuditHome /> },
{ path: "audit/dashboard", element: <AuditDashboard /> },
{ path: "audit/notifications", element: <AuditNotificationsList /> },
{ path: "audit/analytics", element: <AuditCenterSummary /> },
{ path: "audit/report/:id", element: <AuditReportDetail /> },
{ path: "audit/execution/:id", element: <AuditExecutionPage /> },
```

## Data modelləri

- `Backend/models/audit.model.js`
- `Backend/models/auditAction.model.js`
- `Backend/models/auditActivity.model.js`
- `Backend/models/auditApproval.model.js`
- `Backend/models/auditAssignment.model.js`
- `Backend/models/auditClosure.model.js`
- `Backend/models/auditContext.model.js`
- `Backend/models/auditDepartmentSnapshot.model.js`
- `Backend/models/auditEvidence.model.js`
- `Backend/models/auditExecution.model.js`
- `Backend/models/auditFinding.model.js`
- `Backend/models/auditNotification.model.js`
- `Backend/models/auditSourceDocument.model.js`
- `Backend/models/auditTemplate.model.js`
- `Backend/models/auditTemplateRevision.model.js`
- `Backend/models/auditTimeline.model.js`
- `Backend/models/auditorProfile.model.js`
- `Backend/models/hrAuditSave.model.js`
- `Backend/models/hrAuditSourceBinding.model.js`
- `Backend/models/hseAuditSave.model.js`
- `Backend/models/hseAuditSourceBinding.model.js`
- `Backend/models/hseObject.model.js`
- `Backend/models/hseObjectGrant.model.js`
- `Backend/models/serviceAuditSave.model.js`
- `Backend/models/serviceAuditSourceBinding.model.js`
- `Backend/models/standardAuditSave.model.js`
- `Backend/models/standardAuditSourceBinding.model.js`

## Security və analitika xidmətləri

- `auditDirection`, `auditScope`, `templateScope`, `authorization` middleware-ləri: role/resource action → active GFC direction grants → tenant/parent/object scope.
- `auditAudience`, `auditCreation`, `auditorProfile`, `hseObjectAccess`: create və assignment-a direction/restaurant/object yoxlaması; transaction daxilində current grant lock.
- `auditCenter.controller`: scope-first say/status/action/approval/closure/recurrence aggregation, ümumi faiz null.
- `auditSourceAnalytics.service`: Standart/HSE execution snapshot-u ilə server aggregation; immutable source/scoring kontraktı saxlanır.
- HR/Servis source controller-ləri: ayrıca scoring, auditor/section filtrləri, maksimum 5000 audit üçün açıq 422.
- `auditReport`, `auditWorkbook`, `auditEvidenceStorage`, private file controller-ləri Paket 07-dən təkrar istifadə edilir; bu paket yeni export/storage sistemi yaratmır.
