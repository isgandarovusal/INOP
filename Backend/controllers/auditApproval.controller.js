const AuditApproval =
  require("../models/auditApproval.model");

const {
  createAuditActivity,
} = require("./auditActivity.controller");


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

    res.status(201).json({
      success: true,
      data: approval,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
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

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// UPDATE APPROVAL
exports.updateApproval = async (req, res) => {
  try {
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

    res.json({
      success: true,
      data: approval,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
