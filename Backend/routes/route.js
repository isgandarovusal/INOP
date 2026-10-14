const auditActivityRoutes = require("./auditActivity.routes");
const authRoutes = require('./auth.routes');
const userRoutes = require("./user.routes");
const departmentRoutes = require("./department.routes");
const activityLogRoutes = require("./activityLog.routes");
const rolesRoutes = require("./roles.routes");
const { verifyToken, requirePermission } = require('../middleware/auth.middleware');
const { authorize, authorizeAny } = require("../middleware/authorization.middleware");
const { cvUpload } = require("../middleware/cvUpload.middleware");
const { cvParseUpload } = require("../middleware/cvParse.middleware");
const cvController = require("../controllers/cv.controller");
const { requireAssignedAuditAccess } = require("../middleware/auditScope.middleware");

const express = require('express');
const router = express.Router();
const { privateUpload, types } = require('../middleware/privateUpload.middleware');
const auditDocumentUpload = privateUpload('file', Object.keys(types));
const privateFiles = require('../controllers/privateFiles.controller');

const jobsController = require('../controllers/jobs.controller');
const candidatesController = require('../controllers/candidates.controller');
const candidatePipelineController = require("../controllers/candidatePipeline.controller");
const applicationsController = require('../controllers/applications.controller');
const auditsController = require('../controllers/audits.controller');
const dashboardSummary = require('../controllers/dashboardSummary.controller');
const auditTemplatesController = require('../controllers/auditTemplates.controller');
const auditSourceDocumentsController = require('../controllers/auditSourceDocuments.controller');
const auditAnalyticsRoutes = require('./auditAnalytics.routes');
const auditModuleRoutes = require('./auditModule.routes');
const occupationalSafetyAuditRoutes = require('./occupationalSafetyAudit.routes');
const auditWorkflowRoutes = require('./auditWorkflow.routes');
const occupationalSafetyDetailsRoutes = require('./occupationalSafetyDetails.routes');
const auditReportRoutes = require('./auditReport.routes');
const auditScoreRoutes = require('./auditScore.routes');
const auditPermissionRoutes = require('./auditPermission.routes');
const restaurantsController = require('../controllers/restaurants.controller');
const { requireGlobalRestaurantAccess } = require('../middleware/restaurantScope.middleware');
const { requireGlobalTemplateAccess, requireGlobalSourceDocumentAccess } = require('../middleware/templateScope.middleware');

const auditFindingRoutes = require('./auditFinding.routes');
const auditAssignmentRoutes = require('./auditAssignment.routes');
const auditTimelineRoutes = require('./auditTimeline.routes');
const auditDashboardRoutes = require('./auditDashboard.routes');
const auditNotificationRoutes = require('./auditNotification.routes');
const auditApprovalRoutes = require('./auditApproval.routes');
const auditClosureRoutes = require('./auditClosure.routes');
const auditExportRoutes = require('./auditExport.routes');
const candidateExportRoutes = require("./candidateExport.routes");

// Signed career relay has its own default-disabled authentication contract.
// No other HR API bypasses the existing global JWT middleware.
router.use('/hr/career-intake',require('./hrCareerIntake.routes'));
router.use('/auth', authRoutes);

// All remaining non-auth API routes require a valid JWT.
// Authentication is therefore secure by default.
router.use(verifyToken);

router.use('/hr/cv-intake',require('./hrCvIntake.routes'));
router.use('/users', userRoutes);
router.use('/departments', departmentRoutes);
router.use("/activity-logs", activityLogRoutes);
router.use("/roles", rolesRoutes);

// Sub-routes

// Audit Analytics API
router.use('/audit-analytics', auditAnalyticsRoutes);

// Audit Module Routes
router.use('/audit-module', auditModuleRoutes);
router.use('/occupational-safety-audits', occupationalSafetyAuditRoutes);
router.use('/audit-workflow', auditWorkflowRoutes);
router.use('/occupational-safety-details', occupationalSafetyDetailsRoutes);
router.use('/audit-report', auditReportRoutes);
router.use('/audit-score', auditScoreRoutes);
router.use('/audit-execution', require('./auditExecution.routes'));

