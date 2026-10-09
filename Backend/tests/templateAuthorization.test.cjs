const test = require('node:test');
const assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Template = require('../models/auditTemplate.model');
const Source = require('../models/auditSourceDocument.model');

test('Template and linked source scopes fail closed without trusted provenance', async t => withAuditFixture(async h => {
  for (const scope of ['own', 'department', 'assigned', 'none']) await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: { $each: [
    { resource: 'audit.template', action: '*', scope }, { resource: 'audit.source_document', action: '*', scope },
    { resource: 'audit.execution', action: '*', scope },
  ] } } });
  const payload = { brandName: 'Synthetic brand', name: 'Synthetic template', auditType: 'standard', sections: [{ id: 'section', title: 'Section', questions: [{ id: 'q1', label: 'Private question' }] }] };
  const foreign = await Template.create({ ...payload, createdBy: String(h.actors.foreign._id) });
  const forged = await Template.create({ ...payload, name: 'Legacy claimed owner', createdBy: String(h.actors.own._id), departmentId: 'dep_A' });
  const source = await Source.create({ id: 'foreign-source', templateId: String(foreign._id), originalName: 'Synthetic private source', uploadedBy: String(h.actors.foreign._id) });
  for (const actor of ['own', 'department', 'assigned', 'none', 'hr', 'anonymous']) {
    const calls = [
      ['GET', '/audit-templates'], ['GET', `/audit-templates?brandId=${foreign.brandId}&auditType=standard`],
      ['GET', `/audit-templates/${foreign._id}`], ['GET', `/audit-templates/${forged._id}`],
      ['POST', '/audit-templates', { ...payload, createdBy: String(h.actors[actor === 'anonymous' ? 'own' : actor]._id), updatedBy: 'admin' }],
      ['PUT', `/audit-templates/${foreign._id}`, { name: 'Denied edit', createdBy: 'forged', updatedBy: 'forged' }],
      ['DELETE', `/audit-templates/${foreign._id}`],
      // There is no separate copy endpoint: client cloning is a normal POST.
      ['POST', '/audit-templates', { ...payload, name: 'Denied copy', sections: foreign.sections.toObject() }],
      ['GET', `/audit-source-documents?templateId=${foreign._id}`],
      ['POST', '/audit-source-documents', { templateId: String(foreign._id), uploadedBy: 'forged' }],
      ['DELETE', `/audit-source-documents/${source.id}`],
    ];
    for (const [method, endpoint, body] of calls) await t.test(`${actor}: ${method} ${endpoint} denies data and writes`, async () => {
      const before = { templates: await Template.find().sort({ _id: 1 }).lean(), sources: await Source.find().sort({ _id: 1 }).lean() };
      const response = await h.request(actor, method, endpoint, body);
      assert.equal(response.status, actor === 'anonymous' ? 401 : 403);
      assert.equal(JSON.stringify(response.data).includes('Private question'), false);
      assert.deepEqual({ templates: await Template.find().sort({ _id: 1 }).lean(), sources: await Source.find().sort({ _id: 1 }).lean() }, before);
    });
  }
  for (const actor of ['admin', 'auditor']) await t.test(`${actor}: explicit all preserves template CRUD/filter/copy and binds metadata on server`, async () => {
    const created = await h.request(actor, 'POST', '/audit-templates', { ...payload, createdBy: String(h.actors.foreign._id), updatedBy: 'forged' });
    assert.equal(created.status, 201); const id = created.data.id;
    assert.equal(created.data.createdBy, String(h.actors[actor]._id)); assert.equal(created.data.updatedBy, String(h.actors[actor]._id));
    assert.ok((await h.request(actor, 'GET', '/audit-templates?auditType=standard')).data.some(item => item.id === id));
    const detail = await h.request(actor, 'GET', `/audit-templates/${id}`); assert.equal(detail.status, 200);
    const updated = await h.request(actor, 'PUT', `/audit-templates/${id}`, { name: 'Updated', createdBy: 'forged', updatedBy: 'forged' });
    assert.equal(updated.status, 200); assert.equal(updated.data.createdBy, created.data.createdBy); assert.equal(updated.data.updatedBy, String(h.actors[actor]._id));
    const copy = await h.request(actor, 'POST', '/audit-templates', { ...detail.data, name: 'Copy' });
    assert.equal(copy.status, 201); assert.notEqual(copy.data.id, id);
    assert.equal((await h.request(actor, 'DELETE', `/audit-templates/${id}`)).status, 200);
    assert.equal((await h.request(actor, 'DELETE', `/audit-templates/${copy.data.id}`)).status, 200);
  });
  await t.test('global source grants preserve list/delete while auditor assigned mutations fail before file parsing', async () => {
    assert.equal((await h.request('admin', 'GET', `/audit-source-documents?templateId=${foreign._id}`)).data.length, 1);
    assert.equal((await h.request('auditor', 'GET', '/audit-source-documents')).status, 200);
    assert.equal((await h.request('auditor', 'POST', '/audit-source-documents', {})).status, 403);
    assert.equal((await h.request('auditor', 'DELETE', `/audit-source-documents/${source.id}`)).status, 403);
    assert.equal((await h.request('admin', 'POST', '/audit-source-documents', {})).status, 400); // Missing file, not an authorization denial.
    assert.equal((await h.request('admin', 'DELETE', `/audit-source-documents/${source.id}`)).status, 200);
  });
  const audit = await h.audit('own');
  for (const actor of ['own', 'department', 'assigned']) await t.test(`${actor}: template reference cannot bypass read scope via Execution create`, async () => {
    if (actor === 'assigned') await h.assign('assigned', audit);
    if (actor === 'department') {
      const Snapshot = require('../models/auditDepartmentSnapshot.model');
      await Snapshot.create({ auditId: audit._id, auditorId: audit.auditorId, departmentId: 'dep_A' });
    }
    assert.equal((await h.request(actor, 'POST', '/audit-execution', { auditId: audit.id, checklistId: String(foreign._id) })).status, 403);
    assert.equal((await h.request(actor, 'POST', '/audit-execution', { auditId: audit.id })).status, 201);
  });
  await t.test('global template read permits authorized Execution use; unknown/malformed references are 404/400', async () => {
    const response = await h.request('admin', 'POST', '/audit-execution', { auditId: audit.id, checklistId: String(foreign._id) });
    assert.equal(response.status, 201); assert.equal(response.data.data.checklistId, String(foreign._id));
    assert.equal((await h.request('admin', 'POST', '/audit-execution', { auditId: audit.id, checklistId: String(new h.mongoose.Types.ObjectId()) })).status, 404);
    assert.equal((await h.request('admin', 'POST', '/audit-execution', { auditId: audit.id, checklistId: 'invalid' })).status, 400);
  });
  await t.test('fresh server role lookup revokes all even with the old JWT', async () => {
    await h.models.Role.updateOne({ key: 'auditor' }, { $set: { 'permissions.$[entry].scope': 'own' } }, { arrayFilters: [{ 'entry.resource': 'audit.template' }] });
    assert.equal((await h.request('auditor', 'GET', `/audit-templates/${foreign._id}`)).status, 403);
  });
  await t.test('global invalid/missing identifiers preserve 400/404 responses', async () => {
    assert.equal((await h.request('admin', 'GET', '/audit-templates/invalid')).status, 400);
    assert.equal((await h.request('admin', 'GET', `/audit-templates/${new h.mongoose.Types.ObjectId()}`)).status, 404);
  });
}));
