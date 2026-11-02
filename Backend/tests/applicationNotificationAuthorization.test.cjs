const test = require('node:test');
const assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Application = require('../models/application.model');
const Candidate = require('../models/candidate.model');
const Job = require('../models/job.model');
const { createNotificationWorker } = require('../services/applicationNotificationWorker.service');

test('Notification sender requires current authority after all parent lookups', async t => withAuditFixture(async h => {
  await h.models.User.updateOne({ _id: h.actors.department._id }, { $set: { role: 'recruitment_manager', departmentId: 'dep_hr' } });
  await h.models.User.updateOne({ _id: h.actors.own._id }, { $set: { role: 'recruitment_employee', departmentId: 'dep_hr' } });
  const role = await h.models.Role.findOne({ key: 'recruitment_manager' }).lean();
  const actorId = String(h.actors.department._id);
  let sequence = 0;
  async function queued(actor = 'department') {
    const fields = { departmentId: 'dep_hr', createdBy: h.actors.admin._id, assignedTo: h.actors.admin._id };
    const candidate = await Candidate.create({ ...fields, name: 'Synthetic Authority Person', role: 'Cashier', email: `authority-${++sequence}@example.invalid` });
    const job = await Job.create({ ...fields, title: 'Synthetic Authority Vacancy', department: 'HR', description: 'Synthetic' });
    const app = await Application.create({ ...fields, candidateId: candidate._id, jobId: job._id, assignedTo: h.actors.own._id });
    const r = await h.request(actor, 'PATCH', `/applications/${app._id}/status`, { status: 'Interview', expectedRevision: 0, reason: 'Synthetic authorized decision' });
    assert.equal(r.status, 200);
    return { app, candidate, job };
  }
  const row = async app => Application.findById(app._id).lean();
  const delivery = async app => (await row(app)).events.find(e => e.delivery).delivery;
  const calls = [];
  const send = async input => { calls.push(input); return { sent: true }; };
  const worker = () => createNotificationWorker({ available: () => true, send });
  const restore = async () => {
    await h.models.Role.updateOne({ _id: role._id }, { $set: { permissions: role.permissions, isActive: true } });
    await h.models.User.updateOne({ _id: actorId }, { $set: { role: 'recruitment_manager', departmentId: 'dep_hr', isActive: true } });
  };

  await t.test('normal current grant, narrow Candidate/Job payload, stable Message-ID and bounded DB reads', async () => {
    const x = await queued(), before = calls.length, operations = [];
    const started = performance.now();
    h.mongoose.set('debug', (collection, method) => operations.push({ collection, method }));
    try { await worker().runOnce(1); } finally { h.mongoose.set('debug', false); }
    const elapsedMs = performance.now() - started;
    assert.equal(calls.length, before + 1);
    const input = calls.at(-1), event = (await row(x.app)).events.find(e => e.delivery);
    assert.equal(input.actor.id, actorId);
    assert.equal(input.application.candidateId.email, x.candidate.email);
    assert.deepEqual(Object.keys(input.application.candidateId).sort(), ['_id', 'email', 'name']);
    assert.deepEqual(Object.keys(input.application.jobId).sort(), ['_id', 'title']);
    assert.equal(input.messageId, `<inop-${event.id}@notifications.invalid>`);
    assert.equal(event.delivery.state, 'sent'); assert.equal(event.delivery.attempts, 1);
    const reads = operations.filter(o => ['findOne', 'find', 'aggregate', 'countDocuments'].includes(o.method)).length;
    const writes = operations.length - reads;
    assert.ok(reads <= 10, `Notification read budget exceeded: ${reads}`);
    assert.equal(writes, 3);
    console.log(JSON.stringify({ scenario: 'notification-authority-budget', reads, writes, elapsedMs: +elapsedMs.toFixed(2) }));
    assert.equal((await worker().runOnce(1)).processed, 0);
    assert.equal(calls.length, before + 1);
  });

  await t.test('revoked role before processing cannot send', async () => {
    const x = await queued(), before = calls.length;
    try {
      await h.models.Role.updateOne({ _id: role._id }, { $set: { isActive: false } });
      await worker().runOnce(1);
      assert.equal(calls.length, before); assert.equal((await delivery(x.app)).code, 'AUTH_REVOKED');
    } finally { await restore(); }
  });

  for (const [label, mutate, code] of [
    ['role deactivation', async () => h.models.Role.updateOne({ _id: role._id }, { $set: { isActive: false } }), 'AUTH_REVOKED'],
    ['permission revocation', async () => h.models.Role.updateOne({ _id: role._id }, { $set: { permissions: [] } }), 'AUTH_REVOKED'],
    ['actor deactivation', async () => h.models.User.updateOne({ _id: actorId }, { $set: { isActive: false } }), 'AUTH_REVOKED'],
    ['department revocation', async () => h.models.User.updateOne({ _id: actorId }, { $set: { departmentId: 'other' } }), 'AUTH_REVOKED'],
    ['Candidate parent scope revocation', async x => Candidate.updateOne({ _id: x.candidate._id }, { $set: { departmentId: 'other' } }), 'PARENT_SCOPE_REVOKED'],
    ['Job parent scope revocation', async x => Job.updateOne({ _id: x.job._id }, { $set: { departmentId: 'other' } }), 'PARENT_SCOPE_REVOKED'],
  ]) await t.test(`${label} during first parent lookup cannot use old authority`, async () => {
    const x = await queued(), original = Candidate.findOne, before = calls.length; let changed = false;
    Candidate.findOne = function (...args) {
      const q = original.apply(this, args), exec = q.exec;
      q.exec = async function (...a) {
        const value = await exec.apply(this, a);
        if (!changed && String(value?._id) === String(x.candidate._id)) { changed = true; await mutate(x); }
        return value;
      };
      return q;
    };
    try {
      await worker().runOnce(1);
      assert.equal(changed, true); assert.equal(calls.length, before, 'Revoked authority must never reach sender');
      const d = await delivery(x.app); assert.equal(d.state, 'skipped'); assert.equal(d.code, code); assert.equal(d.attempts, 0);
    } finally { Candidate.findOne = original; await restore(); }
  });

  await t.test('revocation during final parent read is observed at the last authority checkpoint', async () => {
    const x = await queued(), original = Candidate.findOne, before = calls.length; let lookups = 0;
    Candidate.findOne = function (...args) {
      const q = original.apply(this, args), exec = q.exec;
      q.exec = async function (...a) { const value = await exec.apply(this, a); if (String(value?._id) === String(x.candidate._id) && ++lookups === 2) await h.models.Role.updateOne({ _id: role._id }, { $set: { permissions: [] } }); return value; };
      return q;
    };
    try { await worker().runOnce(1); assert.equal(lookups, 2); assert.equal(calls.length, before); assert.equal((await delivery(x.app)).code, 'AUTH_REVOKED'); }
    finally { Candidate.findOne = original; await restore(); }
  });

  await t.test('attempt reservation cannot create a new stale-authority window', async () => {
    const x = await queued(), original = Application.updateOne, before = calls.length; let changed = false;
    Application.updateOne = function (...args) {
      const q = original.apply(this, args), exec = q.exec;
      q.exec = async function (...a) { const result = await exec.apply(this, a); if (!changed && args[1]?.$set?.['events.$.delivery.attempts'] === 1) { changed = true; await h.models.Role.updateOne({ _id: role._id }, { $set: { permissions: [] } }); } return result; };
      return q;
    };
    try { await worker().runOnce(1); assert.equal(changed, true); assert.equal(calls.length, before); assert.equal((await delivery(x.app)).attempts, 0); }
    finally { Application.updateOne = original; await restore(); }
  });

  await t.test('final authority database failure is fail-closed without a sender call', async () => {
    const x = await queued(), original = h.models.Role.findOne, before = calls.length; let lookups = 0;
    h.models.Role.findOne = function (...args) {
      const q = original.apply(this, args), exec = q.exec;
      q.exec = async function (...a) { if (++lookups === 2) throw Error('SYNTHETIC_AUTHORITY_UNAVAILABLE'); return exec.apply(this, a); };
      return q;
    };
    try { await assert.rejects(worker().runOnce(1), /SYNTHETIC_AUTHORITY_UNAVAILABLE/); assert.equal(calls.length, before); assert.equal((await delivery(x.app)).state, 'running'); }
    finally { h.models.Role.findOne = original; }
  });

  await t.test('context-only Employee remains parent-denied and never gains send authority', async () => {
    const x = await queued('own'), before = calls.length;
    await worker().runOnce(1);
    assert.equal(calls.length, before); assert.equal((await delivery(x.app)).state, 'skipped'); assert.equal((await delivery(x.app)).code, 'PARENT_SCOPE_REVOKED');
  });
}, { canonicalHR: true }));
