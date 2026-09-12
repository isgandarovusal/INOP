const Audit = require("../models/audit.model");
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
    console.error("Get safety details error:", error);

    return res.status(500).json({
      success: false,
      message: "Safety details error",
    });
  }
};

exports.updateSafetyDetails = async (req, res) => {
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
        new: true,
        runValidators: true,
      }
    );

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: "Audit not found",
      });
    }

    return res.json({
      success: true,
      data: audit.safetyDetails,
    });
  } catch (error) {
    console.error("Update safety details error:", error);

    return res.status(500).json({
      success: false,
      message: "Safety details error",
    });
  }
};
