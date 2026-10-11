const mongoose = require('mongoose'), crypto = require('node:crypto');
const Candidate = require('../models/candidate.model');
const { resourceFilter } = require('../services/hrResourceScope.service');
const { verifyToken, getRolePermissions } = require('../middleware/auth.middleware');
const evidence = require('../services/hrAiCvReview.service'), ai = require('../services/hrAiProvider.service');
const { readCandidateOriginal } = require('./privateFiles.controller');
const query = (req, id) => Candidate.findOne({ $and: [{ _id: id }, resourceFilter(req, 'candidate', 'read'), resourceFilter(req, 'candidate', 'update')] }).select('name cvUrl cvOriginal.sha256 cvOriginal.size cvReview __v updatedAt +privateCvBlob +privateCvArchive +privateCvIntake').maxTimeMS(1000).lean();
const authority = req => JSON.stringify([req.user.id, req.user.role, req.user.departmentId, req.authRole.permissions]);
const fail = (code, message, status) => Object.assign(new Error(message), { code, status });
async function original(candidate, hash, signal) {
  if (typeof candidate.cvUrl !== 'string' || !candidate.cvUrl.startsWith('/uploads/')) throw fail('AI_SOURCE_UNAVAILABLE', 'Original source is unavailable. Review the stored facts manually.', 404);
  let bytes;
  try { bytes = await readCandidateOriginal(candidate,{signal}); }
  catch (e) {
    if (['ENOENT','ENOTDIR','EACCES','ELOOP','STORAGE_NOT_FOUND'].includes(e.code)) throw fail('AI_SOURCE_UNAVAILABLE', 'Original source is unavailable. Review the stored facts manually.', 404);
    if (e.code === 'STORAGE_IDENTITY_MISMATCH') throw fail('AI_CONTEXT_CHANGED', 'Original source changed. Reload and review.', 409);
    if (e.code === 'DOCUMENT_LIMIT') throw fail('AI_NO_REVIEW_CONTEXT', 'Source exceeds the supported review bound.', 422);
    throw e;
  }
  if (!bytes) throw fail('AI_SOURCE_UNAVAILABLE', 'Original source is unavailable. Review the stored facts manually.', 404);
  if (crypto.createHash('sha256').update(bytes).digest('hex') !== hash) throw fail('AI_CONTEXT_CHANGED', 'Original source changed. Reload and review.', 409);
}
exports.get = async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  const controller = new AbortController(), close = () => { if (!res.writableEnded) controller.abort(); };
  res.once('close', close);
  try {
    const body = req.body;
    if (!mongoose.isObjectIdOrHexString(req.params.id) || !body || Object.keys(body).some(k => !['expectedHash','expectedRevision'].includes(k)) || !/^[a-f0-9]{64}$/.test(body.expectedHash || '') || !Number.isInteger(body.expectedRevision) || body.expectedRevision < 0) throw fail('AI_INVALID_CONTEXT', 'An explicit source hash and Candidate revision are required.', 400);
    const initialAuthority = authority(req), candidate = await query(req, req.params.id);
    if (!candidate) throw fail('AI_PARENT_UNAVAILABLE', 'Candidate not found or unavailable.', 404);
    if (body.expectedHash !== candidate.cvOriginal?.sha256 || body.expectedRevision !== (candidate.__v || 0)) throw fail('AI_CONTEXT_CHANGED', 'Candidate source changed. Reload and review.', 409);
    const context = evidence.buildContext(candidate), identity = evidence.identity(candidate);
    const refresh = async () => {
      await verifyToken(req, res, () => {}); if (res.headersSent || controller.signal.aborted) return false;
      req.authRole = { permissions: await getRolePermissions(req.user.role) };
      for (const action of ['read','update']) {
        const grant = req.authRole.permissions.find(p => (p.resource === 'candidate' || p.resource === '*') && (p.action === action || p.action === '*'));
        if (!grant || grant.scope === 'none') throw fail('AI_PERMISSION_CHANGED', 'Candidate permission is no longer available.', 403);
      }
      if (authority(req) !== initialAuthority) throw fail('AI_AUTHORIZATION_CHANGED', 'Authorization changed. Reload the current profile.', 409);
      return true;
    };
    const sameSource = row => evidence.identity(row) === identity && row.cvUrl === candidate.cvUrl &&
      JSON.stringify(row.privateCvBlob) === JSON.stringify(candidate.privateCvBlob) &&
      JSON.stringify(row.privateCvArchive) === JSON.stringify(candidate.privateCvArchive);
    await original(candidate, body.expectedHash, controller.signal);
    // The first private read is asynchronous too: never send professional facts
    // to an external provider after current JWT/role/parent/source has changed.
    if (!await refresh()) return;
    const beforeProvider = await query(req, candidate._id);
    if (!beforeProvider) throw fail('AI_PARENT_UNAVAILABLE', 'Candidate not found or unavailable.', 404);
    if (!sameSource(beforeProvider)) throw fail('AI_CONTEXT_CHANGED', 'Candidate source changed. Reload and review.', 409);
    if (!await refresh()) return;
    const result = await ai.suggestCv(context, { actorId: req.user.id, signal: controller.signal });
    if (!await refresh()) return;
    const current = await query(req, candidate._id);
    if (!current) throw fail('AI_PARENT_UNAVAILABLE', 'Candidate not found or unavailable.', 404);
    if (!sameSource(current)) throw fail('AI_CONTEXT_CHANGED', 'Candidate source changed. Reload and review.', 409);
    await original(current, body.expectedHash, controller.signal);
    if (!await refresh()) return;
    const final = await query(req,candidate._id);
    if (!final) throw fail('AI_PARENT_UNAVAILABLE','Candidate not found or unavailable.',404);
    if (!sameSource(final)) throw fail('AI_CONTEXT_CHANGED','Candidate source changed. Reload and review.',409);
    if (!await refresh()) return;
    return res.json({ ...result, source: { sha256: body.expectedHash, revision: body.expectedRevision, parserVersion: candidate.cvReview.version },
      reviewScope: 'professional_evidence_only', evidence: context.facts, requiresApproval: true });
  } catch (error) {
    if (res.headersSent || controller.signal.aborted) return;
    const known = typeof error.code === 'string' && error.code.startsWith('AI_');
    return res.status(known ? error.status || 503 : 503).json({ code: known ? error.code : 'AI_UNAVAILABLE', message: known ? error.message : 'AI review is temporarily unavailable. Review facts manually.' });
  } finally { res.off('close', close); }
};
