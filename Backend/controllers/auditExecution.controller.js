const Execution = require('../models/auditExecution.model');
const { findAuditByIdentifier, getAuditChildScopeFilter } = require('../middleware/auditScope.middleware');

function validAnswers(answers) {
  return Array.isArray(answers) && answers.every(answer =>
    answer && typeof answer === 'object' && !Array.isArray(answer) &&
    (answer.questionId == null || typeof answer.questionId === 'string') &&
    (answer.answer == null || typeof answer.answer === 'string') &&
    (answer.comment == null || typeof answer.comment === 'string') &&
    (answer.score == null || ((typeof answer.score === 'number' || typeof answer.score === 'string') && Number.isFinite(Number(answer.score))))
  );
}

function fail(res, error) {
  const status = error.status || (error?.code === 11000 ? 409 : ['ValidationError', 'CastError'].includes(error?.name) ? 400 : 500);
  return res.status(status).json({ success: false, message: status === 500 ? 'Audit execution error.' : 'Invalid execution data.' });
}

exports.listExecutions = async (req, res) => {
  try {
    const scope = await getAuditChildScopeFilter(req);
    if (scope === null) return res.status(403).json({ success: false, message: 'Execution scope denied.' });
    const filters = [scope];
    if (req.query.auditId !== undefined) {
      if (typeof req.query.auditId !== 'string') return res.status(400).json({ success: false, message: 'Invalid audit id.' });
      const parent = await findAuditByIdentifier(req.query.auditId);
      if (!parent) return res.json({ success: true, data: [] });
      filters.push({ auditId: parent._id });
    }
    return res.json({ success: true, data: await Execution.find({ $and: filters }).sort({ createdAt: -1 }).lean() });
  } catch (error) { return fail(res, error); }
};

exports.createExecution = async (req, res) => {
  try {
    const { checklistId, answers = [], findings, correctiveActions } = req.body;
    if (!validAnswers(answers)) return res.status(400).json({ success: false, message: 'Invalid answers.' });
    const audit = await require('../models/audit.model').findById(req.auditScopeId).lean();
    const bound = {};
    const context = await require('../models/auditContext.model').findById(req.auditScopeId).lean();
    if (audit?.templateRevisionId && String(context?.templateRevisionId) === String(audit.templateRevisionId)) {
      const revision = await require('../models/auditTemplateRevision.model').findById(audit.templateRevisionId).lean();
      if (!revision || (checklistId && String(revision.templateId) !== String(checklistId))) return res.status(400).json({ message: 'Execution must use the audit revision.' });
      bound.templateRevisionId = revision._id; bound.templateSnapshot = revision.content;
    }
    const execution = await require('../services/auditTransaction.service').transaction(async session => {
      await require('../services/auditLifecycle.service').lockAudit(req.auditScopeId,session,req.user);
      const existing = await Execution.findOne({ auditId:req.auditScopeId, templateRevisionId:bound.templateRevisionId || null }).session(session);
      if(existing)return existing;
      const [created] = await Execution.create([{ ...bound, auditId:req.auditScopeId,createdBy:req.user.id,checklistId,answers:[],findings,correctiveActions,status:'draft',totalScore:null,riskLevel:'unscored' }],{session});return created;
    });
    return res.status(201).json({ success: true, data: execution });
  } catch (error) { return fail(res, error); }
};

exports.getExecution = async (req, res) => {
  try {
    const execution = await Execution.findOne({ _id: req.executionId, auditId: req.auditScopeId });
    if (!execution) return res.status(404).json({ success: false, message: 'Execution not found.' });
    return res.json({ success: true, data: execution });
  } catch (error) { return fail(res, error); }
};

exports.submitExecution = async (req, res) => {
  try {
    const { answers = [] } = req.body;
    if (!validAnswers(answers)) return res.status(400).json({ success: false, message: 'Invalid answers.' });
    const execution = await require('../services/auditTransaction.service').transaction(async session => {
      const audit = await require('../services/auditLifecycle.service').lockAudit(req.auditScopeId, session, req.user);
      if (await require('../models/auditClosure.model').exists({ auditId: audit._id }).session(session)) throw Object.assign(new Error('Closed audit is immutable.'), { status: 409 });
      const existing = await Execution.findOne({ _id: req.executionId, auditId: req.auditScopeId }).session(session);
      if (!existing) return null;
      if (!existing.templateRevisionId) throw Object.assign(new Error('Legacy execution has no certified scoring contract.'), { status: 409 });
      const assessment = require('../services/auditAssessment.service').assess(existing.templateSnapshot, answers, true);
      const safeAnswers = answers.map(({questionId,answer,comment}) => ({questionId,answer,comment}));
      existing.answers = safeAnswers; existing.status = 'completed'; existing.totalScore = null; existing.riskLevel = 'unscored';
      Object.assign(existing, assessment); await existing.save({ session });
      audit.checks = safeAnswers; Object.assign(audit, assessment); await audit.save({ session }); return existing;
    });
    if (!execution) return res.status(404).json({ success: false, message: 'Execution not found.' });
    return res.json({ success: true, data: execution });
  } catch (error) { return fail(res, error); }
};
