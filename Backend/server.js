const path = require("node:path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });
const { createApp, validateEnvironment } = require("./app");

async function start(env = process.env) {
  validateEnvironment(env);
  mongoose.set("maxTimeMS", 10000);
  await mongoose.connect(env.MONGO_URI || env.CS, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 10000,
    maxPoolSize: 20,
    autoIndex: env.NODE_ENV !== "production",
  });
  const app = createApp({ env });
  const server = await new Promise((resolve, reject) => {
    const listener = app.listen(Number(env.PORT || 3001), "0.0.0.0", () => resolve(listener));
    listener.once("error", reject);
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  console.log(`INOP API listening on port ${server.address().port}`);
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10000).unref();
    server.close(async () => {
      require("./services/email.service").closeEmailTransport();
      await mongoose.disconnect();
      clearTimeout(timeout);
    });
    server.closeIdleConnections();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  return { app, server, shutdown };
}

if (require.main === module) {
  start().catch(async (error) => {
    // Connection errors may contain credentials in a URI. Never log that URI.
    console.error(`INOP startup failed (${error.name}): check runtime configuration and database connectivity.`);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
}

module.exports = { start };
