const test = require('node:test');
const assert = require('node:assert/strict');
const { withBrowserFixture } = require('./helpers/browser.cjs');
const harness = `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';
import {AuthContext} from '/src/Context/AuthContext.ts';
import Execution from '/src/Pages/Audit/AuditExecution/AuditExecutionPage.tsx';
import * as service from '/src/Services/auditExecutionService.ts';
import api from '/src/api/axios.ts'; api.defaults.baseURL='/api'; window.executionService=service;
function App(){const [user,setUser]=React.useState(window.testUser);window.setTestUser=setUser;window.navigateTest=useNavigate();
return React.createElement(AuthContext.Provider,{value:{user,isLoading:false}},React.createElement(Routes,null,React.createElement(Route,{path:'/execution/:id',element:React.createElement(Execution)})));}
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));
`;

test('Execution frontend uses authenticated JSON contracts and safe lifecycle states', async t => withBrowserFixture(harness, async h => {
  for (const scope of ['own', 'assigned']) await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: { $each: [
    { resource: 'audit.execution', action: '*', scope }, { resource: 'audit.template', action: 'read', scope: 'all' },
  ] } } });
  const Template = require('../../Backend/models/auditTemplate.model');
  const template = await Template.create({ brandName: 'Synthetic brand', name: 'Synthetic template', auditType: 'standard', sections: [{ id: 's1', title: 'Section', questions: [{ id: 'q1', label: 'Stored question' }, { id: 'q2', label: 'New question' }] }] });
  const audit = await h.audit('own');
  const content={...template.toObject(),organizationId:'gfc',brandId:'kfc',sections:[{id:'s1',title:'Synthetic',questions:[{id:'q1',label:'Stored question',answerType:'text',required:true},{id:'q2',label:'New question',answerType:'text',required:true}]}]};
  const revision=await require('../../Backend/models/auditTemplateRevision.model').create({templateId:template._id,revision:1,content,publishedBy:String(h.actors.admin._id),publishedAt:new Date()});
  await h.models.Audit.updateOne({_id:audit._id},{$set:{templateId:template._id,templateRevisionId:revision._id,templateSnapshot:content}});
  await require('../../Backend/models/auditContext.model').create({_id:audit._id,organizationId:'gfc',brandId:'kfc',direction:'standard',restaurantId:audit.restaurantId,actorId:String(h.actors.admin._id),templateRevisionId:revision._id});
  const first = await h.models.Execution.create({ auditId: audit._id, checklistId: template._id, templateRevisionId:revision._id,templateSnapshot:content, answers: [{ questionId: 'q1', answer: 'stored answer', score: 12, comment: 'keep' }] });
  const second = await h.models.Execution.create({ auditId: audit._id, checklistId:template._id, answers: [{ questionId: 'newer question', answer: 'newer answer', score: 0 }] });
  const requests = [];
  h.page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/audit-execution')) requests.push({ method: request.method(), contentType: request.headers()['content-type'], hasBearer: request.headers().authorization?.startsWith('Bearer ') || false, body: request.postDataJSON() }); });
  await t.test('actual service create/list/detail/PUT submit sends Bearer and JSON, rejecting client score authority', async () => {
    await h.open('own', `/execution/${second._id}`); await h.page.getByRole('textbox', { name: 'newer question' }).waitFor();
    assert.equal(h.wire.filter(item => item.path === `/api/audit-execution/${second._id}`).length, 1, 'StrictMode shares the in-flight authenticated read');
    const result = await h.page.evaluate(async auditId => {
      const api = window.executionService;
      const created = await api.startAuditExecution({ auditId, answers: [{ questionId: 'flow', answer: 'first', score: 0 }] });
      const listed = await api.listAuditExecutions(auditId), detail = await api.getAuditExecution(created.data._id);
      const updated = await api.submitAuditAnswers(created.data._id, [{ questionId: 'q1', answer: 'final', score: 999 },{questionId:'q2',answer:'second',score:999}]);
      return { created, listed, detail, updated };
    }, audit.id);
    assert.equal(result.created.success, true); assert.equal(result.created.data.auditId, String(audit._id));
    assert.ok(result.listed.data.some(item => item._id === result.created.data._id));
    assert.equal(result.detail.data.answers[0].answer, 'stored answer');
    assert.equal(result.updated.data.answers[0].answer, 'final'); assert.equal(result.updated.data.totalScore, null);
    assert.ok(requests.every(request => request.hasBearer));
    for (const request of requests.filter(request => ['POST', 'PUT'].includes(request.method))) assert.ok(request.contentType.includes('application/json'));
    assert.ok(requests.some(request => request.method === 'PUT')); assert.ok(!requests.some(request => request.method === 'PATCH'));
    assert.ok(h.wire.filter(item => item.path.startsWith('/api/audit-execution')).every(item => item.actor === 'own'));
  });
  await t.test('bound snapshot answers render; submission retains comment and strips client score', async () => {
    await h.models.Execution.updateOne({_id:first._id},{$set:{answers:[{questionId:'q1',answer:'stored answer',score:12,comment:'keep'}],status:'draft'}});
    await h.open('own', `/execution/${first._id}`);
    await h.page.getByRole('textbox', { name: 'New question' }).waitFor();
    await h.page.getByRole('textbox', { name: 'Stored question' }).fill('edited answer');
    await h.page.getByRole('textbox', { name: 'New question' }).fill('added answer');
    await h.page.getByRole('button', { name: 'auditFoundation.submit' }).click();
    await h.page.waitForFunction(()=>document.querySelector('.audit-execution__action-copy small')?.textContent.includes('completed'));
    const stored = await h.models.Execution.findById(first._id);
    assert.equal(stored.answers.find(answer => answer.questionId === 'q1').answer, 'edited answer');
    assert.equal(stored.answers.find(answer => answer.questionId === 'q1').score, 0);
    assert.equal(stored.answers.find(answer => answer.questionId === 'q1').comment, 'keep');
    assert.equal(stored.totalScore, null); assert.deepEqual(h.pageErrors, []);
  });
  await t.test('Legacy stored answers remain readable, and unbound submission fails closed', async () => {
    await h.open('own', `/execution/${second._id}`);
    await h.page.getByText('auditFoundation.legacyExecution', { exact: true }).waitFor();
    assert.equal(await h.page.getByRole('textbox', { name: 'newer question' }).inputValue(), 'newer answer');
    const status=await h.page.evaluate(async id=>{try{await window.executionService.submitAuditAnswers(id,[{questionId:'newer question',answer:'changed',score:999}]);return 200;}catch(error){return error.response.status;}},String(second._id));
    assert.equal(status,409);assert.equal((await h.models.Execution.findById(second._id)).answers[0].answer,'newer answer');
  });
  for (const status of [401, 403, 404, 500]) await t.test(`primary HTTP ${status} renders a distinct error state`, async () => {
    await h.page.route('**/api/audit-execution/status-test', route => route.fulfill({ status, contentType: 'application/json', body: '{"message":"Injected primary error"}' }));
    await h.open('own', '/execution/status-test');
    await h.page.locator(`[data-audit-state="${{401:'unauthenticated',403:'forbidden',404:'not-found',500:'server-error'}[status]}"]`).waitFor();
    await h.page.unroute('**/api/audit-execution/status-test');
  });
  await t.test('late previous execution cannot overwrite a newer execution', async () => {
    let release, entered; const gate = new Promise(resolve => release = resolve), started = new Promise(resolve => entered = resolve);
    await h.page.route(`**/api/audit-execution/${first._id}`, async route => { entered(); await gate; await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: first.toObject() }) }); });
    try {
      await h.open('own', `/execution/${first._id}`); await started;
      await h.page.evaluate(id => window.navigateTest('/execution/' + id), String(second._id));
      await h.page.getByRole('textbox', { name: 'newer question' }).waitFor(); release();
      await h.page.waitForLoadState('networkidle');
      assert.equal(await h.page.getByRole('textbox', { name: 'newer question' }).inputValue(), 'newer answer');
    } finally { release(); await h.page.unroute(`**/api/audit-execution/${first._id}`); }
  });
  await t.test('permission loss removes sensitive execution data immediately', async () => {
    await h.open('own', `/execution/${second._id}`); await h.page.getByRole('textbox', { name: 'newer question' }).waitFor();
    const user = await h.profile('own'); user.permissions = [];
    await h.page.evaluate(user => window.setTestUser(user), user);
    await h.page.locator('[data-audit-state="forbidden"]').waitFor(); assert.equal(await h.page.getByRole('textbox').count(), 0);
  });
  await t.test('revoked assignment is rechecked on focus with the existing JWT', async () => {
    const assignment = await h.assign('assigned', audit);
    await h.open('assigned', `/execution/${second._id}`); await h.page.getByRole('textbox', { name: 'newer question' }).waitFor();
    await h.models.Assignment.deleteOne({ _id: assignment._id });
    await h.page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await h.page.locator('[data-audit-state="forbidden"]').waitFor(); assert.equal(await h.page.getByRole('textbox').count(), 0);
  });
  await t.test('forbidden submit is caught without changing the document or throwing page errors', async () => {
    const before = await h.models.Execution.findById(second._id).lean();
    await h.page.route(`**/api/audit-execution/${second._id}/submit`, route => route.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"Injected submit denial"}' }));
    await h.open('own', `/execution/${second._id}`); await h.page.getByRole('textbox', { name: 'newer question' }).waitFor();
    await h.page.getByRole('button', { name: 'auditFoundation.submit' }).click(); await h.page.locator('[data-audit-state="forbidden"]').waitFor();
    assert.deepEqual(await h.models.Execution.findById(second._id).lean(), before); assert.deepEqual(h.pageErrors, []);
    await h.page.unroute(`**/api/audit-execution/${second._id}/submit`);
  });
}));
