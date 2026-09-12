const path = require("path");

require("dotenv").config({
  path:
    process.env.BACKEND_ENV_FILE ||
    path.resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const Role = require("../models/role.model");

const permission = (resource, action, scope = "all") => ({
  resource,
  action,
  scope,
});

const roles = [
  {
    name: "Admin",
    key: "admin",
    description: "Full system access.",
    isSystemRole: true,
    permissions: [
      permission("*", "*", "all"),
    ],
  },

  {
    name: "HR Manager",
    key: "hr_manager",
    description:
      "Full HR department access including recruitment management, candidates, applications and HR analytics.",
    isSystemRole: true,
    permissions: [
      permission("dashboard", "read", "all"),

      permission("recruitment", "read", "all"),
      permission("recruitment", "create", "all"),
      permission("recruitment", "update", "all"),
      permission("recruitment", "delete", "all"),

      permission("candidate", "read", "all"),
      permission("candidate", "create", "all"),
      permission("candidate", "update", "all"),
      permission("candidate", "delete", "all"),

      permission("application", "read", "all"),
      permission("application", "create", "all"),
      permission("application", "update", "all"),
      permission("application", "delete", "all"),

      permission("recruitment.analytics", "read", "all"),

      permission("user", "read", "department"),
      permission("user", "create", "department"),
      permission("user", "update", "department"),

      permission("activity_log", "read", "department"),
    ],
  },

  {
    name: "Assistant HR",
    key: "assistant_hr",
    description:
      "Limited HR operational access.",
    isSystemRole: true,
    permissions: [
      permission("dashboard", "read", "department"),

      permission("recruitment", "read", "department"),

      permission("candidate", "read", "department"),
      permission("candidate", "create", "department"),
      permission("candidate", "update", "assigned"),

      permission("application", "read", "department"),
      permission("application", "create", "department"),
      permission("application", "update", "assigned"),

      permission("recruitment.analytics", "read", "department"),

      permission("user", "read", "department"),
    ],
  },

  {
    name: "Employee",
    key: "employee",
    description:
      "Basic employee access.",
    isSystemRole: true,
    permissions: [
      permission("dashboard", "read", "own"),

      permission("profile", "read", "own"),
      permission("profile", "update", "own"),

      permission("internal_request", "read", "own"),
      permission("internal_request", "create", "own"),
      permission("internal_request", "update", "own"),
    ],
  },

  {
    name: "Auditor",
    key: "auditor",
    description:
      "Audit operational access.",
    isSystemRole: true,
    permissions: [
      permission("dashboard", "read", "all"),

      permission("audit", "read", "assigned"),
      permission("audit", "create", "all"),
      permission("audit", "update", "assigned"),
      permission("audit", "delete", "assigned"),

      permission("audit.finding", "read", "all"),
      permission("audit.finding", "create", "assigned"),
      permission("audit.finding", "update", "assigned"),

      permission("audit.assignment", "read", "all"),
      permission("audit.assignment", "create", "all"),
      permission("audit.assignment", "update", "all"),

      permission("audit.analytics", "read", "all"),

      permission("audit.approval", "read", "all"),
      permission("audit.approval", "create", "assigned"),
      permission("audit.approval", "update", "assigned"),

      permission("audit.closure", "read", "all"),
      permission("audit.closure", "update", "assigned"),

      permission("audit.action", "read", "all"),
      permission("audit.action", "create", "assigned"),
      permission("audit.action", "update", "assigned"),

      permission("audit.execution", "read", "assigned"),
      permission("audit.execution", "create", "assigned"),
      permission("audit.execution", "update", "assigned"),

      permission("audit.timeline", "read", "all"),
      permission("audit.activity", "read", "all"),

      permission("audit.report", "read", "all"),
      permission("audit.score", "update", "assigned"),
      permission("audit.workflow", "update", "assigned"),

      permission("audit.notification", "read", "own"),
      permission("audit.notification", "create", "own"),
      permission("audit.notification", "update", "own"),

      permission("audit.permission", "read", "own"),

      permission("audit.source_document", "read", "all"),
      permission("audit.source_document", "create", "assigned"),
      permission("audit.source_document", "delete", "assigned"),

      permission("occupational_safety_audit", "read", "all"),
      permission("occupational_safety_audit", "create", "assigned"),
      permission("occupational_safety_details", "read", "assigned"),
      permission("occupational_safety_details", "update", "assigned"),

      permission("restaurant", "read", "all"),
      permission("restaurant", "create", "all"),
      permission("restaurant", "update", "all"),
      permission("restaurant", "delete", "all"),

      permission("audit.template", "read", "all"),
      permission("audit.template", "create", "all"),
      permission("audit.template", "update", "all"),
      permission("audit.template", "delete", "all"),

      permission("audit.export", "read", "all"),
    ],
  },

  {
    name: "Audit Manager",
    key: "audit_manager",
    description:
      "Full audit management access.",
    isSystemRole: true,
    permissions: [
      permission("dashboard", "read", "all"),

      permission("audit", "read", "all"),
      permission("audit", "create", "all"),
      permission("audit", "update", "all"),
      permission("audit", "delete", "all"),

      permission("audit.finding", "read", "all"),
      permission("audit.finding", "create", "all"),
      permission("audit.finding", "update", "all"),

      permission("audit.assignment", "read", "all"),
      permission("audit.assignment", "create", "all"),
      permission("audit.assignment", "update", "all"),

      permission("audit.analytics", "read", "all"),

      permission("audit.approval", "read", "all"),
      permission("audit.approval", "create", "all"),
      permission("audit.approval", "update", "all"),

      permission("audit.closure", "read", "all"),
      permission("audit.closure", "update", "all"),

      permission("audit.action", "read", "all"),
      permission("audit.action", "create", "all"),
      permission("audit.action", "update", "all"),

      permission("audit.execution", "read", "all"),
      permission("audit.execution", "create", "all"),
      permission("audit.execution", "update", "all"),

      permission("audit.timeline", "read", "all"),
      permission("audit.activity", "read", "all"),

      permission("audit.report", "read", "all"),
      permission("audit.score", "update", "all"),
      permission("audit.workflow", "update", "all"),

      permission("audit.notification", "read", "all"),
      permission("audit.notification", "create", "all"),
      permission("audit.notification", "update", "all"),

      permission("audit.permission", "read", "all"),

      permission("audit.source_document", "read", "all"),
      permission("audit.source_document", "create", "all"),
      permission("audit.source_document", "delete", "all"),

      permission("occupational_safety_audit", "read", "all"),
      permission("occupational_safety_audit", "create", "all"),
      permission("occupational_safety_details", "read", "all"),
      permission("occupational_safety_details", "update", "all"),

      permission("restaurant", "read", "all"),
      permission("restaurant", "create", "all"),
      permission("restaurant", "update", "all"),
      permission("restaurant", "delete", "all"),

      permission("audit.template", "read", "all"),
      permission("audit.template", "create", "all"),
      permission("audit.template", "update", "all"),
      permission("audit.template", "delete", "all"),

      permission("audit.export", "read", "all"),
    ],
  },

  {
    name: "Manager",
    key: "manager",
    description:
      "Read-oriented management access.",
    isSystemRole: true,
    permissions: [
      permission("dashboard", "read", "all"),

      permission("audit", "read", "all"),
      permission("audit.analytics", "read", "all"),

      permission("audit.finding", "read", "all"),
      permission("audit.assignment", "read", "all"),

      permission("audit.approval", "read", "all"),
      permission("audit.approval", "update", "assigned"),

      permission("audit.closure", "read", "all"),
      permission("audit.closure", "update", "assigned"),

      permission("audit.timeline", "read", "all"),
      permission("audit.activity", "read", "all"),

      permission("audit.report", "read", "all"),

      permission("restaurant", "read", "all"),
    ],
  },
];

async function seedRoles() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error(
      "MONGO_URI is not configured. Check Backend/.env."
    );
  }

  await mongoose.connect(mongoUri);

  for (const roleData of roles) {
    await Role.findOneAndUpdate(
      { key: roleData.key },
      roleData,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log(`Role synced: ${roleData.key}`);
  }

  const count = await Role.countDocuments();

  console.log(`Total roles: ${count}`);

  await mongoose.disconnect();

  console.log("Role seed completed.");
}

seedRoles().catch(async (error) => {
  console.error("Role seed error:", error);

  try {
    await mongoose.disconnect();
  } catch (_) {}

  process.exit(1);
});
