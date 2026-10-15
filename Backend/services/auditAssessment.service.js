const { questions } = require('./auditTemplateRevision.service');
const { auditError } = require('./auditTransaction.service');
function assess(snapshot, answers, submitting = false) {
  if(snapshot?.auditType==='service'&&snapshot.serviceSource)return require('./serviceAuditAssessment.service').assessService(snapshot,answers,submitting);
  if (snapshot?.auditType === 'hr' && snapshot.hrSource) return require('./hrAuditAssessment.service').assessHR(snapshot, answers, submitting);
  if (!snapshot) return { assessmentStatus: 'legacy-unscored', overallPercentage: null, passed: null };
  const items = questions(snapshot);
  if (!Array.isArray(answers)) throw auditError(400, 'Answers must be an array.');
  const known = new Map(items.map(item => [item.id, item]));
  const supplied = new Map();
  for (const answer of answers) {
    const id = answer.questionId || answer.checkId;
    if (!known.has(id) || supplied.has(id)) throw auditError(400, 'Unknown or duplicate question.');
    const value = answer.answer ?? answer.result;
    if (known.get(id).answerType === 'yes-no-na' && !['yes','no','na'].includes(value)) throw auditError(400, 'Invalid yes/no/na answer.');
    if (value != null && typeof value !== 'string') throw auditError(400, 'Invalid answer.');
    supplied.set(id, value);
  }
  const complete = items.length > 0 && items.filter(item => item.required !== false).every(item => typeof supplied.get(item.id) === 'string' && supplied.get(item.id).trim());
  if (submitting && !complete) throw auditError(422, 'Complete every required question before submission.');
  // Only the already established service yes/no/na formula is supported.
  // No weights, severity thresholds or numeric policies are invented.
  if (!complete || snapshot.auditType !== 'service' || items.some(item => item.answerType !== 'yes-no-na')) return { assessmentStatus: 'unscored', overallPercentage: null, passed: null };
  const evaluated = [...supplied.values()].filter(value => value !== 'na');
  return { assessmentStatus: evaluated.length ? 'scored' : 'unscored', overallPercentage: evaluated.length ? evaluated.filter(value => value === 'yes').length / evaluated.length * 100 : null, passed: null };
}
const trustedFields = ['scores','score','overallScore','overallPercentage','compliancePercentage','passed','foundCritical','foundMajor','foundMinor','foundTotal','totalScore','maxScore','scorePercentage','riskLevel','approvedAt','approvalStatus','archivedAt','archivedBy','auditWriteVersion','assessmentStatus'];
function sanitizeNew(payload) {
  delete payload.serviceAssessment;delete payload.serviceDetails;delete payload.serviceVersion;
  delete payload.hrAssessment; delete payload.hrDetails; delete payload.hrVersion;
  if (['approved','archived'].includes(payload.status)) throw auditError(400, 'Approval/archival is a protected operation.');
  for (const field of trustedFields) delete payload[field];
  for (const field of ['photos','attachments']) {
    if ((payload[field] || []).length) throw auditError(400, 'Upload evidence through the private evidence endpoint.');
    payload[field] = [];
  }
  payload.status = 'draft';
  Object.assign(payload, assess(payload.templateSnapshot, payload.checks || payload.results || []));
}
module.exports = { assess, sanitizeNew, trustedFields };
