const { listRecords } = require("../utils/listQuery");
const AuditExecution = require('../models/auditExecution.model');
const AuditApproval = require('../models/auditApproval.model');
const { badRequest } = require('../services/auditPolicy.service');
const { assertRelatedRecord, assertAuditEditable } = require('../services/auditRelations.service');
const AuditFinding = require("../models/auditFinding.model");
const { recordActivity } = require("../services/activityLog.service");
const {
  findAuditByIdentifier,
  userHasAuditAccess,
} = require("../middleware/auditScope.middleware");
const { createAuditActivity } = require("./auditActivity.controller");

exports.getFindings = async (req, res, next) => {
  try {
    const auditId = req.params.auditId;

    const audit = await findAuditByIdentifier(auditId);

    if (!audit) {
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
          message: "Bu Audit-in finding-lərinə giriş icazəniz yoxdur.",
        });
      }
    }

    const data = await listRecords(AuditFinding, { auditId: audit._id }, req, res);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.status || error.statusCode) return next(error);
    console.error("Get findings error:", error?.name || "Error");

    return res.status(500).json({
      success: false,
      message: "Finding error",
    });
  }
};

exports.createFinding = async (req, res, next) => {
  try {
    const auditId = req.body.auditId;

    const audit = await findAuditByIdentifier(auditId);

    if (!audit) {
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
          message: "Bu Audit-ə finding əlavə etmək icazəniz yoxdur.",
        });
      }
    }

    assertAuditEditable(req);
    const executionId = await assertRelatedRecord(AuditExecution, req.body.executionId, audit._id, 'Execution');
    const finding = await AuditFinding.create({
      auditId: audit._id,
      executionId,
      createdBy: req.user.id,
      status: "open",
      title: req.body.title,
      description: req.body.description || "",
      severity: req.body.severity || "medium",
      category: req.body.category || "quality",
      dueDate: req.body.dueDate || undefined,
    });

    await createAuditActivity({
      userId: req.user.id,
      auditId: audit._id,
      action: "created",
      resource: "finding",
      description: `Finding yaradıldı: ${finding.title}`,
      metadata: {
        findingId: finding._id,
        severity: finding.severity,
        category: finding.category,
        status: finding.status,
        createdBy: req.user?.id || null,
      },
    });

    try {
      await recordActivity({
        req,
        action: "create",
        entityType: "audit_finding",
        entityId: finding._id,
        description: `Audit finding yaradıldı: ${finding.title}`,
      });
    } catch (activityError) {
      console.error(
        "Audit finding activity log error:",
        activityError?.name || "Error");
    }

    return res.status(201).json({
      success: true,
      data: finding,
    });
  } catch (error) {
    if (error.statusCode) return next(error);
    console.error("Create finding error:", error?.name || "Error");

    return res.status(500).json({
      success: false,
      message: "Finding creation error",
    });
  }
};

exports.updateFindingStatus = async (req, res, next) => {
  try {
    assertAuditEditable(req);
    const finding = await AuditFinding.findById(req.params.id);
    if (!finding) throw badRequest('Finding not found', 404);
    const status = req.body.status;
    const allowed = { open: ['assigned', 'in-progress'], assigned: ['in-progress'], 'in-progress': ['resolved'], resolved: ['closed', 'in-progress'], closed: [] };
    if (!allowed[finding.status]?.includes(status)) throw badRequest('Invalid finding status transition', 409);
    if (status === 'closed') {
      const approval = await AuditApproval.findOne({ auditId: req.audit._id, findingId: finding._id }).sort({ createdAt: -1 });
      if (!approval || approval.status !== 'approved' || !approval.approvedAt || new Date(approval.approvedAt) < new Date(finding.updatedAt)) throw badRequest('Current finding approval is required');
    }
    const updated = await AuditFinding.findOneAndUpdate({ _id: finding._id, status: finding.status }, { $set: { status } }, { returnDocument: 'after', runValidators: true });
    if (!updated) throw badRequest('Finding changed; reload it and try again', 409);
    await createAuditActivity({ auditId: req.audit._id, userId: req.user.id, action: 'updated', resource: 'finding', description: `Finding ${status}`, metadata: { findingId: finding._id } });
    return res.json({ success: true, data: updated });
  } catch (error) { return next(error); }
};
