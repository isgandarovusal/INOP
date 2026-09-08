const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const candidateRoutes = require('./candidate.routes');
const jobsController = require('../controllers/jobs.controller');
const candidatesController = require('../controllers/candidates.controller');
const applicationsController = require('../controllers/applications.controller');

// Multer konfiqurasiyası (CV fayllarının saxlanması üçün)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Sub-routes
router.use('/candidates-api', candidateRoutes);

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