const test = require('node:test'), assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Application = require('../models/application.model'), Job = require('../models/job.model'), Candidate = require('../models/candidate.model');
test('Application interview roster exposes only independently readable active people', async t => withAuditFixture(async h => {
  await h.models.Role.updateOne({ key: 'test_own' }, { $push: { permissions: { resource: 'application', action: '*', scope: 'own' } } });
  const job = await Job.create({ title: 'Roster vacancy', department: 'HR', description: 'Roster' });
  const candidate = await Candidate.create({ name: 'Synthetic roster candidate', role: 'Cashier' });
  const row = await Application.create({ jobId: job._id, candidateId: candidate._id, createdBy: h.actors.own._id, assignedTo: h.actors.own._id });
  await t.test('without user.read the roster contains self only, with id/name projection', async () => {
    const r = await h.request('own', 'GET', `/applications/${row._id}/interviewers`); assert.equal(r.status, 200);
    assert.deepEqual(r.data, [{ id: String(h.actors.own._id), name: h.actors.own.name }]);
  });
  await t.test('global user.read exposes active names without credential/contact fields', async () => {
    const r = await h.request('admin', 'GET', `/applications/${row._id}/interviewers`); assert.equal(r.status, 200);
    assert.ok(r.data.some(u => u.id === String(h.actors.foreign._id))); assert.ok(r.data.length <= 50);
    assert.ok(r.data.every(u => Object.keys(u).sort().join(',') === 'id,name'));
  });
  await t.test('parent scope, unauthenticated access and permission revocation fail closed', async () => {
    assert.equal((await h.request('anonymous', 'GET', `/applications/${row._id}/interviewers`)).status, 401);
    const foreign = await Application.create({ jobId: job._id, candidateId: candidate._id, createdBy: h.actors.foreign._id });
    assert.equal((await h.request('own', 'GET', `/applications/${foreign._id}/interviewers`)).status, 404);
    await h.models.Role.updateOne({ key: 'test_own' }, { $pull: { permissions: { resource: 'application' } } });
    assert.equal((await h.request('own', 'GET', `/applications/${row._id}/interviewers`)).status, 403);
  });
  await t.test('next action local time persists timezone and rejects malformed timezone without a due date', async () => {
    const r = await h.request('admin', 'PATCH', `/applications/${row._id}/workflow`, { nextAction: { kind: 'call', localDueAt: '2026-11-10T10:30', timezone: 'Asia/Baku' } });
    assert.equal(r.status, 200); assert.equal(r.data.nextAction.dueAt, '2026-11-10T06:30:00.000Z');
    for (const timezone of ['Invented/Zone', { injected: true }, '']) assert.equal((await h.request('admin', 'PATCH', `/applications/${row._id}/workflow`, { nextAction: { kind: 'call', timezone } })).status, 400);
    assert.equal((await Application.findById(row._id)).__v, r.data.__v);
  });
}));
