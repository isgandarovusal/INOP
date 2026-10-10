const { listRecords } = require("../utils/listQuery");
const mongoose = require("mongoose");
const User = require('../models/user.model');
const AuditFinding = require('../models/auditFinding.model');
const AuditAction = require('../models/auditAction.model');
const { getPermissionScope } = require('../middleware/auth.middleware');
const { badRequest } = require('../services/auditPolicy.service');
const { assertRelatedRecord, assertAuditEditable } = require('../services/auditRelations.service');
const AuditApproval =
  require("../models/auditApproval.model");
const { recordActivity } = require("../services/activityLog.service");

const {
  createAuditActivity,
} = require("./auditActivity.controller");

const {
  notifyUserBestEffort: notifyUser,
} = require("../services/auditNotificationDelivery.service");


// CREATE APPROVAL
exports.createApproval = async (req, res, next) => {
  try {
    assertAuditEditable(req);
    if (!mongoose.Types.ObjectId.isValid(req.body.reviewer)) throw badRequest('A valid reviewer is required');
    const reviewer = await User.findOne({ _id: req.body.reviewer, isActive: true }).select('_id role').lean();
    if (!reviewer || !await getPermissionScope(reviewer.role, 'audit.approval', 'update')) throw badRequest('Reviewer is not authorized to approve audits');
    if (String(reviewer._id) === String(req.user.id)) throw badRequest('Requester cannot review their own approval', 403);
    if (req.body.findingId && req.body.actionId) throw badRequest('Approval can reference a finding or an action, not both');
    const [findingId, actionId] = await Promise.all([
      assertRelatedRecord(AuditFinding, req.body.findingId, req.audit._id, 'Finding'),
      assertRelatedRecord(AuditAction, req.body.actionId, req.audit._id, 'Action'),
    ]);
    const approval = await AuditApproval.create({
      auditId: req.audit._id, findingId, actionId,
      reviewer: reviewer._id, requestedBy: req.user.id, status: 'pending', comment: '',
    });

    await createAuditActivity({
      userId: req.user.id,
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
        activityError?.name || "Error");
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
    if (error.statusCode) return next(error);
    console.error(error?.name || "Error");

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
exports.getApprovals = async (req, res, next) => {
  try {
    const approvals =
      await listRecords(AuditApproval, { auditId: req.audit._id }, req, res);

    res.json({
      success: true,
      data: approvals,
    });

  } catch (error) {
    if (error.statusCode) return next(error);
    console.error(error?.name || "Error");

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
exports.updateApproval = async (req, res, next) => {
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

    assertAuditEditable(req);
    if (!['approved', 'rejected'].includes(status)) throw badRequest('Invalid approval decision');
    const existing = await AuditApproval.findById(req.params.id);
    if (!existing) throw badRequest('Approval not found', 404);
    if (existing.status !== 'pending') throw badRequest('Approval has already been reviewed', 409);
    if (String(existing.requestedBy) === String(req.user.id)) throw badRequest('Requester cannot review their own approval', 403);
    if (String(existing.reviewer) !== String(req.user.id) && req.permission.scope !== 'all') throw badRequest('Only the nominated reviewer may decide this request', 403);
    if (status === 'approved') {
      if (existing.findingId) {
        const finding = await AuditFinding.findById(existing.findingId).lean();
        if (!finding || finding.status !== 'resolved') throw badRequest('Finding must be resolved before approval');
      } else if (existing.actionId) {
        const action = await AuditAction.findById(existing.actionId).lean();
        if (!action || !['completed', 'verified'].includes(action.status)) throw badRequest('Action must be completed before approval');
      } else {
        await require('../services/auditCompletion.service').assertAuditReadyForApproval(req.audit);
      }
    }
    const approval = await AuditApproval.findOneAndUpdate(
      { _id: existing._id, status: 'pending' },
      { $set: { status, comment: typeof comment === 'string' ? comment : '', approvedAt: status === 'approved' ? new Date() : null, reviewedBy: req.user.id } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!approval) throw badRequest('Approval changed; reload it and try again', 409);

    await createAuditActivity({
      userId: req.user.id,
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
        activityError?.name || "Error");
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
    if (error.statusCode) return next(error);
    console.error(error?.name || "Error");

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
