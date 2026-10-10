const test = require('node:test'), assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Job = require('../models/job.model'), Candidate = require('../models/candidate.model'), Application = require('../models/application.model');

test('Application placement is scoped, persistent and revision controlled', async t => withAuditFixture(async h => {
  for (const scope of ['own', 'department', 'assigned']) await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: ['application', 'candidate', 'recruitment'].map(resource => ({ resource, action: '*', scope })) } });
  const job = await Job.create({ title: 'Ordering vacancy', description: 'Synthetic', department: 'HR', createdBy: h.actors.own._id, assignedTo: h.actors.assigned._id, departmentId: 'dep_A' });
  const otherJob = await Job.create({ title: 'Other vacancy', description: 'Synthetic', department: 'HR' });
  const make = async (owner = 'own', extra = {}) => {
    const candidate = await Candidate.create({ name: 'Synthetic ordering', role: 'Cashier', createdBy: h.actors[owner]._id });
    return Application.create({ jobId: job._id, candidateId: candidate._id, createdBy: h.actors[owner]._id, assignedTo: h.actors[owner]._id, departmentId: h.actors[owner].departmentId, ...extra });
  };
  const anchor = row => ({ id: String(row._id), expectedRevision: row.__v || 0 });
  const place = (actor, row, before, after, extra = {}) => h.request(actor, 'PATCH', `/applications/${row._id}/workflow`, { placement: { before: before && anchor(before), after: after && anchor(after) }, expectedRevision: row.__v || 0, ...extra });
  let first = await make(), middle = await make(), last = await make();
  await t.test('same-stage reorder persists without changing score, decision or stage time', async () => {
    const previous = await Application.findById(last._id).lean();
    const r = await place('own', last, null, first, { commandId: 'ordering-command-0001', status: 'Applied' });
    assert.equal(r.status, 200); assert.ok(r.data.boardOrder); assert.equal(r.data.status, previous.status);
    assert.equal(r.data.stageEnteredAt, previous.stageEnteredAt.toISOString()); assert.equal(r.data.processingState, 'idle');
    const stored = await Application.findById(last._id).lean(); assert.equal(stored.boardOrder, r.data.boardOrder); assert.equal(stored.__v, 1);
    assert.equal(stored.events.at(-1).type, 'reorder'); assert.equal(stored.events.at(-1).actor, String(h.actors.own._id)); assert.equal(stored.events.at(-1).delivery, undefined);
    assert.equal(stored.events.at(-1).after.boardOrder, stored.boardOrder);
    last = stored;
    assert.equal((await h.request('own', 'GET', `/applications/${last._id}`)).data.boardOrder, stored.boardOrder);
  });
  await t.test('idempotent placement replay preserves one event', async () => {
    const replay = await place('own', { ...last, __v: 0 }, null, first, { commandId: 'ordering-command-0001', status: 'Applied' }); assert.equal(replay.status, 200);
    assert.equal((await Application.findById(last._id)).events.length, 1);
    assert.equal((await place('own', last, first, middle, { commandId: 'ordering-command-0001' })).status, 409);
  });
  await t.test('compound status plus placement is one atomic event/revision', async () => {
    const r = await place('own', middle, null, null, { status: 'Screening' }); assert.equal(r.status, 200);
    assert.equal(r.data.status, 'Screening'); assert.equal(r.data.__v, 1);
    middle = await Application.findById(middle._id).lean(); assert.equal(middle.events.length, 1); assert.equal(middle.events[0].type, 'status');
  });
  await t.test('stale target and neighbor revisions return 409 without a second write', async () => {
    assert.equal((await place('own', { ...last, __v: 0 }, null, first)).status, 409);
    const stale = { ...first.toObject(), __v: 7 }; assert.equal((await place('own', last, null, stale)).status, 409);
    assert.equal((await Application.findById(last._id)).__v, 1);
  });
  await t.test('anchors must be adjacent within the readable cohort', async () => {
    const extra = await make(); assert.equal((await place('own', first, last, extra)).status, 200);
    first = await Application.findById(first._id);
    const another = await make(); assert.equal((await place('own', first, last, another)).status, 409);
    assert.equal((await place('own', another, null, null)).status, 409);
  });
  await t.test('foreign, wrong-vacancy and wrong-stage anchors are indistinguishable 404', async () => {
    for (const row of [await make('foreign'), await make('own', { jobId: otherJob._id }), middle]) assert.equal((await place('own', first, null, row)).status, 404);
  });
  await t.test('own, department and assigned obey independent application boundaries', async () => {
    for (const actor of ['own', 'department', 'assigned']) {
      const hidden = await make('foreign'); assert.equal((await place(actor, hidden, null, null)).status, 404);
      const scopedJob = await Job.create({ title: actor, description: 'Synthetic', department: 'HR', createdBy: h.actors[actor]._id, assignedTo: h.actors[actor]._id, departmentId: 'dep_A' });
      const row = await make(actor, { jobId: scopedJob._id }); assert.equal((await place(actor, row, null, null)).status, 200);
    }
  });
  await t.test('admin/all can place foreign rows without weakening parent scope', async () => {
    const isolated = await Job.create({ title: 'Foreign vacancy', description: 'Synthetic', department: 'HR' });
    const foreign = await make('foreign', { jobId: isolated._id, boardOrder: 'a2V' }); assert.equal((await place('admin', foreign, null, null)).status, 200);
    const denied = await make('own', { jobId: isolated._id }); assert.equal((await place('own', denied, null, foreign)).status, 404);
    assert.equal((await h.request('own', 'PATCH', `/applications/${denied._id}/status`, { status: 'Screening' })).status, 200);
  });
  await t.test('processing is server-managed and terminal reorder cannot reopen a decision', async () => {
    const row = await make('own', { jobId: otherJob._id, status: 'Hired' });
    assert.equal((await place('admin', row, null, null)).status, 200); assert.equal((await Application.findById(row._id)).status, 'Hired');
    assert.equal((await place('admin', await make('own', { processingState: 'running' }), null, null)).status, 409);
    assert.equal((await place('admin', row, null, null, { status: 'Applied' })).status, 400);
  });
  await t.test('malformed anchors, fake keys, missing revision and self anchors fail closed', async () => {
    for (const placement of [{}, { before: null, after: null, key: 'admin' }, { before: anchor(first), after: null }, { before: { id: String(last._id) }, after: null }, { before: 'invalid', after: null }]) {
      assert.equal((await h.request('own', 'PATCH', `/applications/${first._id}/workflow`, { expectedRevision: first.__v, placement })).status, 400);
    }
    assert.equal((await h.request('own', 'PATCH', `/applications/${first._id}/workflow`, { placement: { before: null, after: null } })).status, 400);
    assert.equal((await h.request('own', 'PATCH', `/applications/${first._id}/workflow`, { boardOrder: 'spoofed', status: 'Applied' })).status, 400);
    assert.equal((await place('anonymous', first, null, null)).status, 401); assert.equal((await place('none', first, null, null)).status, 403);
  });
  await t.test('independent read/update grants and assignment revocation are enforced with old JWT', async () => {
    await h.models.Role.create({ key: 'order_mixed', name: 'Ordering mixed', permissions: [{ resource: 'application', action: 'update', scope: 'all' }, { resource: 'application', action: 'read', scope: 'own' }, { resource: 'recruitment', action: 'read', scope: 'all' }] });
    await h.models.User.updateOne({ _id: h.actors.own._id }, { role: 'order_mixed' });
    assert.equal((await place('own', await make('foreign'), null, null)).status, 404);
    await h.models.User.updateOne({ _id: h.actors.own._id }, { role: 'test_own' });
    const row = await make('assigned'); await Application.updateOne({ _id: row._id }, { assignedTo: h.actors.admin._id }); assert.equal((await place('assigned', row, null, null)).status, 404);
  });
  await t.test('concurrent writes to one application cannot lose an ordering event', async () => {
    const isolatedJob = await Job.create({ title: 'Concurrent', department: 'HR', description: 'Synthetic' });
    const row = await make('own', { jobId: isolatedJob._id, boardOrder: 'a2V' });
    const r = await Promise.all(['ordering-parallel-01', 'ordering-parallel-02'].map(commandId => place('admin', row, null, null, { commandId })));
    assert.deepEqual(r.map(v => v.status).sort(), [200, 409]); assert.equal((await Application.findById(row._id)).events.length, 1);
  });
  await t.test('legacy rows use a stable fallback without a bulk rewrite', async () => {
    const isolatedJob = await Job.create({ title: 'Legacy order', department: 'HR', description: 'Synthetic' });
    const a = await make('own', { jobId: isolatedJob._id }), b = await make('own', { jobId: isolatedJob._id });
    await Application.collection.updateMany({ jobId: isolatedJob._id }, { $unset: { boardOrder: '' } });
    const r = await place('admin', b, null, a); assert.equal(r.status, 200);
    const { orderKey } = require('../services/applicationOrdering.service'); assert.ok(r.data.boardOrder < orderKey(a));
    assert.equal((await Application.collection.findOne({ _id: a._id })).boardOrder, undefined);
  });
  await t.test('placement replay cannot regain a newly revoked read grant', async () => {
    const isolatedJob = await Job.create({ title: 'Replay scope', department: 'HR', description: 'Synthetic', createdBy: h.actors.own._id });
    const row = await make('own', { jobId: isolatedJob._id, boardOrder: 'a2V' }); const commandId = 'ordering-revoked-replay';
    assert.equal((await place('own', row, null, null, { commandId })).status, 200);
    await h.models.Role.create({ key: 'order_write_only', name: 'Ordering write only', permissions: [{ resource: 'application', action: 'update', scope: 'all' }, { resource: 'recruitment', action: 'read', scope: 'all' }] });
    await h.models.User.updateOne({ _id: h.actors.own._id }, { role: 'order_write_only' });
    assert.equal((await place('own', row, null, null, { commandId })).status, 404);
  });
}));

