const test = require('node:test'), assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Application = require('../models/application.model'), Job = require('../models/job.model'), Candidate = require('../models/candidate.model'), Branch = require('../models/recruitmentBranch.model');
const { calculateApplicationMatch } = require('../services/applicationMatch.service');
test('HR analytics uses independent scoped cohorts, bounded DTOs and trusted scores', async t => withAuditFixture(async h => {
  for (const scope of ['own', 'department', 'assigned', 'none']) await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: ['application', 'candidate', 'recruitment'].map(resource => ({ resource, action: '*', scope })) } });
  const get = (actor, query = '') => h.request(actor, 'GET', '/hr/analytics' + query);
  await t.test('empty cohort has zero counts, null durations and explicit disconnected health', async () => {
    const r = await get('admin'); assert.equal(r.status, 200); assert.equal(r.data.totals.applications, 0); assert.equal(r.data.timeToHire.averageDays, null);
    assert.ok(r.data.timeInStage.every(s => s.averageDays === null)); assert.equal(r.data.integrations.ai, 'not_configured'); assert.equal(r.data.integrations.smtp, 'not_configured');
  });
  const owned = actor => ({ createdBy: h.actors[actor]._id, assignedTo: h.actors[actor]._id, departmentId: h.actors[actor].departmentId });
  const branch = await Branch.create({ code: 'analytics-branch', name: 'Readable branch', brandId: 'kfc', kind: 'restaurant', ...owned('own') });
  const fixtures = [];
  for (const [actor, brand, status] of [['own', 'kfc', 'Applied'], ['peer', 'pizza-hut', 'Interview'], ['foreign', 'simit-sarayi', 'Hired']]) {
    const job = await Job.create({ title: `${actor} scoped vacancy`, description: 'Hiring', department: 'HR', brandId: brand, branchId: actor === 'own' ? branch._id : null, requiredSkills: ['Cash handling'], ...owned(actor) });
    const candidate = await Candidate.create({ name: `${actor}_PRIVATE_NAME`, email: `${actor}@private.invalid`, phone: '+994501234567', role: 'Cashier', skills: actor === 'own' ? ['Unrelated skill'] : ['Kassa'], cvReview: { version: 'rules-2', reviewStatus: actor === 'peer' ? 'pending' : 'confirmed', processingStatus: actor === 'peer' ? 'unsupported_ocr' : 'extracted' }, cvOriginal: { sha256: 'a'.repeat(64) }, ...owned(actor) });
    const createdAt = new Date('2026-01-01T00:00:00Z'), at = new Date('2026-01-05T00:00:00Z');
    const context = { jobId: job._id, candidateId: candidate._id }, matching = calculateApplicationMatch(job, candidate, { application: context });
    const app = await Application.create({ ...context, ...owned(actor), status, stageEnteredAt: at, createdAt, source: { key: 'manual', receivedAt: createdAt },
      matching, score: matching.score, scoreStatus: matching.scoreStatus,
      ...(status === 'Interview' ? { interview: { startsAt: at, timezone: 'Asia/Baku', result: 'pending' } } : {}),
      ...(status === 'Hired' ? { events: [{ type: 'status', at, after: { status: 'Hired' }, before: { status: 'Offered' }, actor: h.actors.admin._id }] } : {}),
    }); fixtures.push({ actor, job, candidate, app });
  }
  await t.test('global cohort covers three brands, funnel, sources, review, file duplicates and exact hire time', async () => {
    const r = await get('admin'); assert.equal(r.status, 200); assert.equal(r.data.totals.applications, 3); assert.equal(r.data.totals.activeVacancies, 3);
    assert.deepEqual(r.data.byBrand.map(b => b.id).sort(), ['kfc', 'pizza-hut', 'simit-sarayi']); assert.equal(r.data.review.pending, 1); assert.equal(r.data.review.ocrRequired, 1);
    assert.equal(r.data.duplicateAlerts.groups, 1); assert.equal(r.data.duplicateAlerts.extraProfiles, 2); assert.equal(r.data.timeToHire.averageDays, 4); assert.equal(r.data.timeToHire.samples, 1);
    assert.equal(r.data.sources.find(s => s.key === 'manual').count, 3); assert.equal(r.data.scores.buckets[0].count, 1); assert.equal(r.data.scores.buckets[4].count, 1); assert.equal(r.data.scores.states.pending, 1);
    const json = JSON.stringify(r.data); assert.ok(!json.includes('_PRIVATE_NAME')); assert.ok(!json.includes('@private.invalid')); assert.ok(!json.includes('a'.repeat(64))); assert.ok(!json.includes('Unrelated skill')); assert.ok(!json.includes('+994501234567')); assert.ok(Buffer.byteLength(json) < 16000);
  });
  for (const [actor, count] of [['own', 1], ['department', 2], ['assigned', 0], ['hr', 3]]) await t.test(`${actor} aggregation casts IDs and respects the same scoped Application/Job cohort`, async () => {
    const r = await get(actor); assert.equal(r.status, 200); assert.equal(r.data.totals.applications, count); assert.equal(r.data.funnel.reduce((n, s) => n + s.count, 0), count);
    if (actor === 'own') { assert.equal(r.data.options.jobs.length, 1); assert.equal(r.data.byBrand[0].id, 'kfc'); assert.equal(r.data.options.branches[0].name, 'Readable branch'); }
  });
  await t.test('brand/branch/vacancy/date/status/source filters intersect permissions and preserve denominators', async () => {
    for (const q of ['?brandId=kfc', `?branchId=${branch._id}`, `?jobId=${fixtures[0].job._id}`, '?status=Applied', '?from=2026-01-01&to=2026-01-01']) {
      const r = await get('own', q); assert.equal(r.status, 200); assert.equal(r.data.totals.applications, 1);
    }
    assert.equal((await get('own', '?brandId=simit-sarayi')).data.totals.applications, 0);
    assert.equal((await get('admin', '?from=2026-01-02')).data.totals.applications, 0); assert.equal((await get('admin', '?source=outlook')).data.totals.applications, 0);
  });
  await t.test('assigned scope positively sees its own assigned Application and independently assigned parents', async () => {
    for (const [Model, id] of [[Application, fixtures[0].app._id], [Job, fixtures[0].job._id], [Candidate, fixtures[0].candidate._id]]) await Model.updateOne({ _id: id }, { $set: { assignedTo: h.actors.assigned._id } });
    const r = await get('assigned'); assert.equal(r.status, 200); assert.equal(r.data.totals.applications, 1); assert.equal(r.data.scores.buckets[0].count, 1);
    await Application.updateOne({ _id: fixtures[0].app._id }, { $set: { assignedTo: h.actors.admin._id } }); assert.equal((await get('assigned')).data.totals.applications, 0);
  });
  await t.test('foreign populated Job cannot contribute counts even when Application scope is all', async () => {
    await h.models.Role.create({ key: 'analytics_mixed', name: 'Mixed', permissions: [{ resource: 'application', action: 'read', scope: 'all' }, { resource: 'recruitment', action: 'read', scope: 'own' }, { resource: 'candidate', action: 'read', scope: 'all' }] });
    await h.models.User.updateOne({ _id: h.actors.own._id }, { $set: { role: 'analytics_mixed' } });
    assert.equal((await get('own')).data.totals.applications, 1); assert.equal((await get('own', `?jobId=${fixtures[2].job._id}`)).data.totals.applications, 0);
    await h.models.User.updateOne({ _id: h.actors.own._id }, { $set: { role: 'test_own' } });
  });
  await t.test('denied Candidate parent leaves allowed totals but withholds scores/review/duplicate metadata', async () => {
    await h.models.Role.create({ key: 'analytics_no_candidate', name: 'No Candidate', permissions: ['application', 'recruitment'].map(resource => ({ resource, action: 'read', scope: 'all' })) });
    await h.models.User.updateOne({ _id: h.actors.peer._id }, { $set: { role: 'analytics_no_candidate' } });
    const r = await get('peer'); assert.equal(r.status, 200); assert.equal(r.data.totals.applications, 3); assert.equal(r.data.coverage.candidateReadable, false); assert.equal(r.data.coverage.restrictedCandidateApplications, 3);
    assert.equal(r.data.scores.states.restricted, 3); assert.equal(r.data.review.pending, 0); assert.equal(r.data.duplicateAlerts.groups, 0);
    await h.models.User.updateOne({ _id: h.actors.peer._id }, { $set: { role: 'test_own' } });
  });
  await t.test('no/none/missing-department grants and unauthenticated access fail closed', async () => {
    assert.equal((await get('anonymous')).status, 401); assert.equal((await get('none')).status, 403); assert.equal((await get('department_missing')).status, 403);
    await h.models.Role.create({ key: 'analytics_app_only', name: 'App only', permissions: [{ resource: 'application', action: 'read', scope: 'all' }] });
    await h.models.User.updateOne({ _id: h.actors.peer._id }, { $set: { role: 'analytics_app_only' } }); assert.equal((await get('peer')).status, 403);
    await h.models.User.updateOne({ _id: h.actors.peer._id }, { $set: { role: 'test_own' } });
  });
  await t.test('legacy unbranded/source/score/time data stays unknown without automatic rewriting', async () => {
    const job = await Job.create({ title: 'Legacy vacancy', department: 'HR', description: 'Legacy', ...owned('admin') });
    await Application.collection.insertOne({ jobId: job._id, candidateId: fixtures[0].candidate._id, status: 'Hired', score: 99, createdAt: new Date('2026-02-01'), ...owned('admin') });
    const r = await get('admin', '?brandId=unset'); assert.equal(r.status, 200); assert.equal(r.data.sources.find(s => s.key === 'unknown').count, 1); assert.equal(r.data.scores.states.legacy, 1); assert.equal(r.data.timeToHire.averageDays, null);
    const old = await Application.collection.findOne({ jobId: job._id }); assert.equal(old.source, undefined); assert.equal(old.matching, undefined); assert.equal(old.score, 99); assert.equal(old.stageEnteredAt, undefined);
  });
  await t.test('changed underlying facts cannot leave a stale percentage in the score distribution', async () => {
    await Candidate.updateOne({ _id: fixtures[0].candidate._id }, { $set: { skills: ['Kassa'] } });
    const r = await get('admin', '?brandId=kfc'); assert.equal(r.data.scores.states.stale, 1); assert.equal(r.data.scores.buckets.reduce((n, b) => n + b.count, 0), 0);
  });
  await t.test('forged sources are ignored on create and new manual records have server provenance', async () => {
    const job = await Job.create({ title: 'Server source', department: 'HR', description: 'Source', ...owned('admin') });
    const made = await h.request('admin', 'POST', '/applications', { jobId: job._id, candidateId: fixtures[0].candidate._id, source: { key: 'outlook', receivedAt: '1900-01-01' } }); assert.equal(made.status, 201);
    assert.equal(made.data.source.key, 'manual'); assert.ok(new Date(made.data.source.receivedAt).getTime() > Date.now() - 60000);
  });
  await t.test('malformed filters return 400 instead of widening a dataset', async () => {
    for (const q of ['?brandId[$ne]=kfc', '?jobId=not-an-id', '?status=Invented', '?source=private@email.invalid', '?from=2026-02-30', '?from=2026-02-02&to=2026-01-01', '?unknown=true']) assert.equal((await get('admin', q)).status, 400);
  });
  await t.test('catalog caps cannot reduce the real total and option labels/payload stay bounded', async () => {
    const brands = Array.from({ length: 60 }, (_, i) => ({ _id: `analytics-${i}`, name: `Analytics ${i}` })); await require('../models/recruitmentBrand.model').insertMany(brands);
    await Job.insertMany(brands.map(b => ({ title: 'Long label '.repeat(500), brandId: b._id, department: 'HR', description: 'Synthetic', ...owned('admin') })));
    const r = await get('admin'); assert.equal(r.status, 200); assert.equal(r.data.totals.activeVacancies, await Job.countDocuments({ status: 'Open' })); assert.equal(r.data.options.jobs.length, 50);
    assert.equal(r.data.byBrandTruncated, true); assert.equal(r.data.options.brandsTruncated, true); assert.ok(r.data.options.jobs.every(j => j.title.length <= 200)); assert.ok(Buffer.byteLength(JSON.stringify(r.data)) < 64000);
  });
}));
