const { listRecords } = require("../utils/listQuery");
const mongoose = require('mongoose');
const User = require('../models/user.model');
const { getPermissionScope } = require('../middleware/auth.middleware');
const { badRequest } = require('../services/auditPolicy.service');
const { assertAuditEditable } = require('../services/auditRelations.service');
const AuditAssignment =
  require("../models/auditAssignment.model");
const { recordActivity } = require("../services/activityLog.service");

const {
  createAuditActivity,
} = require("./auditActivity.controller");

const {
  notifyUserBestEffort: notifyUser,
} = require("../services/auditNotificationDelivery.service");


exports.assignAudit = async (req, res, next) => {
  try {
    assertAuditEditable(req);
    const managementScope = await getPermissionScope(req.user.role, 'audit', 'update');
    if (managementScope !== 'all' && !(managementScope === 'department' && req.user.departmentId && String(req.audit.departmentId) === String(req.user.departmentId))) {
      throw badRequest('Audit management permission is required to assign auditors', 403);
    }
    if (!mongoose.Types.ObjectId.isValid(req.body.auditor)) throw badRequest('Invalid auditor id');
    const auditor = await User.findOne({ _id: req.body.auditor, isActive: true }).select('_id role').lean();
    if (!auditor || !await getPermissionScope(auditor.role, 'audit.execution', 'read')) throw badRequest('Auditor is not authorized to execute audits');
    const assignment = await AuditAssignment.findOneAndUpdate(
      { auditId: req.audit._id, auditor: auditor._id },
      { $setOnInsert: { assignedBy: req.user.id, status: 'assigned' } },
      { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
    );

    await createAuditActivity({
      userId: req.user.id,
      auditId: assignment.auditId,
      action: "created",
      resource: "assignment",
      description: "Audit auditor-a təyin edildi",
      metadata: {
        assignmentId: assignment._id,
        auditor: assignment.auditor,
        assignedBy: assignment.assignedBy || null,
        status: assignment.status,
      },
    });

    try {
      await recordActivity({
        req,
        action: "create",
        entityType: "audit_assignment",
        entityId: assignment._id,
        description: "Audit auditor-a təyin edildi",
      });
    } catch (activityError) {
      console.error(
        "Audit assignment activity log error:",
        activityError?.name || "Error");
    }

    await notifyUser({
      auditId: assignment.auditId,
      userId: assignment.auditor,
      type: "assigned",
      title: "Yeni audit sizə təyin edildi",
      message:
        "Sizə yeni audit təyin edildi. INOP platformasında audit məlumatlarını nəzərdən keçirə bilərsiniz.",
    });

    res.status(201).json({
      success: true,
      data: assignment,
    });

  } catch (e) {
    if (e.status || e.statusCode) return next(e);
    console.error(e?.name || "Error");

    res.status(500).json({
      success: false,
      message: "Assignment creation error",
    });
  }
};


exports.getAssignments = async (req, res, next) => {
  try {
    const data =
      await listRecords(AuditAssignment, { auditId: req.audit._id }, req, res);

    res.json({
      success: true,
      data,
    });

  } catch (e) {
    if (e.status || e.statusCode) return next(e);
    console.error(e?.name || "Error");

    res.status(500).json({
      success: false,
      message: "Assignment fetch error",
    });
  }
};
