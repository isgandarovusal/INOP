const crypto = require('node:crypto'), mongoose = require('mongoose');
const Application = require('../models/application.model'), Job = require('../models/job.model'), Candidate = require('../models/candidate.model');
const { resourceFilter, aggregateResourceFilter, applicationParents } = require('../services/hrResourceScope.service');
const { stageFilter, orderExpression, orderKey } = require('../services/applicationOrdering.service');
const { scoreResponses } = require('../services/applicationScoreState.service');
const { decorateApplications } = require('../services/recruitmentCatalog.service');
const { parameters, lookup, fields, clip } = require('./hrPaged.controller');
const { verifyToken, getRolePermissions } = require('../middleware/auth.middleware');
const stages = ['Applied', 'processing', 'Screening', 'Shortlisted', 'Interview', 'Offered', 'Hired', 'Rejected'];
const anchor = row => row ? { id: String(row._id), expectedRevision: row.__v || 0 } : null;
function signature(body) { if (!process.env.JWT_SECRET) throw Error('JWT configuration required.'); return crypto.createHmac('sha256', process.env.JWT_SECRET).update('hr-board-v1:' + body).digest('base64url'); }
function token(value) { const body = Buffer.from(JSON.stringify(value)).toString('base64url'); return body + '.' + signature(body); }
function scopeKey(req, query) { return crypto.createHash('sha256').update(JSON.stringify([req.user.id, req.user.role, req.user.departmentId, req.authRole.permissions, query])).digest('hex'); }
function decode(value, scope) {
  if (typeof value !== 'string' || value.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(value)) throw Error('Invalid board cursor.');
  const [body, mac] = value.split('.');
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(signature(body)))) throw Error('Invalid board cursor.');
  const p = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (p.scope !== scope || !Number.isInteger(p.page) || p.page < 2 || !Number.isInteger(p.revision) || p.revision < 0 || !mongoose.isObjectIdOrHexString(p.id) || typeof p.key !== 'string' || p.key.length > 512 || typeof p.at !== 'string' || !Number.isFinite(Date.parse(p.at)) || new Date(p.at).toISOString() !== p.at || !Number.isFinite(p.expires) || p.expires <= Date.now() || p.expires > Date.now() + 600000) throw Error('Cursor does not match this board.');
  return p;
}
exports.get = async (req, res, next) => {
  let p, position, stage, query, size;
  try {
    for (const [key, value] of Object.entries(req.query)) if (!['q', 'status', 'brandId', 'branchId', 'jobId', 'pageSize', 'stage', 'after'].includes(key) || typeof value !== 'string' || value.length > (key === 'after' ? 2048 : 80)) throw Error('Invalid board filter.');
    stage = req.query.stage; if (stage && !stages.includes(stage) || req.query.after && !stage) throw Error('Cursor requires a valid lane.');
    size = req.query.pageSize === undefined ? 10 : Number(req.query.pageSize);
    if (!Number.isInteger(size) || size < 1 || size > 30) throw Error('Invalid board page size.');
    query = Object.fromEntries(Object.entries(req.query).filter(([key]) => !['after', 'stage'].includes(key))); query.pageSize = String(size);
    p = parameters({ ...req, query }, 'applications');
    if (req.query.after) position = decode(req.query.after, scopeKey(req, { ...query, stage }));
  } catch (e) { return res.status(400).json({ message: e.message, code: 'INVALID_BOARD_REQUEST' }); }
  const initialScope = scopeKey(req, query), ordered = !!query.jobId;
  const changed = () => res.status(409).json({ message: 'Board changed. Reload this lane from the first page.', code: 'BOARD_CHANGED' });
  res.set('Cache-Control', 'private, no-store');
  try {
    if (query.jobId && !await Job.exists({ $and: [{ _id: query.jobId }, resourceFilter(req, 'recruitment')] }).maxTimeMS(5000)) return res.status(404).json({ message: 'Vacancy not found.' });
    const extra = { ...p.extra }; delete extra.branchId;
    const common = [{ $match: { $and: [aggregateResourceFilter(req, 'application'), extra] } }, { $project: { jobId: 1, candidateId: 1, boardOrder: 1, status: 1, processingState: 1, __v: 1, createdAt: 1 } }];
    if (p.search || query.brandId || query.branchId) {
      const jobExtra = { ...(query.brandId ? { brandId: query.brandId === 'unset' ? null : query.brandId } : {}), ...(query.branchId ? { branchId: new mongoose.Types.ObjectId(query.branchId) } : {}) };
      common.push(lookup(req, Job, 'jobId', 'jobMeta', { title: 1 }, jobExtra));
      if (query.brandId || query.branchId) common.push({ $match: { 'jobMeta.0': { $exists: true } } });
      if (p.search) common.push(lookup(req, Candidate, 'candidateId', 'candidateMeta', { name: 1, role: 1 }), { $match: { $or: [{ 'jobMeta.title': p.search }, { 'candidateMeta.name': p.search }, { 'candidateMeta.role': p.search }] } });
    }
    common.push({ $project: { status: 1, processingState: 1, __v: 1, key: orderExpression, at: { $ifNull: ['$createdAt', new Date(0)] } } });
    if (position) {
      const [boundary] = await Application.aggregate([...common, { $match: { _id: new mongoose.Types.ObjectId(position.id), ...stageFilter(stage) } }, { $limit: 1 }]).collation({ locale: 'simple' }).option({ maxTimeMS: 5000 });
      if (!boundary || (boundary.__v || 0) !== position.revision || boundary.key !== position.key || boundary.at.toISOString() !== position.at) return changed();
    }
    const requested = stage ? [stage] : stages;
    const facet = { counts: [{ $group: { _id: { $cond: [{ $and: [{ $eq: ['$status', 'Applied'] }, { $in: ['$processingState', ['queued', 'running']] }] }, 'processing', '$status'] }, count: { $sum: 1 } } }] };
    for (const lane of requested) {
      const bound = position ? ordered ? { key: { $gt: position.key } } : { $or: [{ at: { $lt: new Date(position.at) } }, { at: new Date(position.at), _id: { $lt: new mongoose.Types.ObjectId(position.id) } }] } : {};
      facet[lane] = [{ $match: { $and: [stageFilter(lane), bound] } }, { $sort: ordered ? { key: 1, _id: 1 } : { at: -1, _id: -1 } }, { $limit: size + 1 }, { $project: { key: 1, at: 1, __v: 1 } }];
    }
    const [data] = await Application.aggregate([...common, { $facet: facet }]).collation({ locale: 'simple' }).option({ maxTimeMS: 5000 });
    await verifyToken(req, res, () => {}); if (res.headersSent) return;
    req.authRole = { permissions: await getRolePermissions(req.user.role) };
    const grant = req.authRole.permissions.find(p => (p.resource === 'application' || p.resource === '*') && (p.action === 'read' || p.action === '*'));
    if (!grant || grant.scope === 'none') return res.status(403).json({ message: 'Application read permission is required.' });
    if (scopeKey(req, query) !== initialScope) return changed();
    if (query.jobId && !await Job.exists({ $and: [{ _id: query.jobId }, resourceFilter(req, 'recruitment')] }).maxTimeMS(5000)) return res.status(404).json({ message: 'Vacancy not found.' });
    const ids = requested.flatMap(lane => data[lane].slice(0, size).map(row => row._id));
    const rows = await Application.find({ $and: [resourceFilter(req, 'application'), { _id: { $in: ids } }] }).select(fields.applications).maxTimeMS(5000).lean();
    const parents = applicationParents(req); parents[0].select = 'name role'; parents[1].select = 'title status brandId branchId';
    const decorated = await decorateApplications(req, await scoreResponses(req, await Application.populate(rows, parents.map(parent => ({ ...parent, options: { lean: true } })))));
    const byId = new Map(decorated.map(row => [String(row._id), row]));
    const columns = {}, counts = new Map(data.counts.map(c => [c._id, c.count]));
    for (const lane of requested) {
      const selected = data[lane].slice(0, size), last = selected.at(-1), hasMore = data[lane].length > size;
      if (selected.some(row => !byId.has(String(row._id)) || (byId.get(String(row._id)).__v || 0) !== (row.__v || 0) || orderKey(byId.get(String(row._id))) !== row.key)) return changed();
      columns[lane] = { items: selected.map(row => clip(byId.get(String(row._id)), 'applications')), total: counts.get(lane) || 0, page: position?.page || 1, pageSize: size, hasMore,
        before: position ? { id: position.id, expectedRevision: position.revision } : null, after: anchor(data[lane][size]),
        nextCursor: hasMore && last ? token({ scope: scopeKey(req, { ...query, stage: lane }), id: String(last._id), key: last.key, revision: last.__v || 0, at: last.at.toISOString(), page: (position?.page || 1) + 1, expires: Date.now() + 600000 }) : null };
    }
    return res.json({ version: 'hr-board-v1', columns, total: data.counts.reduce((sum, c) => sum + c.count, 0), manualOrder: ordered && !query.q && !query.status && !query.brandId && !query.branchId });
  } catch (e) { if (e.code === 50) return res.status(503).json({ message: 'Board query timed out. Narrow filters and retry.', code: 'BOARD_TIMEOUT' }); next(e); }
};
