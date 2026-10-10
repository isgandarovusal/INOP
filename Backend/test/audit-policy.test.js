const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreAnswers, canTransition } = require('../services/auditPolicy.service');
const { normalizeAuditPayload } = require('../services/auditPayload.service');
const template = { sections: [{ questions: [
  { id: 'yes', label: 'Compliant?', answerType: 'yes-no-na' },
  { id: 'score', label: 'Rating', answerType: 'score' },
  { id: 'text', label: 'Notes', answerType: 'text' },
] }] };

test('execution scoring ignores supplied scores and accepts frontend positional value answers', () => {
  const result = scoreAnswers(template, [{ value: 'yes', score: -999 }, { value: '3', score: 9999 }, { value: 'observations', score: 9999 }]);
  assert.equal(result.totalScore, 66.67);
  assert.equal(result.riskLevel, 'high');
  assert.deepEqual(result.answers.map(a => a.score), [1, 3, 0]);
  assert.equal(result.answers[0].questionId, 'yes');
});
test('N/A and text answers are excluded from the scoring denominator', () => {
  const result = scoreAnswers(template, [{ questionId: 'yes', answer: 'na' }, { questionId: 'score', answer: '5' }, { questionId: 'text', answer: 'notes' }]);
  assert.equal(result.totalScore, 100);
});
test('unknown, duplicate, missing and out of range answers cannot forge a submission', () => {
  assert.throws(() => scoreAnswers(template, [{ questionId: 'bogus', answer: 'yes' }]), /Unknown/);
  assert.throws(() => scoreAnswers(template, [{ questionId: 'yes', answer: 'yes' }, { questionId: 'yes', answer: 'yes' }]), /duplicate/);
  assert.throws(() => scoreAnswers(template, [{ questionId: 'yes', answer: 'yes' }]), /required/);
  assert.throws(() => scoreAnswers(template, [{ value: 'yes' }, { value: 'Infinity' }, { value: 'notes' }]), /between/);
});
test('inactive sections and questions cannot be used to influence score', () => {
  const item = { sections: [{ active: false, questions: [{ id: 'inactive', answerType: 'score' }] }, { questions: [{ id: 'active', answerType: 'yes-no-na' }, { id: 'disabled', active: false }] }] };
  assert.throws(() => scoreAnswers(item, [{ questionId: 'inactive', answer: '5' }]), /Unknown/);
  assert.equal(scoreAnswers(item, [{ questionId: 'active', answer: 'yes' }]).totalScore, 100);
});
test('completed and cancelled audits cannot be reopened or skip directly from draft to completed', () => {
  assert.equal(canTransition('draft', 'completed'), false);
  assert.equal(canTransition('completed', 'draft'), false);
  assert.equal(canTransition('cancelled', 'in-progress'), false);
  assert.equal(canTransition('in-progress', 'completed'), true);
});
test('audit creation fixes actors and state and recomputes supplied summary scores', () => {
  const req = { user: { id: 'actor', departmentId: 'department' } };
  const payload = normalizeAuditPayload({ id: 'a', auditType: 'Routine', auditorId: 'admin', createdBy: 'admin', departmentId: 'other', status: 'completed', overallPercentage: 100, scores: { cleanliness: 2, service: 2, food: 2, staff: 2 } }, req);
  assert.equal(payload.status, 'draft');
  assert.equal(payload.auditorId, 'actor');
  assert.equal(payload.departmentId, 'department');
  assert.equal(payload.overallPercentage, 20);
});
test('legacy standard and safety totals derive from submitted primary observations', () => {
  const req = { user: { id: 'actor' } };
  const standard = normalizeAuditPayload({ auditType: 'standard', passed: true, foundCritical: 0, results: [{ checkId: 'a', result: 'critical' }, { checkId: 'b', result: 'compliant' }] }, req);
  assert.equal(standard.passed, false); assert.equal(standard.foundCritical, 1); assert.equal(standard.compliancePercentage, 50);
  const safety = normalizeAuditPayload({ auditType: 'occupational-safety', totalScore: 10000, checks: [{ checkId: 'a', score: 3 }, { checkId: 'b', score: null }] }, req);
  assert.equal(safety.totalScore, 3); assert.equal(safety.maxScore, 10); assert.equal(safety.scorePercentage, 30);
});
test('audit JSON cannot persist browser-only blobs or rewrite protected fields on update', () => {
  const req = { user: { id: 'actor' } };
  assert.throws(() => normalizeAuditPayload({ photos: [{ blobUrl: 'blob:client' }] }, req), /Upload files/);
  const update = normalizeAuditPayload({ status: 'completed', auditorId: 'other', createdBy: 'other', departmentId: 'other', attachments: [{ blobUrl: '/uploads/private.pdf' }] }, req, false);
  assert.deepEqual(update, {});
});
