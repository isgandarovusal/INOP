const Audit = require("../models/audit.model");
const { createAuditWithDepartmentSnapshot } = require("../services/auditCreation.service");
const { recordActivity } = require("../services/activityLog.service");
const {
  getAssignedAuditFilter,
} = require("../middleware/auditScope.middleware");

exports.getOccupationalSafetyAudits = async (req, res) => {
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

    const audits = await Audit.find(filter)
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.json({
      success: true,
      data: audits,
    });
  } catch (error) {
    console.error("Occupational safety audit list error:", error);

    return res.status(500).json({
      success: false,
      message: "Occupational safety audit error",
    });
  }
};

exports.createOccupationalSafetyAudit = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const audit = await createAuditWithDepartmentSnapshot({
      id: req.body.id,
      restaurantId: req.body.restaurantId,
      auditorId: req.user.id,
      auditType: "occupational-safety",
      date: req.body.date,
      shift: req.body.shift || "",
      status: req.body.status || "draft",
      template: req.body.template,
      scores: req.body.scores,
      checks: Array.isArray(req.body.checks)
        ? req.body.checks
        : [],
      serviceTimeObservations: Array.isArray(
        req.body.serviceTimeObservations
      )
        ? req.body.serviceTimeObservations
        : [],
      findings: Array.isArray(req.body.findings)
        ? req.body.findings
        : [],
      recommendations: Array.isArray(
        req.body.recommendations
      )
        ? req.body.recommendations
        : [],
      overallPercentage:
        typeof req.body.overallPercentage === "number"
          ? req.body.overallPercentage
          : 0,
      comments: req.body.comments || "",
      photos: Array.isArray(req.body.photos)
        ? req.body.photos
        : [],
      attachments: Array.isArray(req.body.attachments)
        ? req.body.attachments
        : [],
      metadata:
        req.body.metadata &&
        typeof req.body.metadata === "object"
          ? req.body.metadata
          : {},
    }, req.user);

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
        activityError
      );
    }

    return res.status(201).json({
      success: true,
      data: audit,
    });
  } catch (error) {
    console.error("Create safety audit error:", error);

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
