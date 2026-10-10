const { randomUUID } = require('node:crypto');
const { badRequest } = require('./auditPolicy.service');
const fields = ['restaurantId', 'auditType', 'date', 'shift', 'template', 'templateId', 'templateSnapshot',
  'scores', 'checks', 'serviceTimeObservations', 'results', 'categories', 'recommendations', 'comments', 'metadata'];
function normalizeAuditPayload(body, req, creating = true, existing = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Audit data must be an object');
  const payload = {};
  for (const field of fields) if (body[field] !== undefined) payload[field] = body[field];
  if (creating) {
    if (!req.user?.id) throw badRequest('Authentication required', 401);
    payload.id = body.id || `aud-${randomUUID()}`;
    payload.auditorId = req.user.id;
    payload.createdBy = req.user.id;
    payload.departmentId = req.user.departmentId || undefined;
    payload.auditType = body.auditType || body.type;
    payload.status = 'draft';
    payload.findings = [];
    if ((body.photos?.length || 0) || (body.attachments?.length || 0)) {
      throw badRequest('Upload files using the audit attachment endpoint after creating the audit');
    }
  }
  for (const field of ['checks', 'serviceTimeObservations', 'results', 'categories', 'recommendations']) {
    if (payload[field] !== undefined && !Array.isArray(payload[field])) throw badRequest(`${field} must be an array`);
  }
  if (payload.date !== undefined) {
    if (typeof payload.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date) || !Number.isFinite(Date.parse(payload.date)) || new Date(payload.date).toISOString().slice(0, 10) !== payload.date) throw badRequest('date must be a valid YYYY-MM-DD calendar date');
  }
  const combined = { ...existing, ...payload };
  if (payload.scores !== undefined) {
    if (!payload.scores || typeof payload.scores !== 'object' || Array.isArray(payload.scores)) throw badRequest('scores must be an object');
    payload.scores = {};
    for (const key of ['cleanliness', 'service', 'food', 'staff']) {
      const number = body.scores[key];
      if (typeof number !== 'number' || !Number.isFinite(number) || number < 0 || number > 10) throw badRequest('Category scores must be between 0 and 10');
      payload.scores[key] = number;
    }
    payload.overallPercentage = Object.values(payload.scores).reduce((sum, v) => sum + v, 0) * 2.5;
  }
  if (combined.auditType === 'standard' && Array.isArray(combined.results)) {
    const valid = new Set(['compliant', 'minor', 'major', 'critical']);
    const ids = new Set();
    for (const result of combined.results) {
      if (!result || !result.checkId || ids.has(result.checkId) || !valid.has(result.result)) throw badRequest('Invalid or duplicate standard audit result');
      ids.add(result.checkId);
    }
    payload.foundCritical = combined.results.filter(r => r.result === 'critical').length;
    payload.foundMajor = combined.results.filter(r => r.result === 'major').length;
    payload.foundMinor = combined.results.filter(r => r.result === 'minor').length;
    payload.foundTotal = payload.foundCritical + payload.foundMajor + payload.foundMinor;
    payload.compliancePercentage = combined.results.length ? (combined.results.length - payload.foundTotal) / combined.results.length * 100 : 0;
    payload.passed = combined.results.length > 0 && payload.foundCritical === 0 && payload.foundMajor === 0;
  }
  if (combined.auditType === 'service' && Array.isArray(combined.checks) && !combined.scores) {
    const ids = new Set();
    for (const check of combined.checks) {
      if (!check || !check.checkId || ids.has(check.checkId) || !['yes', 'no', 'na'].includes(check.answer)) throw badRequest('Invalid or duplicate service answer');
      ids.add(check.checkId);
    }
    const answered = combined.checks.filter(c => c.answer !== 'na');
    payload.overallPercentage = answered.length ? answered.filter(c => c.answer === 'yes').length / answered.length * 100 : 0;
  }
  if (combined.auditType === 'occupational-safety' && Array.isArray(combined.checks)) {
    const ids = new Set();
    for (const check of combined.checks) {
      if (!check || !check.checkId || ids.has(check.checkId) || (check.score !== null && (typeof check.score !== 'number' || !Number.isFinite(check.score) || check.score < 0 || check.score > 5))) throw badRequest('Safety scores must be between 0 and 5');
      ids.add(check.checkId);
    }
    payload.totalScore = combined.checks.reduce((sum, check) => sum + (check.score || 0), 0);
    payload.maxScore = combined.checks.length * 5;
    payload.scorePercentage = payload.maxScore ? payload.totalScore / payload.maxScore * 100 : 0;
  }
  return payload;
}
module.exports = { normalizeAuditPayload };
