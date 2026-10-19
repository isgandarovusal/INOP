const AuditAssignment =
  require("../models/auditAssignment.model");
const { recordActivity } = require("../services/activityLog.service");

const {
  createAuditActivity,
} = require("./auditActivity.controller");

const {
  notifyUser,
} = require("../services/notification.service");


exports.assignAudit = async (req, res) => {
  try {
    const result = await require('../services/auditorProfile.service').assignAudit({ auditId: req.auditScopeId, auditor: req.body.auditor, actorId: req.user.id });
    const assignment = result.assignment;
    if (!result.created) return res.status(200).json({ success: true, data: assignment });

    await createAuditActivity({
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
      require('../services/safeErrorLog.service').logFailure(activityError);
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
    require('../services/safeErrorLog.service').logFailure(e);

    res.status(e.status || (e.code === 11000 ? 409 : 500)).json({
      success: false,
      message: e.status ? e.message : "Assignment creation error",
    });
  }
};


exports.getAssignments = async (req, res) => {
  try {
    const data =
      await AuditAssignment.find({
        auditId: req.params.auditId,
      });

    res.json({
      success: true,
      data,
    });

  } catch (e) {
    require('../services/safeErrorLog.service').logFailure(e);

    res.status(500).json({
      success: false,
      message: "Assignment fetch error",
    });
  }
};
