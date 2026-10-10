const test = require('node:test'), assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Job = require('../models/job.model'), Candidate = require('../models/candidate.model'), Application = require('../models/application.model');
test('Application matching is versioned, scoped, invalidated and explicitly recalculated', async t => withAuditFixture(async h => {
  for (const scope of ['own', 'department', 'assigned']) await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: ['candidate', 'recruitment', 'application'].map(resource => ({ resource, action: '*', scope })) } });
  const create = async (actor, title, skills, candidateSkills) => {
    const job = await h.request(actor, 'POST', '/jobs', { title, description: 'Operations', department: 'Operations', requiredSkills: skills, experienceYears: 0 }); assert.equal(job.status, 201);
    const candidate = await h.request(actor, 'POST', '/candidates', { name: 'Synthetic', role: title, skills: candidateSkills }); assert.equal(candidate.status, 201);
    const app = await h.request(actor, 'POST', '/applications', { jobId: job.data._id, candidateId: candidate.data._id }); assert.equal(app.status, 201);
    return { job: job.data, candidate: candidate.data, app: app.data };
  };
  let row;
  await t.test('create persists version, criterion evidence, zero and nonzero scores', async () => {
    row = await create('admin', 'Cashier', ['Cash handling'], ['Kassa']); assert.equal(row.app.score, 100); assert.equal(row.app.matching.version, 'ats-v1');
    assert.equal(row.app.scoreStatus, 'calculated'); assert.equal(row.app.matching.dataCoverage, 1); assert.ok(row.app.matching.calculatedAt);
    assert.deepEqual(row.app.matching.criteria[0].matched, ['cash handling']);
    const zero = await create('admin', 'Cook', ['Food safety'], []); assert.equal(zero.app.score, 0); assert.equal(zero.app.scoreStatus, 'calculated');
  });
  await t.test('job changes clear stale score until explicit recalculation', async () => {
    assert.equal((await h.request('admin', 'PUT', '/jobs/' + row.job._id, { requiredSkills: ['HACCP'] })).status, 200);
    const stale = await h.request('admin', 'GET', '/applications/' + row.app._id); assert.equal(stale.data.score, null); assert.equal(stale.data.scoreStatus, 'stale'); assert.equal(stale.data.matching, null);
    const fresh = await h.request('admin', 'POST', `/applications/${row.app._id}/recalculate`, {}); assert.equal(fresh.status, 200); assert.equal(fresh.data.score, 0);
    row.app = fresh.data;
  });
  await t.test('candidate changes and out-of-band fact changes cannot expose stale score', async () => {
    await h.request('admin', 'PUT', '/candidates/' + row.candidate._id, { skills: ['HACCP'] });
    assert.equal((await h.request('admin', 'GET', '/applications/' + row.app._id)).data.score, null);
    const fresh = await h.request('admin', 'POST', `/applications/${row.app._id}/recalculate`, {}); assert.equal(fresh.data.score, 100);
    await Candidate.updateOne({ _id: row.candidate._id }, { $set: { skills: ['Cash handling'] } });
    const stale = await h.request('admin', 'GET', '/applications/' + row.app._id); assert.equal(stale.data.scoreStatus, 'stale'); assert.equal(stale.data.score, null);
  });
  await t.test('legacy numeric score is retained in DB but is not advertised as current trusted score', async () => {
    await Application.collection.updateOne({ _id: row.app._id && new h.mongoose.Types.ObjectId(row.app._id) }, { $unset: { matching: '', scoreStatus: '' }, $set: { score: 73 } });
    const r = await h.request('admin', 'GET', '/applications/' + row.app._id); assert.equal(r.data.scoreStatus, 'legacy'); assert.equal(r.data.score, null);
    assert.equal((await Application.findById(row.app._id)).score, 73);
  });
  await t.test('independent denied parent scopes suppress score, evidence and experience review', async () => {
    await h.models.Role.create({ key: 'app_only', name: 'Application only', permissions: [{ resource: 'application', action: '*', scope: 'all' }] });
    await h.models.User.updateOne({ _id: h.actors.peer._id }, { $set: { role: 'app_only' } });
    const r = await h.request('peer', 'GET', '/applications/' + row.app._id); assert.equal(r.status, 200); assert.equal(r.data.scoreStatus, 'restricted'); assert.equal(r.data.matching, null); assert.equal(r.data.score, null);
    assert.equal((await h.request('peer', 'POST', `/applications/${row.app._id}/recalculate`, {})).status, 403);
  });
  for (const actor of ['own', 'department', 'assigned']) await t.test(`${actor} can recalculate allowed records but not foreign applications`, async () => {
    const allowed = await create(actor, 'Cashier', ['Cash handling'], ['Kassa']);
    assert.equal((await h.request(actor, 'POST', `/applications/${allowed.app._id}/recalculate`, {})).status, 200);
    const foreign = await create('foreign', 'Cashier', ['Cash handling'], []);
    assert.equal((await h.request(actor, 'POST', `/applications/${foreign.app._id}/recalculate`, {})).status, 404);
  });
  await t.test('contextual HR experience review is recorded and invalidated by changed facts', async () => {
    const r = await create('admin', 'Cashier', [], []); await h.request('admin', 'PUT', '/jobs/' + r.job._id, { experienceYears: 2 });
    await h.request('admin', 'PUT', '/candidates/' + r.candidate._id, { role: 'Other', experience: null });
    const missing = await h.request('admin', 'POST', `/applications/${r.app._id}/recalculate`, {}); assert.equal(missing.data.score, null);
    const reviewed = await h.request('admin', 'POST', `/applications/${r.app._id}/recalculate`, { relevantExperienceYears: 2, reason: 'HR verified dated cashier employment' });
    assert.equal(reviewed.data.score, 100); assert.equal(reviewed.data.matchingReview.reviewedBy, String(h.actors.admin._id));
    await h.request('admin', 'PUT', '/candidates/' + r.candidate._id, { role: 'Changed facts' });
    const again = await h.request('admin', 'POST', `/applications/${r.app._id}/recalculate`, {}); assert.equal(again.data.score, null);
  });
  await t.test('invalid evidence/weights and protected criteria return 400; stale revision is 409; anonymous is 401', async () => {
    assert.equal((await h.request('admin', 'POST', `/applications/${row.app._id}/recalculate`, { relevantExperienceYears: 2 })).status, 400);
    assert.equal((await h.request('admin', 'POST', `/applications/${row.app._id}/recalculate`, { expectedRevision: 999 })).status, 409);
    assert.equal((await h.request('admin', 'PUT', '/jobs/' + row.job._id, { criterionWeights: { skills: -1 } })).status, 400);
    assert.equal((await h.request('admin', 'PUT', '/jobs/' + row.job._id, { criterionWeights: { skills: 0, preferred: 0, experience: 0, education: 0, certificates: 0 } })).status, 400);
    assert.equal((await h.request('admin', 'PUT', '/jobs/' + row.job._id, { requiredSkills: ['female'] })).status, 400);
    assert.equal((await h.request('anonymous', 'POST', `/applications/${row.app._id}/recalculate`, {})).status, 401);
  });
  await t.test('scoring never changes HR status or automatically hires/rejects', async () => {
    const before = await Application.findById(row.app._id); await h.request('admin', 'POST', `/applications/${row.app._id}/recalculate`, {});
    assert.equal((await Application.findById(row.app._id)).status, before.status);
  });
}));
