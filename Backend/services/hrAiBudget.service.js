const crypto = require('node:crypto');
const Usage = require('../models/hrAiUsage.model');
const fail = code => Object.assign(new Error('AI request limit or budget reached.'), { code, status: 429 });
exports.reserve = async ({ provider, actorId, micros, limitMicros, actorLimit, at = new Date() }) => {
  if (!/^[a-z0-9-]{1,40}$/.test(provider || '') || !/^[a-f0-9]{24}$/.test(actorId || '') || !Number.isSafeInteger(micros) || micros < 1 || !Number.isSafeInteger(limitMicros) || limitMicros < 1 || !Number.isInteger(actorLimit) || actorLimit < 1 || actorLimit > 100 || !(at instanceof Date) || !Number.isFinite(at.getTime())) throw Object.assign(new Error('Invalid AI reservation.'), { code: 'AI_INVALID_CONTEXT', status: 400 });
  const day = at.toISOString().slice(0, 10), globalId = `${provider}:${day}`, actor = crypto.createHash('sha256').update(actorId).digest('hex');
  const actorIdKey = `${provider}:${day}:${actor}`, expiresAt = new Date(at.getTime() + 90 * 86400000);
  for (const id of [globalId, actorIdKey]) {
    try { await Usage.updateOne({ _id: id }, { $setOnInsert: { reservedMicros: 0, requests: 0, expiresAt } }, { upsert: true, setDefaultsOnInsert: false, maxTimeMS: 1000 }); }
    catch (error) { if (error.code !== 11000) throw error; }
  }
  const actorGrant = await Usage.findOneAndUpdate({ _id: actorIdKey, requests: { $lt: actorLimit } }, { $inc: { requests: 1 } }, { returnDocument: 'after', maxTimeMS: 1000 }).lean();
  if (!actorGrant) throw fail('AI_RATE_LIMIT');
  const budget = await Usage.findOneAndUpdate({ _id: globalId, reservedMicros: { $lte: limitMicros - micros } }, { $inc: { reservedMicros: micros, requests: 1 } }, { returnDocument: 'after', maxTimeMS: 1000 }).lean();
  if (!budget) throw fail('AI_BUDGET_LIMIT');
  // Reservations remain conservative after provider failures/unknown billing.
  // No release below the worst-case reservation and no inferred free retry.
  let finished = false;
  return { async finish({ ok, inputTokens = 0, outputTokens = 0 }) {
    if (finished) return;
    if (typeof ok !== 'boolean' || !Number.isSafeInteger(inputTokens) || inputTokens < 0 || !Number.isSafeInteger(outputTokens) || outputTokens < 0) throw Object.assign(new Error('Invalid AI usage.'), { code: 'AI_INVALID_CONTEXT', status: 400 });
    finished = true;
    await Usage.updateOne({ _id: globalId }, { $inc: { [ok ? 'successes' : 'failures']: 1, inputTokens, outputTokens } }, { maxTimeMS: 1000 });
  } };
};
