const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("node:crypto");
const routes = require("./routes/route");
const setupSwagger = require("./swagger");
const { verifyToken } = require("./middleware/auth.middleware");
const { getUploadedFile } = require("./middleware/uploads.middleware");
const { standardizeErrorResponses, notFoundHandler, globalErrorHandler } = require("./middleware/error.middleware");

function validateEnvironment(env) {
  if (!(env.MONGO_URI || env.CS)) throw new Error("MONGO_URI is required.");
  if (typeof env.JWT_SECRET !== "string" || env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }
  const port = Number(env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT.");
  if (env.TRUST_PROXY !== undefined && !/^\d+$/.test(env.TRUST_PROXY)) {
    throw new Error("TRUST_PROXY must be an explicit proxy hop count.");
  }
}

function createApp({ env = process.env, database = mongoose.connection } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("query parser", "simple");
  app.set("trust proxy", Number(env.TRUST_PROXY || 0));
  app.use(helmet());
  app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    next();
  });
  const origins = new Set((env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
    .split(",").map((origin) => origin.trim()).filter(Boolean));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origins.has(origin)) return callback(null, true);
      const error = new Error("Origin is not allowed.");
      error.status = 403;
      callback(error);
    },
    exposedHeaders: ["Content-Disposition", "X-Request-Id", "X-Total-Count", "X-Next-Page"],
  }));
  app.use(standardizeErrorResponses);
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", (req, res, next) => {
    if (req.body !== undefined && (!req.body || typeof req.body !== "object" || Array.isArray(req.body))) {
      return res.status(400).json({ success: false, message: "Request data must be an object." });
    }
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: "draft-8", legacyHeaders: false });
  app.use(["/api", "/uploads"], limiter);
  app.use("/api/auth/login", rateLimit({
    windowMs: 15 * 60 * 1000, limit: 15, skipSuccessfulRequests: true,
    standardHeaders: "draft-8", legacyHeaders: false,
    message: { success: false, message: "Too many login attempts. Try again later." },
  }));
  app.get("/health", (_req, res) => res.status(database.readyState === 1 ? 200 : 503)
    .json({ success: database.readyState === 1, status: database.readyState === 1 ? "ok" : "unavailable" }));
  if (env.ENABLE_API_DOCS === "true" || (env.ENABLE_API_DOCS !== "false" && env.NODE_ENV !== "production")) setupSwagger(app);
  app.get("/uploads/:filename", verifyToken, getUploadedFile);
  app.use("/api", routes);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
  return app;
}

module.exports = { createApp, validateEnvironment };
