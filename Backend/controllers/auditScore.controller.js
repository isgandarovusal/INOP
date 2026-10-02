const Audit = require("../models/audit.model");
const { recordActivity } = require("../services/activityLog.service");
const {
  findAuditByIdentifier,
  userHasAuditAccess,
} = require("../middleware/auditScope.middleware");

exports.calculateScore = async (req, res) => {
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
          message: "Bu Audit-in score-unu dəyişmək icazəniz yoxdur.",
        });
      }
    }

    const audit = await Audit.findById(auditInfo._id);

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: "Audit not found",
      });
    }

    const checks = Array.isArray(audit.checks)
      ? audit.checks
      : Array.isArray(audit.checklist)
        ? audit.checklist
        : [];

    const total = checks.length;

    const passed = checks.filter(
      (item) => item.status === "passed"
    ).length;

    const score = total
      ? Math.round((passed / total) * 100)
      : 0;

    audit.overallPercentage = score;

    await audit.save();

    try {
      await recordActivity({
        req,
        action: "calculate",
        entityType: "audit_score",
        entityId: audit._id,
        description: `Audit score hesablandı: ${score}%`,
      });
    } catch (activityError) {
      console.error(
        "Audit score activity log error:",
        activityError
      );
    }

    return res.json({
      success: true,
      score,
      data: audit,
    });
  } catch (error) {
    console.error("Score calculation error:", error);

    return res.status(500).json({
      success: false,
      message: "Score error",
    });
  }
};
