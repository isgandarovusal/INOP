const { listRecords } = require("../utils/listQuery");
const AuditAction = require('../models/auditAction.model');
const AuditExecution = require('../models/auditExecution.model');
const { badRequest } = require('../services/auditPolicy.service');
const { assertRelatedRecord, assertAuditEditable } = require('../services/auditRelations.service');
const { createAuditActivity } = require('./auditActivity.controller');

exports.createAction = async (req, res, next) => {
  try {
    assertAuditEditable(req);
    const executionId = await assertRelatedRecord(AuditExecution, req.body.executionId, req.audit._id, 'Execution');
    const action = await AuditAction.create({
      auditId: req.audit._id, executionId, title: req.body.title, description: req.body.description,
      priority: req.body.priority || 'medium', responsible: req.body.responsible,
      dueDate: req.body.dueDate, status: 'open', createdBy: req.user.id,
    });
    await createAuditActivity({ auditId: req.audit._id, userId: req.user.id, action: 'created', resource: 'action', description: 'Corrective action created', metadata: { actionId: action._id } });
    return res.status(201).json({ success: true, data: action });
  } catch (error) { return next(error); }
};
exports.getActions = async (req, res, next) => {
  try {
    const actions = await listRecords(AuditAction, { auditId: req.audit._id }, req, res);
    return res.json({ success: true, data: actions });
  } catch (error) { return next(error); }
};
exports.updateActionStatus = async (req, res, next) => {
  try {
    assertAuditEditable(req);
    const existing = await AuditAction.findById(req.params.id);
    if (!existing) throw badRequest('Action not found', 404);
    const status = req.body.status;
    const allowed = { open: ['in-progress'], 'in-progress': ['completed'], completed: ['verified', 'rejected'], rejected: ['in-progress'], verified: [] };
    if (!allowed[existing.status]?.includes(status)) throw badRequest('Invalid action status transition', 409);
    const update = { status };
    if (status === 'completed') { update.completedAt = new Date(); update.completedBy = req.user.id; }
    if (['verified', 'rejected'].includes(status)) {
      if (String(existing.completedBy || existing.createdBy) === String(req.user.id)) throw badRequest('An action needs an independent reviewer', 403);
      update.verifiedBy = req.user.id; update.verificationNote = req.body.verificationNote || '';
      update.verifiedAt = new Date();
    }
    const action = await AuditAction.findOneAndUpdate({ _id: existing._id, status: existing.status }, { $set: update }, { returnDocument: 'after', runValidators: true });
    if (!action) throw badRequest('Action changed; reload it and try again', 409);
    await createAuditActivity({ auditId: req.audit._id, userId: req.user.id, action: 'updated', resource: 'action', description: `Corrective action ${status}`, metadata: { actionId: action._id } });
    return res.json({ success: true, data: action });
  } catch (error) { return next(error); }
};