router.use('/audit-dashboard', auditDashboardRoutes);
router.use('/audit-notification', auditNotificationRoutes);
router.use('/audit-approval', auditApprovalRoutes);
router.use('/audit-closure', auditClosureRoutes);
router.use('/audit-export', auditExportRoutes);
router.use("/candidate-export", candidateExportRoutes);

router.use(
'/audit-findings',
auditFindingRoutes
);

router.use(
'/audit-assignments',
auditAssignmentRoutes
);

router.use(
'/audit-timeline',
auditTimelineRoutes
);


router.use('/audit-permission', auditPermissionRoutes);
router.use('/auditor-profiles', require('./auditorProfile.routes'));
const recruitmentCatalog = require('../controllers/recruitmentCatalog.controller');
const applicationWorkflow = require('../controllers/applicationWorkflow.controller');
const hrPaged = require('../controllers/hrPaged.controller');
const hrAi = require('../controllers/hrAi.controller');
router.get('/hr/ai/status', ...authorizeAny(['recruitment.create', 'recruitment.update', 'candidate.create', 'candidate.update']), hrAi.status);
router.post('/hr/ai/job-skills', ...authorize('recruitment', 'create'), hrAi.suggest);
router.post('/jobs/:id/ai-skills', ...authorize('recruitment', 'update'), requirePermission('recruitment', 'read'), hrAi.suggest);
router.post('/candidates/:id/ai-review', ...authorize('candidate', 'update'), requirePermission('candidate', 'read'), require('../controllers/hrAiCvReview.controller').get);
router.get('/hr/v2/brands', ...authorize('recruitment', 'read'), hrPaged.brands);
router.get('/hr/v2/branches', ...authorize('recruitment', 'read'), hrPaged.list('branches'));
router.get('/hr/v2/jobs', ...authorize('recruitment', 'read'), hrPaged.list('jobs'));
router.get('/hr/v2/application-ranking', ...authorize('application', 'read'), require('../controllers/hrRanking.controller').get);
router.get('/hr/v2/application-board', ...authorize('application', 'read'), require('../controllers/hrBoard.controller').get);
router.get('/hr/v2/candidates', ...authorize('candidate', 'read'), hrPaged.list('candidates'));
router.get('/hr/v2/applications', ...authorize('application', 'read'), hrPaged.list('applications'));
router.get('/hr/analytics', ...authorize('application', 'read'), requirePermission('recruitment', 'read'), require('../controllers/hrAnalytics.controller').get);
for (const view of ['overview', 'scores', 'operations']) router.get('/hr/analytics/' + view, ...authorize('application', 'read'), requirePermission('recruitment', 'read'), require('../controllers/hrAnalytics.controller')[view]);
router.patch('/applications/:id/workflow', ...authorize('application', 'update'), applicationWorkflow.update);
router.patch('/applications/:id/assignment', ...authorize('application', 'update'), applicationWorkflow.update);
router.get('/applications/:id/interviewers', ...authorize('application', 'read'), applicationWorkflow.interviewers);
router.post('/applications/:id/notifications/:eventId/retry', ...authorize('application', 'update'), require('../controllers/applicationDelivery.controller').retry);
router.get('/applications/:id/history', ...authorize('application', 'read'), applicationWorkflow.history);
router.post('/applications/:id/recalculate', ...authorize('application', 'update'), require('../controllers/applicationMatching.controller').recalculate);
router.get('/hr/brands', ...authorize('recruitment', 'read'), recruitmentCatalog.brands);
router.post('/hr/brands', ...authorize('recruitment', 'create'), recruitmentCatalog.createBrand);
router.get('/hr/branches', ...authorize('recruitment', 'read'), recruitmentCatalog.branches);
router.get('/hr/branches/:id', ...authorize('recruitment', 'read'), recruitmentCatalog.branch);
router.post('/hr/branches', ...authorize('recruitment', 'create'), recruitmentCatalog.createBranch);
router.put('/hr/branches/:id', ...authorize('recruitment', 'update'), recruitmentCatalog.updateBranch);
router.delete('/hr/branches/:id', ...authorize('recruitment', 'delete'), recruitmentCatalog.deleteBranch);

