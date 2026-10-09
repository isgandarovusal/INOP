const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Snapshot = require('../models/auditDepartmentSnapshot.model');

test('Generic Audit scope and trusted department provenance', async t => withAuditFixture(async h => {
  await Snapshot.createIndexes();
  const records = {};
  for (const owner of ['own', 'department', 'assigned', 'peer', 'foreign']) {
    records[owner] = await h.audit(owner);
    await Snapshot.create({ auditId: records[owner]._id, auditorId: String(h.actors[owner]._id), departmentId: h.actors[owner].departmentId });
  }
  const legacy = await h.audit('foreign', 'safety', { departmentId: 'dep_A', departmentSnapshot: 'dep_A', departmentSnapshotVersion: 1 });
  const assignment = await h.assign('assigned', records.foreign);
  const expected = {
    admin: Object.values(records).concat(legacy), own: [records.own],
    department: [records.own, records.department, records.assigned, records.peer],
    assigned: [records.assigned, records.foreign],
  };
  for (const actor of Object.keys(expected)) {
    await t.test(`${actor}: list returns exactly its permitted records`, async () => {
      const response = await h.request(actor, 'GET', '/audits'); assert.equal(response.status, 200);
      assert.deepEqual(response.data.map(a => a.id).sort(), expected[actor].map(a => a.id).sort());
    });
    for (const [owner, audit] of Object.entries({ ...records, legacy })) {
      const allowed = expected[actor].includes(audit);
      for (const identifier of [audit.id, String(audit._id)]) await t.test(`${actor}: ${owner} detail/update via ${identifier === audit.id ? 'public id' : 'Mongo id'}`, async () => {
        const before = await h.models.Audit.findById(audit._id).lean();
        assert.equal((await h.request(actor, 'GET', `/audits/${identifier}`)).status, allowed ? 200 : 404);
        const update = await h.request(actor, 'PUT', `/audits/${identifier}`, { comments: 'scope-check', auditorId: String(h.actors.admin._id), departmentId: 'forged' });
        assert.equal(update.status, allowed ? 200 : (actor === 'assigned' ? 403 : 404));
        const after = await h.models.Audit.findById(audit._id).lean();
        if (allowed) {
          assert.equal(after.comments, 'scope-check'); assert.equal(after.auditorId, before.auditorId);
          if (owner !== 'legacy') assert.equal((await Snapshot.findOne({ auditId: audit._id })).departmentId, h.actors[owner].departmentId);
          await h.models.Audit.replaceOne({ _id: audit._id }, before);
        } else assert.deepEqual(after, before);
      });
    }
    for (const owner of ['own', 'foreign']) await t.test(`${actor}: delete ${owner} enforces same scope`, async () => {
      const audit = await h.audit(owner);
      await Snapshot.create({ auditId: audit._id, auditorId: audit.auditorId, departmentId: h.actors[owner].departmentId });
      const allowed = actor === 'admin' || (actor === 'own' && owner === 'own') || (actor === 'department' && owner === 'own');
      assert.equal((await h.request(actor, 'DELETE', `/audits/${audit.id}`)).status, allowed ? 200 : 404);
      assert.equal(Boolean(await h.models.Audit.exists({ _id: audit._id })), !allowed);
      if (!allowed) await h.models.Audit.deleteOne({ _id: audit._id });
    });
  }
  await t.test('Assignment removal revokes old JWT access', async () => {
    await h.models.Assignment.deleteOne({ _id: assignment._id });
    assert.equal((await h.request('assigned', 'GET', `/audits/${records.foreign.id}`)).status, 404);
    assert.equal((await h.request('assigned', 'PUT', `/audits/${records.foreign.id}`, { comments: 'no' })).status, 403);
  });
  await t.test('Assigned author may delete their own audit', async () => {
    const audit = await h.audit('assigned');
    assert.equal((await h.request('assigned', 'DELETE', `/audits/${audit.id}`)).status, 200);
    assert.equal(await h.models.Audit.exists({ _id: audit._id }), null);
  });
  for (const status of ['assigned', 'accepted', 'started', 'completed']) await t.test(`${status}: assigned detail/update/delete remain permitted`, async () => {
    const audit = await h.audit('foreign'); await h.assign('assigned', audit, status);
    assert.equal((await h.request('assigned', 'GET', `/audits/${audit.id}`)).status, 200);
    assert.equal((await h.request('assigned', 'PUT', `/audits/${audit.id}`, { comments: status })).status, 200);
    assert.equal((await h.request('assigned', 'DELETE', `/audits/${audit.id}`)).status, 200);
  });
  for (const actor of ['none', 'hr', 'department_missing', 'anonymous']) await t.test(`${actor}: fail closed`, async () => {
    assert.equal((await h.request(actor, 'GET', '/audits')).status, actor === 'anonymous' ? 401 : 403);
  });
  const payload = { id: crypto.randomUUID(), restaurantId: 'local-test', auditType: 'standard', type: 'standard', date: '2026-10-09' };
  for (const endpoint of ['/audits', '/occupational-safety-audits']) await t.test(`${endpoint}: server captures immutable department and owner, ignores client internal id`, async () => {
    const clientId = new h.mongoose.Types.ObjectId();
    const response = await h.request('own', 'POST', endpoint, { ...payload, id: crypto.randomUUID(), _id: String(clientId), auditorId: String(h.actors.foreign._id), departmentId: 'dep_B', departmentSnapshot: 'dep_B' });
    assert.equal(response.status, 201); const audit = response.data.data || response.data;
    assert.notEqual(audit._id, String(clientId)); assert.equal(audit.auditorId, String(h.actors.own._id));
    assert.equal(audit.auditType, endpoint === '/audits' ? 'standard' : 'occupational-safety');
    const snapshot = await Snapshot.findOne({ auditId: audit._id });
    assert.equal(snapshot.departmentId, 'dep_A'); assert.equal(snapshot.auditorId, String(h.actors.own._id));
    assert.equal((await h.request('department', 'GET', `/audits/${audit.id}`)).status, 200);
    await Snapshot.updateOne({ auditId: audit._id }, { $set: { departmentId: 'dep_B', auditorId: 'forged' } });
    assert.equal((await Snapshot.findById(snapshot._id)).departmentId, 'dep_A');
  });
  await t.test('Author department movement never reclassifies old audits; JWT uses fresh viewer department', async () => {
    const first = await h.request('own', 'POST', '/audits', { ...payload, id: crypto.randomUUID() });
    assert.equal(first.status, 201);
    await h.models.User.updateOne({ _id: h.actors.own._id }, { departmentId: 'dep_B' });
    const second = await h.request('own', 'POST', '/audits', { ...payload, id: crypto.randomUUID() });
    assert.equal(second.status, 201);
    assert.equal((await h.request('department', 'GET', `/audits/${first.data.id}`)).status, 200);
    assert.equal((await h.request('department', 'GET', `/audits/${second.data.id}`)).status, 404);
    await h.models.User.updateOne({ _id: h.actors.department._id }, { departmentId: 'dep_B' });
    assert.equal((await h.request('department', 'GET', `/audits/${first.data.id}`)).status, 404);
    assert.equal((await h.request('department', 'GET', `/audits/${second.data.id}`)).status, 200);
    await h.models.User.updateMany({ _id: { $in: [h.actors.own._id, h.actors.department._id] } }, { departmentId: 'dep_A' });
  });
  for (const endpoint of ['/audits', '/occupational-safety-audits']) await t.test(`${endpoint}: validation/duplicate failures leave no snapshot`, async () => {
    const valid = await h.request('own', 'POST', endpoint, { ...payload, id: crypto.randomUUID() }); assert.equal(valid.status, 201);
    const audit = valid.data.data || valid.data, before = await Snapshot.countDocuments();
    assert.equal((await h.request('own', 'POST', endpoint, { ...payload, id: audit.id })).status, 409);
    assert.equal((await h.request('own', 'POST', endpoint, { ...payload, id: crypto.randomUUID(), date: '' })).status, 400);
    assert.equal(await Snapshot.countDocuments(), before);
  });
  await t.test('Snapshot write failure cannot leave a visible unscoped audit', async () => {
    const original = Snapshot.create, before = await h.models.Audit.countDocuments();
    Snapshot.create = async () => { throw Error('Injected local snapshot failure'); };
    try { assert.equal((await h.request('own', 'POST', '/audits', payload)).status, 500); }
    finally { Snapshot.create = original; }
    assert.equal(await h.models.Audit.countDocuments(), before);
  });
  await t.test('Department approval uses trusted snapshot and still rejects legacy forged JSON', async () => {
    assert.equal((await h.request('department', 'POST', '/audit-approval', { auditId: String(records.peer._id) })).status, 201);
    assert.equal((await h.request('department', 'GET', `/audit-approval/${legacy._id}`)).status, 403);
  });
}));
