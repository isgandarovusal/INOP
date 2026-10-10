const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Application = require('../models/application.model');
const User = require('../models/user.model');
const { resourceFilter } = require('../services/hrResourceScope.service');
const { applicationParents } = require('../services/hrResourceScope.service');
const { scoreResponses, scopedScoreRecords } = require('../services/applicationScoreState.service');
const { decorateApplications } = require('../services/recruitmentCatalog.service');
const { prepareWorkflow, workflowSnapshot, commandHash } = require('../services/applicationLifecycle.service');
const { recordActivity } = require('../services/activityLog.service');
const { preparePlacement } = require('../services/applicationOrdering.service');
const Job = require('../models/job.model');
const { verifyToken, getRolePermissions } = require('../middleware/auth.middleware');
const { getDataScope } = require('../middleware/dataScope.middleware');
const query = req => ({ $and: [{ _id: req.params.id }, req.dataScope, ...(req.body?.placement !== undefined ? [resourceFilter(req, 'application')] : [])] });
async function response(req) { const row = await Application.findOne(query(req)).select('-events').populate(applicationParents(req)).lean(); return row && (await decorateApplications(req, await scoreResponses(req, [row])))[0]; }
exports.update = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid Application id.' });
  try {
    if (req.body.placement !== undefined) {
      // Replays must also obey current independent read/update/parent grants.
      await verifyToken(req, res, () => {}); if (res.headersSent) return;
      req.authRole = { permissions: await getRolePermissions(req.user.role) };
      const grant = req.authRole.permissions.find(p => (p.resource === 'application' || p.resource === '*') && (p.action === 'update' || p.action === '*'));
      req.permission = grant && { resource: 'application', action: 'update', scope: grant.scope };
      req.dataScope = getDataScope(req);
      if (req.dataScope === null) return res.status(403).json({ message: 'Application update permission is required.' });
    }
    const current = await Application.findOne(query(req)).lean(); if (!current) return res.status(404).json({ message: 'Application not found.' });
    if (req.body.placement !== undefined && !await Job.exists({ $and: [{ _id: current.jobId }, resourceFilter(req, 'recruitment')] }).maxTimeMS(5000)) return res.status(404).json({ message: 'Vacancy not found.' });
    const key = req.body.commandId, hash = commandHash(req.body);
    if (key !== undefined && (typeof key !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(key))) return res.status(400).json({ message: 'Invalid command id.' });
    const replay = key && current.events?.find(e => e.commandId === key);
    if (replay) {
      if (replay.commandHash !== hash || replay.actor !== req.user.id) return res.status(409).json({ message: 'Command id was already used for another action.' });
      return res.json(await response(req));
    }
    if (req.body.expectedRevision !== undefined && (!Number.isInteger(req.body.expectedRevision) || req.body.expectedRevision < 0)) return res.status(400).json({ message: 'Invalid revision.' });
    if (req.body.expectedRevision !== undefined && req.body.expectedRevision !== (current.__v || 0)) return res.status(409).json({ message: 'Application changed. Reload before retrying.', code: 'REVISION_CONFLICT' });
    const update = await prepareWorkflow(req, current);
    if (req.body.placement !== undefined) {
      update.boardOrder = await preparePlacement(req, current, update.status || current.status);
    }
    const before = workflowSnapshot(current), after = workflowSnapshot({ ...current, ...update });
    if (JSON.stringify(before) === JSON.stringify(after)) return res.json(await response(req));
    if ((current.events?.length || 0) >= 1000) return res.status(409).json({ message: 'Application history needs archiving before further changes.', code: 'HISTORY_LIMIT' });
    const event = { id: crypto.randomUUID(), type: update.status && update.status !== current.status ? 'status' : Object.keys(update).length === 1 && update.boardOrder ? 'reorder' : 'workflow', actor: req.user.id, at: new Date(), revision: (current.__v || 0) + 1,
      before, after, reason: req.body.reason?.trim() || '', ...(key ? { commandId: key, commandHash: hash } : {}) };
    const rescheduled = update.interview && (!current.interview || String(update.interview.startsAt) !== String(current.interview.startsAt) || update.interview.timezone !== current.interview.timezone || String(update.interview.interviewerId) !== String(current.interview.interviewerId));
    if ((update.status && update.status !== current.status || rescheduled) && ['Interview', 'Offered'].includes(after.status)) event.delivery = { state: 'pending', attempts: 0 };
    if (mongoose.mongo.BSON.calculateObjectSize({ ...current, ...update, events: [...(current.events || []), event] }) > 8 * 1024 * 1024) return res.status(409).json({ message: 'Application history needs archiving before further changes.', code: 'HISTORY_LIMIT' });
    const updated = await Application.findOneAndUpdate({ $and: [query(req), { __v: current.__v ?? { $exists: false } }] }, { $set: update, $push: { events: event }, $inc: { __v: 1 } }, { returnDocument: 'after', runValidators: true });
    if (!updated) return res.status(409).json({ message: 'Application changed. Reload before retrying.', code: 'REVISION_CONFLICT' });
    try { await recordActivity({ req, action: 'update', entityType: 'application', entityId: current._id, description: `Application workflow updated (${before.status} → ${after.status})` }); } catch { /* authoritative event is atomically persisted */ }
    return res.json(await response(req));
  } catch (e) { if (e.code === 50) return res.status(503).json({ message: 'Board query timed out. Reload and retry.', code: 'ORDER_TIMEOUT' }); if (e.status) return res.status(e.status).json({ message: e.message, code: e.code }); next(e); }
};
exports.history = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid Application id.' });
  const limit = req.query.limit === undefined ? 50 : Number(req.query.limit), offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) return res.status(400).json({ message: 'Invalid history pagination.' });
  try { const row = await Application.findOne(query(req)).select('events jobId candidateId').lean(); if (!row) return res.status(404).json({ message: 'Application not found.' });
    const { jobs, candidates } = await scopedScoreRecords(req, [row]); const canReadScore = jobs.has(String(row.jobId)) && candidates.has(String(row.candidateId));
    const events = [...(row.events || [])].reverse(); res.json({ total: events.length, items: events.slice(offset, offset + limit).map(({ commandHash: _hash, commandId: _key, delivery, ...event }) => {
      if (delivery) event.delivery = Object.fromEntries(['state', 'attempts', 'code', 'at', 'sentAt', 'nextAttemptAt'].filter(k => delivery[k] !== undefined).map(k => [k, delivery[k]]));
      return event.type === 'score' && !canReadScore ? { ...event, before: { score: null, scoreStatus: 'restricted' }, after: { score: null, scoreStatus: 'restricted' }, reason: '' } : event;
    }), hasMore: offset + limit < events.length });
  } catch (e) { next(e); }
};
exports.interviewers = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid Application id.' });
  try {
    if (!await Application.exists(query(req))) return res.status(404).json({ message: 'Application not found.' });
    const users = await User.find({ $and: [{ isActive: true }, { $or: [{ _id: req.user.id }, resourceFilter(req, 'user')] }] }).select('_id name').sort({ name: 1 }).limit(50).lean();
    res.json(users.map(u => ({ id: String(u._id), name: u.name })));
  } catch (e) { next(e); }
};
