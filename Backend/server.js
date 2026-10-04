const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });
function validateEnvironment() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  if (!process.env.MONGO_URI && !process.env.CS)
    throw new Error("MONGO_URI is required.");
}
function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY)
    app.set(
      "trust proxy",
      process.env.TRUST_PROXY.split(",").map((v) => v.trim()),
    );
  app.use(helmet());
  const origins = (process.env.CORS_ORIGINS || "").split(",").filter(Boolean);
  if (origins.length)
    app.use(
      cors({ origin: origins, exposedHeaders: ["X-Page", "X-Page-Limit"] }),
    );
  app.use(express.json({ limit: "1mb" }));
  const errors = require("./middleware/error.middleware");
  app.use(errors.standardizeErrorResponses);
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/ready", async (_req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) throw new Error("offline");
      await mongoose.connection.db.admin().ping();
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });
  app.use(
    "/api/auth/login",
    rateLimit({
      windowMs: 15 * 60000,
      limit: 30,
      skipSuccessfulRequests: true,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use("/api", require("./routes/route"));
  if (process.env.ENABLE_SWAGGER === "true") require("./swagger")(app);
  app.use(errors.notFoundHandler);
  app.use(errors.globalErrorHandler);
  return app;
}
async function start() {
  validateEnvironment();
  await mongoose.connect(process.env.MONGO_URI || process.env.CS, {
    serverSelectionTimeoutMS: 10000,
  });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName)
    throw new Error(
      "MongoDB replica set is required for atomic workflows. See README.",
    );
  const app = createApp();
  const server = app.listen(process.env.PORT || 3001, "0.0.0.0", () =>
    console.log("INOP API ready"),
  );
  const stopWorker = require("./services/mailOutbox.service").startWorker();
  const shutdown = () => {
    stopWorker();
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  return server;
}
if (require.main === module)
  start().catch((e) => {
    console.error("Startup failed:", e.message);
    process.exit(1);
  });
module.exports = { createApp, start, validateEnvironment };
