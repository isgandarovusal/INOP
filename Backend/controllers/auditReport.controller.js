const {
  findAuditByIdentifier,
  userHasAuditAccess,
} = require("../middleware/auditScope.middleware");

exports.getAuditReport = async (req, res) => {
  try {
    const auditId = req.params.id;

    const audit = await findAuditByIdentifier(auditId);

    if (!audit) {
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
          message: "Bu Audit üzrə report-a giriş icazəniz yoxdur.",
        });
      }
    }

    const fullAudit = await require("../models/audit.model")
      .findById(audit._id)
      .lean();

    if (!fullAudit) {
      return res.status(404).json({
        success: false,
        message: "Audit not found",
      });
    }

    const score = fullAudit.overallPercentage ?? 0;
    const checks = fullAudit.checks?.length
      ? fullAudit.checks
      : fullAudit.checklist || fullAudit.results || [];
    const report = {
      id: fullAudit._id,
      auditId: fullAudit.id,
      type: fullAudit.auditType,
      status: fullAudit.status,
      score,
      summary: {
        totalChecks: checks.length,
        passed: checks.filter(
          (item) =>
            item.status === "passed" ||
            item.answer === "yes" ||
            item.result === "compliant",
        ).length,
        failed: checks.filter(
          (item) =>
            item.status === "failed" ||
            item.answer === "no" ||
            ["minor", "major", "critical"].includes(item.result),
        ).length,
      },
      safety: fullAudit.safetyDetails || null,
      createdAt: fullAudit.createdAt,
    };

    return res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Audit report error:", error);

    return res.status(500).json({
      success: false,
      message: "Report generation error",
    });
  }
};
