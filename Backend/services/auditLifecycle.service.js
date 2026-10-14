const Audit = require('../models/audit.model');
const Approval = require('../models/auditApproval.model');
const Finding = require('../models/auditFinding.model');
const Closure = require('../models/auditClosure.model');
const Assignment = require('../models/auditAssignment.model');
const Activity = require('../models/auditActivity.model');
const { transaction, auditError } = require('./auditTransaction.service');
async function lockAudit(id, session, user) {
  const audit = await Audit.findOneAndUpdate({ _id: id, archivedAt: null }, { $inc: { auditWriteVersion: 1 } }, { returnDocument: 'after', session });
  if (!audit) throw auditError(404, 'Audit not found.');
  if (user) {
    const Profile = require('../models/auditorProfile.model');
    const profile = await Profile.findById(user.id).session(session);
    if (user.role === 'auditor' || profile) {
      const current = await require('./auditorProfile.service').lockProfile(user.id, session);
      if (current.direction !== require('./auditDirection.service').canonicalDirection(audit.auditType)) throw auditError(403, 'Audit direction changed.');
    }
  }
  return audit;
}
async function history(audit, actor, action, session) {
  await Activity.create([{ auditId: audit._id, userId: actor.id, action, resource: 'lifecycle', description: action }], { session });
  await require('../models/activityLog.model').create([{ departmentId: actor.departmentId || '', createdBy: actor.id, assignedTo: actor.id, userId: actor.id, userName: actor.name || '', action, entityType: 'audit', entityId: String(audit._id), description: action }], { session });
}
async function createApproval(req) {
  if (req.body.status && req.body.status !== 'pending') throw auditError(400, 'Approval requests must start pending.');
  return transaction(async session => {
    const audit = await lockAudit(req.auditScopeId, session, req.user);
    const User = require('../models/user.model');
    const reviewer = await User.findOne({ _id: req.body.reviewer, isActive: true }).session(session);
    if (!reviewer || String(reviewer._id) === req.user.id) throw auditError(400, 'Select an active independent reviewer.');
    const scope = await require('../middleware/auth.middleware').getPermissionScope(reviewer.role, 'audit.approval', 'update');
    if (!scope || scope === 'none') throw auditError(403, 'Reviewer lacks approval permission.');
    const profile = await require('../models/auditorProfile.model').findById(reviewer._id).session(session).lean();
    if (reviewer.role === 'auditor' && !profile?.active) throw auditError(403, 'Reviewer has no audit direction.');
    const filter = await require('../middleware/auditScope.middleware').getAuditScopeFilter({ user: { id: String(reviewer._id), role: reviewer.role, departmentId: reviewer.departmentId }, permission: { scope }, auditorProfile: profile || undefined });
    if (!filter || !(await Audit.exists({ $and: [{_id:audit._id},filter] }).session(session))) throw auditError(403, 'Reviewer cannot access this audit.');
    for (const [field, Model] of [['findingId', Finding], ['actionId', require('../models/auditAction.model')]]) {
      if (req.body[field] && !(await Model.exists({ _id: req.body[field], auditId: audit._id }).session(session))) throw auditError(400, 'Approval reference belongs to another audit.');
    }
    const existing = await Approval.findOne({ auditId: audit._id, requestedBy: req.user.id, reviewer: reviewer._id, status: 'pending' }).session(session);
    if (existing) return existing;
    const [approval] = await Approval.create([{ auditId: audit._id, reviewer: reviewer._id, requestedBy: req.user.id, status: 'pending', findingId: req.body.findingId, actionId: req.body.actionId, comment: req.body.comment }], { session });
    await history(audit, req.user, 'approval-requested', session); return approval;
  });
}
async function resolveApproval(req) {
  return transaction(async session => {
    const audit = await lockAudit(req.auditScopeId, session, req.user);
    const approval = await Approval.findOne({ _id: req.params.id, auditId: audit._id }).session(session);
    if (!approval) throw auditError(404, 'Approval not found.');
    if (String(approval.requestedBy) === req.user.id || (String(approval.reviewer) !== req.user.id && !(['admin','audit_manager'].includes(req.user.role) && req.permission.scope === 'all'))) throw auditError(403, 'Independent designated reviewer or authorized audit manager required.');
    if (approval.status !== 'pending') throw auditError(409, 'Approval is already resolved.');
    if (!['approved','rejected'].includes(req.body.status)) throw auditError(400, 'Invalid approval decision.');
    approval.status = req.body.status; approval.comment = req.body.comment || ''; approval.approvedAt = approval.status === 'approved' ? new Date() : null;
    await approval.save({ session }); await history(audit, req.user, 'approval-' + approval.status, session); return approval;
  });
}
async function closeAudit(req) {
  return transaction(async session => {
    const audit = await lockAudit(req.auditScopeId, session, req.user);
    const existing = await Closure.findOne({ auditId: audit._id, finalStatus: 'completed' }).session(session);
    if (existing && audit.status === 'completed') return existing;
    if (await Finding.exists({ auditId: audit._id, status: { $ne: 'closed' } }).session(session)) throw auditError(409, 'Close every finding first.');
    const approval = await Approval.findOne({ auditId: audit._id }).sort({ createdAt: -1 }).session(session);
    if (!approval || approval.status !== 'approved') throw auditError(409, 'Independent approval is required.');
    if (!['completed','in-progress'].includes(audit.status)) throw auditError(409, 'Audit is not ready for closure.');
    const context = await require('../models/auditContext.model').findById(audit._id).session(session);
    if (!audit.templateRevisionId || String(context?.templateRevisionId) !== String(audit.templateRevisionId)) throw auditError(409, 'Legacy unversioned audit requires reviewed closure migration.');
    require('./auditAssessment.service').assess(audit.templateSnapshot, audit.checks || [], true);
    const [closure] = await Closure.create([{ auditId: audit._id, executionId: req.body.executionId, approvalStatus: 'approved', finalStatus: 'completed', closedBy: req.user.id, comment: req.body.comment }], { session });
    audit.status = 'completed'; await audit.save({ session });
    await Assignment.updateMany({ auditId: audit._id }, { $set: { status: 'completed' } }, { session });
    await history(audit, req.user, 'closed', session); return closure;
  });
}
async function transition(req) {
  const allowed = { draft: ['scheduled','in-progress','cancelled'], scheduled: ['in-progress','cancelled'], 'in-progress': ['completed','cancelled'], completed: ['in-progress'], failed: ['in-progress'], cancelled: ['draft'] };
  return transaction(async session => {
    const audit = await lockAudit(req.auditScopeId, session, req.user);
    const next = req.body.status;
    if (next === audit.status) return audit;
    if (await Closure.exists({ auditId: audit._id }).session(session)) throw auditError(409, 'Use a reviewed reopening operation for closed audits.');
    if (!(allowed[audit.status] || []).includes(next)) throw auditError(409, 'Invalid audit status transition.');
    if (next === 'completed') Object.assign(audit, require('./auditAssessment.service').assess(audit.templateSnapshot, audit.checks || [], true));
    if(next==='completed'){const context=await require('../models/auditContext.model').findById(audit._id).session(session);if(!audit.templateRevisionId||String(context?.templateRevisionId)!==String(audit.templateRevisionId))throw auditError(409,'Unversioned audit cannot be certified complete.');}
    audit.status = next; await audit.save({ session }); await history(audit, req.user, 'status-' + next, session); return audit;
  });
}
async function setFindingStatus(req) {
  return transaction(async session => {
    const audit = await lockAudit(req.auditScopeId, session, req.user);
    if (await Closure.exists({ auditId: audit._id }).session(session)) throw auditError(409, 'Closed audit is immutable.');
    if (!['open','assigned','in-progress','resolved','closed'].includes(req.body.status)) throw auditError(400, 'Invalid finding status.');
    const finding = await Finding.findOneAndUpdate({ _id: req.params.id, auditId: audit._id }, { $set: { status: req.body.status } }, { returnDocument: 'after', runValidators: true, session });
    if (!finding) throw auditError(404, 'Finding not found.');
    await history(audit, req.user, 'finding-' + finding.status, session); return finding;
  });
}
async function createFinding(req) {
  return transaction(async session => {
    const audit = await lockAudit(req.auditScopeId, session, req.user);
    if (await Closure.exists({ auditId: audit._id }).session(session)) throw auditError(409, 'Closed audit is immutable.');
    const [finding] = await Finding.create([{ auditId: audit._id, executionId: req.body.executionId, title: req.body.title, description: req.body.description, severity: req.body.severity, category: req.body.category, dueDate: req.body.dueDate }], { session });
    await history(audit, req.user, 'finding-created', session); return finding;
  });
}
module.exports = { lockAudit, createApproval, resolveApproval, closeAudit, transition, setFindingStatus, createFinding };
