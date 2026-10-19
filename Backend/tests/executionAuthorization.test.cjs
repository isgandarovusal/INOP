const test = require('node:test');
const assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Snapshot = require('../models/auditDepartmentSnapshot.model');

test('Execution integration uses the real parent audit for every scope and operation', async t => withAuditFixture(async h => {
  await Snapshot.createIndexes();
  for (const scope of ['own', 'department', 'assigned', 'none']) {
    await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: { resource: 'audit.execution', action: '*', scope } } });
  }
  const audits = {}, executions = {};
  const template=(await h.request('admin','POST','/audit-templates',{organizationId:'gfc',brandId:'kfc',brandName:'KFC',auditType:'service',name:'Synthetic scope contract',sections:[{id:'s',title:'Synthetic',questions:[{id:'q1',label:'Synthetic',answerType:'yes-no-na'}]}]})).data;
  const published=await h.request('admin','POST',`/audit-templates/${template.id}/publish`,{});assert.equal(published.status,200);const revision=published.data.data;
  const makeParent=async owner=>{const audit=await h.audit(owner,'service',{templateId:template.id,templateRevisionId:revision._id,templateSnapshot:revision.content});await Snapshot.create({auditId:audit._id,auditorId:audit.auditorId,departmentId:h.actors[owner].departmentId});await require('../models/auditContext.model').create({_id:audit._id,organizationId:'gfc',brandId:'kfc',direction:'service',restaurantId:audit.restaurantId,templateRevisionId:revision._id,actorId:audit.auditorId});return audit;};

  for (const actor of ['own', 'department', 'assigned', 'peer', 'foreign']) {
    audits[actor] = await makeParent(actor);
    executions[actor] = await h.models.Execution.create({ auditId: audits[actor]._id, templateRevisionId:revision._id,templateSnapshot:revision.content,createdBy: String(h.actors.foreign._id), answers: [{ questionId: 'q1', answer: 'initial', score: 0 }] });
  }
  const legacy = await h.audit('foreign', 'standard', { departmentId: 'dep_A' });
  executions.legacy = await h.models.Execution.create({ auditId: legacy._id });
  const assignment = await h.assign('assigned', audits.foreign);
  const expected = { admin: Object.keys(executions), own: ['own'], department: ['own', 'department', 'assigned', 'peer'], assigned: ['assigned', 'foreign'] };
  for (const [actor, owners] of Object.entries(expected)) {
    await t.test(`${actor}: list exposes exactly authorized parent records`, async () => {
      const response = await h.request(actor, 'GET', '/audit-execution');
      assert.equal(response.status, 200); assert.equal(response.data.success, true);
      assert.deepEqual(response.data.data.map(item => item._id).sort(), owners.map(owner => String(executions[owner]._id)).sort());
      const filtered = await h.request(actor, 'GET', `/audit-execution?auditId=${audits.foreign.id}`);
      assert.equal(filtered.status, 200);
      assert.equal(filtered.data.data.length, owners.includes('foreign') ? 1 : 0);
    });
    for (const [owner, execution] of Object.entries(executions)) {
      const allowed = owners.includes(owner);
      await t.test(`${actor}: ${owner} detail and submit enforce the same parent scope`, async () => {
        const before = await h.models.Execution.findById(execution._id).lean();
        assert.equal((await h.request(actor, 'GET', `/audit-execution/${execution._id}`)).status, allowed ? 200 : 403);
        const response = await h.request(actor, 'PUT', `/audit-execution/${execution._id}/submit`, { answers: [{ questionId: 'q1', answer: 'yes', score: 80 }], auditId: String(audits[actor === 'admin' ? 'own' : actor]._id), createdBy: String(h.actors.admin._id) });
        assert.equal(response.status, allowed ? owner==='legacy'?409:200 : 403);
        const after = await h.models.Execution.findById(execution._id).lean();
        if (allowed&&owner!=='legacy') {
          assert.equal(response.data.success, true); assert.equal(response.data.data.totalScore, null);assert.equal(response.data.data.overallPercentage,100);assert.equal(after.answers[0].score,0,'Schema default remains; client 80 points are not trusted');
          assert.equal(response.data.data.riskLevel, 'unscored'); assert.equal(after.status, 'completed');
          assert.equal(String(after.auditId), String(before.auditId)); assert.equal(after.createdBy, before.createdBy);
          await h.models.Execution.replaceOne({ _id: execution._id }, before);
        } else assert.deepEqual(after, before);
      });
    }
    await t.test(`${actor}: create binds canonical parent and server creator, then list/detail/submit work`, async () => {
      const parent = await makeParent(actor === 'admin' ? 'foreign' : actor);
      const response = await h.request(actor, 'POST', '/audit-execution', { auditId: parent.id, createdBy: String(h.actors.admin._id), answers: [{ questionId: 'q1', answer: 'yes', score: 0 }] });
      assert.equal(response.status, 201); assert.equal(response.data.success, true);
      assert.equal(response.data.data.auditId, String(parent._id)); assert.equal(response.data.data.createdBy, String(h.actors[actor]._id));
      const id = response.data.data._id;
      assert.equal((await h.request(actor, 'GET', `/audit-execution/${id}`)).status, 200);
      assert.ok((await h.request(actor, 'GET', '/audit-execution')).data.data.some(item => item._id === id));
      assert.equal((await h.request(actor, 'PUT', `/audit-execution/${id}/submit`, { answers: [{ questionId: 'q1', answer: 'yes', score: 0 }] })).data.data.overallPercentage, 100);
      await h.models.Execution.deleteOne({ _id: id });
    });
  }
  await t.test('foreign create cannot be authorized by client creator or department', async () => {
    for (const actor of ['own', 'department']) assert.equal((await h.request(actor, 'POST', '/audit-execution', { auditId: String(audits.foreign._id), createdBy: String(h.actors[actor]._id), departmentId: 'dep_A' })).status, 403);
  });
  await t.test('child id alias and body auditId cannot substitute an authorized parent', async () => {
    await h.audit('own', 'standard', { id: String(executions.foreign._id) });
    assert.equal((await h.request('own', 'GET', `/audit-execution/${executions.foreign._id}`)).status, 403);
    assert.equal((await h.request('own', 'PUT', `/audit-execution/${executions.foreign._id}/submit`, { auditId: String(audits.own._id), answers: [] })).status, 403);
  });
  await t.test('assignment revocation immediately affects list/detail/submit/create with old JWT', async () => {
    await h.models.Assignment.deleteOne({ _id: assignment._id });
    assert.equal((await h.request('assigned', 'GET', `/audit-execution/${executions.foreign._id}`)).status, 403);
    assert.equal((await h.request('assigned', 'PUT', `/audit-execution/${executions.foreign._id}/submit`, { answers: [] })).status, 403);
    assert.equal((await h.request('assigned', 'POST', '/audit-execution', { auditId: audits.foreign.id })).status, 403);
    assert.equal((await h.request('assigned', 'GET', '/audit-execution')).data.data.length, 1);
  });
  for (const actor of ['hr', 'none', 'department_missing', 'anonymous']) await t.test(`${actor}: list/detail/create/submit fail closed`, async () => {
    for (const [method, endpoint, body] of [['GET', '/audit-execution'], ['GET', `/audit-execution/${executions.own._id}`], ['POST', '/audit-execution', { auditId: audits.own.id }], ['PUT', `/audit-execution/${executions.own._id}/submit`, { answers: [] }]]) {
      assert.equal((await h.request(actor, method, endpoint, body)).status, actor === 'anonymous' ? 401 : 403);
    }
  });
  await t.test('missing and malformed identifiers / invalid answer payloads are explicit 400/404 without writes', async () => {
    assert.equal((await h.request('admin', 'GET', '/audit-execution/not-an-id')).status, 400);
    assert.equal((await h.request('admin', 'GET', `/audit-execution/${new h.mongoose.Types.ObjectId()}`)).status, 404);
    const before = await h.models.Execution.findById(executions.own._id).lean();
    for (const answers of [{}, [null], [{ score: 'not-numeric' }], [{ answer: {} }]]) assert.equal((await h.request('admin', 'PUT', `/audit-execution/${executions.own._id}/submit`, { answers })).status, 400);
    assert.deepEqual(await h.models.Execution.findById(executions.own._id).lean(), before);
  });
  await t.test('Legacy nullable fields remain readable but unversioned submission cannot reinterpret history',async()=>{
    const parent=await h.audit('admin'),row=await h.models.Execution.create({auditId:parent._id,answers:[{questionId:null,answer:null,score:null,comment:null}]});
    assert.equal((await h.request('admin','GET',`/audit-execution/${row._id}`)).data.data.answers[0].score,null);const before=await h.models.Execution.findById(row._id).lean();
    assert.equal((await h.request('admin','PUT',`/audit-execution/${row._id}/submit`,{answers:before.answers})).status,409);assert.deepEqual(await h.models.Execution.findById(row._id).lean(),before);
  });
}));
