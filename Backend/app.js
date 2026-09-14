const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const routes = require("./routes/route");
const setupSwagger = require("./swagger");
const {
  standardizeErrorResponses,
  notFoundHandler,
  globalErrorHandler,
} = require("./middleware/error.middleware");

function buildCorsOptions() {
  const configured = String(process.env.CORS_ORIGIN || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!configured.length || configured.includes("*")) {
    return {};
  }

  return {
    origin(origin, callback) {
      if (!origin || configured.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("CORS origin is not allowed.");
      error.statusCode = 403;
      return callback(error);
    },
  };
}

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(standardizeErrorResponses);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT || 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "RATE_LIMITED",
    message:
      "Çoxlu sorğu göndərildi, xahiş olunur 15 dəqiqə sonra yenidən cəhd edin.",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT || 15),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "AUTH_RATE_LIMITED",
    message: "Çoxlu login cəhdi edildi. Bir qədər sonra yenidən cəhd edin.",
  },
});

app.use("/api/auth/login", authLimiter);
app.use("/api", apiLimiter);

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    fallthrough: false,
  })
);

setupSwagger(app);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "INOP Backend",
    status: "ok",
  });
});

app.use("/api", routes);
app.use("/api", notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
