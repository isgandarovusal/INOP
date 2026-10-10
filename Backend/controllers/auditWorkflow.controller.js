const { canTransition, badRequest } = require("../services/auditPolicy.service");
const { assertAuditCompletion } = require("../services/auditCompletion.service");
const Audit = require("../models/audit.model");
const { recordActivity } = require("../services/activityLog.service");
const {
  findAuditByIdentifier,
  userHasAuditAccess,
} = require("../middleware/auditScope.middleware");

exports.updateAuditStatus = async (req, res, next) => {
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

    const existingAudit = await Audit.findById(auditInfo._id);

    if (!existingAudit) {
      return res.status(404).json({
        success: false,
        message: "Audit not found",
      });
    }

    const previousStatus = existingAudit.status;
    if (!canTransition(previousStatus, status)) throw badRequest('Invalid audit status transition', 409);
    if (status === 'completed') await assertAuditCompletion(existingAudit);


    const audit = await Audit.findOneAndUpdate(
      { _id: auditInfo._id, status: previousStatus, updatedAt: existingAudit.updatedAt },
      {
        $set: {
          status,
        },
      },
      {
        returnDocument: 'after',
        runValidators: true,
      }
    );

    if (!audit) throw badRequest("Audit changed; reload it and try again", 409);
    if (previousStatus !== status) {
      try {
        await recordActivity({
          req,
          action: "status_change",
          entityType: "audit",
          entityId: audit._id,
          description: `Audit statusu dəyişdirildi: ${previousStatus} → ${status}`,
        });
      } catch (activityError) {
        console.error(
          "Audit workflow activity log error:",
          activityError?.name || "Error");
      }
    }

    return res.json({
      success: true,
      data: audit,
    });
  } catch (error) {
    if (error.statusCode) return next(error);
    console.error("Audit status update error:", error?.name || "Error");

    return res.status(500).json({
      success: false,
      message: "Status update error",
    });
  }
};
