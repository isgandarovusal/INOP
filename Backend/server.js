require('./services/fatalError.service').install();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { configureTrustedProxy, createApiRateLimiter } = require('./middleware/networkSecurity.middleware');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const runtime = require('./services/runtimeConfiguration.service').configuration();
require('./services/auditStorageBootstrap.service').initialize();

const routes = require('./routes/route');
const setupSwagger = require('./swagger');
const {
  standardizeErrorResponses,
  notFoundHandler,
  globalErrorHandler,
} = require('./middleware/error.middleware');

const app = express();
configureTrustedProxy(app);
app.use(require('./middleware/operationalTelemetry.middleware').createTelemetry({enabled:process.env.API_REQUEST_LOG_ENABLED==='true'}).middleware);
const PORT = runtime.port;

// Security Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Standardize API error responses
app.use(standardizeErrorResponses);

// Rate Limiting
const limiter = createApiRateLimiter();
app.use('/api/', limiter);

// Uploads are private: resolve their owning record and current server permission.
app.use('/uploads', require('./routes/privateUpload.routes'));

require('./services/operationalRoutes.service').register(app);

// Swagger
setupSwagger(app);

// API Routes
app.use('/api', routes);

// 404 + global error handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

// MongoDB Connection
const MONGO_URI = runtime.mongoUri;
mongoose.connect(MONGO_URI, { autoIndex: false, autoCreate: false })
  .then(() => {
    console.log('db connected');
    if (process.env.HR_CV_INTAKE_WORKER_ENABLED === 'true' && process.env.HR_CV_DURABLE_INTAKE_ENABLED === 'true') {
      const worker = require('./services/hrCvIntakeWorker.service').createWorker({ enabled: true });
      worker.start();
    }
    if (process.env.HR_NOTIFICATION_WORKER_ENABLED === 'true') {
      require('./services/applicationNotificationWorker.service').createNotificationWorker().start();
    }
    if (process.env.HR_CV_PROCESSING_ENABLED === 'true') {
      require('./services/hrCvProcessing.service').createProcessing().start();
    }
    if (process.env.HR_CV_OCR_ENABLED === 'true') {
      require('./services/hrCvTaskProfiles.service').profile('ocr').start();
    }
    if (process.env.HR_CV_AI_PROCESSING_ENABLED === 'true') {
      require('./services/hrCvTaskProfiles.service').profile('ai-review').start();
    }
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Port is listening in ${PORT}`);
      // One optional read-only HEAD; never delays readiness or enables intake.
      void require('./services/hrR2StartupVerification.service').createVerification().run();
    });
  })
  .catch((err) => { require('./services/safeErrorLog.service').logFailure(err);process.exitCode=1; });
