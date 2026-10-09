const test = require('node:test');
const assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');

test('Approval parent authorization', async t => withAuditFixture(async h => {
  const own = await h.audit('assigned'), foreign = await h.audit('foreign');
  const ordinary = await h.models.Approval.create({ auditId: own._id, requestedBy: h.actors.assigned._id, status: 'pending' });
  const crafted = await h.models.Approval.create({ _id: own._id, auditId: foreign._id, requestedBy: h.actors.assigned._id, status: 'pending' });
  const finding = await h.models.Finding.create({ auditId: foreign._id, title: 'Foreign finding' });
  const action = await h.models.Action.create({ auditId: foreign._id, title: 'Foreign action' });

  await t.test('Legitimate assigned approval update resolves its actual parent', async () => {
    const response = await h.request('assigned', 'PATCH', `/audit-approval/${ordinary._id}`, { status: 'pending', comment: 'authorized' });
    assert.equal(response.status, 200); assert.equal(response.data.data.comment, 'authorized');
  });
  await t.test('Chosen child ID cannot authorize a different owned Audit', async () => {
    const before = await h.models.Approval.findById(crafted._id).lean();
    const count = await h.models.Activity.countDocuments();
    const response = await h.request('assigned', 'PATCH', `/audit-approval/${crafted._id}`, { auditId: String(own._id), status: 'pending', comment: 'forbidden' });
    assert.equal(response.status, 403); assert.deepEqual(await h.models.Approval.findById(crafted._id).lean(), before);
    assert.equal(await h.models.Activity.countDocuments(), count);
  });
  for (const status of ['assigned', 'accepted', 'started', 'completed']) await t.test(`${status} assignment allows actual parent workflow, removal revokes it`, async () => {
    const assignment = await h.assign('assigned', foreign, status);
    assert.equal((await h.request('assigned', 'PATCH', `/audit-approval/${crafted._id}`, { status: 'pending', comment: status })).status, 200);
    await h.models.Assignment.deleteOne({ _id: assignment._id });
    const before = await h.models.Approval.findById(crafted._id).lean();
    const notifications = await h.models.Notification.countDocuments();
    assert.equal((await h.request('assigned', 'GET', `/audit-approval/${foreign._id}`)).status, 403);
    assert.equal((await h.request('assigned', 'PATCH', `/audit-approval/${crafted._id}`, { status: 'approved', comment: 'revoked' })).status, 403);
    assert.deepEqual(await h.models.Approval.findById(crafted._id).lean(), before);
    assert.equal(await h.models.Notification.countDocuments(), notifications);
  });
  await t.test('Create uses server-generated ID and authenticated requester', async () => {
    const clientId = new h.mongoose.Types.ObjectId();
    const response = await h.request('assigned', 'POST', '/audit-approval', { _id: String(clientId), auditId: String(own._id), requestedBy: String(h.actors.admin._id), status: 'pending' });
    assert.equal(response.status, 201); assert.notEqual(response.data.data._id, String(clientId));
    assert.equal(response.data.data.requestedBy, String(h.actors.assigned._id));
  });
  for (const field of ['findingId', 'actionId']) await t.test(`${field} must refer to the same parent audit`, async () => {
    const before = await h.models.Approval.countDocuments();
    const response = await h.request('assigned', 'POST', '/audit-approval', { auditId: String(own._id), [field]: String(field === 'findingId' ? finding._id : action._id) });
    assert.equal(response.status, 400); assert.equal(await h.models.Approval.countDocuments(), before);
  });
  await t.test('Matching linked records preserve the create workflow', async () => {
    const response = await h.request('admin', 'POST', '/audit-approval', { auditId: String(foreign._id), findingId: String(finding._id), actionId: String(action._id) });
    assert.equal(response.status, 201); assert.equal(response.data.data.auditId, String(foreign._id));
  });
  await t.test('Own scope permits own approval and denies foreign parent', async () => {
    const parent = await h.audit('own');
    const approval = await h.models.Approval.create({ auditId: parent._id });
    assert.equal((await h.request('own', 'PATCH', `/audit-approval/${approval._id}`, { status: 'pending' })).status, 200);
    assert.equal((await h.request('own', 'PATCH', `/audit-approval/${crafted._id}`, { status: 'pending' })).status, 403);
  });
  await t.test('Department cannot use untrusted legacy audit metadata', async () => {
    await h.models.Audit.updateOne({ _id: foreign._id }, { $set: { departmentId: 'dep_A', auditScopeDepartmentId: 'dep_A', auditScopeVersion: 1 } });
    assert.equal((await h.request('department', 'PATCH', `/audit-approval/${crafted._id}`, { status: 'pending' })).status, 403);
  });
  await t.test('All scope preserves approved/rejected and comment-only timestamp', async () => {
    const approved = await h.request('admin', 'PATCH', `/audit-approval/${ordinary._id}`, { status: 'approved' });
    assert.equal(approved.status, 200); assert.ok(approved.data.data.approvedAt);
    const comment = await h.request('admin', 'PATCH', `/audit-approval/${ordinary._id}`, { comment: 'only comment' });
    assert.equal(comment.status, 200); assert.equal(comment.data.data.approvedAt, approved.data.data.approvedAt);
    assert.equal((await h.request('admin', 'PATCH', `/audit-approval/${ordinary._id}`, { status: 'rejected' })).status, 200);
  });
  await t.test('Invalid status is rejected without mutation', async () => {
    const before = await h.models.Approval.findById(ordinary._id).lean();
    assert.equal((await h.request('admin', 'PATCH', `/audit-approval/${ordinary._id}`, { status: 'invalid' })).status, 400);
    assert.deepEqual(await h.models.Approval.findById(ordinary._id).lean(), before);
  });
  await t.test('401/403/400/404 and missing parents fail safely', async () => {
    assert.equal((await h.request('anonymous', 'PATCH', `/audit-approval/${ordinary._id}`, { status: 'approved' })).status, 401);
    assert.equal((await h.request('none', 'PATCH', `/audit-approval/${ordinary._id}`, { status: 'approved' })).status, 403);
    assert.equal((await h.request('admin', 'PATCH', '/audit-approval/invalid', {})).status, 400);
    assert.equal((await h.request('admin', 'PATCH', `/audit-approval/${new h.mongoose.Types.ObjectId()}`, {})).status, 404);
    assert.equal((await h.request('admin', 'POST', '/audit-approval', {})).status, 400);
    assert.equal((await h.request('admin', 'POST', '/audit-approval', { auditId: String(new h.mongoose.Types.ObjectId()) })).status, 404);
  });
}));
