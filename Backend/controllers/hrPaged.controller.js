const Branch = require('../models/recruitmentBranch.model');
const Brand = require('../models/recruitmentBrand.model');
const { defaultBrands } = require('../services/recruitmentCatalog.service');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Job = require('../models/job.model'), Candidate = require('../models/candidate.model'), Application = require('../models/application.model');
const { resourceFilter, aggregateResourceFilter, applicationParents } = require('../services/hrResourceScope.service');
const { scoreResponses } = require('../services/applicationScoreState.service');
const { decorateJobs, decorateApplications } = require('../services/recruitmentCatalog.service');
const resources = { jobs: 'recruitment', candidates: 'candidate', applications: 'application', branches: 'recruitment', brands: 'recruitment' };
const models = { jobs: Job, candidates: Candidate, applications: Application, branches: Branch };
const fields = {
  branches: 'code name brandId kind location status createdAt updatedAt',
  jobs: 'requiredSkills title department location type status brandId branchId experienceYears createdAt updatedAt',
  candidates: 'experience name role status email phone skills cvUrl cvOriginal cvReview.version cvReview.processingStatus cvReview.reviewStatus createdAt updatedAt',
  applications: 'jobId candidateId status substatus processingState interview nextAction assignedTo source score scoreStatus matching.version matching.calculatedAt matching.dataCoverage matching.reason matching.score matching.scoreStatus matching.jobHash matching.candidateHash __v createdAt updatedAt',
};
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function parameters(req, kind) {
  const q = req.query, extra = {}, resource = resources[kind];
  for (const [key, value] of Object.entries(q)) if (!['q', 'page', 'pageSize', 'sort', 'status', 'brandId', 'branchId', 'jobId', 'candidateId', 'after', 'excludeJobId'].includes(key) || typeof value !== 'string' || value.length > (key === 'after' ? 320 : 80)) throw Error('Invalid page filter.');
  const page = q.page === undefined ? 1 : Number(q.page), pageSize = q.pageSize === undefined ? 30 : Number(q.pageSize), sort = q.sort || 'newest';
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 || !['newest', 'name'].includes(sort) || kind === 'applications' && sort !== 'newest') throw Error('Invalid pagination or sort.');
  for (const key of ['branchId', 'jobId', 'candidateId', 'excludeJobId']) if (q[key]) { if (!mongoose.isObjectIdOrHexString(q[key])) throw Error('Invalid resource filter.'); if (key !== 'excludeJobId') extra[key] = new mongoose.Types.ObjectId(q[key]); }
  if (kind === 'brands' && (q.status || q.brandId || q.branchId || q.jobId || q.candidateId || q.excludeJobId || q.after) || kind === 'branches' && (q.branchId || q.jobId || q.candidateId || q.excludeJobId) || kind === 'jobs' && (q.jobId || q.candidateId || q.excludeJobId) || kind === 'candidates' && (q.brandId || q.branchId || q.jobId || q.candidateId) || kind === 'applications' && q.excludeJobId) throw Error('Filter does not apply to this resource.');
  if (q.brandId) { if (q.brandId !== 'unset' && !/^[a-z0-9][a-z0-9-]{0,59}$/.test(q.brandId)) throw Error('Invalid brand filter.'); if (kind === 'jobs' || kind === 'branches') extra.brandId = q.brandId === 'unset' ? null : q.brandId; }
  if (q.status) {
    const choices = kind === 'branches' ? ['active', 'inactive'] : kind === 'jobs' ? ['Open', 'Closed', 'Draft'] : kind === 'candidates' ? ['new', 'applied', 'screening', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'] : ['Applied', 'Screening', 'Shortlisted', 'Interview', 'Offered', 'Hired', 'Rejected', 'Processing'];
    if (!choices.includes(q.status)) throw Error('Invalid status filter.');
    if (kind === 'applications' && q.status === 'Processing') { extra.status = 'Applied'; extra.processingState = { $in: ['queued', 'running'] }; } else extra.status = q.status;
  }
  const search = q.q?.trim() ? new RegExp(escape(q.q.trim()), 'i') : null;
  if (search && kind !== 'applications') extra.$or = (kind === 'brands' ? ['name'] : kind === 'branches' ? ['name', 'code', 'location'] : kind === 'jobs' ? ['title', 'department', 'location', 'requiredSkills'] : ['name', 'role', 'skills']).map(field => ({ [field]: search }));
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify([req.user.id, req.user.departmentId, req.authRole.permissions, resource, { ...q, page: undefined, after: undefined }])).digest('hex');
  let after;
  if (q.after) {
    if (sort !== 'newest' || page !== 1 || !/^[A-Za-z0-9_-]{16,320}$/.test(q.after)) throw Error('Invalid cursor.');
    const decoded = JSON.parse(Buffer.from(q.after, 'base64url').toString('utf8'));
    if (decoded.scope !== fingerprint || !mongoose.isObjectIdOrHexString(decoded.id) || typeof decoded.at !== 'string' || !Number.isFinite(Date.parse(decoded.at)) || new Date(decoded.at).toISOString() !== decoded.at) throw Error('Cursor does not match this request.');
    after = { $or: [{ createdAt: { $lt: new Date(decoded.at) } }, { createdAt: new Date(decoded.at), _id: { $lt: new mongoose.Types.ObjectId(decoded.id) } }] };
  }
  return { page, pageSize, sort, extra, search, after, fingerprint };
}
function clip(record, kind) {
  const row = { ...(record.toObject?.() || record) };
  for (const key of ['title', 'name', 'role', 'department', 'location', 'cvUrl']) if (typeof row[key] === 'string') row[key] = row[key].slice(0, 200);
  if (typeof row.email === 'string') row.email = row.email.slice(0, 254);
  if (typeof row.phone === 'string') row.phone = row.phone.slice(0, 80);
  if (typeof row.type === 'string') row.type = row.type.slice(0, 50);
  if (Array.isArray(row.requiredSkills)) { row.requiredSkillsCount = row.requiredSkills.length; row.requiredSkills = row.requiredSkills.slice(0, 12).map(s => String(s).slice(0, 120)); }
  if (Array.isArray(row.skills)) { row.skillsCount = row.skills.length; row.skills = row.skills.slice(0, 12).map(s => String(s).slice(0, 120)); }
  if (kind === 'applications') {
    if (row.matching) row.matching = { version: row.matching.version, calculatedAt: row.matching.calculatedAt, dataCoverage: row.matching.dataCoverage, reason: row.matching.reason, criteria: [], summary: true };
    if (row.jobId && typeof row.jobId === 'object') row.jobId = clip(row.jobId, 'jobs');
    if (row.candidateId && typeof row.candidateId === 'object') row.candidateId = clip(row.candidateId, 'candidates');
    if (row.source) row.source = { key: row.source.key, receivedAt: row.source.receivedAt };
    if (row.interview) row.interview = Object.fromEntries(['startsAt', 'timezone', 'durationMinutes', 'interviewerId', 'result'].filter(k => row.interview[k] !== undefined).map(k => [k, row.interview[k]]));
    if (row.nextAction) row.nextAction = { kind: row.nextAction.kind, dueAt: row.nextAction.dueAt, timezone: row.nextAction.timezone };
  }
  if (row.cvOriginal) row.cvOriginal = { originalName: String(row.cvOriginal.originalName || '').slice(0, 200), mimeType: String(row.cvOriginal.mimeType || '').slice(0, 120), size: row.cvOriginal.size, sha256: row.cvOriginal.sha256 };
  if (row.cvReview) row.cvReview = { version: String(row.cvReview.version || '').slice(0, 40), processingStatus: row.cvReview.processingStatus, reviewStatus: row.cvReview.reviewStatus };
  return row;
}
function lookup(req, Model, field, as, projection, extra = {}) {
  return { $lookup: { from: Model.collection.name, let: { parentId: '$' + field }, pipeline: [{ $match: { $and: [{ $expr: { $eq: ['$_id', '$$parentId'] } }, aggregateResourceFilter(req, Model === Job ? 'recruitment' : 'candidate'), extra] } }, { $project: projection }], as } };
}
exports.list = kind => async (req, res, next) => {
  let p; try { p = parameters(req, kind); } catch (e) { return res.status(400).json({ message: e.message }); }
  const Model = models[kind], scope = resourceFilter(req, resources[kind]);
  try {
    if (kind === 'applications') for (const [key, Parent, resource] of [['jobId', Job, 'recruitment'], ['candidateId', Candidate, 'candidate']]) {
      if (req.query[key] && !await Parent.exists({ $and: [{ _id: req.query[key] }, resourceFilter(req, resource)] })) return res.status(404).json({ message: 'Parent resource not found.' });
    }
    if (kind === 'candidates' && req.query.excludeJobId && !await Job.exists({ $and: [{ _id: req.query.excludeJobId }, resourceFilter(req, 'recruitment')] })) return res.status(404).json({ message: 'Vacancy not found.' });
    const baseQuery = { $and: [scope, p.extra] }, sort = p.sort === 'name' ? { [kind === 'jobs' ? 'title' : 'name']: 1, _id: 1 } : { createdAt: -1, _id: -1 };
    let items, total;
    if (kind === 'candidates' && req.query.excludeJobId) {
      // Anti-join only readable links. No unbounded $nin list or hidden-link oracle.
      const pipeline = [{ $match: { $and: [aggregateResourceFilter(req, 'candidate'), p.extra] } }, { $project: { createdAt: 1, name: 1 } },
        { $lookup: { from: Application.collection.name, let: { id: '$_id' }, pipeline: [{ $match: { $and: [aggregateResourceFilter(req, 'application'), { jobId: new mongoose.Types.ObjectId(req.query.excludeJobId) }, { $expr: { $eq: ['$candidateId', '$$id'] } }] } }, { $project: { _id: 1 } }, { $limit: 1 }], as: 'linked' } }, { $match: { 'linked.0': { $exists: false } } },
        { $facet: { total: [{ $count: 'count' }], items: [...(p.after ? [{ $match: p.after }] : []), { $sort: sort }, { $skip: (p.page - 1) * p.pageSize }, { $limit: p.pageSize + 1 }, { $project: { _id: 1 } }] } }];
      const [data] = await Candidate.aggregate(pipeline).option({ maxTimeMS: 5000 }); total = data.total[0]?.count || 0;
      const ids = data.items.map(r => r._id), rows = await Candidate.find({ $and: [scope, { _id: { $in: ids } }] }).select(fields.candidates).lean();
      const byId = new Map(rows.map(r => [String(r._id), r])); items = ids.map(id => byId.get(String(id))).filter(Boolean);
    } else if (kind === 'applications' && (p.search || req.query.brandId || req.query.branchId)) {
      const appExtra = { ...p.extra }; delete appExtra.branchId;
      const jobExtra = { ...(req.query.brandId ? { brandId: req.query.brandId === 'unset' ? null : req.query.brandId } : {}), ...(req.query.branchId ? { branchId: new mongoose.Types.ObjectId(req.query.branchId) } : {}) };
      const pipeline = [{ $match: { $and: [aggregateResourceFilter(req, 'application'), appExtra] } }, { $project: { jobId: 1, candidateId: 1, createdAt: 1 } }, lookup(req, Job, 'jobId', 'jobMeta', { title: 1 }, jobExtra), lookup(req, Candidate, 'candidateId', 'candidateMeta', { name: 1, role: 1 })];
      if (req.query.brandId || req.query.branchId) pipeline.push({ $match: { 'jobMeta.0': { $exists: true } } });
      if (p.search) pipeline.push({ $match: { $or: [{ 'jobMeta.title': p.search }, { 'candidateMeta.name': p.search }, { 'candidateMeta.role': p.search }] } });
      const [data] = await Application.aggregate([...pipeline, { $facet: { total: [{ $count: 'count' }], items: [...(p.after ? [{ $match: p.after }] : []), { $sort: sort }, { $skip: (p.page - 1) * p.pageSize }, { $limit: p.pageSize + 1 }, { $project: { _id: 1 } }] } }]).option({ maxTimeMS: 5000 });
      total = data.total[0]?.count || 0;
      const ids = data.items.map(r => r._id), rows = await Application.find({ $and: [scope, { _id: { $in: ids } }] }).select(fields.applications).lean();
      const byId = new Map(rows.map(r => [String(r._id), r])); items = ids.map(id => byId.get(String(id))).filter(Boolean);
    } else {
      [items, total] = await Promise.all([Model.find({ $and: [...baseQuery.$and, ...(p.after ? [p.after] : [])] }).select(fields[kind]).sort(sort).skip((p.page - 1) * p.pageSize).limit(p.pageSize + 1).maxTimeMS(5000).lean(), Model.countDocuments(baseQuery).maxTimeMS(5000)]);
    }
    const hasMore = items.length > p.pageSize; items = items.slice(0, p.pageSize); const last = items.at(-1);
    const nextCursor = hasMore && p.sort === 'newest' && last?.createdAt ? Buffer.from(JSON.stringify({ at: new Date(last.createdAt).toISOString(), id: String(last._id), scope: p.fingerprint })).toString('base64url') : null;
    if (kind === 'jobs') items = await decorateJobs(req, items);
    if (kind === 'applications') {
      const parents = applicationParents(req); parents[0].select = 'name role'; parents[1].select = 'title status brandId branchId';
      items = await Application.populate(items, parents.map(parent => ({ ...parent, options: { lean: true } }))); items = await decorateApplications(req, await scoreResponses(req, items));
    }
    res.json({ version: 'hr-page-v1', items: items.map(row => clip(row, kind)), page: p.page, pageSize: p.pageSize, total, hasMore, nextCursor });
  } catch (e) { if (e.code === 50) return res.status(503).json({ message: 'Query timed out. Narrow filters and retry.' }); next(e); }
};

