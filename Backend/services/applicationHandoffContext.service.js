const Application = require('../models/application.model');
const Candidate = require('../models/candidate.model');
const Job = require('../models/job.model');
const authority = require('./hrCreateRecovery.service');
const { resourceFilter } = require('./hrResourceScope.service');
const { scoreRecord } = require('./applicationScoreState.service');
const fail = (status = 409) => Object.assign(new Error('Application context is unavailable.'), { status, code: 'HANDOFF_CONTEXT_CHANGED' });
const eligible = (req, row) => ['recruitment_employee', 'recruitment_manager'].includes(req.user?.role) &&
  String(row.assignedTo || '') === req.user.id && Boolean(req.user.departmentId) && row.departmentId === req.user.departmentId;
const text = value => { if (typeof value !== 'string' || value.length > 500) throw fail(); return value; };
const list = value => { if (!Array.isArray(value) || value.length > 100) throw fail(); return value.map(text); };
const number = value => { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw fail(); return value; };
const dated = value => value instanceof Date && Number.isFinite(value.getTime());
const pick = (row, keys) => Object.fromEntries(keys.filter(k => row[k] !== undefined).map(k => [k, row[k]]));
const candidateFields = 'departmentId updatedAt __v name role email phone skills experience education languages certificates reviewedFields cvReview.version cvReview.reviewStatus employmentHistory.title employmentHistory.start employmentHistory.end employmentHistory.ongoing';
const jobFields = 'departmentId updatedAt __v title department location type status brandId requiredSkills preferredSkills experienceYears requiredEducation requiredCertificates criterionWeights';
function matchingView(row, job, candidate) {
  const scored = scoreRecord(row, job, candidate), status = scored.scoreStatus;
  if (!['pending','incomplete','calculated','stale','legacy','restricted'].includes(status)) throw fail();
  if (!scored.matching) return { score: null, scoreStatus: status, matching: null };
  const m = scored.matching;
  if (m.version !== 'ats-v2' || !Array.isArray(m.criteria) || m.criteria.length > 5 || !Number.isFinite(m.dataCoverage) || m.dataCoverage < 0 || m.dataCoverage > 1 || !Number.isFinite(new Date(m.calculatedAt).getTime())) throw fail();
  const reasons = ['requirements_missing', 'application_context_required', 'protected_criteria_forbidden', 'hr_review_required', 'facts_missing'];
  if (m.reason !== null && !reasons.includes(m.reason)) throw fail();
  const sources = ['candidate.skills', 'candidate.certificates', 'candidate.education', 'application.hr-review', 'candidate.experience:matching-role', 'candidate.employmentHistory:unknown', 'candidate.employmentHistory:dated-matching-role'];
  const criteria = m.criteria.map(c => {
    if (!['skills','preferred','experience','education','certificates'].includes(c.key) || typeof c.known !== 'boolean' || !sources.includes(c.source) || number(c.weight) > 1 || c.ratio !== null && number(c.ratio) > 1) throw fail();
    const result = pick(c, ['key','known','weight','ratio','source']);
    for (const key of ['matched','missing']) if (c[key] !== undefined) result[key] = list(c[key]);
    for (const key of ['value','required']) if (c[key] !== undefined) result[key] = c[key] === null ? null : number(c[key]);
    return result;
  });
  const score = status === 'calculated' ? number(scored.score) : null;
  if (score !== null && score > 100) throw fail();
  return { score, scoreStatus: status, matching: { version: 'ats-v2', calculatedAt: new Date(m.calculatedAt).toISOString(), dataCoverage: m.dataCoverage, reason: m.reason, criteria } };
}
// Detail-only disclosure. Never changes ordinary parent grants, scoring or writes.
async function handoffContext(req, row, populated) {
  if (!eligible(req, row) || !dated(row.updatedAt) || populated.candidateId && populated.jobId) return undefined;
  const identity = authority.identity(req), departmentId = req.user.departmentId;
  const [candidate, job] = await Promise.all([
    Candidate.findOne({ _id: row.candidateId, departmentId }).select(candidateFields).maxTimeMS(1000).lean(),
    Job.findOne({ _id: row.jobId, departmentId }).select(jobFields).maxTimeMS(1000).lean(),
  ]);
  if (!candidate || !job || !dated(candidate.updatedAt) || !dated(job.updatedAt)) return undefined;
  let context;
  try {
    context = { version: 'application-context-v1', mode: 'assigned-read-only', applicationId: String(row._id), revision: row.__v || 0,
      candidate: { name: text(candidate.name), role: text(candidate.role), email: text(candidate.email || ''), phone: text(candidate.phone || ''), skills: list(candidate.skills || []), experience: candidate.experience == null ? null : number(candidate.experience), education: text(candidate.education || ''), languages: list(candidate.languages || []), certificates: list(candidate.certificates || []) },
      job: { title: text(job.title), department: text(job.department || ''), location: text(job.location || ''), type: text(job.type || ''), status: text(job.status), brandId: job.brandId == null ? null : text(job.brandId), requiredSkills: list(job.requiredSkills || []), preferredSkills: list(job.preferredSkills || []), experienceYears: number(job.experienceYears || 0), requiredEducation: list(job.requiredEducation || []), requiredCertificates: list(job.requiredCertificates || []) },
      ...matchingView(row, job, candidate) };
  } catch { return undefined; } // Malformed legacy facts never become partial privileged context.
  // +3 authority reads, then +3 narrow snapshot checks; with parents: at most +8.
  const fresh = await authority.current(req);
  if (authority.identity(fresh) !== identity) throw fail(403);
  if (!eligible(fresh, row)) throw fail(404);
  const [current, currentCandidate, currentJob] = await Promise.all([
    Application.exists({ $and: [resourceFilter(fresh, 'application'), { _id: row._id, assignedTo: row.assignedTo, departmentId, candidateId: row.candidateId, jobId: row.jobId, __v: row.__v ?? { $exists: false }, updatedAt: row.updatedAt }] }).maxTimeMS(1000),
    Candidate.exists({ _id: candidate._id, departmentId, updatedAt: candidate.updatedAt, __v: candidate.__v ?? { $exists: false } }).maxTimeMS(1000),
    Job.exists({ _id: job._id, departmentId, updatedAt: job.updatedAt, __v: job.__v ?? { $exists: false } }).maxTimeMS(1000),
  ]);
  if (!current || !currentCandidate || !currentJob) throw fail();
  return context;
}
module.exports = { handoffContext };
