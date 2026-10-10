const mongoose = require("mongoose");

const AUDIT_RESOURCES = new Set([
  "audit", "audit.template", "audit.source_document", "audit.finding", "audit.assignment",
  "audit.analytics", "audit.approval", "audit.closure", "audit.action", "audit.execution",
  "audit.timeline", "audit.activity", "audit.report", "audit.score", "audit.workflow",
  "audit.notification", "audit.permission", "audit.export", "occupational_safety_audit",
  "occupational_safety_details",
]);

function buildScopeFilter(req) {
  const scope = req.permission?.scope;
  const resource = req.permission?.resource;

  if (!scope) {
    return null;
  }

  if (scope === "all") {
    return {};
  }

  if (scope === "department") {
    if (!req.user?.departmentId) {
      return null;
    }

    if (resource === "department") {
      return mongoose.Types.ObjectId.isValid(req.user.departmentId)
        ? { _id: req.user.departmentId } : null;
    }
    const departmentResources = new Set([
      "user", "candidate", "application", "recruitment", "recruitment.analytics",
      "activity_log", "audit", "audit.template", "audit.source_document", "restaurant",
    ]);
    return departmentResources.has(resource) || AUDIT_RESOURCES.has(resource)
      ? { departmentId: req.user.departmentId } : null;
  }

  if (scope === "assigned") {
    if (!req.user?.id) {
      return null;
    }

    if (resource === "user") return { managerId: req.user.id };
    // Audit controllers additionally resolve assignment membership through the
    // parent audit. Preserve this filter for their existing middleware chain.
    if (AUDIT_RESOURCES.has(resource)) {
      return { assignedTo: req.user.id };
    }
    return ["candidate", "application", "recruitment", "restaurant"].includes(resource)
      ? { assignedTo: req.user.id } : null;
  }

  if (scope === "own") {
    if (!req.user?.id) {
      return null;
    }

    if (resource === "user" || resource === "profile") return { _id: req.user.id };
    if (resource === "activity_log" || resource === "audit.notification") {
      return { userId: req.user.id };
    }
    if (resource === "audit.source_document") return { uploadedBy: req.user.id };
    if (["candidate", "application", "recruitment", "department", "audit", "audit.template", "restaurant"].includes(resource) ||
        AUDIT_RESOURCES.has(resource)) {
      return { createdBy: req.user.id };
    }
    return null;
  }

  return null;
}

exports.getDataScope = (req) => {
  return buildScopeFilter(req);
};

exports.applyDataScope = (req, res, next) => {
  const scope = buildScopeFilter(req);

  if (scope === null) {
    return res.status(403).json({
      message:
        "Bu məlumatlara giriş üçün tələb olunan məlumat səviyyəsi müəyyən edilə bilmədi.",
    });
  }

  req.dataScope = scope;

  next();
};
