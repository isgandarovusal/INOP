const path = require("path");
require("dotenv").config({ path: process.env.BACKEND_ENV_FILE || path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/user.model");
const Department = require("../models/department.model");

const users = [
  {
    name: "Admin User",
    email: "admin@inop.com",
    password: "password123",
    role: "admin",
    departmentId: "dep_ops",
    position: "System Administrator",
    isActive: true,
  },
  {
    name: "Aysel Huseynova",
    email: "hr@inop.com",
    password: "password123",
    role: "hr_manager",
    departmentId: "dep_hr",
    position: "HR Manager",
    isActive: true,
  },
  {
    name: "Kamran Aliyev",
    email: "auditor@inop.com",
    password: "password123",
    role: "auditor",
    departmentId: "dep_ops",
    position: "Field Auditor",
    isActive: true,
  },
  {
    name: "Nigar Mammadova",
    email: "manager@inop.com",
    password: "password123",
    role: "manager",
    departmentId: "dep_ops",
    position: "Operations Manager",
    isActive: true,
  },
];

async function seedUsers() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo accounts cannot be seeded in production. Create an administrator using the deployment bootstrap script.");
  }
  const mongoUri = process.env.MONGO_URI || process.env.CS;

  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured.");
  }

  mongoose.set("maxTimeMS", 10000);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000, socketTimeoutMS: 15000 });

  console.log("MongoDB connected.");

  const departmentIds = {};
  for (const [key, name] of Object.entries({ dep_hr: "Human Resources", dep_ops: "Operations" })) {
    const department = await Department.findOneAndUpdate({ name }, {
      $setOnInsert: { name, description: `${name} demo department` },
    }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
    departmentIds[key] = String(department._id);
  }

  for (const input of users) {
    const email = input.email.toLowerCase();

    const existingUser = await User.findOne({ email }).select("+password");

    if (existingUser) {
      console.log(`SKIP: ${email} already exists.`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    await User.create({
      ...input,
      email,
      departmentId: departmentIds[input.departmentId],
      password: hashedPassword,
    });

    console.log(`CREATED: ${email} (${input.role})`);
  }

  const count = await User.countDocuments();

  console.log(`Total users in database: ${count}`);

  await mongoose.disconnect();
  console.log("MongoDB disconnected.");
}

seedUsers().catch(async (error) => {
  const configurationMessages = [
    "Demo accounts cannot be seeded in production. Create an administrator using the deployment bootstrap script.",
    "MONGO_URI is not configured.",
  ];
  console.error("User seed failed:", configurationMessages.includes(error.message) ? error.message : error.name);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});
