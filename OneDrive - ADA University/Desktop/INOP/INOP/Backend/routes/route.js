const auditActivityRoutes = require("./auditActivity.routes");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const departmentRoutes = require("./department.routes");
const activityLogRoutes = require("./activityLog.routes");
const { verifyToken } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/authorization.middleware");
const { cvUpload } = require("../middleware/cvUpload.middleware");
const { cvParseUpload } = require("../middleware/cvParse.middleware");
const cvController = require("../controllers/cv.controller");
const {
  requireAssignedAuditAccess,
} = require("../middleware/auditScope.middleware");

const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  upload: auditDocumentUpload,
  validateUploads,
} = require("../middleware/privateUpload.middleware");
const filesController = require("../controllers/files.controller");

const jobsController = require("../controllers/jobs.controller");
const candidatesController = require("../controllers/candidates.controller");
const candidatePipelineController = require("../controllers/candidatePipeline.controller");
const applicationsController = require("../controllers/applications.controller");
const auditsController = require("../controllers/audits.controller");
const auditTemplatesController = require("../controllers/auditTemplates.controller");
const auditSourceDocumentsController = require("../controllers/auditSourceDocuments.controller");
const auditAnalyticsRoutes = require("./auditAnalytics.routes");
const auditModuleRoutes = require("./auditModule.routes");
const occupationalSafetyAuditRoutes = require("./occupationalSafetyAudit.routes");
const auditWorkflowRoutes = require("./auditWorkflow.routes");
const occupationalSafetyDetailsRoutes = require("./occupationalSafetyDetails.routes");
const auditReportRoutes = require("./auditReport.routes");
const auditScoreRoutes = require("./auditScore.routes");
const auditPermissionRoutes = require("./auditPermission.routes");
const restaurantsController = require("../controllers/restaurants.controller");

const auditFindingRoutes = require("./auditFinding.routes");
const auditAssignmentRoutes = require("./auditAssignment.routes");
const auditTimelineRoutes = require("./auditTimeline.routes");
const auditDashboardRoutes = require("./auditDashboard.routes");
const auditNotificationRoutes = require("./auditNotification.routes");
const auditApprovalRoutes = require("./auditApproval.routes");
const auditClosureRoutes = require("./auditClosure.routes");
const auditExportRoutes = require("./auditExport.routes");
const candidateExportRoutes = require("./candidateExport.routes");

router.use("/auth", authRoutes);

