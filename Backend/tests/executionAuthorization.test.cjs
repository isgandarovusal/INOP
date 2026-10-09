const test = require('node:test');
const assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Snapshot = require('../models/auditDepartmentSnapshot.model');

test('Execution integration uses the real parent audit for every scope and operation', async t => withAuditFixture(async h => {
  await Snapshot.createIndexes();
  for (const scope of ['own', 'department', 'assigned', 'none']) {
    await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: { resource: 'audit.execution', action: '*', scope } } });
  }
  const audits = {}, executions = {};
  for (const actor of ['own', 'department', 'assigned', 'peer', 'foreign']) {
    audits[actor] = await h.audit(actor);
    await Snapshot.create({ auditId: audits[actor]._id, auditorId: audits[actor].auditorId, departmentId: h.actors[actor].departmentId });
    executions[actor] = await h.models.Execution.create({ auditId: audits[actor]._id, createdBy: String(h.actors.foreign._id), answers: [{ questionId: 'q1', answer: 'initial', score: 0 }] });
  }
  const legacy = await h.audit('foreign', 'standard', { departmentId: 'dep_A' });
  executions.legacy = await h.models.Execution.create({ auditId: legacy._id });
  const assignment = await h.assign('assigned', audits.foreign);
  const expected = { admin: Object.keys(executions), own: ['own'], department: ['own', 'department', 'assigned', 'peer'], assigned: ['assigned', 'foreign'] };
  for (const [actor, owners] of Object.entries(expected)) {
    await t.test(`${actor}: list exposes exactly authorized parent records`, async () => {
      const response = await h.request(actor, 'GET', '/audit-execution');
      assert.equal(response.status, 200); assert.equal(response.data.success, true);
      assert.deepEqual(response.data.data.map(item => item._id).sort(), owners.map(owner => String(executions[owner]._id)).sort());
      const filtered = await h.request(actor, 'GET', `/audit-execution?auditId=${audits.foreign.id}`);
      assert.equal(filtered.status, 200);
      assert.equal(filtered.data.data.length, owners.includes('foreign') ? 1 : 0);
    });
    for (const [owner, execution] of Object.entries(executions)) {
      const allowed = owners.includes(owner);
      await t.test(`${actor}: ${owner} detail and submit enforce the same parent scope`, async () => {
        const before = await h.models.Execution.findById(execution._id).lean();
        assert.equal((await h.request(actor, 'GET', `/audit-execution/${execution._id}`)).status, allowed ? 200 : 403);
        const response = await h.request(actor, 'PUT', `/audit-execution/${execution._id}/submit`, { answers: [{ questionId: 'q1', answer: 'updated', score: 80 }], auditId: String(audits[actor === 'admin' ? 'own' : actor]._id), createdBy: String(h.actors.admin._id) });
        assert.equal(response.status, allowed ? 200 : 403);
        const after = await h.models.Execution.findById(execution._id).lean();
        if (allowed) {
          assert.equal(response.data.success, true); assert.equal(response.data.data.totalScore, 80);
          assert.equal(response.data.data.riskLevel, 'medium'); assert.equal(after.status, 'completed');
          assert.equal(String(after.auditId), String(before.auditId)); assert.equal(after.createdBy, before.createdBy);
          await h.models.Execution.replaceOne({ _id: execution._id }, before);
        } else assert.deepEqual(after, before);
      });
    }
    await t.test(`${actor}: create binds canonical parent and server creator, then list/detail/submit work`, async () => {
      const parent = audits[actor === 'admin' ? 'foreign' : actor];
      const response = await h.request(actor, 'POST', '/audit-execution', { auditId: parent.id, createdBy: String(h.actors.admin._id), answers: [{ questionId: 'q', answer: 'yes', score: 0 }] });
      assert.equal(response.status, 201); assert.equal(response.data.success, true);
      assert.equal(response.data.data.auditId, String(parent._id)); assert.equal(response.data.data.createdBy, String(h.actors[actor]._id));
      const id = response.data.data._id;
      assert.equal((await h.request(actor, 'GET', `/audit-execution/${id}`)).status, 200);
      assert.ok((await h.request(actor, 'GET', '/audit-execution')).data.data.some(item => item._id === id));
      assert.equal((await h.request(actor, 'PUT', `/audit-execution/${id}/submit`, { answers: [{ questionId: 'q', answer: 'yes', score: 0 }] })).data.data.totalScore, 0);
      await h.models.Execution.deleteOne({ _id: id });
    });
  }
  await t.test('foreign create cannot be authorized by client creator or department', async () => {
    for (const actor of ['own', 'department']) assert.equal((await h.request(actor, 'POST', '/audit-execution', { auditId: String(audits.foreign._id), createdBy: String(h.actors[actor]._id), departmentId: 'dep_A' })).status, 403);
  });
  await t.test('child id alias and body auditId cannot substitute an authorized parent', async () => {
    await h.audit('own', 'standard', { id: String(executions.foreign._id) });
    assert.equal((await h.request('own', 'GET', `/audit-execution/${executions.foreign._id}`)).status, 403);
    assert.equal((await h.request('own', 'PUT', `/audit-execution/${executions.foreign._id}/submit`, { auditId: String(audits.own._id), answers: [] })).status, 403);
  });
  await t.test('assignment revocation immediately affects list/detail/submit/create with old JWT', async () => {
    await h.models.Assignment.deleteOne({ _id: assignment._id });
    assert.equal((await h.request('assigned', 'GET', `/audit-execution/${executions.foreign._id}`)).status, 403);
    assert.equal((await h.request('assigned', 'PUT', `/audit-execution/${executions.foreign._id}/submit`, { answers: [] })).status, 403);
    assert.equal((await h.request('assigned', 'POST', '/audit-execution', { auditId: audits.foreign.id })).status, 403);
    assert.equal((await h.request('assigned', 'GET', '/audit-execution')).data.data.length, 1);
  });
  for (const actor of ['hr', 'none', 'department_missing', 'anonymous']) await t.test(`${actor}: list/detail/create/submit fail closed`, async () => {
    for (const [method, endpoint, body] of [['GET', '/audit-execution'], ['GET', `/audit-execution/${executions.own._id}`], ['POST', '/audit-execution', { auditId: audits.own.id }], ['PUT', `/audit-execution/${executions.own._id}/submit`, { answers: [] }]]) {
      assert.equal((await h.request(actor, method, endpoint, body)).status, actor === 'anonymous' ? 401 : 403);
    }
  });
  await t.test('missing and malformed identifiers / invalid answer payloads are explicit 400/404 without writes', async () => {
    assert.equal((await h.request('admin', 'GET', '/audit-execution/not-an-id')).status, 400);
    assert.equal((await h.request('admin', 'GET', `/audit-execution/${new h.mongoose.Types.ObjectId()}`)).status, 404);
    const before = await h.models.Execution.findById(executions.own._id).lean();
    for (const answers of [{}, [null], [{ score: 'not-numeric' }], [{ answer: {} }]]) assert.equal((await h.request('admin', 'PUT', `/audit-execution/${executions.own._id}/submit`, { answers })).status, 400);
    assert.deepEqual(await h.models.Execution.findById(executions.own._id).lean(), before);
  });
  await t.test('legacy nullable optional answer fields remain readable and submittable', async () => {
    const legacyAnswers = [{ questionId: null, answer: null, score: null, comment: null }];
    const created = await h.request('admin', 'POST', '/audit-execution', { auditId: audits.own.id, answers: legacyAnswers });
    assert.equal(created.status, 201);
    const id = created.data.data._id;
    assert.equal((await h.request('admin', 'GET', `/audit-execution/${id}`)).data.data.answers[0].score, null);
    const updated = await h.request('admin', 'PUT', `/audit-execution/${id}/submit`, { answers: legacyAnswers });
    assert.equal(updated.status, 200); assert.equal(updated.data.data.totalScore, 0);
    assert.equal(updated.data.data.answers[0].score, null);
  });
}));
