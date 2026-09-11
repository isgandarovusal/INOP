const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const candidateRoutes = require('./candidate.routes');
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
const restaurantsController = require('../controllers/restaurants.controller');

// Multer konfiqurasiyası (CV fayllarının saxlanması üçün)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Sub-routes
router.use('/candidates-api', candidateRoutes);

// Audit Analytics API
router.use('/audit-analytics', auditAnalyticsRoutes);

// Audit Module Routes
router.use('/audit-module', auditModuleRoutes);
router.use('/occupational-safety-audits', occupationalSafetyAuditRoutes);
router.use('/audit-workflow', auditWorkflowRoutes);
router.use('/occupational-safety-details', occupationalSafetyDetailsRoutes);

// Audit API
router.get('/audits/analytics', auditsController.getAuditAnalytics);
router.get('/audits', auditsController.getAudits);
router.get('/audits/:id', auditsController.getAuditById);
router.post('/audits', auditsController.createAudit);
router.put('/audits/:id', auditsController.updateAudit);
router.delete('/audits/:id', auditsController.deleteAudit);


// Restaurants API
router.get('/restaurants', restaurantsController.getRestaurants);
router.get('/restaurants/:id', restaurantsController.getRestaurantById);
router.post('/restaurants', restaurantsController.createRestaurant);
router.put('/restaurants/:id', restaurantsController.updateRestaurant);
router.delete('/restaurants/:id', restaurantsController.deleteRestaurant);

// Audit Template API
router.get('/audit-templates', auditTemplatesController.getTemplates);
router.get('/audit-templates/:id', auditTemplatesController.getTemplateById);
router.post('/audit-templates', auditTemplatesController.createTemplate);
router.put('/audit-templates/:id', auditTemplatesController.updateTemplate);
router.delete('/audit-templates/:id', auditTemplatesController.deleteTemplate);

// Audit Source Documents
router.get(
  '/audit-source-documents',
  auditSourceDocumentsController.getDocuments
);
router.post(
  '/audit-source-documents',
  upload.single('file'),
  auditSourceDocumentsController.uploadDocument
);
router.delete(
  '/audit-source-documents/:id',
  auditSourceDocumentsController.deleteDocument
);

// Jobs Endpoints
router.get('/jobs', jobsController.getJobs);
router.get('/jobs/:id', jobsController.getJobById);
router.post('/jobs', jobsController.createJob);
router.put('/jobs/:id', jobsController.updateJob);
router.delete('/jobs/:id', jobsController.deleteJob);

// Candidates Endpoints
router.get('/candidates', candidatesController.getCandidates);
router.get('/candidates/:id', candidatesController.getCandidateById);
router.post('/candidates', upload.single('cv'), candidatesController.createCandidate);
router.delete('/candidates/:id', candidatesController.deleteCandidate);

// Applications Endpoints
router.get('/applications', applicationsController.getApplications);
router.post('/applications', applicationsController.createApplication);
router.patch('/applications/:id/status', applicationsController.updateApplicationStatus);
router.delete('/applications/:id', applicationsController.deleteApplication);

module.exports = router;