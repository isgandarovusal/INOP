const test = require('node:test'), assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Job = require('../models/job.model'), Candidate = require('../models/candidate.model'), Application = require('../models/application.model');
const { calculateApplicationMatch } = require('../services/applicationMatch.service');
test('Versioned HR pages are bounded, independently scoped and cursor-safe', async t => withAuditFixture(async h => {
  for (const scope of ['own', 'department', 'assigned', 'none']) await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: ['application', 'candidate', 'recruitment'].map(resource => ({ resource, action: '*', scope })) } });
  await Promise.all([Job.createIndexes(), Candidate.createIndexes(), Application.createIndexes()]);
  const made = [];
  for (const [i, actor] of ['own', 'own', 'peer', 'foreign', 'assigned'].entries()) {
    const provenance = { createdBy: h.actors[actor]._id, assignedTo: h.actors[actor]._id, departmentId: h.actors[actor].departmentId };
    const job = await Job.create({ title: `Vacancy ${i}`, description: 'HEAVY_DESCRIPTION'.repeat(1000), department: 'HR', brandId: i < 2 ? 'kfc' : 'simit-sarayi', requiredSkills: ['Cash handling'], ...provenance });
    const candidate = await Candidate.create({ name: `Applicant ${i}`, role: 'Cashier', skills: ['Kassa'], email: `person${i}@example.invalid`, cvReview: { version: 'rules-2', reviewStatus: 'confirmed', processingStatus: 'extracted', fields: { evidence: 'PRIVATE_EVIDENCE'.repeat(1000) } }, ...provenance });
    const context = { jobId: job._id, candidateId: candidate._id }, matching = calculateApplicationMatch(job, candidate, { application: context });
    const app = await Application.create({ ...context, ...provenance, matching, score: matching.score, scoreStatus: matching.scoreStatus, notes: 'PRIVATE_NOTES'.repeat(100), events: [{ type: 'workflow', before: { notes: 'PRIVATE_EVENT' }, after: {} }] });
    made.push({ actor, job, candidate, app });
  }
  const get = (actor, kind, suffix = '') => h.request(actor, 'GET', `/hr/v2/${kind}${suffix}`);
  for (const [actor, count] of [['admin', 5], ['hr', 5], ['own', 2], ['department', 4], ['assigned', 1]]) for (const kind of ['jobs', 'candidates', 'applications']) await t.test(`${actor}: ${kind} bounded page and count share the primary scope`, async () => {
    const r = await get(actor, kind, '?pageSize=1'); assert.equal(r.status, 200); assert.equal(r.data.version, 'hr-page-v1'); assert.equal(r.data.total, count); assert.equal(r.data.items.length, 1); assert.equal(r.data.hasMore, count > 1);
    const json = JSON.stringify(r.data); assert.ok(!json.includes('HEAVY_DESCRIPTION')); assert.ok(!json.includes('PRIVATE_EVIDENCE')); assert.ok(!json.includes('PRIVATE_NOTES')); assert.ok(!json.includes('PRIVATE_EVENT'));
    if (kind === 'applications') { assert.equal(r.data.items[0].candidateId.email, undefined); assert.match(r.data.items[0].candidateId._id, /^[a-f0-9]{24}$/); assert.match(r.data.items[0].candidateId.name, /^Applicant /); assert.ok(!json.includes('$__')); assert.equal(r.data.items[0].matching.summary, true); assert.deepEqual(r.data.items[0].matching.criteria, []); assert.equal(r.data.items[0].score, 100); }
  });
  await t.test('same-timestamp records page without overlap; cursor binds user/permissions/filters', async () => {
    await Candidate.updateMany({}, { $set: { createdAt: new Date('2026-01-01') } }, { timestamps: false });
    const first = await get('admin', 'candidates', '?pageSize=2'); const second = await get('admin', 'candidates', '?pageSize=2&after=' + first.data.nextCursor);
    assert.equal(second.status, 200); assert.equal(second.data.items.length, 2); assert.ok(!second.data.items.some(c => first.data.items.some(f => f._id === c._id))); assert.equal(second.data.total, 5);
    assert.equal((await get('own', 'candidates', '?pageSize=2&after=' + first.data.nextCursor)).status, 400);
    assert.equal((await get('admin', 'candidates', '?pageSize=2&q=Applicant&after=' + first.data.nextCursor)).status, 400);
    assert.equal((await get('admin', 'candidates', '?pageSize=2&after=not-a-cursor-token')).status, 400);
  });
  await t.test('job-specific and Candidate-specific queries bound the same Application context', async () => {
    assert.equal((await get('admin', 'applications', `?jobId=${made[0].job._id}`)).data.total, 1);
    assert.equal((await get('admin', 'applications', `?candidateId=${made[0].candidate._id}`)).data.total, 1);
    assert.equal((await get('own', 'applications', `?jobId=${made[3].job._id}`)).status, 404, 'Unreadable and missing parents are indistinguishable');
  });
  await t.test('search, status and brand filters are scoped, escaped and do not broaden grants', async () => {
    assert.equal((await get('own', 'jobs', '?q=Vacancy&brandId=kfc')).data.total, 2); assert.equal((await get('own', 'jobs', '?brandId=simit-sarayi')).data.total, 0);
    assert.equal((await get('admin', 'candidates', '?q=.*')).data.total, 0); assert.equal((await get('own', 'candidates', '?q=Applicant%203')).data.total, 0);
    const r = await get('own', 'applications', '?q=Applicant%200&brandId=kfc'); assert.equal(r.status, 200); assert.equal(r.data.total, 1);
  });
  await t.test('missing Candidate permission cannot search/count hidden populated names or expose derived scores', async () => {
    await h.models.Role.create({ key: 'page_mixed', name: 'Mixed pages', permissions: [{ resource: 'application', action: 'read', scope: 'all' }, { resource: 'recruitment', action: 'read', scope: 'all' }] });
    await h.models.User.updateOne({ _id: h.actors.peer._id }, { $set: { role: 'page_mixed' } });
    const r = await get('peer', 'applications'); assert.equal(r.status, 200); assert.equal(r.data.total, 5); assert.ok(r.data.items.every(a => a.candidateId === null && a.score === null && a.scoreStatus === 'restricted'));
    const hidden = await get('peer', 'applications', '?q=Applicant'); assert.equal(hidden.status, 200); assert.equal(hidden.data.total, 0);
    assert.equal((await get('peer', 'applications', `?candidateId=${made[0].candidate._id}`)).status, 404, 'A resource-id filter must not reveal an unreadable parent cohort');
    await h.models.Role.updateOne({ key: 'page_mixed' }, { $set: { permissions: [{ resource: 'application', action: 'read', scope: 'all' }, { resource: 'candidate', action: 'read', scope: 'all' }] } });
    assert.equal((await get('peer', 'applications', `?jobId=${made[0].job._id}`)).status, 404, 'Unscoped Job IDs are not a grouping oracle');
    await h.models.User.updateOne({ _id: h.actors.peer._id }, { $set: { role: 'test_own' } });
  });
  await t.test('candidate lookup excludes only readable links and validates its Job parent', async () => {
    const foreignLink = await Application.create({ jobId: made[0].job._id, candidateId: made[1].candidate._id, createdBy: h.actors.foreign._id, assignedTo: h.actors.foreign._id, departmentId: 'dep_B' });
    const own = await get('own', 'candidates', `?excludeJobId=${made[0].job._id}`); assert.equal(own.status, 200); assert.deepEqual(own.data.items.map(c => c._id), [String(made[1].candidate._id)]);
    const all = await get('admin', 'candidates', `?excludeJobId=${made[0].job._id}`); assert.equal(all.status, 200); assert.equal(all.data.total, 3);
    assert.equal((await get('own', 'candidates', `?excludeJobId=${made[3].job._id}`)).status, 404);
    assert.ok(await Application.exists({ _id: foreignLink._id }));
  });
  await t.test('none/missing department/anonymous scopes fail closed for every page', async () => {
    for (const kind of ['jobs', 'candidates', 'applications']) for (const [actor, status] of [['none', 403], ['department_missing', 403], ['anonymous', 401]]) assert.equal((await get(actor, kind)).status, status);
  });
  await t.test('legacy array endpoints remain available and detail retains full HR review data', async () => {
    for (const kind of ['jobs', 'candidates', 'applications']) assert.ok(Array.isArray((await h.request('admin', 'GET', '/' + kind)).data));
    const detail = await h.request('admin', 'GET', `/candidates/${made[0].candidate._id}`); assert.equal(detail.status, 200); assert.ok(JSON.stringify(detail.data).includes('PRIVATE_EVIDENCE'));
  });
  await t.test('bad paging/filter inputs cannot request unbounded data or inject a scope', async () => {
    for (const [kind, q] of [['jobs', '?pageSize=100000'], ['jobs', '?page=0'], ['candidates', '?pageSize=NaN'], ['jobs', '?q[$ne]=x'], ['jobs', '?sort=score'], ['applications', '?status=Invented'], ['applications', '?jobId=wrong'], ['candidates', '?brandId=kfc'], ['jobs', '?createdBy=foreign']]) assert.equal((await get('admin', kind, q)).status, 400);
  });
  await t.test('paginated catalog lookups preserve global brands and independent branch scopes', async () => {
    const Branch = require('../models/recruitmentBranch.model'), Brand = require('../models/recruitmentBrand.model');
    await Brand.insertMany(Array.from({ length: 35 }, (_, i) => ({ _id: `custom-${i}`, name: `Custom brand ${i}` })));
    await Branch.insertMany(made.map((row, i) => ({ code: `branch-${i}`, name: `Branch ${i}`, brandId: 'kfc', kind: 'restaurant', createdBy: row.job.createdBy, assignedTo: row.job.assignedTo, departmentId: row.job.departmentId })));
    const brands = await get('own', 'brands', '?pageSize=2'); assert.equal(brands.status, 200); assert.equal(brands.data.total, 38); assert.deepEqual(brands.data.items.map(b => b.id), ['kfc', 'pizza-hut']);
    const second = await get('admin', 'brands', '?pageSize=2&page=2'); assert.equal(second.data.items[0].id, 'simit-sarayi'); assert.equal(second.data.items.length, 2);
    const custom = await get('own', 'brands', '?q=Custom%20brand%2034'); assert.equal(custom.data.total, 1); assert.equal(custom.data.items[0].id, 'custom-34');
    for (const [actor, count] of [['admin', 5], ['own', 2], ['department', 4], ['assigned', 1]]) {
      const branches = await get(actor, 'branches', '?sort=name&brandId=kfc'); assert.equal(branches.status, 200); assert.equal(branches.data.total, count); assert.ok(branches.data.items.every(b => b.createdBy === undefined && b.departmentId === undefined));
    }
    assert.equal((await get('own', 'branches', '?q=Branch%203')).data.total, 0);
    for (const kind of ['brands', 'branches']) assert.equal((await get('none', kind)).status, 403);
    for (const [kind, query] of [['brands', '?after=invalid'], ['brands', '?brandId=kfc'], ['branches', '?jobId=' + made[0].job._id]]) assert.equal((await get('admin', kind, query)).status, 400);
  });
  await t.test('processing filter is server-owned and legacy missing scores retain plain parent DTOs', async () => {
    await Application.updateOne({ _id: made[0].app._id }, { $set: { processingState: 'running' }, $unset: { matching: 1 } });
    const page = await get('admin', 'applications', '?status=Processing'); assert.equal(page.status, 200); assert.equal(page.data.total, 1); const row = page.data.items[0];
    assert.equal(row.status, 'Applied'); assert.equal(row.processingState, 'running'); assert.equal(row.score, null); assert.equal(row.scoreStatus, 'legacy');
    assert.equal(row.candidateId.name, 'Applicant 0'); assert.equal(row.candidateId._doc, undefined); assert.equal(row.candidateId.$__, undefined);
    assert.equal((await get('admin', 'jobs', '?q=Cash%20handling')).data.total, 5);
  });
  await t.test('bounded skill previews preserve real counts and full detail remains editable', async () => {
    const skills = Array.from({ length: 40 }, (_, i) => `Skill ${i}`);
    await Job.updateOne({ _id: made[0].job._id }, { $set: { requiredSkills: skills } }); await Candidate.updateOne({ _id: made[0].candidate._id }, { $set: { skills } });
    for (const [kind, row, field] of [['jobs', made[0].job, 'requiredSkills'], ['candidates', made[0].candidate, 'skills']]) {
      const page = await get('admin', kind, '?q=' + (kind === 'jobs' ? 'Vacancy%200' : 'Applicant%200'));
      assert.equal(page.status, 200); assert.equal(page.data.items[0][field].length, 12); assert.equal(page.data.items[0][field + 'Count'], 40);
      const detail = await h.request('admin', 'GET', '/' + kind + '/' + row._id); assert.equal(detail.data[field].length, 40);
    }
  });
  await t.test('compound index supports a real scoped newest-page query without collection scan', async () => {
    const plan = await Candidate.find({ createdBy: h.actors.own._id }).sort({ createdAt: -1, _id: -1 }).hint({ createdBy: 1, createdAt: -1, _id: -1 }).limit(2).explain('executionStats');
    const winner = JSON.stringify(plan.queryPlanner.winningPlan); assert.ok(winner.includes('IXSCAN')); assert.ok(winner.includes('createdBy_1_createdAt_-1__id_-1')); assert.ok(!winner.includes('COLLSCAN')); assert.ok(!winner.includes('"stage":"SORT"'));
    assert.equal(plan.executionStats.nReturned, 2); assert.equal(plan.executionStats.totalDocsExamined, 2);
  });
}));
