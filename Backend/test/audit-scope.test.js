const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Audit = require('../models/audit.model');
const Assignment = require('../models/auditAssignment.model');
const Execution = require('../models/auditExecution.model');
const scope = require('../middleware/auditScope.middleware');
const auditId = new mongoose.Types.ObjectId();
const childId = new mongoose.Types.ObjectId();
const chain = value => ({ select() { return this; }, lean() { return Promise.resolve(value); } });

test('scope filters fail closed for absent identity, absent scope and missing departments', async () => {
  assert.equal(await scope.getAuditScopeFilter({ permission: { scope: 'all' } }), null);
  assert.equal(await scope.getAuditScopeFilter({ user: { id: 'u' }, permission: {} }), null);
  assert.equal(await scope.getAuditScopeFilter({ user: { id: 'u' }, permission: { scope: 'department' } }), null);
});
test('assigned list filter contains owned and explicitly assigned audits only', async t => {
  t.mock.method(Assignment, 'find', query => { assert.equal(query.auditor, 'u'); return chain([{ auditId }]); });
  const filter = await scope.getAuditScopeFilter({ user: { id: 'u' }, permission: { scope: 'assigned' } });
  assert.deepEqual(filter, { deletedAt: null, $or: [{ auditorId: 'u' }, { _id: { $in: [auditId] } }] });
});
test('execution child ids resolve to the parent and attach the checked audit', async t => {
  t.mock.method(Execution, 'findById', id => { assert.equal(String(id), String(childId)); return chain({ auditId }); });
  t.mock.method(Audit, 'findOne', query => { assert.equal(String(query.$or[0]._id), String(auditId)); return chain({ _id: auditId, id: 'audit-public-id', auditorId: 'u', status: 'draft' }); });
  const req = { params: { id: String(childId) }, user: { id: 'u' }, permission: { scope: 'assigned', resource: 'audit.execution' } };
  let passed = false;
  const res = { status() { throw new Error('Access should be granted'); } };
  await scope.requireAssignedAuditAccess(req, res, err => { if (err) throw err; passed = true; });
  assert.equal(passed, true); assert.equal(String(req.audit._id), String(auditId));
});
test('unassigned audit and mismatched department cannot be accessed', async t => {
  t.mock.method(Audit, 'findOne', () => chain({ _id: auditId, auditorId: 'other', departmentId: 'finance' }));
  t.mock.method(Assignment, 'findOne', () => chain(null));
  assert.equal(await scope.userHasAuditAccess({ user: { id: 'u' }, permission: { scope: 'assigned' } }, auditId), false);
  assert.equal(await scope.userHasAuditAccess({ user: { id: 'u', departmentId: 'engineering' }, permission: { scope: 'department' } }, auditId), false);
});
test('nominated reviewer can access the approval parent without audit assignment', async t => {
  t.mock.method(Audit, 'findOne', () => chain({ _id: auditId, auditorId: 'other' }));
  const req = { user: { id: 'reviewer' }, permission: { resource: 'audit.approval', scope: 'assigned' }, auditChild: { reviewer: 'reviewer' } };
  assert.equal(await scope.userHasAuditAccess(req, auditId), true);
});

test('standard module list retains assignment and tombstone filters through pagination', async t => {
  const { getStandardAudits } = require('../controllers/auditModule.controller');
  t.mock.method(Assignment, 'find', () => chain([{ auditId }]));
  let seen;
  t.mock.method(Audit, 'find', filter => {
    seen = filter;
    return { sort() { return this; }, skip(value) { assert.equal(value, 0); return this; }, limit(value) { assert.equal(value, 1000); return this; }, lean() { return Promise.resolve([]); } };
  });
  t.mock.method(Audit, 'countDocuments', async filter => { assert.equal(filter, seen); return 0; });
  let result;
  const req = { query: {}, user: { id: 'u' }, permission: { scope: 'assigned' } };
  await getStandardAudits(req, { setHeader() {}, json(body) { result = body; } }, error => { throw error; });
  assert.equal(seen.$and[0].deletedAt, null);
  assert.deepEqual(seen.$and[0].$or, [{ auditorId: 'u' }, { _id: { $in: [auditId] } }]);
  assert.equal(seen.$and[1].auditType, 'standard'); assert.equal(result.count, 0);
});
test('summary analytics applies scope to both status aggregation and total count', async t => {
  const { getSummary } = require('../controllers/auditAnalytics.controller');
  t.mock.method(Assignment, 'find', () => chain([{ auditId }]));
  const pipelines = [];
  t.mock.method(Audit, 'aggregate', async pipeline => { pipelines.push(pipeline); return []; });
  await getSummary({ user: { id: 'u' }, permission: { scope: 'assigned' } }, { json() {} });
  assert.equal(pipelines.length, 2);
  for (const pipeline of pipelines) {
    assert.equal(pipeline[0].$match.deletedAt, null);
    assert.equal(pipeline[0].$match.$or[0].auditorId, 'u');
  }
});
test('dashboard averages totalScore and only joins visible live audit parents', async t => {
  const { getAuditDashboard } = require('../controllers/auditDashboard.controller');
  t.mock.method(Audit, 'countDocuments', async filter => { assert.equal(filter.deletedAt, null); return 0; });
  t.mock.method(Audit, 'aggregate', async () => []);
  t.mock.method(Execution, 'aggregate', async pipeline => {
    assert.deepEqual(pipeline[0].$lookup.pipeline[0].$match.$and[0], { deletedAt: null });
    assert.equal(pipeline[2].$facet.scoreStats[0].$group.averageScore.$avg, '$totalScore');
    return [];
  });
  await getAuditDashboard({ user: { id: 'u' }, permission: { scope: 'all' } }, { json() {} }, error => { throw error; });
});
test('deleted audit evidence cannot be accessed through a cached audit', async () => {
  assert.equal(await scope.userHasAuditAccess({ user: { id: 'u' }, permission: { scope: 'all' }, audit: { _id: auditId, deletedAt: new Date() } }, auditId), false);
});
