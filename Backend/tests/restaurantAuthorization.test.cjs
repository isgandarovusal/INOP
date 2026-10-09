const test = require('node:test');
const assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Restaurant = require('../models/restaurant.model');

test('Restaurant access requires an explicit global grant until trusted scoped provenance exists', async t => withAuditFixture(async h => {
  await Restaurant.createIndexes();
  for (const scope of ['own', 'department', 'assigned']) {
    await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: { resource: 'restaurant', action: '*', scope } } });
  }
  const foreign = await Restaurant.create({ id: 'foreign-restaurant', name: 'Foreign private label', location: 'Foreign location' });
  const endpoints = [
    ['GET', '/restaurants'], ['GET', `/restaurants/${foreign.id}`],
    ['POST', '/restaurants', { id: 'forged-new', name: 'Denied', createdBy: String(h.actors.own._id), departmentId: 'dep_A' }],
    ['PUT', `/restaurants/${foreign.id}`, { name: 'Denied update', departmentId: 'dep_A' }],
    ['DELETE', `/restaurants/${foreign.id}`],
  ];
  for (const actor of ['own', 'department', 'assigned', 'none', 'hr', 'anonymous']) {
    for (const [method, endpoint, body] of endpoints) await t.test(`${actor}: ${method} ${endpoint} denies data and writes`, async () => {
      const before = await Restaurant.find().sort({ _id: 1 }).lean();
      const response = await h.request(actor, method, endpoint, body);
      assert.equal(response.status, actor === 'anonymous' ? 401 : 403);
      assert.equal(JSON.stringify(response.data).includes(foreign.name), false);
      assert.deepEqual(await Restaurant.find().sort({ _id: 1 }).lean(), before);
    });
  }
  for (const actor of ['admin', 'auditor']) await t.test(`${actor}: explicit all preserves create/list/detail/update/delete envelopes`, async () => {
    const id = `global-${actor}`;
    const create = await h.request(actor, 'POST', '/restaurants', { id, name: 'Permitted' });
    assert.equal(create.status, 201); assert.equal(create.data.id, id);
    const list = await h.request(actor, 'GET', '/restaurants');
    assert.equal(list.status, 200); assert.ok(Array.isArray(list.data));
    assert.ok(list.data.some(item => item.id === foreign.id));
    assert.equal((await h.request(actor, 'GET', `/restaurants/${id}`)).data.name, 'Permitted');
    assert.equal((await h.request(actor, 'PUT', `/restaurants/${id}`, { name: 'Updated' })).data.name, 'Updated');
    assert.equal((await h.request(actor, 'DELETE', `/restaurants/${id}`)).status, 200);
    assert.equal(await Restaurant.exists({ id }), null);
  });
  await t.test('read-only all grant does not authorize write actions', async () => {
    await h.models.User.updateOne({ _id: h.actors.peer._id }, { $set: { role: 'manager' } });
    assert.equal((await h.request('peer', 'GET', '/restaurants')).status, 200);
    for (const [method, endpoint, body] of endpoints.slice(2)) assert.equal((await h.request('peer', method, endpoint, body)).status, 403);
  });
  await t.test('revoked grant is checked against current role even with the original JWT', async () => {
    await h.models.Role.updateOne({ key: 'auditor' }, { $pull: { permissions: { resource: 'restaurant' } } });
    assert.equal((await h.request('auditor', 'GET', `/restaurants/${foreign.id}`)).status, 403);
  });
  await t.test('dashboard restaurant lookup hides labels without all; counts include only authorized audits', async () => {
    await h.audit('own', 'service', { restaurantId: 'owned-audit-restaurant' });
    await h.audit('foreign', 'service', { restaurantId: foreign.id });
    const response = await h.request('own', 'GET', '/audits/dashboard-summary');
    assert.equal(response.status, 200);
    assert.equal(response.data.restaurantsAudited, 1);
    assert.equal(JSON.stringify(response.data).includes(foreign.id), false);
    assert.equal(JSON.stringify(response.data).includes(foreign.name), false);
    assert.ok(response.data.restaurantComparison.every(item => item.name === 'Unknown'));
  });
  await t.test('global missing/invalid status behavior remains unchanged', async () => {
    assert.equal((await h.request('admin', 'GET', '/restaurants/missing')).status, 404);
    assert.equal((await h.request('admin', 'PUT', `/restaurants/${foreign.id}`, { status: 'invalid' })).status, 400);
  });
}));
