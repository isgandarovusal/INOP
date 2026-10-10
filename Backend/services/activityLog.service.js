const mongoose = require("mongoose");
const ActivityLog = require("../models/activityLog.model");

async function recordActivity({
  req,
  action,
  entityType,
  entityId = "",
  description,
}) {
  if (!action || !entityType || !description) {
    throw new Error(
      "action, entityType and description are required"
    );
  }

  return ActivityLog.create({
    userId: mongoose.Types.ObjectId.isValid(req.user?.id)
      ? req.user.id
      : null,
    userName: req.user?.name || "",
    departmentId: req.user?.departmentId || "",
    action: String(action).trim().toLowerCase(),
    entityType: String(entityType).trim(),
    entityId: String(entityId || "").trim(),
    description: String(description).trim(),
  });
}

module.exports = {
  recordActivity,
};
