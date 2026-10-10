const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");

require("dotenv").config({
  path: process.env.BACKEND_ENV_FILE || path.resolve(__dirname, "../.env"),
});

async function initializeIndexes() {
  const mongoUri = process.env.MONGO_URI || process.env.CS;
  if (!mongoUri) throw new Error("MONGO_URI is not configured.");
  const modelDirectory = path.resolve(__dirname, "../models");
  for (const filename of fs.readdirSync(modelDirectory).sort()) {
    if (filename.endsWith(".model.js")) require(path.join(modelDirectory, filename));
  }

  await mongoose.connect(mongoUri, { autoIndex: false, serverSelectionTimeoutMS: 10000 });
  for (const model of Object.values(mongoose.models)) {
    // createIndexes adds declared indexes; it never drops existing indexes.
    await model.createIndexes();
    console.log(`Indexes ready: ${model.modelName}`);
  }
}

initializeIndexes()
  .catch((error) => {
    console.error(`Index initialization failed (${error.name}): check database connectivity and existing duplicate records.`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
