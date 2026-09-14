const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const app = require("./app");

const PORT = Number(process.env.PORT || 3001);
const MONGO_URI = process.env.MONGO_URI || process.env.CS;

async function startServer() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is not configured.");
  }

  await mongoose.connect(MONGO_URI);
  console.log("MongoDB connected");

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`INOP backend listening on port ${PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      try {
        await mongoose.disconnect();
      } finally {
        process.exit(0);
      }
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  return server;
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Failed to start INOP backend:", error);
    process.exit(1);
  });
}

module.exports = { startServer };
