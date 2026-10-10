const AuditExecution = require('../models/auditExecution.model');
const AuditTemplate = require('../models/auditTemplate.model');
const Audit = require('../models/audit.model');
const { badRequest, getTemplateQuestions, scoreAnswers } = require('../services/auditPolicy.service');
const { readScope } = require('../services/auditLibrary.service');
const { executionTemplate } = require('../services/auditExecutionTemplate.service');

function present(execution, templateOverride) {
  const data = execution.toObject ? execution.toObject() : { ...execution };
  const template = templateOverride || data.checklistSnapshot;
  const checklist = getTemplateQuestions(template).map(q => ({ ...q, question: q.label }));
  const map = new Map((data.answers || []).map(a => [a.questionId, a]));
  return { ...data, checklistId: data.checklistId ? String(data.checklistId._id || data.checklistId) : undefined, checklist, answers: checklist.map(q => ({ ...(map.get(q.id) || {}), questionId: q.id, value: map.get(q.id)?.answer || '' })) };
}
exports.createExecution = async (req, res, next) => {
  try {
    if (['completed', 'cancelled'].includes(req.audit.status)) throw badRequest('A closed audit cannot be executed', 409);
    const audit = await Audit.findById(req.audit._id).lean();
    const checklistId = req.body.checklistId || audit.templateId;
    const templateScope = await readScope(req, 'audit.template');
    const template = checklistId ? await AuditTemplate.findOne({ $and: [{ _id: checklistId, status: 'active' }, templateScope] }).lean() : null;
    if (!template || template.status !== 'active' || (['standard', 'service', 'occupational-safety'].includes(audit.auditType) && template.auditType !== audit.auditType)) {
      throw badRequest('An active template matching the audit type is required');
    }
    const questions = getTemplateQuestions(template);
    if (!questions.length) throw badRequest('Checklist has no active questions');
    const execution = await AuditExecution.create({
      auditId: req.audit._id, checklistId: template._id,
      checklistSnapshot: { sections: template.sections, name: template.name, version: template.version },
      answers: [], status: 'draft', totalScore: 0, createdBy: req.user.id,
    });
    return res.status(201).json({ success: true, data: present(execution, await executionTemplate(req, execution)) });
  } catch (error) { return next(error); }
};
exports.getExecution = async (req, res, next) => {
  try {
    const execution = await AuditExecution.findById(req.params.id);
    if (!execution) throw badRequest('Execution not found', 404);
    return res.json({ success: true, data: present(execution, await executionTemplate(req, execution)) });
  } catch (error) { return next(error); }
};
exports.submitExecution = async (req, res, next) => {
  try {
    if (['completed', 'cancelled'].includes(req.audit.status)) throw badRequest('A closed audit cannot be changed', 409);
    const existing = await AuditExecution.findById(req.params.id);
    if (!existing) throw badRequest('Execution not found', 404);
    if (!['draft', 'in-progress'].includes(existing.status)) throw badRequest('Execution has already been submitted', 409);
    const template = await executionTemplate(req, existing);
    const calculated = scoreAnswers(template, req.body.answers);
    const updated = await AuditExecution.findOneAndUpdate(
      { _id: existing._id, status: existing.status },
      { $set: { ...calculated, checklistSnapshot: template, status: 'completed' } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!updated) throw badRequest('Execution changed; reload it and try again', 409);
    return res.json({ success: true, data: present(updated) });
  } catch (error) { return next(error); }
};
