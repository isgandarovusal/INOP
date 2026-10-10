const Audit = require("../models/audit.model");
const { listRecords } = require("../utils/listQuery");
const { recordActivity } = require("../services/activityLog.service");
const {
  getAssignedAuditFilter,
} = require("../middleware/auditScope.middleware");

exports.getOccupationalSafetyAudits = async (req, res, next) => {
  try {
    const scopeFilter = await getAssignedAuditFilter(req);

    if (scopeFilter === null) {
      return res.status(403).json({
        success: false,
        message: "Audit məlumatlarına giriş icazəniz yoxdur.",
      });
    }

    const filter = {
      auditType: "occupational-safety",
      ...scopeFilter,
    };

    const audits = await listRecords(Audit, filter, req, res);

    return res.json({
      success: true,
      data: audits,
    });
  } catch (error) {
    if (error.status || error.statusCode) return next(error);
    console.error("Occupational safety audit list error:", error?.name || "Error");

    return res.status(500).json({
      success: false,
      message: "Occupational safety audit error",
    });
  }
};

exports.createOccupationalSafetyAudit = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { normalizeAuditPayload } = require('../services/auditPayload.service');
    const audit = await Audit.create(normalizeAuditPayload({ ...req.body, auditType: 'occupational-safety' }, req));

    try {
      await recordActivity({
        req,
        action: "create",
        entityType: "occupational_safety_audit",
        entityId: audit._id,
        description: `Əməyin mühafizəsi auditi yaradıldı: ${audit.id || audit._id}`,
      });
    } catch (activityError) {
      console.error(
        "Occupational safety audit activity log error:",
        activityError?.name || "Error");
    }

    return res.status(201).json({
      success: true,
      data: audit,
    });
  } catch (error) {
    if (error.statusCode) return next(error);
    console.error("Create safety audit error:", error?.name || "Error");

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Bu audit ID artıq mövcuddur.",
      });
    }

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Safety audit məlumatları düzgün deyil.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Create safety audit error",
    });
  }
};
