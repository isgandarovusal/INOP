const test = require('node:test'), assert = require('node:assert/strict');
const { calculateApplicationMatch } = require('../services/applicationMatch.service');
const job = { _id: '111111111111111111111111', title: 'Cashier', requiredSkills: ['Cash handling'], preferredSkills: [], experienceYears: 0 };
const candidate = { _id: '222222222222222222222222', role: 'Kassir', skills: ['Kassa'], experience: null, reviewedFields: ['skills'] };
function match(j = job, c = candidate) { return calculateApplicationMatch(j, c, { application: { jobId: j._id, candidateId: c._id } }); }
test('matching requires an Application context and empty requirements do not invent 100%', () => {
  assert.equal(calculateApplicationMatch(job, candidate).score, null);
  assert.equal(calculateApplicationMatch(undefined, undefined, { application: {} }).score, null);
  assert.equal(match({ ...job, requiredSkills: [] }, { ...candidate, skills: [] }).score, null);
});
test('restaurant skill aliases and duplicate criteria count only once', () => {
  const r = match({ ...job, requiredSkills: ['Cash handling', 'Kassa', 'Food safety'] }, { ...candidate, skills: ['Kassa', 'Qida təhlükəsizliyi'] });
  assert.equal(r.score, 100); assert.equal(r.scoreStatus, 'calculated'); assert.equal(r.criteria[0].matched.length, 2);
});
test('confirmed absence is zero, unknown skills are incomplete', () => {
  assert.equal(match(job, { ...candidate, skills: [] }).score, 0);
  const r = match(job, { ...candidate, skills: [], reviewedFields: [] }); assert.equal(r.score, null); assert.equal(r.scoreStatus, 'incomplete');
});
test('irrelevant experience is unknown; HR reviewed contextual override is explicit', () => {
  const r = match({ ...job, experienceYears: 2 }, { ...candidate, role: 'Developer', experience: 10 }); assert.equal(r.score, null);
  assert.equal(match({ ...job, experienceYears: 2 }, { ...candidate, experience: 0 }).score < 100, true);
});
test('education and certification are not criteria unless genuinely required', () => {
  assert.equal(match(job, { ...candidate, education: '', languages: [], certificates: [] }).score, 100);
  const r = match({ ...job, requiredCertificates: ['HACCP'], requiredEducation: ['Secondary school'] }, { ...candidate, certificates: [], education: '', reviewedFields: ['skills', 'education', 'certificates'] });
  assert.ok(r.score >= 0 && r.score < 100); assert.equal(r.criteria.length, 3); assert.ok(r.criteria.find(c => c.key === 'certificates').missing.includes('haccp'));
});
test('pending CV review never becomes a trusted percentage', () => {
  const r = match(job, { ...candidate, cvReview: { version: 'rules-2', reviewStatus: 'pending' } }); assert.equal(r.score, null); assert.equal(r.scoreStatus, 'pending');
});
test('protected traits, contact details and unrelated metadata do not change score/fingerprint', () => {
  const a = match(), b = match(job, { ...candidate, age: 60, gender: 'female', nationality: 'changed', name: 'other', email: 'other@example.invalid', phone: '+994501234567' });
  assert.equal(a.score, b.score); assert.equal(a.candidateHash, b.candidateHash); assert.equal(a.version, 'ats-v1');
});
test('missing relevant experience produces null, explicit zero is a scored fact with evidence', () => {
  const j = { ...job, requiredSkills: [], experienceYears: 2 };
  assert.equal(match(j).score, null); const r = match(j, { ...candidate, experience: 0 }); assert.equal(r.score, 0); assert.equal(r.dataCoverage, 1); assert.equal(r.criteria[0].source, 'candidate.experience:matching-role');
});
test('dated relevant employment merges overlaps instead of double-counting years', () => {
  const j = { ...job, requiredSkills: [], experienceYears: 3 };
  const c = { ...candidate, role: 'Other', employmentHistory: [
    { title: 'Cashier', start: { year: 2020, month: 1 }, end: { year: 2022, month: 1 } },
    { title: 'Kassir', start: { year: 2021, month: 1 }, end: { year: 2023, month: 1 } },
  ] };
  const r = match(j, c); assert.equal(r.score, 100); assert.equal(r.criteria[0].value, 3);
});
test('unknown employment months or unsupported aliases are never silently inferred', () => {
  const r = match({ ...job, requiredSkills: [], experienceYears: 2 }, { ...candidate, role: 'Other', employmentHistory: [{ title: 'Cashier', start: { year: 2020, month: null }, end: { year: 2024, month: null } }] }); assert.equal(r.score, null);
});
test('custom weights are normalized only across applicable criteria', () => {
  const r = match({ ...job, requiredSkills: ['Cash handling'], preferredSkills: ['HACCP'], criterionWeights: { skills: 3, preferred: 1 } }); assert.equal(r.score, 75); assert.equal(r.criteria[0].weight, .75);
});
test('protected traits disguised as skill criteria are not scored; corrections are not full review approval', () => {
  assert.equal(match({ ...job, requiredSkills: ['female'] }).score, null);
  assert.equal(match(job, { ...candidate, cvReview: { version: 'rules-2', reviewStatus: 'corrected' } }).score, null);
});
