const Audit = require("../models/audit.model");
const { recordActivity } = require("../services/activityLog.service");
const {
  findAuditByIdentifier,
  userHasAuditAccess,
} = require("../middleware/auditScope.middleware");

exports.getSafetyDetails = async (req, res) => {
  try {
    const auditId = req.params.id;

    const auditInfo = await findAuditByIdentifier(auditId);

    if (!auditInfo) {
      return res.status(404).json({
        success: false,
        message: "Audit not found",
      });
    }

    if (req.permission?.scope === "assigned") {
      const allowed = await userHasAuditAccess(req, auditId);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            "Bu Audit-in safety məlumatlarına giriş icazəniz yoxdur.",
        });
      }
    }

    const audit = await Audit.findById(auditInfo._id).lean();

    return res.json({
      success: true,
      data: audit.safetyDetails || {
        riskLevel: "low",
        violations: [],
        correctiveAction: "",
        responsiblePerson: "",
        deadline: null,
      },
    });
  } catch (error) {
    console.error("Get safety details error:", error?.name || "Error");

    return res.status(500).json({
      success: false,
      message: "Safety details error",
    });
  }
};

exports.updateSafetyDetails = async (req, res, next) => {
  try {
    const auditId = req.params.id;

    const auditInfo = await findAuditByIdentifier(auditId);

    if (!auditInfo) {
      return res.status(404).json({
        success: false,
        message: "Audit not found",
      });
    }

    if (req.permission?.scope === "assigned") {
      const allowed = await userHasAuditAccess(req, auditId);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            "Bu Audit-in safety məlumatlarını dəyişmək icazəniz yoxdur.",
        });
      }
    }

    const { assertAuditEditable } = require('../services/auditRelations.service');
    const { badRequest } = require('../services/auditPolicy.service');
    assertAuditEditable(req);
    if (req.body.riskLevel && !['low', 'medium', 'high', 'critical'].includes(req.body.riskLevel)) throw badRequest('Invalid risk level');
    if (req.body.deadline && !Number.isFinite(Date.parse(req.body.deadline))) throw badRequest('Invalid safety deadline');
    const safetyDetails = {
      riskLevel: req.body.riskLevel || "low",
      violations: Array.isArray(req.body.violations)
        ? req.body.violations
        : [],
      correctiveAction: req.body.correctiveAction || "",
      responsiblePerson: req.body.responsiblePerson || "",
      deadline: req.body.deadline || null,
    };

    const audit = await Audit.findByIdAndUpdate(
      auditInfo._id,
      {
        $set: {
          safetyDetails,
        },
      },
      {
        returnDocument: 'after',
        runValidators: true,
      }
    );

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: "Audit not found",
      });
    }

    try {
      await recordActivity({
        req,
        action: "update",
        entityType: "occupational_safety_details",
        entityId: audit._id,
        description: `Əməyin mühafizəsi auditinin safety məlumatları yeniləndi: ${audit.id || audit._id}`,
      });
    } catch (activityError) {
      console.error(
        "Occupational safety details activity log error:",
        activityError?.name || "Error");
    }

    return res.json({
      success: true,
      data: audit.safetyDetails,
    });
  } catch (error) {
    if (error.statusCode) return next(error);
    console.error("Update safety details error:", error?.name || "Error");

    return res.status(500).json({
      success: false,
      message: "Safety details error",
    });
  }
};
