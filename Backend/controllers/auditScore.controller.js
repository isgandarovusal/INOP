const Audit = require('../models/audit.model');
const AuditExecution = require('../models/auditExecution.model');
const { recordActivity } = require('../services/activityLog.service');
const { normalizeAuditPayload } = require('../services/auditPayload.service');
const { badRequest, scoreAnswers } = require('../services/auditPolicy.service');
const { assertAuditEditable } = require('../services/auditRelations.service');
const { executionTemplate } = require('../services/auditExecutionTemplate.service');

exports.calculateScore = async (req, res, next) => {
  try {
    assertAuditEditable(req);
    const audit = await Audit.findById(req.audit._id).lean();
    if (!audit) throw badRequest('Audit not found', 404);
    const execution = await AuditExecution.findOne({ auditId: audit._id, status: { $in: ['completed', 'approved'] } })
      .sort({ createdAt: -1 }).lean();
    let metrics, score;
    if (execution) {
      score = scoreAnswers(await executionTemplate(req, execution), execution.answers).totalScore;
      metrics = { overallPercentage: score };
    } else {
      const body = audit.scores ? { scores: audit.scores } : {};
      const derived = normalizeAuditPayload(body, req, false, audit);
      const names = ['overallPercentage', 'foundCritical', 'foundMajor', 'foundMinor', 'foundTotal', 'compliancePercentage', 'passed', 'totalScore', 'maxScore', 'scorePercentage'];
      metrics = Object.fromEntries(names.filter(key => derived[key] !== undefined).map(key => [key, derived[key]]));
      score = audit.auditType === 'standard' ? metrics.compliancePercentage : audit.auditType === 'occupational-safety' ? metrics.scorePercentage : metrics.overallPercentage;
      if (score === undefined) throw badRequest('No valid primary observations exist for scoring');
    }
    const updated = await Audit.findOneAndUpdate({ _id: audit._id, status: audit.status, updatedAt: audit.updatedAt },
      { $set: metrics }, { returnDocument: 'after', runValidators: true });
    if (!updated) throw badRequest('Audit changed; reload it and try again', 409);
    try {
      await recordActivity({ req, action: 'calculate', entityType: 'audit_score', entityId: audit._id, description: `Audit score calculated: ${score}%` });
    } catch (error) { console.error('Audit score activity error:', error?.name || "Error"); }
    return res.json({ success: true, score, data: updated });
  } catch (error) { return next(error); }
};
