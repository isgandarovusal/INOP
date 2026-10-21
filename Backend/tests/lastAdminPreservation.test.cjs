const { test } = require('node:test');
const assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');

test('last active administrator survives delete, demotion and deactivation, including concurrent removals', async () => withAuditFixture(async h => {
  const { User, Role } = h.models;
  await Role.create({ key: 'preservation_operator', name: 'Preservation operator', permissions: [
    { resource: 'user', action: '*', scope: 'all' }, { resource: 'role', action: 'update', scope: 'all' },
  ] });
  await User.updateOne({ _id: h.actors.own._id }, { role: 'preservation_operator' });
  const id = String(h.actors.admin._id);
  const before = await User.findById(id).lean();
  for (const [method, endpoint, body] of [
    ['DELETE', `/users/${id}`], ['PUT', `/users/${id}`, { role: 'employee' }],
    ['PATCH', `/users/${id}/status`, { isActive: false }],
  ]) {
    const result = await h.request('own', method, endpoint, body);
    assert.equal(result.status, 409, `${method} must preserve the last active administrator`);
    assert.deepEqual(await User.findById(id).lean(), before);
  }
  // A broad user.delete grant alone cannot remove a privileged account.
  await Role.create({ key: 'delete_only', name: 'Delete only', permissions: [{ resource: 'user', action: 'delete', scope: 'all' }] });
  await User.updateOne({ _id: h.actors.peer._id }, { role: 'delete_only' });
  assert.equal((await h.request('peer', 'DELETE', `/users/${id}`)).status, 403);
  // Exercise races on different records: count-then-write alone is insufficient.
  for (const operations of [
    [['DELETE'], ['DELETE']],
    [['PUT', { role: 'employee' }], ['PATCH', { isActive: false }]],
    [['PATCH', { isActive: false }], ['DELETE']],
  ]) {
    await User.updateMany({ _id: { $in: [h.actors.admin._id, h.actors.foreign._id] } }, { role: 'admin', isActive: true });
    if (!await User.exists({ _id: h.actors.admin._id })) await User.create({ ...before, password: h.actors.admin.password });
    if (!await User.exists({ _id: h.actors.foreign._id })) await User.create({ ...before, password: h.actors.admin.password, _id: h.actors.foreign._id, email: 'foreign@example.invalid' });
    const results = await Promise.all(operations.map(([method, body], i) => {
      const target = i ? h.actors.foreign._id : h.actors.admin._id;
      return h.request('own', method, `/users/${target}${method === 'PATCH' ? '/status' : ''}`, body);
    }));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    assert.equal(await User.countDocuments({ role: 'admin', isActive: true }), 1);
  }
}, { canonicalHR: true }));
