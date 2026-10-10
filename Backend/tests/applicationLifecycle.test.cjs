const test = require('node:test'), assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Job = require('../models/job.model'), Candidate = require('../models/candidate.model'), Application = require('../models/application.model');
test('Application lifecycle keeps scope, revisions, history and interviews independent', async t => withAuditFixture(async h => {
  for (const scope of ['own', 'department', 'assigned']) await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: ['application', 'candidate', 'recruitment', 'user'].map(resource => ({ resource, action: '*', scope })) } });
  const create = async actor => {
    const job = await Job.create({ title: 'Cashier', department: 'HR', description: 'Operations', createdBy: h.actors[actor]._id, assignedTo: h.actors[actor]._id, departmentId: h.actors[actor].departmentId });
    const candidate = await Candidate.create({ name: 'Synthetic', role: 'Cashier', createdBy: h.actors[actor]._id, assignedTo: h.actors[actor]._id, departmentId: h.actors[actor].departmentId });
    const app = await h.request(actor, 'POST', '/applications', { jobId: job._id, candidateId: candidate._id }); assert.equal(app.status, 201); return app.data;
  };
  let app;
  await t.test('creation has server event, actor and stage time', async () => {
    app = await create('admin'); const history = await h.request('admin', 'GET', `/applications/${app._id}/history`); assert.equal(history.status, 200);
    assert.equal(history.data.items[0].type, 'create'); assert.equal(history.data.items[0].actor, String(h.actors.admin._id)); assert.equal(history.data.items[0].after.status, 'Applied'); assert.ok(app.stageEnteredAt);
  });
  await t.test('concurrent status writes yield one 200 and one 409 with exactly one new event', async () => {
    const results = await Promise.all(['Screening', 'Shortlisted'].map(status => h.request('admin', 'PATCH', `/applications/${app._id}/status`, { status, expectedRevision: app.__v, reason: 'HR selection' })));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]); app = results.find(r => r.status === 200).data;
    const history = await h.request('admin', 'GET', `/applications/${app._id}/history`); assert.equal(history.data.total, 2); assert.equal(history.data.items[0].before.status, 'Applied'); assert.ok(history.data.items[0].at);
  });
  await t.test('idempotent replay does not duplicate status or notification events', async () => {
    const body = { status: 'Interview', expectedRevision: app.__v, commandId: 'local-command-0001' };
    const first = await h.request('admin', 'PATCH', `/applications/${app._id}/status`, body); assert.equal(first.status, 200); app = first.data;
    assert.equal((await h.request('admin', 'PATCH', `/applications/${app._id}/status`, body)).status, 200);
    assert.equal((await h.request('admin', 'PATCH', `/applications/${app._id}/status`, { ...body, status: 'Rejected' })).status, 409);
    assert.equal((await h.request('admin', 'GET', `/applications/${app._id}/history`)).data.total, 3);
  });
  await t.test('interview local time converts with IANA timezone, result and next action persist', async () => {
    const r = await h.request('admin', 'PATCH', `/applications/${app._id}/workflow`, { expectedRevision: app.__v,
      interview: { localStart: '2026-11-10T10:30', timezone: 'Asia/Baku', durationMinutes: 30, interviewerId: h.actors.admin._id, result: 'pending' },
      substatus: 'scheduled', nextAction: { kind: 'interview', dueAt: '2026-11-10T06:30:00Z', notes: 'Interview preparation' }, reason: 'HR scheduled interview' });
    assert.equal(r.status, 200); app = r.data; assert.equal(app.interview.startsAt, '2026-11-10T06:30:00.000Z'); assert.equal(app.interview.timezone, 'Asia/Baku'); assert.equal(app.substatus, 'scheduled'); assert.equal(app.nextAction.kind, 'interview');
    assert.equal((await h.request('admin', 'GET', `/applications/${app._id}`)).data.interview.interviewerId, String(h.actors.admin._id));
  });
  await t.test('invalid dates/timezones, DST gaps and ambiguous wall times never change data', async () => {
    for (const interview of [
      { localStart: '2026-11-10T10:30', timezone: 'Invented/Zone' }, { localStart: '2026-02-30T10:30', timezone: 'UTC' },
      { localStart: '2026-03-08T02:30', timezone: 'America/New_York' }, { localStart: '2026-11-01T01:30', timezone: 'America/New_York' },
    ]) assert.equal((await h.request('admin', 'PATCH', `/applications/${app._id}/workflow`, { interview })).status, 400);
    assert.equal((await Application.findById(app._id)).__v, app.__v);
  });
  await t.test('another vacancy has independent status and processing does not become an HR decision', async () => {
    const otherJob = await Job.create({ title: 'Other vacancy', department: 'HR', description: 'Other' });
    const other = await h.request('admin', 'POST', '/applications', { jobId: otherJob._id, candidateId: app.candidateId._id }); assert.equal(other.status, 201); assert.equal(other.data.status, 'Applied');
    assert.equal((await Application.findById(app._id)).status, 'Interview');
    const r = await h.request('admin', 'PATCH', `/applications/${other.data._id}/workflow`, { processingState: 'completed', status: 'Invented', createdBy: h.actors.foreign._id }); assert.equal(r.status, 400);
    assert.equal((await Application.findById(other.data._id)).status, 'Applied');
  });
  await t.test('Closed and Draft jobs reject new applications without overwriting existing records', async () => {
    for (const status of ['Closed', 'Draft']) {
      const job = await Job.create({ title: 'Closed', department: 'HR', description: 'Closed', status });
      assert.equal((await h.request('admin', 'POST', '/applications', { jobId: job._id, candidateId: app.candidateId._id })).status, 409);
      assert.equal(await Application.countDocuments({ jobId: job._id }), 0);
    }
  });
  await t.test('closed Job rejects the real DOCX pipeline before a Candidate/Application is persisted', async () => {
    const job = await Job.create({ title: 'Closed CV intake', department: 'HR', description: 'Closed', status: 'Closed' });
    const before = await Candidate.countDocuments(); const form = new FormData();
    form.append('cv', new Blob([require('./helpers/cvDocuments.cjs').docx('Name: Synthetic Applicant')], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'closed.docx');
    form.append('name', 'Synthetic Applicant'); form.append('role', 'Cashier'); form.append('jobId', String(job._id));
    const r = await fetch(h.apiBase + '/candidates/from-cv', { method: 'POST', headers: { Authorization: 'Bearer ' + h.tokens.admin }, body: form });
    assert.equal(r.status, 409); assert.equal(await Candidate.countDocuments(), before); assert.equal(await Application.countDocuments({ jobId: job._id }), 0);
  });
  await t.test('terminal decisions require explicit reason/all authority to reopen', async () => {
    const row = await create('own'); assert.equal((await h.request('own', 'PATCH', `/applications/${row._id}/status`, { status: 'Rejected' })).status, 200);
    assert.equal((await h.request('own', 'PATCH', `/applications/${row._id}/status`, { status: 'Screening', reopen: true, reason: 'Review again' })).status, 403);
    assert.equal((await h.request('admin', 'PATCH', `/applications/${row._id}/status`, { status: 'Screening' })).status, 400);
    assert.equal((await h.request('admin', 'PATCH', `/applications/${row._id}/status`, { status: 'Screening', reopen: true, reason: 'HR corrected decision' })).status, 200);
  });
  await t.test('global reassignment is server checked; revoked assignment denies the old JWT', async () => {
    const row = await create('assigned');
    assert.equal((await h.request('assigned', 'PATCH', `/applications/${row._id}/assignment`, { assignedTo: h.actors.peer._id, reason: 'Self reassignment' })).status, 403);
    const r = await h.request('admin', 'PATCH', `/applications/${row._id}/assignment`, { assignedTo: h.actors.admin._id, reason: 'HR reassignment' }); assert.equal(r.status, 200);
    for (const path of ['', '/history']) assert.equal((await h.request('assigned', 'GET', `/applications/${row._id}${path}`)).status, 404);
    assert.equal((await h.request('assigned', 'PATCH', `/applications/${row._id}/status`, { status: 'Screening' })).status, 404);
  });
  for (const actor of ['own', 'department', 'assigned']) await t.test(`${actor} history/interview respects foreign Application scope`, async () => {
    const row = await create('foreign'); assert.equal((await h.request(actor, 'GET', `/applications/${row._id}/history`)).status, 404);
    assert.equal((await h.request(actor, 'PATCH', `/applications/${row._id}/workflow`, { substatus: 'scheduled' })).status, 404);
  });
  await t.test('history pagination is bounded and actor/provenance spoofing is ignored', async () => {
    const r = await h.request('admin', 'PATCH', `/applications/${app._id}/workflow`, { substatus: 'completed', actor: h.actors.foreign._id, createdBy: h.actors.foreign._id, departmentId: 'forged' }); assert.equal(r.status, 200);
    const history = await h.request('admin', 'GET', `/applications/${app._id}/history?limit=1&offset=0`); assert.equal(history.data.items.length, 1); assert.equal(history.data.items[0].actor, String(h.actors.admin._id)); assert.ok(history.data.hasMore);
    assert.equal((await h.request('admin', 'GET', `/applications/${app._id}/history?limit=1000`)).status, 400);
    assert.equal((await h.request('anonymous', 'GET', `/applications/${app._id}/history`)).status, 401);
  });
  await t.test('activity snapshots make new own/department logs visible without opening legacy/foreign logs', async () => {
    const Activity = require('../models/activityLog.model');
    for (const scope of ['own', 'department']) await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: { resource: 'activity_log', action: '*', scope } } });
    await h.request('own', 'POST', '/activity-logs', { action: 'create', entityType: 'application', description: 'OWN_ACTIVITY', departmentId: 'dep_B', createdBy: h.actors.foreign._id });
    await h.request('foreign', 'PATCH', `/applications/${(await create('foreign'))._id}/status`, { status: 'Screening' });
    await Activity.create({ userId: h.actors.own._id, action: 'create', entityType: 'application', description: 'LEGACY_WITHOUT_SNAPSHOT' });
    for (const actor of ['own', 'department']) {
      const r = await h.request(actor, 'GET', '/activity-logs'); assert.equal(r.status, 200); assert.ok(r.data.activityLogs.some(l => l.description === 'OWN_ACTIVITY'));
      assert.ok(!r.data.activityLogs.some(l => l.description === 'LEGACY_WITHOUT_SNAPSHOT'));
      const rows = await Activity.find({ _id: { $in: r.data.activityLogs.map(l => l.id) } }); assert.ok(rows.every(l => l.departmentId === 'dep_A'));
    }
  });
}));
