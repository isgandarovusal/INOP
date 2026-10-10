const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const { unrestricted } = require("../services/authorizationPolicy.service");
const { validNewPassword } = require("../utils/passwordPolicy");

class BootstrapConfigurationError extends Error {
  constructor(message) { super(message); this.name = "BootstrapConfigurationError"; }
}

function validateBootstrapInput(env) {
  const email = (env.BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();
  const name = (env.BOOTSTRAP_ADMIN_NAME || "").trim();
  const password = env.BOOTSTRAP_ADMIN_PASSWORD || "";
  if (!name || name.length > 200 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BootstrapConfigurationError("Set a valid BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_NAME.");
  }
  if (!validNewPassword(password) ||
      !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password)) {
    throw new BootstrapConfigurationError("BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters and at most 72 UTF-8 bytes, including uppercase, lowercase, a number, and a symbol.");
  }
  return { email, name, password };
}

async function bootstrapAdmin(env = process.env) {
  const input = validateBootstrapInput(env);
  const mongoUri = env.MONGO_URI || env.CS;
  if (!mongoUri) throw new BootstrapConfigurationError("MONGO_URI is not configured.");
  mongoose.set("maxTimeMS", 10000);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000, socketTimeoutMS: 15000 });
  let lockToken;
  try {
    const role = await Role.findOneAndUpdate({ key: "admin" }, {
      $setOnInsert: {
        name: "Admin", key: "admin", description: "Full system access.",
        permissions: [{ resource: "*", action: "*", scope: "all" }],
        isSystemRole: true, isActive: true,
      },
    }, { upsert: true, returnDocument: "after", runValidators: true });
    if (!role.isActive || !role.isSystemRole || !unrestricted(role.permissions)) {
      throw new BootstrapConfigurationError("The existing admin role is invalid. Restore its system permissions before bootstrapping.");
    }
    const candidateLock = crypto.randomUUID();
    const now = new Date();
    const acquired = await Role.findOneAndUpdate({
      key: "admin",
      $or: [{ userMutationLockUntil: { $exists: false } }, { userMutationLockUntil: { $lte: now } }],
    }, { $set: { userMutationLockToken: candidateLock, userMutationLockUntil: new Date(now.getTime() + 60_000) } }, { returnDocument: "after", maxTimeMS: 5000 });
    if (!acquired) throw new BootstrapConfigurationError("Administrator setup is already running. Retry after it finishes.");
    lockToken = candidateLock;
    if (await User.exists({ role: "admin", isActive: true })) {
      throw new BootstrapConfigurationError("An active administrator already exists. Use normal user administration.");
    }
    if (await User.exists({ email: input.email })) {
      throw new BootstrapConfigurationError("BOOTSTRAP_ADMIN_EMAIL is already assigned. Bootstrap does not overwrite existing users.");
    }
    await User.create({ name: input.name, email: input.email, password: await bcrypt.hash(input.password, 12), role: "admin", isActive: true });
    console.log("Administrator created. Remove the BOOTSTRAP_ADMIN_PASSWORD binding after setup.");
  } finally {
    if (lockToken) {
      try {
        await Role.updateOne({ key: "admin", userMutationLockToken: lockToken }, {
          $unset: { userMutationLockToken: "", userMutationLockUntil: "" },
        });
      } catch (error) {
        console.error("Administrator setup lock cleanup failed:", error.name);
      }
    }
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  require("dotenv").config({ path: process.env.BACKEND_ENV_FILE || path.resolve(__dirname, "../.env") });
  bootstrapAdmin().catch((error) => {
    // Database errors can contain credential-bearing connection details or input
    // values; only validation errors above are safe to show directly.
    console.error("Administrator bootstrap failed:", error instanceof BootstrapConfigurationError ? error.message : error.name);
    process.exitCode = 1;
  });
}

module.exports = { bootstrapAdmin, validateBootstrapInput };
