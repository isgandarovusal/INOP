const test = require('node:test');
const assert = require('node:assert/strict');
const Audit = require('../models/audit.model');
const { withAuditMutation } = require('../services/auditMutation.service');
const audit = { _id: '507f1f77bcf86cd799439011', id: 'a', status: 'in-progress', auditorId: 'u' };
const query = value => ({ select() { return this; }, lean() { return Promise.resolve(value); } });
function res() { return { json(body) { this.body = body; return this; } }; }
function req() { return { audit, user: { id: 'u' }, permission: { scope: 'all' } }; }

test('simultaneous finding creation and completion cannot both hold the audit lease', async t => {
  let holder = null;
  t.mock.method(Audit, 'findOneAndUpdate', (filter, update) => {
    assert.equal(filter.status.$nin.includes('completed'), true);
    if (holder) return query(null);
    holder = update.$set.mutationLock.token;
    return query(audit);
  });
  t.mock.method(Audit, 'updateOne', async filter => { assert.equal(filter['mutationLock.token'], holder); holder = null; return { matchedCount: 1 }; });
  let releaseHandler;
  const blocked = new Promise(resolve => { releaseHandler = resolve; });
  let acquired;
  const started = new Promise(resolve => { acquired = resolve; });
  const firstRes = res();
  const first = withAuditMutation(async (_req, response) => { acquired(); await blocked; response.json({ success: true }); })(req(), firstRes, error => { throw error; });
  await started;
  let secondEntered = false, failure;
  await withAuditMutation(async () => { secondEntered = true; })(req(), res(), error => { failure = error; });
  assert.equal(secondEntered, false); assert.equal(failure.statusCode, 409);
  releaseHandler(); await first;
  assert.equal(holder, null); assert.deepEqual(firstRes.body, { success: true });
});
test('failed audit mutations release their lease before forwarding the error', async t => {
  let unlocked = false;
  t.mock.method(Audit, 'findOneAndUpdate', () => query(audit));
  t.mock.method(Audit, 'updateOne', async () => { unlocked = true; return { matchedCount: 1 }; });
  const failure = new Error('validation failed');
  await withAuditMutation(async (_req, _res, next) => { next(failure); })(req(), res(), error => {
    assert.equal(unlocked, true); assert.equal(error, failure);
  });
});
test('JSON response is delivered after lock release so sequential clients can mutate immediately', async t => {
  let released = false;
  t.mock.method(Audit, 'findOneAndUpdate', () => query(audit));
  t.mock.method(Audit, 'updateOne', async () => { released = true; return { matchedCount: 1 }; });
  const response = { json() { assert.equal(released, true); } };
  await withAuditMutation(async (_req, res) => { res.json({ success: true }); assert.equal(released, false); })(req(), response, error => { throw error; });
});
