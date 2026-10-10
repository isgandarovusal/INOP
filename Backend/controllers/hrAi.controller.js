const mongoose = require('mongoose');
const Job = require('../models/job.model');
const ai = require('../services/hrAiProvider.service');
const { jobContext } = require('../services/hrAiSchema.service');
const { resourceFilter } = require('../services/hrResourceScope.service');
const { validateLocation, decorateJobs } = require('../services/recruitmentCatalog.service');
const { verifyToken, getRolePermissions } = require('../middleware/auth.middleware');
const identity = req => JSON.stringify([req.user.id, req.user.role, req.user.departmentId, req.authRole.permissions]);
const jobQuery = (req, id) => Job.findOne({ $and: [{ _id: id }, resourceFilter(req, 'recruitment', 'read'), resourceFilter(req, 'recruitment', 'update')] }).select('title description brandId branchId location experienceYears requiredSkills preferredSkills updatedAt').maxTimeMS(1000).lean();
const fail = (code, message, status) => Object.assign(new Error(message), { code, status });
exports.suggest = async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  const controller = new AbortController();
  const close = () => { if (!res.writableEnded) controller.abort(); };
  res.once('close', close);
  try {
    const expected = identity(req), action = req.params.id ? 'update' : 'create';
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !['title','description','brandId','branchId','workplace','experienceYears','requiredSkills','preferredSkills'].includes(k))) throw fail('AI_INVALID_CONTEXT', 'Invalid professional vacancy context.', 400);
    let job;
    if (req.params.id) {
      if (!mongoose.isObjectIdOrHexString(req.params.id)) throw fail('AI_INVALID_CONTEXT', 'Invalid vacancy ID.', 400);
      job = await jobQuery(req, req.params.id);
      if (!job) throw fail('AI_PARENT_UNAVAILABLE', 'Vacancy not found or unavailable.', 404);
    }
    const location = { brandId: body.brandId ?? null, branchId: body.branchId ?? null };
    if (await validateLocation(req, location, job || {})) throw fail('AI_INVALID_CONTEXT', 'Selected business context is unavailable.', 400);
    const [decorated] = await decorateJobs(req, [{ ...location }]);
    const professional = jobContext({ title: body.title, description: body.description, workplace: body.workplace, experienceYears: body.experienceYears,
      requiredSkills: body.requiredSkills, preferredSkills: body.preferredSkills });
    const input = jobContext({ ...professional, brandName: decorated.brandName || undefined,
      workplace: [professional.workplace, decorated.branchName].filter(Boolean).join(' · '), experienceYears: body.experienceYears,
      requiredSkills: body.requiredSkills, preferredSkills: body.preferredSkills });
    // Branch names come only from independently scoped records, not supplied strings.
    const proposal = await ai.suggestJob(input, { actorId: req.user.id, signal: controller.signal });
    if (controller.signal.aborted) return;
    // Refresh before parent checks, then again after their awaits. Old token claims
    // and role snapshots cannot authorize a long-running provider response.
    const refresh = async () => {
      await verifyToken(req, res, () => {});
      if (res.headersSent || controller.signal.aborted) return false;
      req.authRole = { permissions: await getRolePermissions(req.user.role) };
      const grant = req.authRole.permissions.find(p => (p.resource === 'recruitment' || p.resource === '*') && (p.action === action || p.action === '*'));
      if (!grant || grant.scope === 'none') throw fail('AI_PERMISSION_CHANGED', 'Recruitment permission is no longer available.', 403);
      if (identity(req) !== expected) throw fail('AI_AUTHORIZATION_CHANGED', 'Authorization changed. Reload the current profile.', 409);
      return true;
    };
    if (!await refresh()) return;
    if (job) {
      const latest = await jobQuery(req, job._id);
      if (!latest) throw fail('AI_PARENT_UNAVAILABLE', 'Vacancy not found or unavailable.', 404);
      if (JSON.stringify(latest.updatedAt) !== JSON.stringify(job.updatedAt)) throw fail('AI_CONTEXT_CHANGED', 'Vacancy changed. Reload and retry.', 409);
    }
    if (await validateLocation(req, location, job || {})) throw fail('AI_CONTEXT_CHANGED', 'Business context changed. Review and retry.', 409);
    const [latestContext] = await decorateJobs(req, [{ ...location }]);
    if (latestContext.brandName !== decorated.brandName || latestContext.branchName !== decorated.branchName) throw fail('AI_CONTEXT_CHANGED', 'Business context changed. Review and retry.', 409);
    if (!await refresh()) return;
    return res.json(proposal);
  } catch (error) {
    if (controller.signal.aborted || res.headersSent) return;
    // Never forward provider diagnostics, request bodies, headers or database errors.
    const known = typeof error.code === 'string' && error.code.startsWith('AI_');
    return res.status(known ? error.status || 503 : 503).json({ code: known ? error.code : 'AI_UNAVAILABLE', message: known ? error.message : 'AI is temporarily unavailable. Enter criteria manually.' });
  } finally { res.off('close', close); }
};
