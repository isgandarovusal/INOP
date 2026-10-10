const { randomUUID } = require('node:crypto');
const Audit = require('../models/audit.model');
const { findAuditByIdentifier, userHasAuditAccess } = require('../middleware/auditScope.middleware');
const { badRequest } = require('./auditPolicy.service');

const LEASE_MS = 120000;
const HEARTBEAT_MS = 20000;

// Serialize audit mutations across workers without requiring a replica set.
// Database timeouts must stay shorter than the lease; the running server sets 10s.
function withAuditMutation(handler) {
  return async (req, res, next) => {
    if (req.auditMutationToken) return handler(req, res, next);
    let auditId, token, heartbeat, renewing = false, leaseLost = false;
    let responseBody, hasResponse = false, failure;
    const originalJson = res.json;
    try {
      const audit = req.audit || await findAuditByIdentifier(req.params?.auditId || req.params?.id || req.body?.auditId);
      if (!audit) throw badRequest('Audit not found', 404);
      if (!await userHasAuditAccess({ ...req, audit }, audit._id)) throw badRequest('Audit access denied', 403);
      auditId = audit._id; token = randomUUID();
      const now = new Date();
      const locked = await Audit.findOneAndUpdate({
        _id: auditId, deletedAt: null, status: { $nin: ['completed', 'cancelled'] },
        $or: [{ mutationLock: null }, { 'mutationLock.expiresAt': { $lte: now } }],
      }, { $set: { mutationLock: { token, expiresAt: new Date(now.getTime() + LEASE_MS) } } },
      { returnDocument: 'after', timestamps: false }).select('_id id auditorId createdBy departmentId status auditType updatedAt').lean();
      if (!locked) { token = null; throw badRequest('Audit is closed or another operation is in progress; reload and retry', 409); }
      req.audit = locked; req.auditMutationToken = token;
      heartbeat = setInterval(async () => {
        if (renewing) return;
        renewing = true;
        try {
          const renewed = await Audit.updateOne({ _id: auditId, 'mutationLock.token': token },
            { $set: { 'mutationLock.expiresAt': new Date(Date.now() + LEASE_MS) } }, { timestamps: false });
          if (!renewed.matchedCount) leaseLost = true;
        } catch { leaseLost = true; }
        finally { renewing = false; }
      }, HEARTBEAT_MS);
      heartbeat.unref();
      res.json = body => { responseBody = body; hasResponse = true; return res; };
      await handler(req, res, error => { failure = error; });
      if (leaseLost) failure = badRequest('Audit operation lost its lock; reload before retrying', 503);
    } catch (error) { failure = error; }
    finally {
      clearInterval(heartbeat);
      if (token && auditId) {
        try {
          const released = await Audit.updateOne({ _id: auditId, 'mutationLock.token': token },
            { $unset: { mutationLock: '' } }, { timestamps: false });
          if (!released.matchedCount && !failure) failure = badRequest('Audit operation lost its lock; reload before retrying', 503);
        } catch (error) { if (!failure) failure = error; }
      }
      delete req.auditMutationToken;
      res.json = originalJson;
    }
    if (failure) return next(failure);
    if (hasResponse) return res.json(responseBody);
  };
}
module.exports = { withAuditMutation, LEASE_MS, HEARTBEAT_MS };
