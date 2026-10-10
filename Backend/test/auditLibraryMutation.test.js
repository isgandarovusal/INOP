const test = require('node:test');
const assert = require('node:assert/strict');
const AuditLibraryLock = require('../models/auditLibraryLock.model');
const { withAuditLibraryMutation, LEASE_MS } = require('../services/auditLibraryMutation.service');
const query = value => ({ lean() { return Promise.resolve(value); } });
const response = () => ({ json(body) { this.body = body; return this; } });

test('library mutation rejects concurrent execution and source deletion instead of racing reference checks', async t => {
  let holder = null;
  t.mock.method(AuditLibraryLock, 'findOneAndUpdate', (filter, update, options) => {
    assert.equal(filter._id, 'library'); assert.equal(options.upsert, true); assert.equal(options.timestamps, false);
    if (holder) return { lean() { return Promise.reject(Object.assign(new Error('Duplicate singleton'), { code: 11000 })); } };
    holder = update.$set.token;
    return query({ token: holder });
  });
  t.mock.method(AuditLibraryLock, 'updateOne', async (filter, update, options) => {
    assert.equal(filter.token, holder); assert.equal(options.timestamps, false);
    assert.equal(update.$set.expiresAt.getTime(), 0); holder = null;
    return { matchedCount: 1 };
  });
  let release, ready;
  const gate = new Promise(resolve => { release = resolve; });
  const acquired = new Promise(resolve => { ready = resolve; });
  const result = response();
  const first = withAuditLibraryMutation(async (_req, res) => { ready(); await gate; res.json({ success: true }); })({}, result, error => { throw error; });
  await acquired;
  let entered = false, failure;
  await withAuditLibraryMutation(async () => { entered = true; })({}, response(), error => { failure = error; });
  assert.equal(entered, false); assert.equal(failure.statusCode, 409);
  release(); await first;
  assert.equal(holder, null); assert.deepEqual(result.body, { success: true });
});
test('expired lease is reclaimed atomically and uses a bounded new expiration', async t => {
  t.mock.method(AuditLibraryLock, 'findOneAndUpdate', (filter, update, options) => {
    assert.ok(filter.$or.some(condition => condition.expiresAt?.$lte instanceof Date));
    const interval = update.$set.expiresAt.getTime() - filter.$or[1].expiresAt.$lte.getTime();
    assert.equal(interval, LEASE_MS); assert.equal(options.runValidators, true);
    return query({ token: update.$set.token });
  });
  t.mock.method(AuditLibraryLock, 'updateOne', async () => ({ matchedCount: 1 }));
  let entered = false;
  await withAuditLibraryMutation(async (_req, res) => { entered = true; res.json({ success: true }); })({}, response(), error => { throw error; });
  assert.equal(entered, true);
});
test('library validation errors unlock before forwarding and do not leave request state', async t => {
  t.mock.method(AuditLibraryLock, 'findOneAndUpdate', (_filter, update) => query({ token: update.$set.token }));
  let released = false;
  t.mock.method(AuditLibraryLock, 'updateOne', async () => { released = true; return { matchedCount: 1 }; });
  const req = {}, error = new Error('invalid source reference');
  await withAuditLibraryMutation(async (_req, _res, next) => { next(error); })(req, response(), failure => {
    assert.equal(failure, error); assert.equal(released, true); assert.equal(req.auditLibraryMutationToken, undefined);
  });
});
test('lost library lease prevents reporting a successful response', async t => {
  t.mock.method(AuditLibraryLock, 'findOneAndUpdate', (_filter, update) => query({ token: update.$set.token }));
  let released = false;
  t.mock.method(AuditLibraryLock, 'updateOne', async () => { released = true; return { matchedCount: 0 }; });
  let sent = false, failure;
  await withAuditLibraryMutation(async (_req, res) => { res.json({ success: true }); assert.equal(released, false); })({}, { json() { sent = true; } }, error => { failure = error; });
  assert.equal(released, true); assert.equal(sent, false); assert.equal(failure.statusCode, 503);
});

test('successful library JSON is delivered only after lease release', async t => {
  t.mock.method(AuditLibraryLock, 'findOneAndUpdate', (_filter, update) => query({ token: update.$set.token }));
  let released = false, sent = false;
  t.mock.method(AuditLibraryLock, 'updateOne', async () => { released = true; return { matchedCount: 1 }; });
  await withAuditLibraryMutation(async (_req, res) => { res.json({ success: true }); assert.equal(sent, false); })({}, { json(body) {
    assert.equal(released, true); assert.deepEqual(body, { success: true }); sent = true;
  } }, error => { throw error; });
  assert.equal(sent, true);
});