// Audit API
router.get('/audits/dashboard-summary', ...authorize('audit', 'read'), dashboardSummary.audits);
router.get('/jobs/dashboard-summary', ...authorize('recruitment', 'read'), dashboardSummary.jobs);
router.get('/candidates/dashboard-summary', ...authorize('candidate', 'read'), dashboardSummary.candidates);
router.get('/applications/dashboard-summary', ...authorize('application', 'read'), dashboardSummary.applications);
router.get(
  '/audits/analytics',
  ...authorize('audit.analytics', 'read'),
  auditsController.getAuditAnalytics
);

router.get(
  '/audits',
  ...authorize('audit', 'read'),
  auditsController.getAudits
);

router.get(
  '/audits/:id',
  ...authorize('audit', 'read'),
  auditsController.getAuditById
);

router.post(
  '/audits',
  ...authorize('audit', 'create'),
  auditsController.createAudit
);

router.put(
  '/audits/:id',
  ...authorize('audit', 'update'),
  requireAssignedAuditAccess,
  auditsController.updateAudit
);

router.delete(
  '/audits/:id',
  ...authorize('audit', 'delete'),
  auditsController.deleteAudit
);


// Read-only Audit identity; uses the existing global restaurant read grant.
router.get('/audit-catalog', ...authorize('restaurant', 'read'), requireGlobalRestaurantAccess,
  (_req, res) => res.json({ success: true, data: require('../services/auditCatalog.service').getCatalog() }));

// Restaurants API
router.get(
  '/restaurants',
  ...authorize('restaurant', 'read'),
  requireGlobalRestaurantAccess,
  restaurantsController.getRestaurants
);

router.get(
  '/restaurants/:id',
  ...authorize('restaurant', 'read'),
  requireGlobalRestaurantAccess,
  restaurantsController.getRestaurantById
);

router.post(
  '/restaurants',
  ...authorize('restaurant', 'create'),
  requireGlobalRestaurantAccess,
  restaurantsController.createRestaurant
);

router.put(
  '/restaurants/:id',
  ...authorize('restaurant', 'update'),
  requireGlobalRestaurantAccess,
  restaurantsController.updateRestaurant
);

router.delete(
  '/restaurants/:id',
  ...authorize('restaurant', 'delete'),
  requireGlobalRestaurantAccess,
  restaurantsController.deleteRestaurant
);

router.use('/audit-templates', require('./auditTemplateRevision.routes'));

// Audit Template API
router.get(
  '/audit-templates',
  ...authorize('audit.template', 'read'),
  requireGlobalTemplateAccess,
  auditTemplatesController.getTemplates
);

router.get(
  '/audit-templates/:id',
  ...authorize('audit.template', 'read'),
  requireGlobalTemplateAccess,
  auditTemplatesController.getTemplateById
);

router.post(
  '/audit-templates',
  ...authorize('audit.template', 'create'),
  requireGlobalTemplateAccess,
  auditTemplatesController.createTemplate
);

router.put(
  '/audit-templates/:id',
  ...authorize('audit.template', 'update'),
  requireGlobalTemplateAccess,
  auditTemplatesController.updateTemplate
);

router.delete(
  '/audit-templates/:id',
  ...authorize('audit.template', 'delete'),
  requireGlobalTemplateAccess,
  auditTemplatesController.deleteTemplate
);

router.get('/candidates/:id/processing', ...authorize('candidate', 'read'), require('../controllers/hrCvProcessing.controller').list);
router.get('/candidates/:id/processing/:jobId', ...authorize('candidate', 'read'), require('../controllers/hrCvProcessing.controller').get);
router.post('/candidates/:id/processing', ...authorize('candidate', 'update'), require('../controllers/hrCvProcessing.controller').start);
router.post('/candidates/:id/processing/:jobId/retry', ...authorize('candidate', 'update'), require('../controllers/hrCvProcessing.controller').retry);
router.get('/candidates/:id/cv-preview', ...authorize('candidate', 'read'), privateFiles.candidatePreview);
router.get('/candidates/:id/cv', ...authorize('candidate', 'read'), privateFiles.candidate);
router.get('/audit-source-documents/:id/file', ...authorize('audit.source_document', 'read'), requireGlobalSourceDocumentAccess, privateFiles.source);

