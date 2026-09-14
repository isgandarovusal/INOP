const mongoose = require("mongoose");
const AuditApproval =
  require("../models/auditApproval.model");

const {
  createAuditActivity,
} = require("./auditActivity.controller");

const {
  notifyUser,
} = require("../services/notification.service");


// CREATE APPROVAL
exports.createApproval = async (req, res) => {
  try {
    const approval =
      await AuditApproval.create({
        ...req.body,
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
        auditId: req.params.auditId,
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

    const approval =
      await AuditApproval.findByIdAndUpdate(
        req.params.id,
        {
          status,
          comment,
          approvedAt:
            status === "approved"
              ? new Date()
              : null,
        },
        {
          new: true,
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
