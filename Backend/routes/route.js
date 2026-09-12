const auditActivityRoutes = require("./auditActivity.routes");
const authRoutes = require('./auth.routes');
const { verifyToken } = require('../middleware/auth.middleware');
const { authorize } = require("../middleware/authorization.middleware");
const { requireAssignedAuditAccess } = require("../middleware/auditScope.middleware");

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const jobsController = require('../controllers/jobs.controller');
const candidatesController = require('../controllers/candidates.controller');
const applicationsController = require('../controllers/applications.controller');
const auditsController = require('../controllers/audits.controller');
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

const auditFindingRoutes = require('./auditFinding.routes');
const auditAssignmentRoutes = require('./auditAssignment.routes');
const auditTimelineRoutes = require('./auditTimeline.routes');
const auditDashboardRoutes = require('./auditDashboard.routes');
const auditNotificationRoutes = require('./auditNotification.routes');
const auditApprovalRoutes = require('./auditApproval.routes');
const auditClosureRoutes = require('./auditClosure.routes');
const auditExportRoutes = require('./auditExport.routes');

// Multer konfiqurasiyası (CV fayllarının saxlanması üçün)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

router.use('/auth', authRoutes);

// All non-auth API routes require a valid JWT.
// Authentication is therefore secure by default.
router.use(verifyToken);

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

router.use('/audit-dashboard', auditDashboardRoutes);
router.use('/audit-notification', auditNotificationRoutes);
router.use('/audit-approval', auditApprovalRoutes);
router.use('/audit-closure', auditClosureRoutes);
router.use('/audit-export', auditExportRoutes);

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

// Audit API
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


// Restaurants API
router.get(
  '/restaurants',
  ...authorize('restaurant', 'read'),
  restaurantsController.getRestaurants
);

router.get(
  '/restaurants/:id',
  ...authorize('restaurant', 'read'),
  restaurantsController.getRestaurantById
);

router.post(
  '/restaurants',
  ...authorize('restaurant', 'create'),
  restaurantsController.createRestaurant
);

router.put(
  '/restaurants/:id',
  ...authorize('restaurant', 'update'),
  restaurantsController.updateRestaurant
);

router.delete(
  '/restaurants/:id',
  ...authorize('restaurant', 'delete'),
  restaurantsController.deleteRestaurant
);

// Audit Template API
router.get(
  '/audit-templates',
  ...authorize('audit.template', 'read'),
  auditTemplatesController.getTemplates
);

router.get(
  '/audit-templates/:id',
  ...authorize('audit.template', 'read'),
  auditTemplatesController.getTemplateById
);

router.post(
  '/audit-templates',
  ...authorize('audit.template', 'create'),
  auditTemplatesController.createTemplate
);

router.put(
  '/audit-templates/:id',
  ...authorize('audit.template', 'update'),
  auditTemplatesController.updateTemplate
);

router.delete(
  '/audit-templates/:id',
  ...authorize('audit.template', 'delete'),
  auditTemplatesController.deleteTemplate
);

// Audit Source Documents
router.get(
  '/audit-source-documents',
  ...authorize('audit.source_document', 'read'),
  auditSourceDocumentsController.getDocuments
);

router.post(
  '/audit-source-documents',
  ...authorize('audit.source_document', 'create'),
  upload.single('file'),
  auditSourceDocumentsController.uploadDocument
);

router.delete(
  '/audit-source-documents/:id',
  ...authorize('audit.source_document', 'delete'),
  auditSourceDocumentsController.deleteDocument
);

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
  '/candidates',
  ...authorize('candidate', 'create'),
  upload.single('cv'),
  candidatesController.createCandidate
);

router.put(
  '/candidates/:id',
  ...authorize('candidate', 'update'),
  candidatesController.updateCandidate
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
