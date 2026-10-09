const Execution = require('../models/auditExecution.model');
const { findAuditByIdentifier, getAuditChildScopeFilter } = require('../middleware/auditScope.middleware');

function calculateRisk(score) {
  if (score >= 90) return 'low';
  if (score >= 70) return 'medium';
  if (score >= 50) return 'high';
  return 'critical';
}

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
  const status = error?.code === 11000 ? 409 : ['ValidationError', 'CastError'].includes(error?.name) ? 400 : 500;
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
    const { checklistId, answers = [], findings, correctiveActions, status, totalScore, riskLevel } = req.body;
    if (!validAnswers(answers)) return res.status(400).json({ success: false, message: 'Invalid answers.' });
    const execution = await Execution.create({ auditId: req.auditScopeId, createdBy: req.user.id, checklistId, answers, findings, correctiveActions, status, totalScore, riskLevel });
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
    // Preserve the existing raw-score/risk contract; no new weighting policy.
    const totalScore = answers.reduce((sum, answer) => sum + Number(answer.score || 0), 0);
    if (!Number.isFinite(totalScore)) return res.status(400).json({ success: false, message: 'Invalid total score.' });
    const execution = await Execution.findOneAndUpdate(
      { _id: req.executionId, auditId: req.auditScopeId },
      { $set: { answers, totalScore, riskLevel: calculateRisk(totalScore), status: 'completed' } },
      { returnDocument: 'after', runValidators: true }
    );
    if (!execution) return res.status(404).json({ success: false, message: 'Execution not found.' });
    return res.json({ success: true, data: execution });
  } catch (error) { return fail(res, error); }
};
