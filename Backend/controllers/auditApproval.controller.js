const mongoose = require("mongoose");
const AuditApproval =
  require("../models/auditApproval.model");
const AuditFinding = require("../models/auditFinding.model");
const AuditAction = require("../models/auditAction.model");
const { recordActivity } = require("../services/activityLog.service");

const {
  createAuditActivity,
} = require("./auditActivity.controller");

const {
  notifyUser,
} = require("../services/notification.service");


// CREATE APPROVAL
exports.createApproval = async (req, res) => {
  try {
    // Child references must belong to the same authorized, canonical parent.
    for (const [field, Model] of [["findingId", AuditFinding], ["actionId", AuditAction]]) {
      const value = req.body[field];
      if (value != null && (!mongoose.Types.ObjectId.isValid(value) ||
        !(await Model.exists({ _id: value, auditId: req.auditScopeId })))) {
        return res.status(400).json({ message: `${field} bu Audit-ə aid deyil.` });
      }
    }
    const approval =
      await AuditApproval.create({
        auditId: req.auditScopeId,
        findingId: req.body.findingId,
        actionId: req.body.actionId,
        reviewer: req.body.reviewer,
        status: req.body.status,
        comment: req.body.comment,
        approvedAt: req.body.status === "approved" ? new Date() : null,
        requestedBy: req.user?.id || null,
      });

    await createAuditActivity({
      auditId: approval.auditId,
      action: "created",
      resource: "approval",
      description: "Audit approval sorğusu yaradıldı",
      metadata: {
        approvalId: approval._id,
        findingId: approval.findingId || null,
        actionId: approval.actionId || null,
        status: approval.status,
      },
    });

    try {
      await recordActivity({
        req,
        action: "create",
        entityType: "audit_approval",
        entityId: approval._id,
        description: "Audit approval sorğusu yaradıldı",
      });
    } catch (activityError) {
      console.error(
        "Audit approval activity log error:",
        activityError
      );
    }

    if (approval.reviewer) {
      await notifyUser({
        auditId: approval.auditId,
        userId: approval.reviewer,
        type: "approval-required",
        title: "Audit təsdiqi tələb olunur",
        message:
          "Sizə yeni audit approval sorğusu göndərildi. Zəhmət olmasa INOP platformasında nəzərdən keçirin.",
      });
    }

    res.status(201).json({
      success: true,
      data: approval,
    });

  } catch (error) {
    console.error(error);

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Approval məlumatları düzgün deyil.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Approval əməliyyatı zamanı server xətası baş verdi.",
    });
  }
};


// GET APPROVALS
exports.getApprovals = async (req, res) => {
  try {
    const approvals =
      await AuditApproval.find({
        auditId: req.auditScopeId,
      })
      .sort({
        createdAt: -1,
      });

    res.json({
      success: true,
      data: approvals,
    });

  } catch (error) {
    console.error(error);

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Approval məlumatları düzgün deyil.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Approval əməliyyatı zamanı server xətası baş verdi.",
    });
  }
};


// Resolve a child ID through its stored FK, not through client auditId or an
// unrelated Audit whose ID happens to match the Approval ID.
exports.resolveApprovalParent = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(req.permission.scope === "all" ? 400 : 403).json({ message: "Invalid approval id" });
    }
    const approval = await AuditApproval.findById(req.params.id).select("_id auditId").lean();
    if (!approval) {
      return res.status(req.permission.scope === "all" ? 404 : 403).json({ message: "Approval not found" });
    }
    req.approvalParent = approval;
    req.auditScopeId = String(approval.auditId);
    next();
  } catch (error) {
    console.error("Approval parent error:", error);
    return res.status(500).json({ message: "Approval parent yoxlanıla bilmədi." });
  }
};

// UPDATE APPROVAL
exports.updateApproval = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid approval id",
      });
    }

    const {
      status,
      comment,
    } = req.body;

    const changes = {};
    if (comment !== undefined) changes.comment = comment;
    if (status !== undefined) {
      changes.status = status;
      changes.approvedAt = status === "approved" ? new Date() : null;
    }
    const approval =
      await AuditApproval.findOneAndUpdate(
        { _id: req.approvalParent._id, auditId: req.approvalParent.auditId },
        { $set: changes },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: "Approval not found",
      });
    }

    await createAuditActivity({
      auditId: approval.auditId,
      action: "updated",
      resource: "approval",
      description: `Audit approval status dəyişdirildi: ${status}`,
      metadata: {
        approvalId: approval._id,
        status: approval.status,
        comment: approval.comment,
      },
    });

    try {
      await recordActivity({
        req,
        action: "update",
        entityType: "audit_approval",
        entityId: approval._id,
        description: `Audit approval status dəyişdirildi: ${approval.status}`,
      });
    } catch (activityError) {
      console.error(
        "Audit approval activity log error:",
        activityError
      );
    }

    if (
      approval.requestedBy &&
      ["approved", "rejected"].includes(approval.status)
    ) {
      await notifyUser({
        auditId: approval.auditId,
        userId: approval.requestedBy,
        type:
          approval.status === "approved"
            ? "completed"
            : "action-required",
        title:
          approval.status === "approved"
            ? "Audit approval təsdiqləndi"
            : "Audit approval rədd edildi",
        message:
          approval.status === "approved"
            ? "Audit approval sorğunuz təsdiqləndi."
            : "Audit approval sorğunuz rədd edildi. Əlavə məlumat üçün INOP platformasındakı şərhə baxın.",
      });
    }

    res.json({
      success: true,
      data: approval,
    });

  } catch (error) {
    console.error(error);

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Approval məlumatları düzgün deyil.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Approval əməliyyatı zamanı server xətası baş verdi.",
    });
  }
};
