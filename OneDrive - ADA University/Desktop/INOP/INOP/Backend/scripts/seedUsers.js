const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const Role = require("../models/role.model");
async function seed() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL,
    password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error(
      "Set BOOTSTRAP_ADMIN_EMAIL and a unique BOOTSTRAP_ADMIN_PASSWORD of at least 12 characters.",
    );
  await mongoose.connect(process.env.MONGO_URI || process.env.CS);
  if (!(await Role.exists({ key: "admin", isActive: true })))
    throw new Error("Run npm run seed:roles first.");
  if (await User.exists({ role: "admin" })) {
    console.log("Administrator already exists; no accounts changed.");
    await mongoose.disconnect();
    return;
  }
  await User.create({
    name: "Administrator",
    email: email.toLowerCase(),
    password: await bcrypt.hash(password, 12),
    role: "admin",
    departmentId: "operations",
    isActive: true,
  });
  await mongoose.disconnect();
  console.log(
    "Administrator created. Remove the bootstrap password from your environment.",
  );
}
if (require.main === module)
  seed().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
