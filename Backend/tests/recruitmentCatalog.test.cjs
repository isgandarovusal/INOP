const test = require('node:test'), assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Job = require('../models/job.model');

test('Recruitment brands and locations preserve independent scope and legacy vacancies', async t => withAuditFixture(async h => {
  for (const scope of ['own', 'department', 'assigned', 'none']) await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: { resource: 'recruitment', action: '*', scope } } });
  const payload = { title: 'Cashier', description: 'Restaurant operations', department: 'Operations', brandId: 'kfc' };
  let first, second;
  await t.test('default catalog contains exactly the approved three brands without creating DB records', async () => {
    const r = await h.request('admin', 'GET', '/hr/brands'); assert.equal(r.status, 200);
    assert.deepEqual(r.data.map(b => b.name), ['KFC', 'Pizza Hut', 'Simit Sarayı']);
  });
  await t.test('HR creates a scoped branch and a vacancy referring to it', async () => {
    const r = await h.request('admin', 'POST', '/hr/branches', { code: 'kfc-central', name: 'Central', brandId: 'kfc', kind: 'restaurant', location: 'Baku', departmentId: 'forged', createdBy: h.actors.foreign._id });
    assert.equal(r.status, 201); first = r.data;
    assert.equal(first.departmentId, h.actors.admin.departmentId); assert.equal(first.createdBy, String(h.actors.admin._id));
    const job = await h.request('admin', 'POST', '/jobs', { ...payload, branchId: first._id }); assert.equal(job.status, 201);
    const read = await h.request('admin', 'GET', `/jobs/${job.data._id}`); assert.equal(read.data.brandName, 'KFC'); assert.equal(read.data.branchName, 'Central');
    second = (await h.request('admin', 'POST', '/hr/branches', { code: 'kfc-west', name: 'West', brandId: 'kfc', kind: 'restaurant' })).data;
    const other = await h.request('admin', 'POST', '/jobs', { ...payload, branchId: second._id }); assert.equal(other.status, 201); assert.notEqual(job.data.branchId, other.data.branchId);
  });
  await t.test('office and warehouse locations need no invented brand', async () => {
    for (const kind of ['office', 'warehouse']) {
      const r = await h.request('admin', 'POST', '/hr/branches', { code: 'central-' + kind, name: 'GFC ' + kind, kind }); assert.equal(r.status, 201); assert.equal(r.data.brandId, null);
      const job = await h.request('admin', 'POST', '/jobs', { ...payload, brandId: null, branchId: r.data._id }); assert.equal(job.status, 201); assert.equal(job.data.brandId, null);
    }
  });
  await t.test('catalog extends without code edits, duplicate keys return 409', async () => {
    const r = await h.request('admin', 'POST', '/hr/brands', { id: 'future-brand', name: 'Future Brand' }); assert.equal(r.status, 201);
    assert.equal((await h.request('admin', 'POST', '/hr/brands', { id: 'future-brand', name: 'Duplicate' })).status, 409);
    assert.equal((await h.request('admin', 'POST', '/hr/brands', { id: 'kfc', name: 'Overwrite' })).status, 409);
    assert.equal((await h.request('admin', 'POST', '/hr/branches', { code: 'future', name: 'Future branch', brandId: 'future-brand', kind: 'restaurant' })).status, 201);
  });
  await t.test('invalid brand, mismatched brand/branch, bad ID and inactive new links are rejected', async () => {
    for (const changes of [{ brandId: 'unknown' }, { brandId: 'pizza-hut', branchId: first._id }, { branchId: 'invalid' }]) assert.equal((await h.request('admin', 'POST', '/jobs', { ...payload, ...changes })).status, 400);
    assert.equal((await h.request('admin', 'PUT', `/hr/branches/${second._id}`, { status: 'inactive' })).status, 200);
    assert.equal((await h.request('admin', 'POST', '/jobs', { ...payload, branchId: second._id })).status, 400);
  });
  await t.test('legacy job stays unbranded through read and unrelated edit', async () => {
    const job = await Job.create({ title: 'Legacy', department: 'HR', description: 'Legacy', createdBy: h.actors.admin._id });
    const r = await h.request('admin', 'PUT', `/jobs/${job._id}`, { title: 'Legacy edited' }); assert.equal(r.status, 200); assert.equal(r.data.brandId, null); assert.equal(r.data.branchId, null);
  });
  await t.test('brand and branch filters remain scoped and malformed filters return 400', async () => {
    const r = await h.request('admin', 'GET', '/jobs?brandId=kfc&branchId=' + first._id); assert.equal(r.status, 200); assert.ok(r.data.length); assert.ok(r.data.every(j => j.brandId === 'kfc' && j.branchId === first._id));
    assert.equal((await h.request('admin', 'GET', '/jobs?branchId=bad')).status, 400);
  });
  const owned = {};
  for (const actor of ['own', 'peer', 'foreign', 'assigned']) await t.test(`${actor} creates a branch with server provenance`, async () => {
    const r = await h.request(actor, 'POST', '/hr/branches', { code: 'branch-' + actor, name: actor + ' branch', brandId: 'kfc', kind: 'restaurant' }); assert.equal(r.status, 201); owned[actor] = r.data;
  });
  for (const [actor, allowed, denied] of [['own', 'own', 'peer'], ['department', 'peer', 'foreign'], ['assigned', 'assigned', 'own']]) await t.test(`${actor} branch CRUD and Job linking cannot cross scope`, async () => {
    const r = await h.request(actor, 'GET', '/hr/branches'); assert.equal(r.status, 200); assert.ok(r.data.some(b => b._id === owned[allowed]._id)); assert.ok(!r.data.some(b => b._id === owned[denied]._id));
    for (const method of ['GET', 'PUT', 'DELETE']) assert.equal((await h.request(actor, method, `/hr/branches/${owned[denied]._id}`, method === 'PUT' ? { name: 'Forbidden' } : undefined)).status, 404);
    assert.equal((await h.request(actor, 'POST', '/jobs', { ...payload, branchId: owned[denied]._id })).status, 400);
    assert.equal((await h.request(actor, 'POST', '/jobs', { ...payload, branchId: owned[allowed]._id })).status, 201);
    assert.equal((await h.request(actor, 'POST', '/hr/brands', { id: actor + '-brand', name: 'Unauthorized global change' })).status, 403);
  });
  await t.test('none is 403; anonymous is 401; invalid branch kind is 400', async () => {
    assert.equal((await h.request('none', 'GET', '/hr/brands')).status, 403);
    assert.equal((await h.request('anonymous', 'GET', '/hr/branches')).status, 401);
    assert.equal((await h.request('admin', 'POST', '/hr/branches', { code: 'bad', name: 'bad', kind: 'invented' })).status, 400);
  });
  await t.test('application parent contract includes authorized brand/branch references', async () => {
    const job = await h.request('admin', 'POST', '/jobs', { ...payload, branchId: first._id });
    const candidate = await h.request('admin', 'POST', '/candidates', { name: 'Applicant', role: 'Cashier' });
    const app = await h.request('admin', 'POST', '/applications', { candidateId: candidate.data._id, jobId: job.data._id }); assert.equal(app.status, 201);
    const r = await h.request('admin', 'GET', '/applications/' + app.data._id); assert.equal(r.data.jobId.brandId, 'kfc'); assert.equal(r.data.jobId.branchId, first._id);
    assert.equal(r.data.jobId.branchName, 'Central'); assert.equal(r.data.jobId.brandName, 'KFC');
  });
  await t.test('revoked branch visibility redacts its label without broadening an owned Job', async () => {
    const job = await Job.create({ ...payload, branchId: owned.foreign._id, createdBy: h.actors.own._id, departmentId: 'dep_A' });
    const r = await h.request('own', 'GET', '/jobs/' + job._id); assert.equal(r.status, 200); assert.equal(r.data.branchName, null);
    assert.equal(r.data.brandName, 'KFC');
    const list = await h.request('own', 'GET', '/jobs?brandId=kfc'); assert.ok(list.data.every(j => j.createdBy === String(h.actors.own._id)));
    assert.equal((await h.request('admin', 'POST', '/jobs', { ...payload, branchId: '' })).status, 400);
  });
}));