// Brands are a shared catalog under the existing recruitment.read contract.
// Defaults are immutable in code; reads never seed or rewrite stored records.
exports.brands = async (req, res, next) => {
  let p; try { p = parameters(req, 'brands'); } catch (e) { return res.status(400).json({ message: e.message }); }
  try {
    const defaults = defaultBrands.filter(b => !p.search || p.search.test(b.name));
    const query = { _id: { $nin: defaultBrands.map(b => b.id) }, ...(p.search ? { name: p.search } : {}) };
    const start = (p.page - 1) * p.pageSize, fixed = defaults.slice(start, start + p.pageSize);
    const [custom, count] = await Promise.all([
      fixed.length === p.pageSize ? [] : Brand.find(query).select('name active').sort({ name: 1, _id: 1 }).skip(Math.max(0, start - defaults.length)).limit(p.pageSize - fixed.length).maxTimeMS(5000).lean(),
      Brand.countDocuments(query).maxTimeMS(5000),
    ]);
    const items = [...fixed, ...custom.map(b => ({ id: b._id, name: b.name, active: b.active }))], total = defaults.length + count;
    res.json({ version: 'hr-page-v1', items, page: p.page, pageSize: p.pageSize, total, hasMore: start + items.length < total, nextCursor: null });
  } catch (e) { if (e.code === 50) return res.status(503).json({ message: 'Query timed out. Narrow filters and retry.' }); next(e); }
};

// Internal shared page projection; ranking retains the established list DTO.
exports.clip = clip; exports.fields = fields;