// Audit Source Documents
router.get(
  '/audit-source-documents',
  ...authorize('audit.source_document', 'read'),
  requireGlobalSourceDocumentAccess,
  auditSourceDocumentsController.getDocuments
);

router.post(
  '/audit-source-documents',
  ...authorize('audit.source_document', 'create'),
  requireGlobalSourceDocumentAccess,
  auditDocumentUpload,
  auditSourceDocumentsController.uploadDocument
);

router.delete(
  '/audit-source-documents/:id',
  ...authorize('audit.source_document', 'delete'),
  requireGlobalSourceDocumentAccess,
  auditSourceDocumentsController.deleteDocument
);

router.post('/jobs/:id/archive', ...authorize('recruitment', 'delete'), require('../controllers/jobArchive.controller').archive);
router.post('/jobs/:id/restore', ...authorize('recruitment', 'update'), require('../controllers/jobArchive.controller').restore);
router.get('/jobs/:id/archive-history', ...authorize('recruitment', 'read'), require('../controllers/jobArchive.controller').history);

// Jobs Endpoints
router.get(
  '/jobs',
  ...authorize('recruitment', 'read'),
  jobsController.getJobs
);

router.get(
  '/jobs/:id',
  ...authorize('recruitment', 'read'),
  jobsController.getJobById
);

router.post(
  '/jobs',
  ...authorize('recruitment', 'create'),
  jobsController.createJob
);

router.put(
  '/jobs/:id',
  ...authorize('recruitment', 'update'),
  jobsController.updateJob
);

router.delete(
  '/jobs/:id',
  ...authorize('recruitment', 'delete'),
  jobsController.deleteJob
);

// CV parsing / preview endpoint
router.post(
  '/candidates/parse-cv',
  ...authorize('candidate', 'read'),
  cvParseUpload,
  cvController.parseCv
);

const candidateArchive=require('../controllers/candidateArchive.controller');
router.post('/candidates/:id/archive', ...authorize('candidate','delete'), candidateArchive.archive);
router.post('/candidates/:id/restore', ...authorize('candidate','update'), candidateArchive.restore);
router.get('/candidates/:id/archive-history', ...authorize('candidate','read'), candidateArchive.history);

// Candidates Endpoints
router.get(
  '/candidates',
  ...authorize('candidate', 'read'),
  candidatesController.getCandidates
);

router.get(
  '/candidates/:id',
  ...authorize('candidate', 'read'),
  candidatesController.getCandidateById
);

router.post(
  '/candidates/from-cv',
  ...authorize('candidate', 'create'),
  ...authorize('application', 'create'),
  cvUpload.single('cv'),
  candidatePipelineController.createCandidateFromCv
);

router.post(
  '/candidates',
  ...authorize('candidate', 'create'),
  cvUpload.single('cv'),
  candidatesController.createCandidate
);

router.put(
  '/candidates/:id',
  ...authorize('candidate', 'update'),
  cvUpload.single('cv'),
  candidatesController.updateCandidate
);

router.patch(
  '/candidates/:id',
  ...authorize('candidate', 'update'),
  candidatesController.updateCandidateStatus
);

router.delete(
  '/candidates/:id',
  ...authorize('candidate', 'delete'),
  candidatesController.deleteCandidate
);

// Applications Endpoints
router.get(
  '/applications',
  ...authorize('application', 'read'),
  applicationsController.getApplications
);

router.get(
  '/applications/:id',
  ...authorize('application', 'read'),
  applicationsController.getApplicationById
);

router.post(
  '/applications',
  ...authorize('application', 'create'),
  applicationsController.createApplication
);

router.patch(
  '/applications/:id/status',
  ...authorize('application', 'update'),
  applicationsController.updateApplicationStatus
);

router.delete(
  '/applications/:id',
  ...authorize('application', 'delete'),
  applicationsController.deleteApplication
);

router.use("/audit-activity", auditActivityRoutes);

module.exports = router;
