require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/user.model");

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
    role: "hr",
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
  const mongoUri = process.env.MONGO_URI || process.env.CS;

  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured.");
  }

  await mongoose.connect(mongoUri);

  console.log("MongoDB connected.");

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
  console.error("User seed failed:", error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});
