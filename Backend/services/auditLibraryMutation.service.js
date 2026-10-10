const { randomUUID } = require('node:crypto');
const AuditLibraryLock = require('../models/auditLibraryLock.model');
const { badRequest } = require('./auditPolicy.service');

const LEASE_MS = 120000;
const HEARTBEAT_MS = 20000;
const LOCK_ID = 'library';

// A shared library lock makes reference checks atomic with execution creation.
// Execution creation acquires its parent audit lease before this library lease.
function withAuditLibraryMutation(handler) {
  return async (req, res, next) => {
    if (req.auditLibraryMutationToken) return handler(req, res, next);
    let token, heartbeat, renewing = false, leaseLost = false;
    let responseBody, hasResponse = false, failure;
    const originalJson = res.json;
    try {
      const candidate = randomUUID();
      const now = new Date();
      let acquired;
      try {
        acquired = await AuditLibraryLock.findOneAndUpdate({
          _id: LOCK_ID, $or: [{ token: null }, { expiresAt: { $lte: now } }],
        }, { $set: { token: candidate, expiresAt: new Date(now.getTime() + LEASE_MS) } },
        { upsert: true, returnDocument: 'after', timestamps: false, runValidators: true }).lean();
      } catch (error) {
        // The singleton already exists and its active lease did not match.
        if (error.code === 11000) throw badRequest('Audit library is being updated; reload and retry', 409);
        throw error;
      }
      if (!acquired || acquired.token !== candidate) throw badRequest('Audit library is being updated; reload and retry', 409);
      token = candidate; req.auditLibraryMutationToken = token;
      heartbeat = setInterval(async () => {
        if (renewing) return;
        renewing = true;
        try {
          const renewed = await AuditLibraryLock.updateOne({ _id: LOCK_ID, token },
            { $set: { expiresAt: new Date(Date.now() + LEASE_MS) } }, { timestamps: false });
          if (!renewed.matchedCount) leaseLost = true;
        } catch { leaseLost = true; }
        finally { renewing = false; }
      }, HEARTBEAT_MS);
      heartbeat.unref();
      res.json = body => { responseBody = body; hasResponse = true; return res; };
      await handler(req, res, error => { failure = error; });
      if (leaseLost) failure = badRequest('Audit library operation lost its lock; reload before retrying', 503);
    } catch (error) { failure = error; }
    finally {
      clearInterval(heartbeat);
      if (token) {
        try {
          const released = await AuditLibraryLock.updateOne({ _id: LOCK_ID, token },
            { $set: { expiresAt: new Date(0) }, $unset: { token: '' } }, { timestamps: false });
          if (!released.matchedCount && !failure) failure = badRequest('Audit library operation lost its lock; reload before retrying', 503);
        } catch (error) { if (!failure) failure = error; }
      }
      delete req.auditLibraryMutationToken;
      res.json = originalJson;
    }
    if (failure) return next(failure);
    if (hasResponse) return res.json(responseBody);
  };
}
module.exports = { withAuditLibraryMutation, LEASE_MS, HEARTBEAT_MS, LOCK_ID };
