const test = require('node:test');
const assert = require('node:assert/strict');
const AuditFinding = require('../models/auditFinding.model');
const AuditAction = require('../models/auditAction.model');
const AuditApproval = require('../models/auditApproval.model');
const AuditExecution = require('../models/auditExecution.model');
const { assertAuditCompletion } = require('../services/auditCompletion.service');
const { updateApproval } = require('../controllers/auditApproval.controller');
const { updateAudit } = require('../controllers/audits.controller');
const Audit = require('../models/audit.model');
const mongoose = require('mongoose');
const date = new Date('2026-10-01T00:00:00Z');
const after = new Date('2026-10-02T00:00:00Z');
const audit = { _id: new mongoose.Types.ObjectId(), updatedAt: date, status: 'in-progress' };
function query(value) { return { sort() { return this; }, select() { return this; }, lean() { return Promise.resolve(value); }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } }; }
function mockPrerequisites(t, state = {}) {
  t.mock.method(AuditFinding, 'countDocuments', async () => state.openFindings || 0);
  t.mock.method(AuditAction, 'countDocuments', async () => state.openActions || 0);
  t.mock.method(AuditFinding, 'findOne', () => query(state.latestFinding || null));
  t.mock.method(AuditAction, 'findOne', () => query(null));
  t.mock.method(AuditExecution, 'findOne', filter => { assert.equal(String(filter.auditId), String(audit._id)); return query(state.execution === null ? null : state.execution || { _id: 'e', status: 'completed', updatedAt: date }); });
  t.mock.method(AuditApproval, 'findOne', filter => { assert.equal(filter.findingId, null); assert.equal(filter.actionId, null); return query(state.approval || null); });
}
test('completion cannot invent approval when no review exists', async t => {
  mockPrerequisites(t);
  await assert.rejects(assertAuditCompletion(audit), /approval is required/);
});
test('completion rejects open findings, unverified actions, and missing execution', async t => {
  mockPrerequisites(t, { openFindings: 1 });
  await assert.rejects(assertAuditCompletion(audit), /Open findings/);
});
test('completion rejects unverified corrective actions', async t => {
  mockPrerequisites(t, { openActions: 1 });
  await assert.rejects(assertAuditCompletion(audit), /Unverified/);
});
test('completion rejects an absent submitted execution', async t => {
  mockPrerequisites(t, { execution: null });
  await assert.rejects(assertAuditCompletion(audit), /completed execution/);
});
test('approval becomes stale if an execution or finding changes after it', async t => {
  mockPrerequisites(t, { approval: { status: 'approved', approvedAt: date }, latestFinding: { updatedAt: after } });
  await assert.rejects(assertAuditCompletion(audit), /changed after approval/);
});
test('fresh approval and complete remediation permit audit completion', async t => {
  mockPrerequisites(t, { approval: { status: 'approved', approvedAt: after } });
  const result = await assertAuditCompletion(audit);
  assert.equal(result.approval.status, 'approved');
});
test('approval requester cannot approve their own request even with all scope', async t => {
  t.mock.method(AuditApproval, 'findById', async () => ({ status: 'pending', requestedBy: 'u', reviewer: 'u' }));
  t.mock.method(AuditApproval, 'findOneAndUpdate', () => { throw new Error('Must not write'); });
  const req = { params: { id: String(new mongoose.Types.ObjectId()) }, body: { status: 'approved' }, user: { id: 'u' }, permission: { scope: 'all' }, audit };
  let error;
  await updateApproval(req, { status() { throw new Error('Unexpected response'); } }, value => { error = value; });
  assert.equal(error.statusCode, 403); assert.match(error.message, /own approval/);
});
test('assigned auditor cannot decide another nominated reviewer request', async t => {
  t.mock.method(AuditApproval, 'findById', async () => ({ status: 'pending', requestedBy: 'requester', reviewer: 'reviewer' }));
  const req = { params: { id: String(new mongoose.Types.ObjectId()) }, body: { status: 'rejected' }, user: { id: 'auditor' }, permission: { scope: 'assigned' }, audit };
  let error;
  await updateApproval(req, {}, value => { error = value; });
  assert.equal(error.statusCode, 403); assert.match(error.message, /nominated/);
});
test('completed audit content cannot be edited through the generic update endpoint', async t => {
  t.mock.method(Audit, 'findOne', () => query({ ...audit, status: 'completed' }));
  t.mock.method(Audit, 'findOneAndUpdate', () => { throw new Error('Must not write'); });
  const req = { params: { id: 'audit' }, body: { comments: 'edit' }, user: { id: 'u' }, permission: { scope: 'all' } };
  let error;
  await updateAudit(req, {}, value => { error = value; });
  assert.equal(error.statusCode, 409); assert.match(error.message, /closed audit/);
});

test('execution creation cannot read another users template through execution permission', async t => {
  const Role = require('../models/role.model');
  const Template = require('../models/auditTemplate.model');
  const { createExecution } = require('../controllers/auditExecution.controller');
  t.mock.method(Role, 'findOne', () => query({ permissions: [{ resource: 'audit.template', action: 'read', scope: 'own' }] }));
  t.mock.method(Audit, 'findById', () => query({ ...audit, auditType: 'service' }));
  t.mock.method(Template, 'findOne', filter => {
    assert.deepEqual(filter.$and[1], { createdBy: 'u' });
    return query(null);
  });
  let error;
  await createExecution({ audit, body: { checklistId: new mongoose.Types.ObjectId() }, user: { id: 'u', role: 'auditor' } }, {}, value => { error = value; });
  assert.equal(error.statusCode, 400); assert.match(error.message, /active template/);
});
test('execution snapshots avoid reading or exposing a live private template', async t => {
  const Template = require('../models/auditTemplate.model');
  const { getExecution } = require('../controllers/auditExecution.controller');
  const checklistId = new mongoose.Types.ObjectId();
  t.mock.method(Template, 'findOne', () => { throw new Error('Live template must not be read'); });
  t.mock.method(AuditExecution, 'findById', async () => ({ checklistId, checklistSnapshot: { sections: [{ questions: [{ id: 'q', label: 'Question', answerType: 'text' }] }] }, answers: [] }));
  let body;
  await getExecution({ params: { id: 'execution' } }, { json(value) { body = value; } }, error => { throw error; });
  assert.equal(body.data.checklistId, String(checklistId));
  assert.equal(body.data.checklist[0].question, 'Question');
});
