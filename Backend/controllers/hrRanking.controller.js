const crypto = require('node:crypto'), mongoose = require('mongoose');
const { setImmediate: yieldEventLoop } = require('node:timers/promises');
const Application = require('../models/application.model'), Job = require('../models/job.model'), Candidate = require('../models/candidate.model');
const { resourceFilter, applicationParents } = require('../services/hrResourceScope.service');
const { scoreRecord, scoreResponses, jobFields } = require('../services/applicationScoreState.service');
const { fingerprints } = require('../services/applicationMatch.service');
const { decorateApplications } = require('../services/recruitmentCatalog.service');
const { verifyToken, getRolePermissions } = require('../middleware/auth.middleware');
const { clip, fields } = require('./hrPaged.controller');
const candidateFacts = 'role skills experience education certificates reviewedFields employmentHistory.title employmentHistory.start employmentHistory.end employmentHistory.ongoing cvReview.reviewStatus cvReview.version';
function scopeKey(req, jobId, size) { return crypto.createHash('sha256').update(JSON.stringify([req.user.id, req.user.role, req.user.departmentId, req.authRole.permissions, String(jobId), size])).digest('hex'); }
function signature(body) { if (!process.env.JWT_SECRET) throw Error('JWT configuration is required.'); return crypto.createHmac('sha256', process.env.JWT_SECRET).update('hr-ranking-v1:' + body).digest('base64url'); }
function cursorToken(value) { const body = Buffer.from(JSON.stringify(value)).toString('base64url'); return body + '.' + signature(body); }
function compare(a, b) { return b.score - a.score || b.at.localeCompare(a.at) || b.id.localeCompare(a.id); }
function identity(row) { return { score: row.scoreStatus === 'calculated' && Number.isFinite(row.score) && row.score >= 0 && row.score <= 100 ? row.score : -1, at: new Date(row.createdAt || 0).toISOString(), id: String(row._id) }; }
function decode(token, key) {
  if (typeof token !== 'string' || token.length > 1024 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)) throw Error('Invalid ranking cursor.');
  const [body, mac] = token.split('.'), wanted = signature(body);
  if (mac.length !== wanted.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(wanted))) throw Error('Invalid ranking cursor.');
  const value = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (value.scope !== key || !Number.isInteger(value.page) || value.page < 2 || !/^[a-f0-9]{64}$/.test(value.cohort) || !Number.isFinite(value.expires) || value.expires <= Date.now() || value.expires > Date.now() + 600000 || !value.after || !mongoose.isObjectIdOrHexString(value.after.id) || !Number.isFinite(value.after.score) || value.after.score < -1 || value.after.score > 100 || typeof value.after.at !== 'string' || !Number.isFinite(Date.parse(value.after.at)) || new Date(value.after.at).toISOString() !== value.after.at) throw Error('Cursor does not match this ranking.');
  return value;
}
function retain(top, value, limit) {
  if (top.length === limit && compare(value, top.at(-1)) >= 0) return;
  let low = 0, high = top.length;
  while (low < high) { const mid = (low + high) >>> 1; if (compare(value, top[mid]) < 0) high = mid; else low = mid + 1; }
  top.splice(low, 0, value); if (top.length > limit) top.pop();
}
exports.get = async (req, res, next) => {
  let size, key, position;
  try {
    for (const [name, value] of Object.entries(req.query)) if (!['jobId', 'pageSize', 'after'].includes(name) || (typeof value !== 'string' || value.length > (name === 'after' ? 1024 : 24))) throw Error('Invalid ranking filter.');
    if (!mongoose.isObjectIdOrHexString(req.query.jobId)) throw Error('A specific vacancy is required.');
    if (req.query.pageSize !== undefined && !/^\d{1,3}$/.test(req.query.pageSize)) throw Error('Invalid ranking page size.');
    size = req.query.pageSize === undefined ? 30 : Number(req.query.pageSize);
    if (!Number.isInteger(size) || size < 1 || size > 100) throw Error('Invalid ranking page size.');
    key = scopeKey(req, req.query.jobId, size); position = req.query.after ? decode(req.query.after, key) : null;
  } catch (error) { return res.status(400).json({ message: error.message, code: 'INVALID_RANKING_REQUEST' }); }
  res.set('Cache-Control', 'private, no-store');
  let cursor, disconnected = false;
  const close = () => { if (!res.writableEnded) { disconnected = true; if (cursor) void cursor.close().catch(() => {}); } };
  res.once('close', close);
  const deadline = Date.now() + 10000;
  const checkDeadline = () => { if (disconnected || Date.now() > deadline) throw Object.assign(new Error('Ranking timed out. Narrow the vacancy and retry.'), { code: 'RANKING_TIMEOUT', status: 503 }); };
  const changed = () => res.status(409).json({ message: 'Ranking changed. Restart from the first page.', code: 'RANKING_CHANGED' });
  try {
    const job = await Job.findOne({ $and: [{ _id: req.query.jobId }, resourceFilter(req, 'recruitment')] }).select(jobFields).maxTimeMS(5000).lean();
    if (!job) return res.status(404).json({ message: 'Vacancy not found.' });
    const top = [], hash = crypto.createHash('sha256'); let total = 0;
    const candidateScope = resourceFilter(req, 'candidate');
    async function consume(batch) {
      checkDeadline();
      const candidates = candidateScope._id?.$in?.length === 0 ? [] : await Candidate.find({ $and: [candidateScope, { _id: { $in: batch.map(row => row.candidateId) } }] }).select(candidateFacts).maxTimeMS(Math.max(1, Math.min(5000, deadline - Date.now()))).lean();
      const byId = new Map(candidates.map(c => [String(c._id), c]));
      for (const [index, row] of batch.entries()) {
        const current = scoreRecord(row, job, byId.get(String(row.candidateId))), order = identity(current);
        total++; hash.update(JSON.stringify([order, current.scoreStatus, row.__v || 0, row.updatedAt || null]));
        if (!position || compare(order, position.after) > 0) retain(top, order, size + 1);
        if (index % 32 === 0) { await yieldEventLoop(); checkDeadline(); }
      }
    }
    cursor = Application.find({ $and: [resourceFilter(req, 'application'), { jobId: job._id }] }).select('candidateId scoreStatus matching.version matching.jobHash matching.candidateHash matching.score matching.scoreStatus createdAt updatedAt __v').sort({ _id: 1 }).maxTimeMS(10000).lean().cursor({ batchSize: 250 });
    let batch = [];
    for await (const row of cursor) { checkDeadline(); batch.push(row); if (batch.length === 250) { await consume(batch); batch = []; } }
    if (batch.length) await consume(batch);
    const cohort = hash.digest('hex'); if (position && position.cohort !== cohort) return changed();
    // Do not complete a long scan with an obsolete actor or cached Role grant.
    await verifyToken(req, res, () => {}); if (res.headersSent || disconnected) return;
    req.authRole = { permissions: await getRolePermissions(req.user.role) };
    const grant = req.authRole.permissions.find(p => (p.resource === 'application' || p.resource === '*') && (p.action === 'read' || p.action === '*'));
    if (!grant || grant.scope === 'none') return res.status(403).json({ message: 'Application read permission is required.' });
    if (scopeKey(req, req.query.jobId, size) !== key) return changed();
    const latestJob = await Job.findOne({ $and: [{ _id: job._id }, resourceFilter(req, 'recruitment')] }).select(jobFields).maxTimeMS(5000).lean();
    if (!latestJob) return res.status(404).json({ message: 'Vacancy not found.' });
    if (fingerprints(job, {}).jobHash !== fingerprints(latestJob, {}).jobHash) return changed();
    const hasMore = top.length > size, selected = top.slice(0, size), ids = selected.map(order => order.id);
    const rows = await Application.find({ $and: [resourceFilter(req, 'application'), { _id: { $in: ids } }] }).select(fields.applications).maxTimeMS(5000).lean();
    const parents = applicationParents(req); parents[0].select = 'name role'; parents[1].select = 'title status brandId branchId';
    const checked = await scoreResponses(req, await Application.populate(rows, parents.map(p => ({ ...p, options: { lean: true } }))));
    const byId = new Map(checked.map(row => [String(row._id), row]));
    if (selected.some(order => !byId.has(order.id) || compare(order, identity(byId.get(order.id))) !== 0)) return changed();
    checkDeadline();
    const ordered = selected.map(order => byId.get(order.id)), page = position?.page || 1;
    const items = await decorateApplications(req, ordered); checkDeadline();
    return res.json({ version: 'hr-page-v1', items: items.map(row => clip(row, 'applications')), page, pageSize: size, total, hasMore, nextCursor: hasMore ? cursorToken({ scope: key, cohort, after: selected.at(-1), page: page + 1, expires: Date.now() + 600000 }) : null });
  } catch (error) { if (disconnected || res.destroyed) return; if (error.code === 50 || error.code === 'RANKING_TIMEOUT') return res.status(503).json({ code: 'RANKING_TIMEOUT', message: 'Ranking timed out. Retry with this vacancy.' }); next(error); }
  finally { res.off('close', close); if (cursor) await cursor.close().catch(() => {}); }
};
