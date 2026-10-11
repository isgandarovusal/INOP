const test = require('node:test'), assert = require('node:assert/strict');
const { calculateApplicationMatch, protectedCriterion, VERSION } = require('../services/applicationMatch.service');
const { jobContext, validateSuggestion } = require('../services/hrAiSchema.service');
const { scoreRecord } = require('../services/applicationScoreState.service');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const job = { _id: '111111111111111111111111', title: 'Cashier', requiredSkills: ['Food safety'] };
const candidate = { _id: '222222222222222222222222', skills: ['Food safety'] };
const app = { jobId: job._id, candidateId: candidate._id, status: 'Applied' };
const match = (j = job, c = candidate) => calculateApplicationMatch(j, c, { application: app });
const protectedTerms = ['Women', 'woman', 'men', 'young', 'elderly', 'gender identity', 'Under 30', 'Over 50', 'qadınlar', 'kişilər', 'yaşlı', 'gənc', 'женщины', 'мужчины', 'молодой', 'пожилые', 'ｆｅｍａｌｅ'];
test('Obvious protected traits in criteria fail closed across matching and AI schema, including plural AZ/EN/RU', async t => {
  for (const term of protectedTerms) await t.test(term, () => {
    assert.equal(protectedCriterion(term), true);
    const r = match({ ...job, requiredSkills: [term] }, { ...candidate, skills: [term] });
    assert.equal(r.score, null); assert.equal(r.reason, 'protected_criteria_forbidden');
    assert.throws(() => jobContext({ title: 'Cashier', description: 'Food service', requiredSkills: [term] }), { code: 'AI_INVALID_CONTEXT' });
    assert.throws(() => validateSuggestion({ status: 'suggested', requiredSkills: [{ name: 'Food safety', reason: term, confidence: null }], preferredSkills: [], uncertainty: [] }), { code: 'AI_INVALID_OUTPUT' });
  });
});
test('Partial confirmed profile does not turn an unknown skill/education/certificate into zero', () => {
  for (const [required, field, empty] of [['requiredSkills', 'skills', []], ['requiredEducation', 'education', ''], ['requiredCertificates', 'certificates', []]]) {
    const j = { ...job, requiredSkills: [], [required]: ['HACCP'] }, c = { ...candidate, skills: [], [field]: empty, reviewedFields: ['role'], cvReview: { version: 'rules-2', reviewStatus: 'confirmed' } };
    assert.equal(match(j, c).score, null); assert.equal(match(j, c).scoreStatus, 'incomplete');
    assert.equal(match(j, { ...c, reviewedFields: ['role', field] }).score, 0);
  }
});
test('Professional terms remain usable; protected metadata cannot affect fingerprints or hiring decision', () => {
  for (const skill of ['Russian language', 'English', 'HACCP', 'Food safety', 'Shift management', 'Ageing inventory control']) {
    assert.equal(protectedCriterion(skill), false); assert.equal(match({ ...job, requiredSkills: [skill] }, { ...candidate, skills: [skill] }).score, 100);
  }
  const a = match(), b = match(job, { ...candidate, age: 20, gender: 'women', nationality: 'unknown', ethnicity: 'changed', disability: true });
  assert.equal(a.score, b.score); assert.equal(a.candidateHash, b.candidateHash); assert.equal(app.status, 'Applied');
});
test('ats-v1 remains stored but is not presented as current; explicit recalculation creates ats-v2', () => {
  assert.equal(VERSION, 'ats-v2'); const current = match();
  const legacy = { ...app, matching: { ...current, version: 'ats-v1' }, score: 100 };
  assert.equal(scoreRecord(legacy, job, candidate).score, null); assert.equal(scoreRecord(legacy, job, candidate).scoreStatus, 'legacy');
  assert.equal(legacy.score, 100); assert.equal(scoreRecord({ ...app, matching: current }, job, candidate).score, 100);
});
test('Actual vacancy create/update reject protected plural traits, without breaking professional admin workflow', async t => withAuditFixture(async h => {
  const payload = { title: 'Cashier', department: 'HR', description: 'Food service', requiredSkills: ['Food safety'] };
  const valid = await h.request('admin', 'POST', '/jobs', payload); assert.equal(valid.status, 201);
  for (const term of ['women', 'young', 'qadınlar', 'женщины']) await t.test(term, async () => {
    assert.equal((await h.request('admin', 'POST', '/jobs', { ...payload, requiredSkills: [term] })).status, 400);
    assert.equal((await h.request('admin', 'PUT', '/jobs/' + valid.data._id, { preferredSkills: [term] })).status, 400);
  });
  assert.equal((await h.request('admin', 'GET', '/jobs/' + valid.data._id)).data.requiredSkills[0], 'Food safety');
}));
