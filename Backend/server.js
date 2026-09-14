const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const routes = require('./routes/route');
const setupSwagger = require('./swagger');
const {
  standardizeErrorResponses,
  notFoundHandler,
  globalErrorHandler,
} = require('./middleware/error.middleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Security Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Standardize API error responses
app.use(standardizeErrorResponses);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Çoxlu sorğu göndərildi, xahiş olunur 15 dəqiqə sonra yenidən cəhd edin.' }
});
app.use('/api/', limiter);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger
setupSwagger(app);

// API Routes
app.use('/api', routes);

// 404 + global error handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || process.env.CS;
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('db connected');
    app.listen(PORT, "0.0.0.0", () => console.log(`Port is listening in ${PORT}`));
  })
  .catch((err) => console.error('Failed to connect to MongoDB:', err));
