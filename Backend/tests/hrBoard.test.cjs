const test = require('node:test'), assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Job = require('../models/job.model'), Candidate = require('../models/candidate.model'), Application = require('../models/application.model');
test('Bounded board has complete scoped lane counts and independent cursor pages', async t => withAuditFixture(async h => {
  for (const scope of ['own', 'department', 'assigned']) await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: ['application', 'candidate', 'recruitment'].map(resource => ({ resource, action: '*', scope })) } });
  const job = await Job.create({ title: 'Board vacancy', department: 'HR', description: 'SENSITIVE_JOB', createdBy: h.actors.own._id, assignedTo: h.actors.assigned._id, departmentId: 'dep_A', brandId: 'kfc' });
  const states = ['Applied', 'processing', 'Screening', 'Shortlisted', 'Interview', 'Offered', 'Hired', 'Rejected'];
  const make = async (owner, lane, index = 0, extra = {}) => {
    const candidate = await Candidate.create({ name: `Board ${owner} ${lane} ${index}`, role: 'Cashier', email: `synthetic-${index}@example.invalid`, phone: '+994501234567', createdBy: h.actors[owner]._id, assignedTo: h.actors[owner]._id, departmentId: h.actors[owner].departmentId });
    return Application.create({ jobId: job._id, candidateId: candidate._id, createdBy: h.actors[owner]._id, assignedTo: h.actors[owner]._id, departmentId: h.actors[owner].departmentId, status: lane === 'processing' ? 'Applied' : lane, processingState: lane === 'processing' ? 'running' : 'idle', notes: 'SENSITIVE_NOTES', ...extra });
  };
  for (const lane of states) for (let i = 0; i < 13; i++) await make('own', lane, i);
  for (const lane of states) await make('foreign', lane, 100);
  const get = (actor, query = '') => h.request(actor, 'GET', '/hr/v2/application-board' + query);
  let first;
  await t.test('initial request returns eight bounded lanes with complete counts', async () => {
    const r = await get('own', `?jobId=${job._id}`); assert.equal(r.status, 200); first = r.data;
    assert.equal(first.version, 'hr-board-v1'); assert.equal(first.total, 104); assert.equal(first.manualOrder, true);
    assert.deepEqual(Object.keys(first.columns).sort(), [...states].sort());
    for (const lane of states) { const c = first.columns[lane]; assert.equal(c.total, 13); assert.equal(c.items.length, 10); assert.equal(c.page, 1); assert.equal(c.before, null); assert.ok(c.after.id); assert.ok(c.nextCursor); assert.equal(c.hasMore, true); }
    const text = JSON.stringify(first); for (const secret of ['SENSITIVE_JOB', 'SENSITIVE_NOTES', 'synthetic-', '+994', '"events"', '"jobHash"', '"candidateHash"']) assert.ok(!text.includes(secret), secret);
  });
  await t.test('lane-specific second page has stable neighbor anchors and no duplicate cards', async () => {
    const c = first.columns.Applied, r = await get('own', `?jobId=${job._id}&stage=Applied&after=${c.nextCursor}`); assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(r.data.columns), ['Applied']); const second = r.data.columns.Applied;
    assert.equal(second.page, 2); assert.equal(second.total, 13); assert.equal(second.items.length, 3); assert.equal(second.hasMore, false); assert.equal(second.after, null);
    assert.equal(second.before.id, c.items.at(-1)._id); assert.equal(second.items[0]._id, c.after.id);
    assert.equal(new Set([...c.items, ...second.items].map(a => a._id)).size, 13);
  });
  await t.test('overview uses newest order and disables manual grouping across vacancies', async () => {
    const r = await get('admin'); assert.equal(r.status, 200); assert.equal(r.data.total, 112); assert.equal(r.data.manualOrder, false);
    const rows = r.data.columns.Applied.items; assert.equal(rows[0].candidateId.name, 'Board foreign Applied 100');
  });
  await t.test('scope counts exclude foreign records for own and department', async () => {
    for (const actor of ['own', 'department']) { const r = await get(actor, `?jobId=${job._id}`); assert.equal(r.status, 200); assert.equal(r.data.total, 104); }
    const r = await get('assigned', `?jobId=${job._id}`); assert.equal(r.status, 200); assert.equal(r.data.total, 0);
  });
  await t.test('hidden and nonexistent Job filters return identical 404', async () => {
    const hidden = await Job.create({ title: 'Hidden', department: 'HR', description: 'Synthetic', createdBy: h.actors.foreign._id });
    assert.equal((await get('own', `?jobId=${hidden._id}`)).status, 404); assert.equal((await get('own', `?jobId=${new h.mongoose.Types.ObjectId()}`)).status, 404);
  });
  await t.test('independent unreadable parents are redacted without losing readable Application cards', async () => {
    await h.models.Role.create({ key: 'board_mixed', name: 'Board mixed', permissions: [{ resource: 'application', action: 'read', scope: 'all' }, { resource: 'candidate', action: 'read', scope: 'assigned' }, { resource: 'recruitment', action: 'read', scope: 'own' }] });
    await h.models.User.updateOne({ _id: h.actors.peer._id }, { role: 'board_mixed' });
    const r = await get('peer'); assert.equal(r.status, 200); assert.equal(r.data.total, 112);
    for (const row of Object.values(r.data.columns).flatMap(c => c.items)) { assert.equal(row.candidateId, null); assert.equal(row.jobId, null); assert.equal(row.score, null); assert.equal(row.scoreStatus, 'restricted'); }
    assert.equal((await get('peer', `?jobId=${job._id}`)).status, 404);
  });
  await t.test('forged, borrowed and filter-mismatched cursors fail closed', async () => {
    const cursor = first.columns.Applied.nextCursor;
    for (const query of [`?jobId=${job._id}&stage=Applied&after=${cursor.slice(0,-1)}X`, `?jobId=${job._id}&stage=Screening&after=${cursor}`, `?jobId=${job._id}&stage=Applied&pageSize=5&after=${cursor}`]) assert.equal((await get('own', query)).status, 400);
    assert.equal((await get('admin', `?jobId=${job._id}&stage=Applied&after=${cursor}`)).status, 400);
  });
  await t.test('changed cursor boundary returns visible 409 restart instead of silently skipping rows', async () => {
    const c = first.columns.Screening, id = c.items.at(-1)._id;
    await Application.updateOne({ _id: id }, { $inc: { __v: 1 } });
    const r = await get('own', `?jobId=${job._id}&stage=Screening&after=${c.nextCursor}`); assert.equal(r.status, 409); assert.equal(r.data.code, 'BOARD_CHANGED');
  });
  await t.test('filters use only independently readable parent facts', async () => {
    const r = await get('own', '?q=Board%20own%20Applied%200&brandId=kfc'); assert.equal(r.status, 200); assert.equal(r.data.total, 1);
    const denied = await get('peer', '?q=Board'); assert.equal(denied.status, 200); assert.equal(denied.data.total, 0);
    const filtered = await get('own', `?jobId=${job._id}&status=Processing`); assert.equal(filtered.data.total, 13); assert.equal(filtered.data.manualOrder, false);
  });
  await t.test('empty vacancy has explicit zero lanes without fabricated cards or scores', async () => {
    const empty = await Job.create({ title: 'Empty', department: 'HR', description: 'Synthetic', createdBy: h.actors.own._id });
    const r = await get('own', `?jobId=${empty._id}`); assert.equal(r.status, 200); assert.equal(r.data.total, 0);
    for (const column of Object.values(r.data.columns)) { assert.deepEqual(column.items, []); assert.equal(column.total, 0); assert.equal(column.hasMore, false); assert.equal(column.nextCursor, null); }
  });
  await t.test('permission revocation during aggregate prevents final rows/counts', async () => {
    const aggregate = Application.aggregate, saved = await h.models.Role.findOne({ key: 'test_own' }).lean();
    let entered, release; const ready = new Promise(r => entered = r), gate = new Promise(r => release = r);
    Application.aggregate = function (...args) { const operation = aggregate.apply(this, args), exec = operation.exec; if (args[0].some(step => step.$facet)) operation.exec = async function (...values) { const rows = await exec.apply(this, values); entered(); await gate; return rows; }; return operation; };
    try {
      const pending = get('own', `?jobId=${job._id}`); await ready;
      await h.models.Role.updateOne({ _id: saved._id }, { permissions: [{ resource: 'application', action: 'read', scope: 'none' }] }); release();
      const r = await pending; assert.equal(r.status, 403); assert.equal(r.data.columns, undefined); assert.equal(r.data.total, undefined);
    } finally { release(); Application.aggregate = aggregate; await h.models.Role.updateOne({ _id: saved._id }, { permissions: saved.permissions }); }
  });
  await t.test('page caps, malformed requests, 401/403 and old JWT role changes are enforced', async () => {
    for (const query of ['?pageSize=31', '?pageSize=0', '?stage=Unknown', '?after=forged', '?jobId=bad', '?unbounded=true']) assert.equal((await get('admin', query)).status, 400);
    assert.equal((await get('anonymous')).status, 401); assert.equal((await get('none')).status, 403);
    await h.models.User.updateOne({ _id: h.actors.own._id }, { role: 'test_none' }); assert.equal((await get('own')).status, 403);
  });
}));
