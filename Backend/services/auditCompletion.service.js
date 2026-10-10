const AuditFinding = require('../models/auditFinding.model');
const AuditApproval = require('../models/auditApproval.model');
const AuditAction = require('../models/auditAction.model');
const AuditExecution = require('../models/auditExecution.model');
const { badRequest } = require('./auditPolicy.service');

async function assertAuditReadyForApproval(audit, executionId) {
  const auditId = audit._id;
  const [openFindings, openActions, execution, latestFinding, latestAction] = await Promise.all([
    AuditFinding.countDocuments({ auditId, status: { $ne: 'closed' } }),
    AuditAction.countDocuments({ auditId, status: { $ne: 'verified' } }),
    AuditExecution.findOne({ auditId, ...(executionId ? { _id: executionId } : {}) }).sort({ createdAt: -1 }),
    AuditFinding.findOne({ auditId }).sort({ updatedAt: -1 }).select('updatedAt').lean(),
    AuditAction.findOne({ auditId }).sort({ updatedAt: -1 }).select('updatedAt').lean(),
  ]);
  if (openFindings) throw badRequest('Open findings exist');
  if (openActions) throw badRequest('Unverified corrective actions exist');
  if (!execution || !['completed', 'approved'].includes(execution.status)) throw badRequest('A completed execution is required');
  const lastChangedAt = Math.max(...[audit.updatedAt, execution.updatedAt, latestFinding?.updatedAt, latestAction?.updatedAt]
    .filter(Boolean).map(value => new Date(value).getTime()));
  return { execution, lastChangedAt };
}
async function assertAuditCompletion(audit, executionId) {
  const ready = await assertAuditReadyForApproval(audit, executionId);
  const approval = await AuditApproval.findOne({ auditId: audit._id, findingId: null, actionId: null }).sort({ createdAt: -1 });
  if (!approval || approval.status !== 'approved' || !approval.approvedAt) throw badRequest('Audit-level approval is required');
  if (new Date(approval.approvedAt).getTime() < ready.lastChangedAt) throw badRequest('Audit changed after approval; request a new approval');
  return { approval, execution: ready.execution };
}
module.exports = { assertAuditCompletion, assertAuditReadyForApproval };
