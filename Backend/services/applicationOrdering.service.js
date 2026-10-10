const mongoose = require('mongoose');
const { generateKeyBetween } = require('fractional-indexing');
const Application = require('../models/application.model');
const Job = require('../models/job.model');
const { resourceFilter, aggregateResourceFilter } = require('./hrResourceScope.service');

const MAX_KEY = 512;
function failure(message, status = 400, code = 'INVALID_PLACEMENT') { return Object.assign(new Error(message), { status, code }); }
function orderKey(row) { return row.boardOrder || `a0${row._id}V`; }
const orderExpression = { $ifNull: ['$boardOrder', { $concat: ['a0', { $toString: '$_id' }, 'V'] }] };
function placementKey(lower, upper, id) {
  // A per-Application suffix makes simultaneous insertions in one gap unique.
  // Verify strict bounds: adding a suffix to a prefix of upper can exceed upper.
  for (let attempts = 0; attempts < 4; attempts++) {
    const midpoint = generateKeyBetween(lower, upper), key = midpoint + String(id) + 'V';
    if (key.length > MAX_KEY) throw failure('Card order needs compaction.', 409, 'ORDER_LIMIT');
    if ((!lower || lower < key) && (!upper || key < upper)) return key;
    upper = midpoint;
  }
  throw failure('Card order needs compaction.', 409, 'ORDER_LIMIT');
}
function stageFilter(status) {
  return status === 'processing' ? { status: 'Applied', processingState: { $in: ['queued', 'running'] } }
    : status === 'Applied' ? { status, processingState: { $nin: ['queued', 'running'] } } : { status };
}
function parseAnchor(value, target) {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== 'expectedRevision,id' || !mongoose.isObjectIdOrHexString(value.id) || String(value.id) === String(target) || !Number.isInteger(value.expectedRevision) || value.expectedRevision < 0) throw failure('Invalid placement anchor.');
  return { id: new mongoose.Types.ObjectId(value.id), revision: value.expectedRevision };
}
async function preparePlacement(req, current, destination) {
  const placement = req.body.placement;
  if (!placement || typeof placement !== 'object' || Array.isArray(placement) || Object.keys(placement).sort().join(',') !== 'after,before') throw failure('A before and after anchor (or null) is required.');
  if (!Number.isInteger(req.body.expectedRevision) || req.body.expectedRevision < 0) throw failure('Reordering requires the current Application revision.');
  if (req.body.boardOrder !== undefined) throw failure('Card order is server-managed.');
  const before = parseAnchor(placement.before, current._id), after = parseAnchor(placement.after, current._id);
  if (before && after && String(before.id) === String(after.id)) throw failure('Placement anchors must be distinct.');
  if (destination === 'Applied' && ['queued', 'running'].includes(current.processingState)) throw failure('Processing cards cannot be manually ordered.', 409, 'ORDER_CONFLICT');
  const [visible, job] = await Promise.all([
    Application.exists({ $and: [{ _id: current._id }, resourceFilter(req, 'application')] }).maxTimeMS(5000),
    Job.exists({ $and: [{ _id: current.jobId }, resourceFilter(req, 'recruitment')] }).maxTimeMS(5000),
  ]);
  if (!visible || !job) throw failure('Application or vacancy not found.', 404, 'NOT_FOUND');
  const cohort = { $and: [resourceFilter(req, 'application'), { jobId: current.jobId, ...stageFilter(destination), _id: { $ne: current._id } }] };
  const anchors = await Application.find({ $and: [cohort, { _id: { $in: [before?.id, after?.id].filter(Boolean) } }] }).select('boardOrder __v').maxTimeMS(5000).lean();
  const byId = new Map(anchors.map(row => [String(row._id), row]));
  function key(anchor) {
    if (!anchor) return null;
    const row = byId.get(String(anchor.id));
    if (!row) throw failure('Placement anchor not found.', 404, 'NOT_FOUND');
    if ((row.__v || 0) !== anchor.revision) throw failure('A neighboring card changed. Reload the board.', 409, 'ORDER_CONFLICT');
    return orderKey(row);
  }
  const lower = key(before), upper = key(after);
  if (lower && upper && lower >= upper) throw failure('Card order changed. Reload the board.', 409, 'ORDER_CONFLICT');
  const bounds = {};
  if (lower) bounds.$gt = lower;
  if (upper) bounds.$lt = upper;
  const between = await Application.aggregate([
    { $match: { $and: [aggregateResourceFilter(req, 'application'), { jobId: current.jobId, ...stageFilter(destination), _id: { $ne: current._id } }] } },
    { $project: { key: orderExpression } },
    ...(Object.keys(bounds).length ? [{ $match: { key: bounds } }] : []),
    { $limit: 1 },
  ]).collation({ locale: 'simple' }).option({ maxTimeMS: 5000 });
  if (between.length) throw failure('Cards moved between the selected neighbors. Reload the board.', 409, 'ORDER_CONFLICT');
  return placementKey(lower, upper, current._id);
}
module.exports = { orderKey, orderExpression, placementKey, preparePlacement, stageFilter, MAX_KEY };
