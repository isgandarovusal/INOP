const { listRecords } = require("../utils/listQuery");
const { assertAuditCompletion } = require("../services/auditCompletion.service");
const { canTransition, badRequest } = require("../services/auditPolicy.service");
const mongoose = require("mongoose");
const Audit =
  require("../models/audit.model");

const AuditClosure =
  require("../models/auditClosure.model");
const { recordActivity } = require("../services/activityLog.service");

const AuditAssignment =
  require("../models/auditAssignment.model");

const {
  createAuditActivity,
} = require("./auditActivity.controller");

const {
  notifyUserBestEffort: notifyUser,
} = require("../services/auditNotificationDelivery.service");


// CLOSE AUDIT
exports.closeAudit = async (req, res, next) => {
  try {
    const {
      executionId,
      comment,
    } = req.body;

    const auditId = req.audit._id;
    if (comment !== undefined && typeof comment !== "string") throw badRequest("Closure comment must be text");
    if (executionId && !mongoose.Types.ObjectId.isValid(executionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid audit id",
      });
    }

    const audit =
      await Audit.findById(auditId);

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: "Audit not found",
      });
    }

    if (!canTransition(audit.status, 'completed') || audit.status === 'completed') throw badRequest('Audit is not ready for closure', 409);
    const { approval, execution } = await assertAuditCompletion(audit, executionId);
    const changed = await Audit.findOneAndUpdate({ _id: auditId, status: audit.status, updatedAt: audit.updatedAt }, { $set: { status: 'completed' } }, { returnDocument: 'after', runValidators: true });
    if (!changed) throw badRequest('Audit changed; reload it and try again', 409);

    let closure;
    try {
      closure = await AuditClosure.create({
        auditId,
        executionId: execution._id,
        approvalStatus:
          approval.status,
        comment,
        closedBy: req.user?.id || null,
      });
    } catch (error) {
      await Audit.findOneAndUpdate({ _id: auditId, status: 'completed', updatedAt: changed.updatedAt }, { $set: { status: audit.status } }, { runValidators: true });
      throw error;
    }



    const [, assignment] =
      await Promise.all([
        createAuditActivity({
          userId: req.user.id,
          auditId: audit._id,
          action: "closed",
          resource: "closure",
          description: "Audit bağlandı",
          metadata: {
            closureId: closure._id,
            approvalStatus: closure.approvalStatus,
            finalStatus: closure.finalStatus,
            comment: closure.comment,
          },
        }),
        AuditAssignment.findOne({
          auditId: audit._id,
        })
          .sort({
            createdAt: -1,
          })
          .select("auditor")
          .lean().catch(error => { console.error("Audit closure recipient lookup failed:", error?.name || "Error"); return null; }),
      ]);

    try {
      await recordActivity({
        req,
        action: "close",
        entityType: "audit_closure",
        entityId: closure._id,
        description: "Audit bağlandı",
      });
    } catch (activityError) {
      console.error(
        "Audit closure activity log error:",
        activityError?.name || "Error");
    }

    if (assignment?.auditor) {
      await notifyUser({
        auditId: audit._id,
        userId: assignment.auditor,
        type: "completed",
        title: "Audit tamamlandı",
        message:
          "Audit bağlanaraq tamamlandı. Nəticəni INOP platformasında nəzərdən keçirə bilərsiniz.",
      });
    }

    return res.status(201).json({
      success: true,
      data: closure,
    });

  } catch (error) {
    if (error.statusCode) return next(error);
    console.error(error?.name || "Error");

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Audit bağlanma məlumatları düzgün deyil.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Audit bağlanarkən server xətası baş verdi.",
    });
  }
};


// GET CLOSURE
exports.getClosure = async (req, res, next) => {
  try {
    const data =
      await listRecords(AuditClosure, { auditId: req.audit._id }, req, res);

    return res.json({
      success: true,
      data,
    });

  } catch (error) {
    if (error.statusCode) return next(error);
    console.error(error?.name || "Error");

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Audit bağlanma məlumatları düzgün deyil.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Audit bağlanarkən server xətası baş verdi.",
    });
  }
};
