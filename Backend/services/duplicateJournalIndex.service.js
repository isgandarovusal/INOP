// Explicit operator procedure; never deletes/coalesces journal entries.
const crypto = require('node:crypto');
const NAME = 'actor_1_commandId_1', KEY = { actor: 1, commandId: 1 };
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const valid = index => index?.name === NAME && JSON.stringify(index.key) === JSON.stringify(KEY) && index.unique === true && !index.sparse && !index.partialFilterExpression && !index.expireAfterSeconds && !index.collation;
async function inspect(collection) {
  const indexes = await collection.indexes().catch(error => { if (error.code === 26) return []; throw error; });
  const conflicts = await collection.aggregate([
    { $group: { _id: { actor: '$actor', commandId: '$commandId' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }, { $limit: 101 }
  ], { maxTimeMS: 10000, allowDiskUse: false }).toArray();
  const malformed = await collection.countDocuments({ $or: [{ actor: { $not: { $type: 'objectId' } } }, { commandId: { $not: { $type: 'string' } } }, { commandId: '' }] }, { maxTimeMS: 10000 });
  return { ready: indexes.some(valid), incompatible: indexes.some(i => (i.name === NAME || JSON.stringify(i.key) === JSON.stringify(KEY)) && !valid(i)), malformed,
    conflicts: conflicts.slice(0, 100).map(v => ({ groupDigest: digest(v._id), count: v.count })), truncated: conflicts.length > 100 };
}
async function apply(collection, { writersPaused = false } = {}) {
  if (typeof collection.namespace !== 'string' || !collection.namespace.includes('.')) throw Error('A native, explicitly scoped collection is required.');
  if (!writersPaused) throw Error('Pause duplicate-review writers before applying the index.');
  const state = await inspect(collection);
  if (state.incompatible || state.malformed || state.conflicts.length || state.truncated) throw Error('Index rollout blocked: resolve data/index conflicts explicitly; no records changed.');
  const receipt = { version: 1, namespace: collection.namespace, name: NAME, keyDigest: digest(KEY), created: !state.ready };
  if (!state.ready) await collection.createIndex(KEY, { name: NAME, unique: true });
  if (!(await inspect(collection)).ready) throw Error('Index verification failed.');
  return receipt;
}
async function rollback(collection, receipt, { writersPaused = false } = {}) {
  if (typeof collection.namespace !== 'string' || !writersPaused || receipt?.version !== 1 || receipt.namespace !== collection.namespace || receipt.name !== NAME || receipt.keyDigest !== digest(KEY) || receipt.created !== true) throw Error('Rollback requires the original created-index receipt and paused writers.');
  const index = (await collection.indexes()).find(i => i.name === NAME);
  if (!valid(index)) throw Error('Index changed; automatic rollback refused.');
  await collection.dropIndex(NAME); // Metadata only; all journal records remain.
  return { dropped: NAME, recordsDeleted: 0 };
}
module.exports = { inspect, apply, rollback };
