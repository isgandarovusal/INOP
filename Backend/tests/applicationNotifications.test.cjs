const test = require('node:test'), assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const { createNotificationWorker, LEASE_MS } = require('../services/applicationNotificationWorker.service');
const { buildStatusMessage } = require('../services/candidateNotification.service');
const Application = require('../models/application.model'), Job = require('../models/job.model'), Candidate = require('../models/candidate.model');
test('Durable Application notifications respect scope, retry bounds and truthful delivery states', async t => withAuditFixture(async h => {
  for (const scope of ['own', 'assigned']) await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: ['application', 'candidate', 'recruitment'].map(resource => ({ resource, action: '*', scope })) } });
  const create = async (actor = 'admin') => {
    const job = (await h.request(actor, 'POST', '/jobs', { title: 'Synthetic cashier', department: 'HR', description: 'Hiring' })).data;
    const candidate = (await h.request(actor, 'POST', '/candidates', { name: 'Synthetic notification applicant', role: 'Cashier', email: 'synthetic@example.invalid' })).data;
    const made = await h.request(actor, 'POST', '/applications', { jobId: job._id, candidateId: candidate._id }); assert.equal(made.status, 201);
    const updated = await h.request(actor, 'PATCH', `/applications/${made.data._id}/status`, { status: 'Interview', expectedRevision: 0 }); assert.equal(updated.status, 200);
    return updated.data;
  };
  const delivery = async row => (await Application.findById(row._id).lean()).events.find(e => e.delivery)?.delivery;
  // A status operation is successful before any SMTP worker is invoked.
  let row = await create();
  await t.test('missing SMTP records blocked, never sent, without changing workflow revision or timestamps', async () => {
    const before = await Application.findById(row._id).lean(); assert.equal((await delivery(row)).state, 'pending');
    let sent = 0; await createNotificationWorker({ available: () => false, send: async () => { sent++; } }).runOnce();
    const after = await Application.findById(row._id).lean(); assert.equal(sent, 0); assert.equal(after.status, 'Interview'); assert.equal(after.__v, before.__v); assert.equal(after.updatedAt.getTime(), before.updatedAt.getTime());
    assert.equal((await delivery(row)).state, 'blocked'); assert.equal((await delivery(row)).attempts, 0);
  });
  await t.test('configured mock resumes blocked event once, with a stable Message-ID and no repeated send', async () => {
    const calls = [], worker = createNotificationWorker({ available: () => true, send: async input => { calls.push(input); return { sent: true }; } });
    await worker.runOnce(); assert.equal(calls.length, 1); assert.match(calls[0].messageId, /^<inop-[a-f0-9-]{36}@notifications\.invalid>$/);
    assert.equal((await delivery(row)).state, 'sent'); assert.equal((await worker.runOnce()).processed, 0); assert.equal(calls.length, 1);
  });
  await t.test('two workers cannot claim the same in-flight event; history excludes internal leases/tokens', async () => {
    row = await create(); let release, entered; const gate = new Promise(resolve => { release = resolve; }), started = new Promise(resolve => { entered = resolve; }); let count = 0;
    const send = async () => { count++; entered(); await gate; return { sent: true }; };
    const running = createNotificationWorker({ available: () => true, send }).runOnce(1); await started;
    try {
      assert.equal((await createNotificationWorker({ available: () => true, send }).runOnce(1)).processed, 0);
      const history = await h.request('admin', 'GET', `/applications/${row._id}/history`), d = history.data.items.find(e => e.delivery).delivery;
      assert.equal(d.state, 'running'); assert.equal(d.token, undefined); assert.equal(d.leaseUntil, undefined); assert.equal(count, 1);
    } finally { release(); await running; }
  });
  await t.test('SMTP failure has bounded backoff/three attempts, sanitized diagnostics and leaves status successful', async () => {
    row = await create(); let clock = new Date(), count = 0;
    const worker = createNotificationWorker({ available: () => true, now: () => clock, send: async () => { count++; throw Error('sensitive-recipient-and-credential'); } });
    await worker.runOnce(1); assert.equal((await delivery(row)).state, 'pending'); assert.equal((await worker.runOnce(1)).processed, 0);
    clock = new Date(clock.getTime() + 61000); await worker.runOnce(1); clock = new Date(clock.getTime() + 301000); await worker.runOnce(1);
    assert.equal(count, 3); assert.equal((await delivery(row)).state, 'failed'); assert.equal((await worker.runOnce(1)).processed, 0);
    const history = await h.request('admin', 'GET', `/applications/${row._id}/history`); assert.ok(!JSON.stringify(history.data).includes('sensitive-recipient-and-credential'));
    assert.equal((await h.request('admin', 'GET', `/applications/${row._id}`)).data.status, 'Interview');
  });
  await t.test('a stuck provider times out and receives cancellation without blocking a status operation', async () => {
    row = await create(); let cancelled = false;
    await createNotificationWorker({ available: () => true, timeoutMs: 10, send: async ({ signal }) => new Promise(() => { signal.addEventListener('abort', () => { cancelled = true; }); }) }).runOnce(1);
    assert.equal(cancelled, true); assert.equal((await delivery(row)).code, 'SEND_TIMEOUT'); assert.equal((await Application.findById(row._id)).status, 'Interview');
    await Application.updateOne({ _id: row._id }, { $set: { 'events.1.delivery.state': 'failed' } });
  });
  await t.test('restart recovers an expired lease while retaining the same event identity', async () => {
    row = await create(); const event = (await Application.findById(row._id)).events.find(e => e.delivery);
    await Application.updateOne({ _id: row._id, 'events.id': event.id }, { $set: { 'events.$.delivery': { state: 'running', token: 'expired-worker', attempts: 1, leaseUntil: new Date(Date.now() - LEASE_MS) } } });
    let id; await createNotificationWorker({ available: () => true, send: async input => { id = input.messageId; return { sent: true }; } }).runOnce(1);
    assert.equal(id, `<inop-${event.id}@notifications.invalid>`); assert.equal((await delivery(row)).attempts, 2); assert.equal((await delivery(row)).state, 'sent');
  });
  await t.test('actor deactivation suppresses the deferred send', async () => {
    row = await create('own'); await h.models.User.updateOne({ _id: h.actors.own._id }, { $set: { isActive: false } });
    let count = 0; await createNotificationWorker({ available: () => true, send: async () => { count++; return { sent: true }; } }).runOnce(1);
    assert.equal(count, 0); assert.equal((await delivery(row)).code, 'AUTH_REVOKED'); await h.models.User.updateOne({ _id: h.actors.own._id }, { $set: { isActive: true } });
  });
  for (const parent of ['candidate', 'job']) await t.test(`${parent} scope is independently revalidated before deferred delivery`, async () => {
    row = await create('own'); const Model = parent === 'candidate' ? Candidate : Job, id = parent === 'candidate' ? row.candidateId._id : row.jobId._id;
    await Model.updateOne({ _id: id }, { $set: { createdBy: h.actors.foreign._id } }); let count = 0;
    await createNotificationWorker({ available: () => true, send: async () => { count++; return { sent: true }; } }).runOnce(1);
    assert.equal(count, 0); assert.equal((await delivery(row)).code, 'PARENT_SCOPE_REVOKED');
  });
  await t.test('current server permission revocation suppresses a queued event', async () => {
    row = await create('own'); const role = await h.models.Role.findOne({ key: 'test_own' }).lean();
    await h.models.Role.updateOne({ _id: role._id }, { $set: { permissions: role.permissions.map(p => p.resource === 'application' ? { ...p, scope: 'none' } : p) } });
    try { let count = 0; await createNotificationWorker({ available: () => true, send: async () => { count++; return { sent: true }; } }).runOnce(1); assert.equal(count, 0); assert.equal((await delivery(row)).code, 'AUTH_REVOKED'); }
    finally { await h.models.Role.updateOne({ _id: role._id }, { $set: { permissions: role.permissions } }); }
  });
  await t.test('assignment revocation denies delivery under the original actor instead of a privileged worker identity', async () => {
    row = await create('assigned'); assert.equal((await h.request('admin', 'PATCH', `/applications/${row._id}/assignment`, { assignedTo: h.actors.admin._id, reason: 'HR reassigned' })).status, 200);
    let count = 0; await createNotificationWorker({ available: () => true, send: async () => { count++; return { sent: true }; } }).runOnce(1);
    assert.equal(count, 0); assert.equal((await delivery(row)).code, 'AUTH_REVOKED');
  });
  await t.test('outdated decisions and schedules are skipped; only the latest interview is delivered', async () => {
    row = await create(); const rejected = await create(); await h.request('admin', 'PATCH', `/applications/${rejected._id}/status`, { status: 'Rejected' });
    for (const localStart of ['2026-11-10T10:30', '2026-11-11T11:00']) assert.equal((await h.request('admin', 'PATCH', `/applications/${row._id}/workflow`, { interview: { localStart, timezone: 'Asia/Baku', interviewerId: h.actors.admin._id } })).status, 200);
    let count = 0, sent; await createNotificationWorker({ available: () => true, send: async input => { count++; sent = input.application; return { sent: true }; } }).runOnce(10);
    assert.equal(count, 1); assert.equal(new Date(sent.interview.startsAt).toISOString(), '2026-11-11T07:00:00.000Z'); assert.equal((await delivery(rejected)).code, 'STALE_WORKFLOW');
    const message = buildStatusMessage({ candidateName: 'Synthetic', jobTitle: 'Cashier', status: 'Interview', interview: sent.interview }); assert.ok(message.message.includes('11:00')); assert.ok(message.message.includes('Asia/Baku'));
  });
  await t.test('missing recipient is explicit and no client delivery/event override becomes trusted', async () => {
    row = await create(); await Candidate.updateOne({ _id: row.candidateId._id }, { $set: { email: '' } });
    await h.request('admin', 'PATCH', `/applications/${row._id}/workflow`, { notes: 'HR note', events: [{ delivery: { state: 'sent' } }], delivery: { state: 'sent' } });
    let count = 0; await createNotificationWorker({ available: () => true, send: async () => { count++; return { sent: true }; } }).runOnce(1);
    assert.equal(count, 0); assert.equal((await delivery(row)).code, 'MISSING_RECIPIENT'); assert.ok((await Application.findById(row._id)).events.every(e => e.actor));
  });
  await t.test('SMTP transport has finite timeouts, closes resources and never returns raw provider errors', async () => {
    const fs = require('node:fs'), vm = require('node:vm'); let closed = 0, options;
    const module = { exports: {} };
    const baseline = process.env.INOP_EMAIL_BASELINE;
    const source = baseline && /^[a-f0-9]{40}$/.test(baseline) ? require('node:child_process').execFileSync('git', ['show', `${baseline}:Backend/services/email.service.js`], { cwd: require('node:path').resolve(__dirname, '../..'), encoding: 'utf8' }) : fs.readFileSync(require.resolve('../services/email.service'), 'utf8');
    vm.runInNewContext(source, {
      module, require: name => { assert.equal(name, 'nodemailer'); return { createTransport: opts => { options = opts; return { close: () => { closed++; }, sendMail: async () => { throw Error('RAW_PROVIDER_PRIVATE_DETAILS'); } }; } }; },
      process: { env: { SMTP_HOST: 'smtp.example.invalid', SMTP_USER: 'synthetic', SMTP_PASS: require('node:crypto').randomBytes(12).toString('hex'), SMTP_FROM: 'hr@example.invalid' } },
    });
    await assert.rejects(module.exports.sendEmail({ to: 'candidate@example.invalid', title: 'Synthetic notification', message: 'Synthetic message' }), /^Error: EMAIL_DELIVERY_FAILED$/);
    assert.equal(closed, 1); assert.equal(options.connectionTimeout, 10000); assert.equal(options.greetingTimeout, 10000); assert.equal(options.socketTimeout, 15000);
    const escaped = module.exports.buildNotificationEmail({ title: '<script>', message: '<img onerror=alert(1)>' }); assert.ok(!escaped.html.includes('<script>')); assert.ok(!escaped.html.includes('<img onerror'));
  });
}));
