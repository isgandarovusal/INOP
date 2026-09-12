const Audit = require("../models/audit.model");
const {
  findAuditByIdentifier,
  userHasAuditAccess,
} = require("../middleware/auditScope.middleware");

exports.updateAuditStatus = async (req, res) => {
  try {
    const auditId = req.params.id;
    const { status } = req.body;

    const allowed = [
      "draft",
      "scheduled",
      "in-progress",
      "completed",
      "failed",
      "cancelled",
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid audit status",
      });
    }

    const auditInfo = await findAuditByIdentifier(auditId);

    if (!auditInfo) {
      return res.status(404).json({
        success: false,
        message: "Audit not found",
      });
    }

    if (req.permission?.scope === "assigned") {
      const allowedAccess = await userHasAuditAccess(
        req,
        auditId
      );

      if (!allowedAccess) {
        return res.status(403).json({
          success: false,
          message:
            "Bu Audit-in statusunu dəyişmək icazəniz yoxdur.",
        });
      }
    }

    const audit = await Audit.findByIdAndUpdate(
      auditInfo._id,
      {
        $set: {
          status,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.json({
      success: true,
      data: audit,
    });
  } catch (error) {
    console.error("Audit status update error:", error);

    return res.status(500).json({
      success: false,
      message: "Status update error",
    });
  }
};
