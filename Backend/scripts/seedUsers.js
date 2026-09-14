const path = require("path");

require("dotenv").config({
  path:
    process.env.BACKEND_ENV_FILE ||
    path.resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/user.model");

const users = [
  {
    name: "Admin User",
    email: "admin@inop.com",
    passwordEnv: "SEED_ADMIN_PASSWORD",
    role: "admin",
    departmentId: "dep_ops",
    position: "System Administrator",
    isActive: true,
  },
  {
    name: "Aysel Huseynova",
    email: "hr@inop.com",
    passwordEnv: "SEED_HR_PASSWORD",
    role: "hr_manager",
    departmentId: "dep_hr",
    position: "HR Manager",
    isActive: true,
  },
  {
    name: "Kamran Aliyev",
    email: "auditor@inop.com",
    passwordEnv: "SEED_AUDITOR_PASSWORD",
    role: "auditor",
    departmentId: "dep_ops",
    position: "Field Auditor",
    isActive: true,
  },
  {
    name: "Nigar Mammadova",
    email: "manager@inop.com",
    passwordEnv: "SEED_MANAGER_PASSWORD",
    role: "manager",
    departmentId: "dep_ops",
    position: "Operations Manager",
    isActive: true,
  },
];

async function seedUsers() {
  const mongoUri = process.env.MONGO_URI || process.env.CS;

  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured.");
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected.");

  for (const input of users) {
    const email = input.email.toLowerCase();
    const password = String(process.env[input.passwordEnv] || "");
    const existingUser = await User.findOne({ email }).select("+password");

    if (password && password.length < 10) {
      throw new Error(
        `${input.passwordEnv} must contain at least 10 characters.`
      );
    }

    if (existingUser) {
      existingUser.name = input.name;
      existingUser.role = input.role;
      existingUser.departmentId = input.departmentId;
      existingUser.position = input.position;
      existingUser.isActive = input.isActive;

      if (password) {
        existingUser.password = await bcrypt.hash(password, 12);
      }

      await existingUser.save();

      console.log(
        `UPDATED: ${email} (${input.role})${password ? " + password" : ""}`
      );
      continue;
    }

    if (!password) {
      console.log(
        `SKIP CREATE: ${email}. Set ${input.passwordEnv} before creating this seed user.`
      );
      continue;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name: input.name,
      email,
      password: hashedPassword,
      role: input.role,
      departmentId: input.departmentId,
      position: input.position,
      isActive: input.isActive,
    });

    console.log(`CREATED: ${email} (${input.role})`);
  }

  const count = await User.countDocuments();
  console.log(`Total users in database: ${count}`);

  await mongoose.disconnect();
  console.log("MongoDB disconnected.");
}

seedUsers().catch(async (error) => {
  console.error("User seed failed:", error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});