// All non-auth API routes require a valid JWT.
// Authentication is therefore secure by default.
router.use(verifyToken);
router.use(
  require("express-rate-limit")({
    windowMs: 60000,
    limit: 600,
    keyGenerator: (req) => req.user.id,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
router.use(require("../middleware/pagination.middleware"));
router.use(require("../middleware/activity.middleware"));
router.get(
  "/dashboard",
  ...authorize("dashboard", "read"),
  require("../controllers/dashboard.controller").summary,
);
router.get(
  "/audit-reviewers",
  ...authorize("audit", "read"),
  async (req, res, next) => {
    try {
      res.json(
        await require("../models/user.model")
          .find({
            role: { $in: ["manager", "audit_manager", "admin"] },
            isActive: true,
          })
          .select("_id name role")
          .limit(100)
          .lean(),
      );
    } catch (e) {
      next(e);
    }
  },
);
router.get(
  "/audit-auditors",
  ...authorize("audit.assignment", "create"),
  async (req, res, next) => {
    try {
      require("../services/policy.service").requireManager(req);
      res.json(
        await require("../models/user.model")
          .find({ role: { $in: ["auditor", "audit_manager"] }, isActive: true })
          .select("_id name role")
          .limit(100)
          .lean(),
      );
    } catch (e) {
      next(e);
    }
  },
);

router.get("/files/:name", filesController.download);
router.post(
  "/audits/:id/evidence",
  ...authorize("audit", "update"),
  requireAssignedAuditAccess,
  auditDocumentUpload.array("files", 10),
  validateUploads,
  filesController.addEvidence,
);
router.put(
  "/candidates/:id/cv",
  ...authorize("candidate", "update"),
  cvUpload.single("cv"),
  validateUploads,
  validateUploads,
  filesController.replaceCv,
);
router.use("/audit-execution", require("./auditExecution.routes"));
router.use("/audit-actions", require("./auditAction.routes"));

router.use("/users", userRoutes);
router.use("/departments", departmentRoutes);
router.use("/activity-logs", activityLogRoutes);

// Sub-routes

// Audit Analytics API
router.use("/audit-analytics", auditAnalyticsRoutes);

// Audit Module Routes
router.use("/audit-module", auditModuleRoutes);
router.use("/occupational-safety-audits", occupationalSafetyAuditRoutes);
router.use("/audit-workflow", auditWorkflowRoutes);
router.use("/occupational-safety-details", occupationalSafetyDetailsRoutes);
router.use("/audit-report", auditReportRoutes);
router.use("/audit-score", auditScoreRoutes);

router.use("/audit-dashboard", auditDashboardRoutes);
router.use("/audit-notification", auditNotificationRoutes);
router.use("/audit-approval", auditApprovalRoutes);
router.use("/audit-closure", auditClosureRoutes);
router.use("/audit-export", auditExportRoutes);
router.use("/candidate-export", candidateExportRoutes);

router.use("/audit-findings", auditFindingRoutes);

router.use("/audit-assignments", auditAssignmentRoutes);

router.use("/audit-timeline", auditTimelineRoutes);

router.use("/audit-permission", auditPermissionRoutes);

// Audit API
router.get(
  "/audits/analytics",
  ...authorize("audit.analytics", "read"),
  auditsController.getAuditAnalytics,
);

router.get(
  "/audits",
  ...authorize("audit", "read"),
  auditsController.getAudits,
);

router.get(
  "/audits/:id",
  ...authorize("audit", "read"),
  auditsController.getAuditById,
);

router.post(
  "/audits",
  ...authorize("audit", "create"),
  auditsController.createAudit,
);

router.put(
  "/audits/:id",
  ...authorize("audit", "update"),
  requireAssignedAuditAccess,
  auditsController.updateAudit,
);

router.delete(
  "/audits/:id",
  ...authorize("audit", "delete"),
  auditsController.deleteAudit,
);

// Restaurants API
router.get(
  "/restaurants",
  ...authorize("restaurant", "read"),
  restaurantsController.getRestaurants,
);

router.get(
  "/restaurants/:id",
  ...authorize("restaurant", "read"),
  restaurantsController.getRestaurantById,
);

router.post(
  "/restaurants",
  ...authorize("restaurant", "create"),
  restaurantsController.createRestaurant,
);

router.put(
  "/restaurants/:id",
  ...authorize("restaurant", "update"),
  restaurantsController.updateRestaurant,
);

router.delete(
  "/restaurants/:id",
  ...authorize("restaurant", "delete"),
  restaurantsController.deleteRestaurant,
);

// Audit Template API
router.get(
  "/audit-templates",
  ...authorize("audit.template", "read"),
  auditTemplatesController.getTemplates,
);

router.get(
  "/audit-templates/:id",
  ...authorize("audit.template", "read"),
  auditTemplatesController.getTemplateById,
);

router.post(
  "/audit-templates",
  ...authorize("audit.template", "create"),
  auditTemplatesController.createTemplate,
);

router.put(
  "/audit-templates/:id",
  ...authorize("audit.template", "update"),
  auditTemplatesController.updateTemplate,
);

router.delete(
  "/audit-templates/:id",
  ...authorize("audit.template", "delete"),
  auditTemplatesController.deleteTemplate,
);

// Audit Source Documents
router.get(
  "/audit-source-documents",
  ...authorize("audit.source_document", "read"),
  auditSourceDocumentsController.getDocuments,
);

router.post(
  "/audit-source-documents",
  ...authorize("audit.source_document", "create"),
  auditDocumentUpload.single("file"),
  validateUploads,
  auditSourceDocumentsController.uploadDocument,
);

router.delete(
  "/audit-source-documents/:id",
  ...authorize("audit.source_document", "delete"),
  auditSourceDocumentsController.deleteDocument,
);

// Jobs Endpoints
router.get(
  "/jobs",
  ...authorize("recruitment", "read"),
  jobsController.getJobs,
);

router.get(
  "/jobs/:id",
  ...authorize("recruitment", "read"),
  jobsController.getJobById,
);

router.post(
  "/jobs",
  ...authorize("recruitment", "create"),
  jobsController.createJob,
);

router.put(
  "/jobs/:id",
  ...authorize("recruitment", "update"),
  jobsController.updateJob,
);

router.delete(
  "/jobs/:id",
  ...authorize("recruitment", "delete"),
  jobsController.deleteJob,
);

// CV parsing / preview endpoint
router.post(
  "/candidates/parse-cv",
  ...authorize("candidate", "read"),
  cvParseUpload,
  cvController.parseCv,
);

// Candidates Endpoints
router.get(
  "/candidates",
  ...authorize("candidate", "read"),
  candidatesController.getCandidates,
);

router.get(
  "/candidates/:id",
  ...authorize("candidate", "read"),
  candidatesController.getCandidateById,
);

router.post(
  "/candidates/from-cv",
  ...authorize("candidate", "create"),
  ...authorize("application", "create"),
  cvUpload.single("cv"),
  validateUploads,
  candidatePipelineController.createCandidateFromCv,
);

router.post(
  "/candidates",
  ...authorize("candidate", "create"),
  cvUpload.single("cv"),
  validateUploads,
  candidatesController.createCandidate,
);

router.put(
  "/candidates/:id",
  ...authorize("candidate", "update"),
  candidatesController.updateCandidate,
);

router.patch(
  "/candidates/:id",
  ...authorize("candidate", "update"),
  candidatesController.updateCandidateStatus,
);

router.delete(
  "/candidates/:id",
  ...authorize("candidate", "delete"),
  candidatesController.deleteCandidate,
);

router.get(
  "/applications/:id/delivery",
  ...authorize("application", "read"),
  applicationsController.deliveryStatus,
);
router.post(
  "/applications/:id/delivery/retry",
  ...authorize("application", "update"),
  applicationsController.retryDelivery,
);
// Applications Endpoints
router.get(
  "/applications",
  ...authorize("application", "read"),
  applicationsController.getApplications,
);

router.get(
  "/applications/:id",
  ...authorize("application", "read"),
  applicationsController.getApplicationById,
);

router.post(
  "/applications",
  ...authorize("application", "create"),
  applicationsController.createApplication,
);

router.patch(
  "/applications/:id/status",
  ...authorize("application", "update"),
  applicationsController.updateApplicationStatus,
);

router.delete(
  "/applications/:id",
  ...authorize("application", "delete"),
  applicationsController.deleteApplication,
);

router.use("/audit-activity", auditActivityRoutes);

module.exports = router;