test('Fractional ordering stays strictly bounded and collision-free under repeated insertions', () => {
  const { placementKey, orderKey, MAX_KEY } = require('../services/applicationOrdering.service');
  const oid = i => i.toString(16).padStart(24, '0');
  let lower = null, upper = null;
  for (let i = 1; i <= 50000; i++) { const key = placementKey(lower, upper, oid(i)); assert.ok(!lower || lower < key); assert.ok(key.length <= MAX_KEY); lower = key; }
  upper = orderKey({ _id: oid(50001) }); lower = null;
  for (let i = 50002; i <= 50502; i++) { const key = placementKey(lower, upper, oid(i)); assert.ok(key < upper); upper = key; }
  lower = orderKey({ _id: oid(60000) }); upper = orderKey({ _id: oid(60001) });
  const concurrent = new Set();
  for (let i = 60002; i <= 61002; i++) { const key = placementKey(lower, upper, oid(i)); assert.ok(lower < key && key < upper); assert.ok(!concurrent.has(key)); concurrent.add(key); }
  for (let i = 61003; i < 61103; i++) { const key = placementKey(lower, upper, oid(i)); assert.ok(lower < key && key < upper); upper = key; }
  let limit;
  for (let i = 61103; i < 70000; i++) { try { upper = placementKey(lower, upper, oid(i)); } catch (e) { limit = e; break; } }
  assert.equal(limit?.status, 409); assert.equal(limit?.code, 'ORDER_LIMIT');
});
