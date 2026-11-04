const test = require('node:test'), assert = require('node:assert/strict');
const { withBrowserFixture } = require('./helpers/browser.cjs');
const Application = require('../../Backend/models/application.model');
const harness = `import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';import {AuthContext} from '/src/Context/AuthContext.ts';import i18n from '/src/i18n/index.ts';import '/src/Styles/recruitment.css';import Apps from '/src/Pages/Recruitment/Applications/ApplicationsList.tsx';const Detail=React.lazy(()=>import('/src/Pages/Recruitment/Applications/ApplicationDetail.tsx'));const Candidates=React.lazy(()=>import('/src/Pages/Recruitment/Candidates/CandidatesList.tsx'));import api from '/src/api/axios.ts';api.defaults.baseURL='/api';window.changeLanguage=l=>i18n.changeLanguage(l);function App(){window.navigateTest=useNavigate();const [user,setUser]=React.useState(window.testUser);window.setTestUser=setUser;return React.createElement(AuthContext.Provider,{value:{user,isLoading:false}},React.createElement(React.Suspense,{fallback:'Loading module'},React.createElement(Routes,null,React.createElement(Route,{path:'/app/recruitment/applications',element:React.createElement(Apps)}),React.createElement(Route,{path:'/app/recruitment/applications/:id',element:React.createElement(Detail)}),React.createElement(Route,{path:'/app/recruitment/candidates',element:React.createElement(Candidates)}))));}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));`;
test('Application UI persists scoped workflow, handles conflicts and discards stale responses', async t => withBrowserFixture(harness, async h => {
  const candidate = (await h.request('admin', 'POST', '/candidates', { name: 'Workflow applicant', email: 'workflow@example.invalid', role: 'Cashier', skills: ['Cash handling'] })).data;
  const job = async title => (await h.request('admin', 'POST', '/jobs', { title, department: 'HR', description: 'Hiring', requiredSkills: ['Cash handling'] })).data;
  const firstJob = await job('First workplace'), secondJob = await job('Second workplace');
  const apply = async j => (await h.request('admin', 'POST', '/applications', { candidateId: candidate._id, jobId: j._id })).data;
  const first = await apply(firstJob), second = await apply(secondJob), detail = id => '/app/recruitment/applications/' + id;
  const card = id => h.page.locator(`[data-application-card="${id}"]`);
  const form = () => h.page.locator('[data-application-workflow]');
  await t.test('keyboard drag persists one Application and survives refresh without changing another vacancy', async () => {
    await h.open('admin', '/app/recruitment/applications?view=board'); await h.page.locator(`[data-application-score="${first._id}"]`).waitFor();
    if (!await h.page.locator('[data-application-kanban]').count()) await h.page.getByRole('button', { name: 'Application Kanban', exact: true }).click();
    await h.page.locator('[data-application-kanban]').waitFor();
    assert.equal(await card(first._id).count(), 1);
    const handle = card(first._id).locator('[data-rfd-drag-handle-draggable-id]'); assert.equal(await handle.count(), 1, 'Application board must expose a real accessible drag handle');
    await handle.focus(); await handle.press('Space'); await handle.press('ArrowRight'); await h.page.waitForTimeout(100);
    const response = h.page.waitForResponse(r => r.url().endsWith(`/applications/${first._id}/status`) && r.request().method() === 'PATCH');
    await handle.press('Space'); const saved = await response; assert.equal(saved.status(), 200);
    const body = saved.request().postDataJSON(); assert.equal(body.status, 'Screening'); assert.equal(body.expectedRevision, 0); assert.match(body.commandId, /^[a-f0-9-]{36}$/);
    await h.page.locator(`section[aria-label="İlkin seçim"] [data-application-card="${first._id}"]`).waitFor();
    assert.equal((await Application.findById(second._id)).status, 'Applied');
    await h.open('admin', '/app/recruitment/applications?view=board'); await h.page.locator(`section[aria-label="İlkin seçim"] [data-application-card="${first._id}"]`).waitFor();
    assert.equal((await Application.findById(first._id)).status, 'Screening');
  });
  if (process.env.INOP_BASELINE_ONLY) return;
  await t.test('processing is a separate non-droppable server-owned lane', async () => {
    await Application.updateOne({ _id: second._id }, { $set: { processingState: 'running' } });
    await h.open('admin', '/app/recruitment/applications?view=board'); await h.page.locator(`section[aria-label="Emal olunur"] [data-application-card="${second._id}"]`).waitFor();
    assert.equal((await Application.findById(second._id)).status, 'Applied');
    await h.page.getByRole('button', { name: 'Cədvəl', exact: true }).click();
    await h.page.locator('select').filter({ has: h.page.locator('option[value=processing]') }).selectOption('processing');
    await h.page.locator('tbody tr').filter({hasText:'Second workplace'}).waitFor();
    assert.equal(await h.page.locator('tbody tr').count(), 1); assert.ok((await h.page.locator('tbody').textContent()).includes('Second workplace'));
  });
  await t.test('search and sort operate on the scoped Application dataset', async () => {
    await h.open('admin', '/app/recruitment/applications'); await h.page.getByRole('searchbox').waitFor();
    await h.page.getByRole('searchbox').fill('Second workplace'); await h.page.waitForResponse(r => r.url().includes('/hr/v2/applications?') && new URL(r.url()).searchParams.get('q') === 'Second workplace'); await h.page.locator('tbody tr').filter({hasText:'First workplace'}).waitFor({state:'detached'}); assert.equal(await h.page.locator('tbody tr').count(), 1);
    assert.ok((await h.page.locator('tbody').textContent()).includes('Second workplace'));
    await h.page.getByRole('searchbox').fill(''); await h.page.waitForResponse(r => r.url().includes('/hr/v2/applications?') && !new URL(r.url()).searchParams.get('q')); await h.page.getByLabel('Sıralama', { exact: true }).selectOption('newest');
    assert.ok((await h.page.locator('tbody tr').first().textContent()).includes('Second workplace'));
  });
  await t.test('interview time, interviewer, outcome, substatus, next action and history persist', async () => {
    await h.open('admin', detail(first._id)); await form().waitFor();
    await form().getByLabel('Status', { exact: true }).selectOption('interview');
    await form().getByLabel('Alt-status', { exact: true }).selectOption('scheduled');
    await form().getByLabel('Müsahibə vaxtı', { exact: true }).fill('2026-11-10T10:30');
    await form().getByLabel('Müsahibə nəticəsi', { exact: true }).selectOption('passed');
    await form().getByLabel('Növbəti addım', { exact: true }).selectOption('follow_up');
    await form().getByLabel('Son tarix (seçilmiş saat qurşağında)', { exact: true }).fill('2026-11-11T11:00');
    await form().getByLabel('Dəyişiklik səbəbi', { exact: true }).fill('HR scheduled and reviewed');
    const response = h.page.waitForResponse(r => r.url().endsWith(`/applications/${first._id}/workflow`) && r.request().method() === 'PATCH');
    await form().locator('button[type=submit]').click(); assert.equal((await response).status(), 200);
    await h.page.getByText('HR scheduled and reviewed', { exact: false }).waitFor();
    const stored = await Application.findById(first._id); assert.equal(stored.interview.startsAt.toISOString(), '2026-11-10T06:30:00.000Z');
    assert.equal(stored.interview.result, 'passed'); assert.equal(stored.nextAction.dueAt.toISOString(), '2026-11-11T07:00:00.000Z'); assert.equal(stored.nextAction.timezone, 'Asia/Baku');
    await h.open('admin', detail(first._id)); await form().waitFor(); assert.equal(await form().getByLabel('Müsahibə vaxtı', { exact: true }).inputValue(), '2026-11-10T10:30');
    assert.equal(await form().getByLabel('Müsahibə nəticəsi', { exact: true }).inputValue(), 'passed');
    assert.equal(await h.page.getByRole('link', { name: 'Redaktə et', exact: true }).getAttribute('href'), `/app/recruitment/candidates/${candidate._id}/edit`);
  });
  await t.test('auxiliary roster/history outage does not hide the primary Application', async () => {
    await h.page.route('**/api/applications/*/interviewers', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Synthetic roster failure"}' }));
    await h.page.route('**/api/applications/*/history?*', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Synthetic history failure"}' }));
    await h.open('admin', detail(first._id)); await form().waitFor(); assert.ok(await h.page.getByText('Workflow applicant', { exact: true }).count());
    await h.page.locator('[data-hr-state=server-error]').waitFor(); assert.ok(await form().count());
    await h.page.unroute('**/api/applications/*/interviewers'); await h.page.unroute('**/api/applications/*/history?*');
  });
  await t.test('language change retains the draft and sends no new API request', async () => {
    await h.open('admin', detail(first._id)); await form().waitFor(); await h.page.getByRole('heading', { name: 'Müraciət tarixçəsi' }).waitFor();
    await form().getByLabel('HR qeydləri', { exact: true }).fill('Draft before translation');
    await h.page.waitForTimeout(100); const count = h.wire.length;
    await h.page.evaluate(() => window.changeLanguage('en')); assert.equal(await form().getByLabel('HR notes', { exact: true }).inputValue(), 'Draft before translation');
    await h.page.waitForTimeout(100); assert.equal(h.wire.length, count); await h.page.evaluate(() => window.changeLanguage('az'));
  });
  await t.test('409 rolls back an optimistic move and refetches the authoritative stage', async () => {
    await h.open('admin', '/app/recruitment/applications'); await h.page.locator(`[data-application-score="${first._id}"]`).waitFor();
    const current = await Application.findById(first._id);
    assert.equal((await h.request('admin', 'PATCH', `/applications/${first._id}/workflow`, { expectedRevision: current.__v, notes: 'Concurrent edit' })).status, 200);
    const select = h.page.locator('tbody tr').filter({ has: h.page.locator(`[data-application-score="${first._id}"]`) }).getByRole('combobox');
    await select.selectOption('offered'); await h.page.getByRole('alert').filter({ hasText: 'Müraciət başqa əməliyyatda dəyişib' }).waitFor();
    await h.page.waitForFunction(id => document.querySelector(`[data-application-score="${id}"]`)?.closest('tr')?.querySelector('select')?.value === 'interview', first._id);
    assert.equal((await Application.findById(first._id)).status, 'Interview');
  });
  await t.test('500 restores the original status while retaining visible applications', async () => {
    await h.page.route(`**/api/applications/${first._id}/status`, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Synthetic status failure"}' }));
    await h.open('admin', '/app/recruitment/applications'); await h.page.locator(`[data-application-score="${first._id}"]`).waitFor();
    const row = h.page.locator('tbody tr').filter({ has: h.page.locator(`[data-application-score="${first._id}"]`) });
    await row.getByRole('combobox').selectOption('offered'); await h.page.getByRole('alert').waitFor();
    assert.equal(await row.getByRole('combobox').inputValue(), 'interview'); assert.equal(await h.page.locator('tbody tr').count(), 2);
    await h.page.unroute(`**/api/applications/${first._id}/status`);
  });
  await t.test('a pending old mutation cannot reload the new permission context', async () => {
    let release, reached; const captured = new Promise(resolve => { reached = resolve; }); const gate = new Promise(resolve => { release = resolve; });
    await h.page.route(`**/api/applications/${first._id}/status`, async r => { reached(); await gate; await r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Synthetic late status failure"}' }).catch(() => {}); });
    await h.open('admin', '/app/recruitment/applications'); await h.page.locator(`[data-application-score="${first._id}"]`).waitFor();
    await h.page.locator('tbody tr').filter({ has: h.page.locator(`[data-application-score="${first._id}"]`) }).getByRole('combobox').selectOption('offered'); await captured;
    const profile = await h.profile('admin'); profile.permissions = []; await h.page.evaluate(p => window.setTestUser(p), profile);
    await h.page.locator('[data-hr-state=forbidden]').waitFor(); const count = h.wire.length; release(); await h.page.waitForTimeout(100);
    assert.equal(h.wire.length, count); assert.equal(await h.page.locator('[role=alert]').count(), 1); assert.equal(await h.page.locator('tbody').count(), 0);
    await h.page.unroute(`**/api/applications/${first._id}/status`);
  });
  await t.test('read-only role has no drag handles or workflow editor', async () => {
    await h.models.Role.create({ key: 'workflow_readonly', name: 'Workflow read only', permissions: ['application', 'candidate', 'recruitment'].map(resource => ({ resource, action: 'read', scope: 'all' })) });
    await h.models.User.updateOne({ _id: h.actors.peer._id }, { $set: { role: 'workflow_readonly' } });
    await h.open('peer', '/app/recruitment/applications?view=board'); await card(first._id).waitFor();
    assert.equal(await h.page.locator('[data-rfd-drag-handle-draggable-id]').count(), 0);
    await h.open('peer', detail(first._id)); await h.page.getByRole('heading', { name: 'Müraciət tarixçəsi' }).waitFor(); assert.equal(await form().count(), 0);
  });
  await t.test('Candidate cards no longer perform a candidate-global recruitment workflow', async () => {
    await h.open('admin', '/app/recruitment/candidates'); await h.page.getByText('Workflow applicant', { exact: true }).waitFor();
    await h.page.getByTitle('Namizəd kartları', { exact: true }).click(); await h.page.locator('.hr-candidate-grid').waitFor();
    assert.equal(await h.page.locator('[data-rfd-drag-handle-draggable-id]').count(), 0); await h.page.getByRole('button', { name: 'Müraciət mərhələləri', exact: true }).click();
    await h.page.waitForURL('**/applications?view=board'); await card(first._id).waitFor();
  });
  for (const [status, state] of [[401, 'unauthenticated'], [403, 'forbidden'], [404, 'not-found'], [500, 'server-error']]) await t.test(`primary ${status} has a distinct state`, async () => {
    await h.page.route(`**/api/applications/${first._id}`, r => r.fulfill({ status, contentType: 'application/json', body: '{"message":"Synthetic primary failure"}' }));
    await h.open('admin', detail(first._id)); await h.page.locator(`[data-hr-state=${state}]`).waitFor(); assert.equal(await form().count(), 0);
    await h.page.unroute(`**/api/applications/${first._id}`);
  });
  await t.test('old Application response cannot overwrite the new route', async () => {
    let release, intercepted; const reached = new Promise(resolve => { intercepted = resolve; }); const gate = new Promise(resolve => { release = resolve; });
    const old = await h.request('admin', 'GET', `/applications/${first._id}`);
    await h.page.route(`**/api/applications/${first._id}`, async r => { intercepted(); await gate; await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(old.data) }).catch(() => {}); });
    await h.open('admin', detail(first._id)); await reached; await h.page.evaluate(id => window.navigateTest('/app/recruitment/applications/' + id), second._id);
    await h.page.getByText('Second workplace · Yeni müraciət', { exact: true }).waitFor(); release(); await h.page.waitForTimeout(100);
    assert.equal(await h.page.getByText('First workplace · Müsahibə', { exact: true }).count(), 0); await h.page.unroute(`**/api/applications/${first._id}`);
  });
  await t.test('permission revocation clears the form and blocks new mutations', async () => {
    await h.open('admin', detail(first._id)); await form().waitFor(); const profile = await h.profile('admin'); profile.permissions = [];
    const count = h.wire.filter(r => r.method === 'PATCH').length; await h.page.evaluate(p => window.setTestUser(p), profile);
    await h.page.locator('[data-hr-state=forbidden]').waitFor(); assert.equal(await form().count(), 0); assert.equal(h.wire.filter(r => r.method === 'PATCH').length, count);
  });
  await t.test('assignment revocation after focus hides the previously visible Application with the old JWT', async () => {
    await h.models.Role.updateOne({ key: 'test_assigned' }, { $push: { permissions: { resource: 'application', action: '*', scope: 'assigned' } } });
    await Application.updateOne({ _id: first._id }, { $set: { assignedTo: h.actors.assigned._id } });
    await h.open('assigned', detail(first._id)); await form().waitFor();
    await Application.updateOne({ _id: first._id }, { $set: { assignedTo: h.actors.admin._id } });
    await h.page.evaluate(() => window.dispatchEvent(new Event('focus'))); await h.page.locator('[data-hr-state=not-found]').waitFor(); assert.equal(await form().count(), 0);
  });
  await t.test('blocked/failed notification is visible without hiding the successful interview', async () => {
    const { createNotificationWorker } = require('../../Backend/services/applicationNotificationWorker.service');
    await createNotificationWorker().runOnce(); await h.open('admin', detail(first._id)); await form().waitFor();
    await h.page.getByText('Bildiriş: Konfiqurasiya tələb olunur', { exact: true }).waitFor();
    let clock = new Date(); const worker = createNotificationWorker({ available: () => true, now: () => clock, send: async () => { throw Error('Synthetic SMTP outage'); } });
    await worker.runOnce(1); clock = new Date(clock.getTime() + 61000); await worker.runOnce(1); clock = new Date(clock.getTime() + 301000); await worker.runOnce(1);
    await h.page.evaluate(() => window.dispatchEvent(new Event('focus'))); await h.page.getByText('Bildiriş: Göndərmə xətası', { exact: true }).waitFor();
    assert.equal(await form().getByLabel('Status', { exact: true }).inputValue(), 'interview'); assert.equal((await Application.findById(first._id)).status, 'Interview');
  });
  assert.deepEqual(h.pageErrors, []);
}));

test('Application history explains authorized handoff and next-action snapshots without extra requests', async t => withBrowserFixture(harness, async h => {
  const candidate=(await h.request('admin','POST','/candidates',{name:'Synthetic History Person',role:'Cashier'})).data;
  const job=(await h.request('admin','POST','/jobs',{title:'Synthetic History Vacancy',department:'HR',description:'Synthetic'})).data;
  const app=(await h.request('admin','POST','/applications',{candidateId:candidate._id,jobId:job._id})).data;
  const az=require('../src/i18n/locales/az.json'),en=require('../src/i18n/locales/en.json'),ru=require('../src/i18n/locales/ru.json');
  const actor=String(h.actors.admin._id),previous=String(h.actors.own._id),next=String(h.actors.peer._id),at='2026-11-02T08:30:00.000Z';
  const event=(changes={})=>({id:'synthetic-history',type:'workflow',actor,at,revision:1,reason:'Synthetic handoff reason',before:{status:'Applied',assignedTo:previous},after:{status:'Applied',assignedTo:next},...changes});
  const history=()=>h.page.locator('[data-application-history]');
  async function open(events){await Application.updateOne({_id:app._id},{$set:{events}});const start=h.wire.length;await h.open('admin','/app/recruitment/applications/'+app._id);await h.page.getByRole('heading',{name:az.hrWorkflow.history,exact:true}).waitFor();await h.page.waitForLoadState('networkidle');const reads=h.wire.slice(start);assert.equal(reads.filter(r=>r.path.startsWith('/api/applications/'+app._id+'/history')).length,1);assert.equal(reads.length,3);}
  await t.test('first assignment distinguishes known unassigned from missing history',async()=>{await open([event({before:{status:'Applied',assignedTo:null}})]);const row=history().locator('[data-history-field=assignment]');assert.equal(await row.count(),1);assert.ok((await row.textContent()).includes(next));assert.ok((await row.textContent()).includes('→'));assert.ok((await row.textContent()).includes(az.hrHistory.unassigned));});
  await t.test('same-stage reassignment shows both IDs without inventing names or profile links',async()=>{await open([event()]);const row=history().locator('[data-history-field=assignment]');assert.ok((await row.textContent()).includes(previous+' → '+next));assert.equal(await history().locator('[data-history-field=stage]').count(),0);assert.ok((await history().textContent()).includes(actor));assert.ok((await history().textContent()).includes('Synthetic handoff reason'));assert.equal(await history().locator('a').count(),0);assert.equal(await history().locator('time').first().getAttribute('datetime'),at);assert.equal(await history().locator('time').first().getAttribute('title'),at);});
  await t.test('next-action kind, deadline, timezone and notes are shown only from the two snapshots',async()=>{await open([event({before:{nextAction:{kind:'call',dueAt:'2026-11-03T08:00:00Z',timezone:'Asia/Baku',notes:'Earlier synthetic note'}},after:{nextAction:{kind:'follow_up',dueAt:'2026-11-04T08:00:00Z',timezone:'Asia/Baku',notes:'Later synthetic note'},privateStorageKey:'NEVER_RENDER'}})]);const row=history().locator('[data-history-field=next-action]');assert.ok((await row.textContent()).includes(az.hrWorkflow.action.call));assert.ok((await row.textContent()).includes(az.hrWorkflow.action.follow_up));assert.ok((await row.textContent()).includes('Earlier synthetic note'));assert.ok((await row.textContent()).includes('Later synthetic note'));assert.ok((await row.textContent()).includes('Asia/Baku'));assert.equal(await row.locator('time').count(),2);assert.ok(!(await history().textContent()).includes('NEVER_RENDER'));
    await open([event({before:{nextAction:{kind:'none',dueAt:null,timezone:'UTC',notes:''}},after:{nextAction:{kind:'none',dueAt:null,timezone:'Asia/Baku',notes:''}}})]);
    const zoneOnly=await history().locator('[data-history-field=next-action]').textContent();assert.ok(zoneOnly.includes('UTC'));assert.ok(zoneOnly.includes('Asia/Baku'));
    await open([event({before:{nextAction:{kind:'call',dueAt:'2026-11-03T08:00:00Z',timezone:'UTC',notes:'Earlier'}},after:{nextAction:{kind:'call',dueAt:'2026-11-04T08:00:00Z',timezone:'Invalid/Zone',notes:'Later'}}})]);
    const changed=history().locator('[data-history-field=next-action]');assert.ok((await changed.textContent()).includes('Earlier'));assert.ok((await changed.textContent()).includes('Later'));assert.ok((await changed.textContent()).includes('Invalid/Zone'));assert.ok((await changed.textContent()).includes('2026-11-04T08:00:00Z'));assert.equal(await changed.locator('time').nth(1).getAttribute('datetime'),'2026-11-04T08:00:00Z');
  });
  await t.test('stage and HR note changes retain reason and do not expose arbitrary nested properties',async()=>{await open([event({before:{status:'Applied',notes:'Before note'},after:{status:'Screening',notes:'After note',cvUrl:'NEVER_RENDER'}})]);const row=history().locator('[data-history-field=stage]');assert.ok((await row.textContent()).includes(az.recruitment.applications.applied+' → '+az.recruitment.applications.screening));assert.ok((await history().locator('[data-history-field=notes]').textContent()).includes('Before note → After note'));assert.ok(!(await history().textContent()).includes('NEVER_RENDER'));});
  await t.test('legacy incomplete events keep safe fallbacks and never infer missing values',async()=>{await open([event({type:'legacy-unknown',actor:null,at:'legacy-time',before:null,after:null,reason:null}),event({id:'partial',actor:{name:'DO_NOT_INVENT'},at:null,before:{},after:{assignedTo:next,nextAction:null}})]);assert.equal(await history().locator('li').count(),2);assert.ok(!(await history().textContent()).includes('DO_NOT_INVENT'));assert.ok(!(await history().textContent()).includes('hrWorkflow.event.'));assert.ok((await history().textContent()).includes('legacy-time'));assert.ok((await history().textContent()).includes(az.hrHistory.unavailable));assert.ok((await history().locator('[data-history-field=assignment]').textContent()).includes(az.hrHistory.unavailable+' → '+next));assert.equal(await history().locator('time[datetime]').count(),0);});
  await t.test('AZ EN RU and four widths preserve read-only content and zero interactive refetches',async()=>{await open([event({reason:'Synthetic reason '+ 'x'.repeat(500)})]);const count=h.wire.length;for(const [language,labels]of[['az',az],['en',en],['ru',ru]]){await h.page.evaluate(l=>window.changeLanguage(l),language);await h.page.getByRole('heading',{name:labels.hrWorkflow.history,exact:true}).waitFor();assert.ok((await history().locator('[data-history-field=assignment]').textContent()).includes(labels.hrWorkflow.assignee));for(const width of[1440,768,390,320]){await h.page.setViewportSize({width,height:1000});assert.ok((await history().textContent()).includes('Synthetic reason'));const dimensions=await h.page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));assert.ok(dimensions.width<=dimensions.viewport+1);}}assert.equal(h.wire.length,count);assert.equal(await history().locator('a,input,select,textarea').count(),0);assert.deepEqual(h.pageErrors,[]);});
}));

test('Notification escalation guidance is read-only, scope-aware and truthful for non-retryable delivery',async t=>withBrowserFixture(harness,async h=>{
 const crypto=require('node:crypto'),Candidate=require('../../Backend/models/candidate.model'),Job=require('../../Backend/models/job.model');
 for(const [actor,role]of[['own','recruitment_employee'],['peer','recruitment_employee'],['department','recruitment_manager']])await h.models.User.updateOne({_id:h.actors[actor]._id},{$set:{role,departmentId:'dep_hr'}});
 const fields={departmentId:'dep_hr',createdBy:h.actors.admin._id,assignedTo:h.actors.admin._id};
 const c=await Candidate.create({...fields,name:'Synthetic Escalation Person',role:'Cashier',email:'synthetic@example.invalid'}),j=await Job.create({...fields,title:'Synthetic Escalation Vacancy',description:'Synthetic',department:'HR'}),eventId=crypto.randomUUID();
 const app=await Application.create({...fields,assignedTo:h.actors.own._id,candidateId:c._id,jobId:j._id,status:'Interview',events:[{id:eventId,type:'status',actor:String(h.actors.admin._id),at:new Date(),revision:0,before:{status:'Applied'},after:{status:'Interview'},reason:'Synthetic HR decision',delivery:{state:'skipped',code:'PARENT_SCOPE_REVOKED',attempts:0}}]});
 const url='/app/recruitment/applications/'+app._id,box=()=>h.page.locator('[data-application-delivery]'),guide=()=>box().locator('[data-delivery-guidance]');
 const requests=[];h.page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))requests.push({method:r.method(),path:u.pathname});});
 const labels={az:require('../src/i18n/locales/az.json'),en:require('../src/i18n/locales/en.json'),ru:require('../src/i18n/locales/ru.json')};
 async function open(actor,delivery){if(delivery)await Application.updateOne({_id:app._id,'events.id':eventId},{$set:{'events.$.delivery':delivery}});const start=requests.length;await h.open(actor,url);await box().waitFor();await h.page.waitForLoadState('networkidle');assert.equal(requests.length-start,3);}
 await t.test('skipped parent-scope outcome explains current boundary in AZ EN RU without retry or automatic escalation',async()=>{
  await open('own');const start=requests.length;
  for(const language of['az','en','ru']){await h.page.evaluate(l=>window.changeLanguage(l),language);await box().getByText(labels[language].hrDelivery.code.PARENT_SCOPE_REVOKED,{exact:true}).waitFor();assert.equal(await guide().count(),1);const copy=labels[language].hrDelivery.escalation;assert.ok((await guide().textContent()).includes(copy.parentScope));assert.ok((await guide().textContent()).includes(copy.admin));assert.equal(await box().locator('form,button,a,select').count(),0);assert.ok((await box().textContent()).includes(labels[language].hrWorkflow.deliveryState.skipped));}
  assert.equal(requests.length,start);assert.equal(await h.page.locator('[data-application-workflow]').count(),1);
 });
 await t.test('sent, pending and running do not imply an escalation or offer resend; failed and blocked keep valid Admin retry',async()=>{
  for(const state of['sent','pending','running','failed','blocked']){await open('admin',{state,code:state==='sent'?'DELIVERED':state==='blocked'?'SMTP_NOT_CONFIGURED':'DELIVERY_FAILED',attempts:state==='failed'?3:0});assert.ok((await box().textContent()).includes(labels.az.hrWorkflow.deliveryState[state]));const retryable=['failed','blocked'].includes(state);assert.equal(await box().locator('form').count(),retryable?1:0);assert.equal(await guide().count(),0);}
 });
 await t.test('Employee context is not parent authority; Manager and Admin retain existing scoped retry',async()=>{
  const delivery={state:'blocked',code:'SMTP_NOT_CONFIGURED',attempts:0};await open('own',delivery);assert.equal(await h.page.locator('[data-application-handoff]').count(),1);assert.equal(await box().locator('form').count(),0);assert.equal(await guide().count(),1);
  for(const actor of['department','admin']){await open(actor);assert.equal(await box().locator('form').count(),1);assert.equal(await guide().count(),0);}
  await h.open('peer',url);await h.page.locator('[data-hr-state=not-found]').waitFor();assert.equal(await box().count(),0);
 });
 await t.test('exhausted or malformed retry counters and legacy state fail closed without raw keys or invented attempts',async()=>{
  for(const delivery of[{state:'failed',attempts:3,retryCount:3},{state:'failed',attempts:4},{state:'blocked',attempts:0,retryCount:-1},{state:'blocked',attempts:0,priorAttempts:10},{state:'failed'},{state:'failed',attempts:0,priorAttempts:{private:'PRIVATE_PROVIDER_OUTPUT'}},{},{state:'legacy-private-state',code:'PRIVATE_PROVIDER_OUTPUT'}]){await open('admin',delivery);assert.equal(await box().locator('form').count(),0);assert.equal(await guide().count(),1);assert.ok(!(await box().textContent()).includes('hrWorkflow.deliveryState.'));assert.ok(!(await box().textContent()).includes('PRIVATE_PROVIDER_OUTPUT'));assert.ok(!(await box().textContent()).includes('legacy-private-state'));assert.ok(!(await box().textContent()).includes('[object Object]'));}
 });
 await t.test('server DELIVERY_NOT_RETRYABLE removes the doomed control, preserves HR draft and makes no follow-up request',async()=>{
  await open('admin',{state:'blocked',code:'SMTP_NOT_CONFIGURED',attempts:0});const workflow=h.page.locator('[data-application-workflow]');await workflow.getByLabel(labels.az.hrWorkflow.notes,{exact:true}).fill('Synthetic retained HR draft');
  const pattern='**/api/applications/'+app._id+'/notifications/'+eventId+'/retry';await h.page.route(pattern,r=>r.fulfill({status:409,contentType:'application/json',body:JSON.stringify({code:'DELIVERY_NOT_RETRYABLE',message:'PRIVATE_PROVIDER_OUTPUT'})}));
  try{const start=requests.length;await box().getByRole('textbox').fill('Synthetic retry reason');await box().getByRole('button').click();await box().getByRole('alert').waitFor();assert.equal(await box().locator('form').count(),0);assert.equal(await guide().count(),1);assert.ok(!(await box().textContent()).includes('PRIVATE_PROVIDER_OUTPUT'));assert.equal(await workflow.getByLabel(labels.az.hrWorkflow.notes,{exact:true}).inputValue(),'Synthetic retained HR draft');await h.page.waitForLoadState('networkidle');assert.equal(requests.length-start,1);assert.equal(requests.at(-1).method,'POST');}finally{await h.page.unroute(pattern);}
 });
 await t.test('four viewports retain readable guidance with no layout or locale requests',async()=>{await open('own',{state:'skipped',code:'PARENT_SCOPE_REVOKED',attempts:0});const start=requests.length;for(const language of['az','en','ru']){await h.page.evaluate(l=>window.changeLanguage(l),language);await box().getByText(labels[language].hrDelivery.code.PARENT_SCOPE_REVOKED,{exact:true}).waitFor();for(const width of[1440,768,390,320]){await h.page.setViewportSize({width,height:1000});assert.equal(await guide().count(),1);const d=await h.page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));assert.ok(d.width<=d.viewport+1);}}assert.equal(requests.length,start);assert.deepEqual(h.pageErrors,[]);});
}));

const timezoneHarness=`import React from'react';import{createRoot}from'react-dom/client';import App from'/src/App.tsx';import api from'/src/api/axios.ts';import i18n from'/src/i18n/index.ts';api.defaults.baseURL='/api';window.navigateTest=()=>{};window.changeLanguage=l=>i18n.changeLanguage(l);createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(App)));`;
test('Interview timezone guidance preserves scheduling, rescheduling and server validation',async t=>withBrowserFixture(timezoneHarness,async h=>{
  const locales=Object.fromEntries(['az','en','ru'].map(l=>[l,require('../src/i18n/locales/'+l+'.json')]));
  const candidate=(await h.request('admin','POST','/candidates',{name:'Synthetic timezone applicant',role:'Cashier'})).data;
  const job=(await h.request('admin','POST','/jobs',{title:'Synthetic timezone vacancy',department:'HR',description:'Synthetic duties'})).data;
  const app=(await h.request('admin','POST','/applications',{candidateId:candidate._id,jobId:job._id})).data;
  const form=h.page.locator('[data-application-workflow]'),requests=[];
  h.page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))requests.push({method:r.method(),path:u.pathname});});
  const url='/app/recruitment/applications/'+app._id;
  const text=(l,k)=>locales[l].hrWorkflow[k];
  async function capture(name,lang,width){
    if(!process.env.INOP_TIMEZONE_SCREENSHOTS)return;
    require('node:fs').mkdirSync(process.env.INOP_TIMEZONE_SCREENSHOTS,{recursive:true});
    await h.page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
    await h.page.screenshot({animations:'disabled',path:require('node:path').join(process.env.INOP_TIMEZONE_SCREENSHOTS,`${name}-${lang}-${width}.png`),fullPage:true});
  }
  async function submit(){const response=h.page.waitForResponse(r=>r.url().endsWith('/applications/'+app._id+'/workflow')&&r.request().method()==='PATCH');await form.locator('button[type=submit]').click();return response;}
  await h.open('admin',url);await form.waitFor();await h.page.waitForLoadState('networkidle');
  assert.equal(requests.length,4,'Auth, Application, history and interviewers only');
  await t.test('localized accessible help, examples and responsive layout preserve the entered timezone without requests',async()=>{
    const zone=form.getByLabel(text('az','timezone'),{exact:true});assert.equal(await zone.inputValue(),'Asia/Baku');
    await form.getByLabel('Status',{exact:true}).selectOption('interview');
    await form.getByLabel(text('az','interviewStart'),{exact:true}).fill('2026-11-10T10:30');await zone.fill('Europe/London');
    const count=requests.length;
    for(const lang of ['az','en','ru']){
      await h.page.evaluate(l=>window.changeLanguage(l),lang);
      const field=form.getByLabel(text(lang,'timezone'),{exact:true});const hintId=await field.getAttribute('aria-describedby');assert.ok(hintId,'Timezone must have associated guidance');
      const hint=h.page.locator('[id='+JSON.stringify(hintId)+']');assert.equal(await hint.textContent(),text(lang,'timezoneHelp'));
      for(const example of ['Asia/Baku','Europe/Istanbul','Europe/London'])assert.ok((await hint.textContent()).includes(example));
      for(const width of [1440,768,390,320]){
        await h.page.setViewportSize({width,height:1000});assert.equal(await field.inputValue(),'Europe/London');
        assert.equal(await h.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,lang+'/'+width);
        await capture('schedule',lang,width);
      }
    }
    assert.equal(requests.length,count,'Locale, viewport and guidance add no requests');
  });
  await t.test('invalid timezone and DST gap/fold retain values and drafts; existing errors remain localized',async()=>{
    const before=await Application.findById(app._id).lean();
    for(const lang of ['az','en','ru'])for(const [kind,zone,start]of [['invalid','Invented/Zone','2026-11-10T10:30'],['gap','America/New_York','2026-03-08T02:30'],['fold','America/New_York','2026-11-01T01:30']]){
      await h.page.evaluate(l=>window.changeLanguage(l),lang);await form.getByLabel(locales[lang].recruitment.applications.status,{exact:true}).selectOption('interview');
      await form.getByLabel(text(lang,'timezone'),{exact:true}).fill(zone);await form.getByLabel(text(lang,'interviewStart'),{exact:true}).fill(start);
      await form.getByLabel(text(lang,'notes'),{exact:true}).fill('Synthetic interview draft');
      const count=requests.length,r=await submit();assert.equal(r.status(),400);await form.getByRole('alert').waitFor();
      assert.ok((await form.getByRole('alert').textContent()).includes(locales[lang].hrErrors.invalid));
      assert.equal(await form.getByLabel(text(lang,'timezone'),{exact:true}).inputValue(),zone);assert.equal(await form.getByLabel(text(lang,'interviewStart'),{exact:true}).inputValue(),start);
      assert.equal(await form.getByLabel(text(lang,'notes'),{exact:true}).inputValue(),'Synthetic interview draft');
      await h.page.waitForLoadState('networkidle');assert.equal(requests.length,count+1,'One explicit PATCH, no retry/refetch on rejection');
      await h.page.setViewportSize({width:320,height:1000});await capture(kind,lang,320);
      assert.equal((await Application.findById(app._id).lean()).__v,before.__v);
    }
  });
  await t.test('valid scheduling and rescheduling preserve conversion, duration and interviewer',async()=>{
    await h.page.evaluate(()=>window.changeLanguage('az'));
    for(const [zone,start,expected,substatus]of [['Asia/Baku','2026-11-10T10:30','2026-11-10T06:30:00.000Z','scheduled'],['Europe/London','2026-11-11T11:00','2026-11-11T11:00:00.000Z','rescheduled']]){
      await form.getByLabel(text('az','timezone'),{exact:true}).fill(zone);await form.getByLabel(text('az','interviewStart'),{exact:true}).fill(start);
      await form.getByLabel(text('az','substatus'),{exact:true}).selectOption(substatus);await form.getByLabel(text('az','duration'),{exact:true}).fill('45');
      const r=await submit();assert.equal(r.status(),200);await h.page.waitForLoadState('networkidle');
      const stored=await Application.findById(app._id).lean();assert.equal(stored.interview.startsAt.toISOString(),expected);assert.equal(stored.interview.timezone,zone);assert.equal(stored.interview.durationMinutes,45);assert.equal(String(stored.interview.interviewerId),String(h.actors.admin._id));
      await h.open('admin',url);await form.waitFor();assert.equal(await form.getByLabel(text('az','timezone'),{exact:true}).inputValue(),zone);assert.equal(await form.getByLabel(text('az','interviewStart'),{exact:true}).inputValue(),start);
    }
    for(const lang of ['az','en','ru']){await h.page.evaluate(l=>window.changeLanguage(l),lang);for(const width of [1440,320]){await h.page.setViewportSize({width,height:1000});await capture('reschedule',lang,width);}}
  });
  await t.test('read-only Application permission gains no scheduling controls',async()=>{
    await h.models.Role.updateOne({key:'recruitment_employee'},{$set:{permissions:[{resource:'application',action:'read',scope:'all'}]}});
    await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{role:'recruitment_employee',departmentId:'dep_hr'}});
    await h.open('peer',url);await h.page.locator('.hr-application-detail').waitFor();assert.equal(await form.count(),0);assert.equal(await h.page.locator('input,textarea,button[type=submit]').count(),0);
    await capture('read-only','az',320);
  });
  assert.deepEqual(h.pageErrors,[]);
}));

test('Interview reschedule history explains only authorized snapshot fields without extra reads',async t=>withBrowserFixture(timezoneHarness,async h=>{
  const labels=Object.fromEntries(['az','en','ru'].map(l=>[l,require('../src/i18n/locales/'+l+'.json')]));
  const candidate=(await h.request('admin','POST','/candidates',{name:'Synthetic History Applicant',role:'Cashier'})).data;
  const job=(await h.request('admin','POST','/jobs',{title:'Synthetic History Vacancy',department:'HR',description:'Synthetic'})).data;
  const app=(await h.request('admin','POST','/applications',{candidateId:candidate._id,jobId:job._id})).data;
  const first=await h.request('admin','PATCH','/applications/'+app._id+'/workflow',{expectedRevision:0,status:'Interview',interview:{localStart:'2026-11-10T10:30',timezone:'Asia/Baku',durationMinutes:30,interviewerId:String(h.actors.admin._id)}});assert.equal(first.status,200);
  const second=await h.request('admin','PATCH','/applications/'+app._id+'/workflow',{expectedRevision:first.data.__v,interview:{localStart:'2026-11-11T11:00',timezone:'Europe/London',durationMinutes:45,interviewerId:String(h.actors.peer._id)},reason:'Synthetic same-stage reschedule'});assert.equal(second.status,200);
  const response=await h.request('admin','GET','/applications/'+app._id+'/history');assert.equal(response.status,200);
  const reschedule=response.data.items[0];assert.equal(reschedule.before.status,'Interview');assert.equal(reschedule.after.status,'Interview');
  assert.equal(reschedule.before.interview.startsAt,'2026-11-10T06:30:00.000Z');assert.equal(reschedule.after.interview.startsAt,'2026-11-11T11:00:00.000Z');
  const history=h.page.locator('[data-application-history]'),url='/app/recruitment/applications/'+app._id;
  await t.test('actual same-stage backend event shows date/time, timezone, duration and opaque interviewer IDs',async()=>{
    await h.open('admin',url);await history.locator('li').first().waitFor();await h.page.waitForLoadState('networkidle');
    const row=history.locator('li').first();assert.equal(await row.locator('[data-history-field=interview-time]').count(),1);
    assert.equal(await row.locator('[data-history-field=interview-time] time').nth(0).getAttribute('datetime'),reschedule.before.interview.startsAt);
    assert.equal(await row.locator('[data-history-field=interview-time] time').nth(1).getAttribute('datetime'),reschedule.after.interview.startsAt);
    assert.ok((await row.textContent()).includes('Asia/Baku'));assert.ok((await row.textContent()).includes('Europe/London'));assert.ok((await row.textContent()).includes('30 → 45'));
    assert.ok((await row.textContent()).includes(String(h.actors.admin._id)+' → '+String(h.actors.peer._id)));
    assert.ok((await row.textContent()).includes('Synthetic same-stage reschedule'));assert.equal(await row.locator('[data-history-field=stage]').count(),0);
    assert.equal(await history.locator('a,input,select,textarea').count(),0);
  });
  await t.test('localized responsive history preserves snapshots and adds no requests',async()=>{
    const count=h.wire.length;
    for(const language of ['az','en','ru']){
      await h.page.evaluate(l=>window.changeLanguage(l),language);
      await history.getByRole('heading',{name:labels[language].hrWorkflow.history,exact:true}).waitFor();
      for(const width of [1440,768,390,320]){
        await h.page.setViewportSize({width,height:1000});await h.page.evaluate(()=>document.fonts.ready);
        assert.ok((await history.textContent()).includes(labels[language].hrWorkflow.duration));
        assert.equal(await h.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,language+'/'+width);
        if(process.env.INOP_HISTORY_SCREENSHOTS){require('node:fs').mkdirSync(process.env.INOP_HISTORY_SCREENSHOTS,{recursive:true});await history.scrollIntoViewIfNeeded();await h.page.screenshot({animations:'disabled',path:require('node:path').join(process.env.INOP_HISTORY_SCREENSHOTS,`history-${language}-${width}.png`),fullPage:true});}
      }
    }
    assert.equal(h.wire.length,count,'locale and viewport changes do not fetch');
  });
  await t.test('only changed allowlisted fields render; legacy unknown values remain neutral',async()=>{
    const base={startsAt:'2026-11-10T06:30:00.000Z',timezone:'Asia/Baku',durationMinutes:30,interviewerId:String(h.actors.admin._id)};
    const event=(id,before,after)=>({id,type:'workflow',actor:String(h.actors.admin._id),at:'2026-11-03T08:00:00Z',revision:3,before:{interview:before},after:{interview:after}});
    const events=[event('date',base,{...base,startsAt:'2026-11-11T06:30:00Z'}),event('zone',base,{...base,timezone:'America/Argentina/Buenos_Aires'}),event('duration',base,{...base,durationMinutes:45}),event('interviewer',base,{...base,interviewerId:String(h.actors.peer._id)}),event('noop',base,{...base,startsAt:'2026-11-10T10:30:00+04:00',name:'NEVER_RENDER',cvUrl:'NEVER_RENDER'}),event('legacy',null,{startsAt:'2026-11-11T11:00',timezone:'invalid',durationMinutes:999,interviewerId:{name:'NEVER_RENDER'}}),event('unknown-zone',{}, {startsAt:'2026-11-11T11:00:00Z'}),event('missing',base,null)];
    await Application.updateOne({_id:app._id},{$set:{events:events.reverse()}});await h.open('admin',url);await history.locator('li').nth(7).waitFor();await h.page.waitForLoadState('networkidle');
    const rows=history.locator('li');assert.equal(await rows.count(),8);
    assert.equal(await rows.nth(0).locator('[data-history-field=interview-time]').count(),1);
    assert.equal(await rows.nth(1).locator('[data-history-field=interview-timezone]').count(),1);
    assert.equal(await rows.nth(2).locator('[data-history-field=interview-duration]').count(),1);
    assert.equal(await rows.nth(2).locator('[data-history-field=interview-time]').count(),0);
    assert.equal(await rows.nth(3).locator('[data-history-field=interview-interviewer]').count(),1);
    for(const index of [4,5])assert.equal(await rows.nth(index).locator('[data-history-field]').count(),0);
    assert.equal(await rows.nth(6).locator('[data-history-field=interview-time] time').textContent(),'2026-11-11T11:00:00.000Z');
    assert.ok((await rows.nth(7).textContent()).includes(labels.az.hrHistory.unavailable));
    assert.ok(!(await history.textContent()).includes('NEVER_RENDER'));assert.equal(await history.locator('a,input,select,textarea').count(),0);
    if(process.env.INOP_HISTORY_SCREENSHOTS){await h.page.setViewportSize({width:320,height:1000});await history.screenshot({path:require('node:path').join(process.env.INOP_HISTORY_SCREENSHOTS,'history-legacy-long-zone-320.png')});}
  });
  await t.test('assigned Employee sees read-only history without parent authority; reassignment removes access',async()=>{
    await h.models.User.updateOne({_id:h.actors.own._id},{$set:{role:'recruitment_employee',departmentId:'dep_hr'}});
    await Application.updateOne({_id:app._id},{$set:{departmentId:'dep_hr',assignedTo:h.actors.own._id,events:[reschedule]}});
    const count=h.wire.length;await h.open('own',url);await history.locator('[data-history-field=interview-time]').waitFor();await h.page.waitForLoadState('networkidle');
    assert.equal(h.wire.length-count,4);assert.equal(await history.locator('a,input,select,textarea').count(),0);
    if(process.env.INOP_HISTORY_SCREENSHOTS)await history.screenshot({path:require('node:path').join(process.env.INOP_HISTORY_SCREENSHOTS,'history-employee-320.png')});
    assert.equal((await h.request('own','GET','/candidates/'+candidate._id)).status,404);assert.equal((await h.request('own','GET','/jobs/'+job._id)).status,404);
    await Application.updateOne({_id:app._id},{$set:{assignedTo:h.actors.peer._id},$inc:{__v:1}});
    await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await h.page.locator('[data-hr-state=not-found]').waitFor();assert.equal(await history.count(),0);
  });
  assert.deepEqual(h.pageErrors,[]);
}));

test('Application substatus History shows stage-valid authorized before and after values',async t=>withBrowserFixture(timezoneHarness,async h=>{
 const locales=Object.fromEntries(['az','en','ru'].map(l=>[l,require('../src/i18n/locales/'+l+'.json')]));
 const c=(await h.request('admin','POST','/candidates',{name:'Synthetic Substatus Applicant',role:'Cashier'})).data,j=(await h.request('admin','POST','/jobs',{title:'Synthetic Substatus Vacancy',department:'HR',description:'Synthetic'})).data;
 const app=(await h.request('admin','POST','/applications',{candidateId:c._id,jobId:j._id})).data,url='/app/recruitment/applications/'+app._id,history=h.page.locator('[data-application-history]');
 const update=await h.request('admin','PATCH','/applications/'+app._id+'/workflow',{expectedRevision:0,substatus:'review-required',reason:'Synthetic review handoff'});assert.equal(update.status,200);
 await t.test('actual same-stage substatus-only event has localized detail',async()=>{
  await h.open('admin',url);await history.locator('li').first().waitFor();await h.page.waitForLoadState('networkidle');const row=history.locator('li').first();
  assert.equal(await row.locator('[data-history-field=substatus]').count(),1);
  assert.ok((await row.textContent()).includes(locales.az.hrCatalog.unset+' → '+locales.az.hrWorkflow.sub['review-required']));
  assert.ok((await row.textContent()).includes('Synthetic review handoff'));assert.equal(await row.locator('[data-history-field=stage]').count(),0);
 });
 await t.test('stage-specific, empty, missing and malformed legacy values are distinguished safely',async()=>{
  const event=(id,before,after)=>({id,type:'workflow',actor:String(h.actors.admin._id),at:'2026-11-03T08:00:00Z',revision:1,before,after});
  const events=[event('reschedule',{status:'Interview',substatus:'scheduled'},{status:'Interview',substatus:'rescheduled'}),event('clear',{status:'Offered',substatus:'sent'},{status:'Offered',substatus:''}),event('missing',{status:'Applied'},{status:'Applied',substatus:''}),event('wrong-stage',{status:'Applied',substatus:'scheduled'},{status:'Applied',substatus:'new'}),event('malformed',{status:'Interview',substatus:{name:'NEVER_RENDER'}},{status:'Interview',substatus:'PRIVATE_UNKNOWN'}),event('no-op',{status:'Screening',substatus:'selected'},{status:'Screening',substatus:'selected'}),event('unknown-stage',{status:'UNKNOWN',substatus:'new'},{substatus:'new'}),event('stage-change',{status:'Applied',substatus:'new'},{status:'Screening',substatus:'in-review'})];
  await Application.updateOne({_id:app._id},{$set:{events:events.reverse()}});await h.open('admin',url);await history.locator('li').nth(7).waitFor();await h.page.waitForLoadState('networkidle');
  const rows=history.locator('li');assert.equal(await rows.count(),8);
  const value=index=>rows.nth(index).locator('[data-history-field=substatus]');
  assert.ok((await value(0).textContent()).includes(locales.az.hrWorkflow.sub.scheduled+' → '+locales.az.hrWorkflow.sub.rescheduled));
  assert.ok((await value(1).textContent()).includes(locales.az.hrWorkflow.sub.sent+' → '+locales.az.hrCatalog.unset));
  assert.ok((await value(2).textContent()).includes(locales.az.hrHistory.unavailable+' → '+locales.az.hrCatalog.unset));
  assert.ok((await value(3).textContent()).includes(locales.az.hrHistory.unavailable+' → '+locales.az.hrWorkflow.sub.new));
  for(const index of [4,5,6])assert.equal(await value(index).count(),0);
  assert.ok((await value(7).textContent()).includes(locales.az.hrWorkflow.sub.new+' → '+locales.az.hrWorkflow.sub['in-review']));assert.equal(await rows.nth(7).locator('[data-history-field=stage]').count(),1);
  assert.ok(!(await history.textContent()).includes('NEVER_RENDER'));assert.ok(!(await history.textContent()).includes('PRIVATE_UNKNOWN'));
  assert.equal(await rows.nth(0).locator('time').first().getAttribute('datetime'),'2026-11-03T08:00:00Z');
 });
 await t.test('AZ EN RU four-width presentation is read-only and produces no requests',async()=>{
  const count=h.wire.length;
  for(const language of ['az','en','ru']){await h.page.evaluate(l=>window.changeLanguage(l),language);await history.getByRole('heading',{name:locales[language].hrWorkflow.history,exact:true}).waitFor();
   assert.ok((await history.locator('[data-history-field=substatus]').first().textContent()).includes(locales[language].hrWorkflow.substatus));
   for(const width of [1440,768,390,320]){await h.page.setViewportSize({width,height:1000});await h.page.evaluate(()=>document.fonts.ready);assert.equal(await h.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,language+'/'+width);
    if(process.env.INOP_SUBSTATUS_SCREENSHOTS&&[['az',1440],['en',768],['ru',390],['az',320]].some(([l,w])=>l===language&&w===width)){require('node:fs').mkdirSync(process.env.INOP_SUBSTATUS_SCREENSHOTS,{recursive:true});await history.screenshot({path:require('node:path').join(process.env.INOP_SUBSTATUS_SCREENSHOTS,`substatus-${language}-${width}.png`)});}
   }
  }
  assert.equal(h.wire.length,count);assert.equal(await history.locator('a,input,select,textarea').count(),0);
 });
 await t.test('Employee history remains scoped and reassignment removes access',async()=>{
  await h.models.User.updateOne({_id:h.actors.own._id},{$set:{role:'recruitment_employee',departmentId:'dep_hr'}});await Application.updateOne({_id:app._id},{$set:{departmentId:'dep_hr',assignedTo:h.actors.own._id}});
  const count=h.wire.length;await h.open('own',url);await history.locator('[data-history-field=substatus]').first().waitFor();await h.page.waitForLoadState('networkidle');assert.equal(h.wire.length-count,4);
  assert.equal(await history.locator('a,input,select,textarea').count(),0);assert.equal((await h.request('own','GET','/candidates/'+c._id)).status,404);assert.equal((await h.request('own','GET','/jobs/'+j._id)).status,404);
  await Application.updateOne({_id:app._id},{$set:{assignedTo:h.actors.peer._id},$inc:{__v:1}});await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await h.page.locator('[data-hr-state=not-found]').waitFor();assert.equal(await history.count(),0);
 });
 assert.deepEqual(h.pageErrors,[]);
}));

test('Interview result History uses authorized snapshots without inferring a hiring decision',async t=>withBrowserFixture(timezoneHarness,async h=>{
 const locales=Object.fromEntries(['az','en','ru'].map(l=>[l,require('../src/i18n/locales/'+l+'.json')]));
 const c=(await h.request('admin','POST','/candidates',{name:'Synthetic Result Applicant',role:'Cashier'})).data,j=(await h.request('admin','POST','/jobs',{title:'Synthetic Result Vacancy',department:'HR',description:'Synthetic'})).data;
 const app=(await h.request('admin','POST','/applications',{candidateId:c._id,jobId:j._id})).data,url='/app/recruitment/applications/'+app._id,history=h.page.locator('[data-application-history]');
 const interview={localStart:'2026-11-10T10:30',timezone:'Asia/Baku',durationMinutes:30,interviewerId:String(h.actors.admin._id),result:'pending'};
 const scheduled=await h.request('admin','PATCH','/applications/'+app._id+'/workflow',{expectedRevision:0,status:'Interview',interview});assert.equal(scheduled.status,200);
 const result=await h.request('admin','PATCH','/applications/'+app._id+'/workflow',{expectedRevision:scheduled.data.__v,interview:{...interview,result:'passed'},reason:'Synthetic interview outcome'});assert.equal(result.status,200);
 await t.test('real result-only event renders pending to passed while Application stage stays Interview',async()=>{
  await h.open('admin',url);await history.locator('li').first().waitFor();await h.page.waitForLoadState('networkidle');const row=history.locator('li').first();assert.equal(await row.locator('[data-history-field=interview-result]').count(),1);
  assert.ok((await row.textContent()).includes(locales.az.hrWorkflow.resultState.pending+' → '+locales.az.hrWorkflow.resultState.passed));assert.equal(await row.locator('[data-history-field=stage]').count(),0);assert.ok((await row.textContent()).includes('Synthetic interview outcome'));
 });
 await t.test('five outcomes and neutral legacy values survive later Application stages without raw leaks',async()=>{
  const event=(id,before,after)=>({id,type:'workflow',actor:String(h.actors.admin._id),at:'2026-11-03T08:00:00Z',revision:1,before,after,reason:'Synthetic outcome history'});
  const values=['passed','failed','no_show','cancelled'];
  const events=values.map(value=>event(value,{status:'Interview',interview:{result:'pending'}},{status:'Interview',interview:{result:value}}));
  events.push(event('missing',{interview:{}},{interview:{result:'pending'}}),event('null',{interview:{result:'passed'}},{interview:null}),event('unknown',{interview:{result:{name:'NEVER_RENDER'}}},{interview:{result:'PRIVATE_UNKNOWN'}}),event('noop',{interview:{result:'passed'}},{interview:{result:'passed'}}),event('combined',{status:'Interview',substatus:'scheduled',interview:{result:'pending',startsAt:'2026-11-10T06:30:00Z',timezone:'Asia/Baku'}},{status:'Interview',substatus:'completed',interview:{result:'passed',startsAt:'2026-11-11T06:30:00Z',timezone:'Asia/Baku'}}));
  await Application.updateOne({_id:app._id},{$set:{status:'Offered',events:events.reverse()}});await h.open('admin',url);await history.locator('li').nth(8).waitFor();await h.page.waitForLoadState('networkidle');const rows=history.locator('li');assert.equal(await rows.count(),9);
  for(let i=0;i<4;i++)assert.ok((await rows.nth(i).locator('[data-history-field=interview-result]').textContent()).includes(locales.az.hrWorkflow.resultState.pending+' → '+locales.az.hrWorkflow.resultState[values[i]]));
  assert.ok((await rows.nth(4).textContent()).includes(locales.az.hrHistory.unavailable+' → '+locales.az.hrWorkflow.resultState.pending));assert.ok((await rows.nth(5).textContent()).includes(locales.az.hrWorkflow.resultState.passed+' → '+locales.az.hrHistory.unavailable));
  for(const i of [6,7])assert.equal(await rows.nth(i).locator('[data-history-field=interview-result]').count(),0);
  for(const field of ['interview-result','interview-time','substatus'])assert.equal(await rows.nth(8).locator('[data-history-field='+field+']').count(),1);
  assert.equal(await rows.nth(0).locator('time').first().getAttribute('datetime'),'2026-11-03T08:00:00Z');assert.ok((await rows.nth(0).textContent()).includes(String(h.actors.admin._id)));
  assert.ok(!(await history.textContent()).includes('NEVER_RENDER'));assert.ok(!(await history.textContent()).includes('PRIVATE_UNKNOWN'));
 });
 await t.test('localized responsive result history stays read-only and creates no requests',async()=>{
  const count=h.wire.length;
  for(const language of ['az','en','ru']){await h.page.evaluate(l=>window.changeLanguage(l),language);await history.getByRole('heading',{name:locales[language].hrWorkflow.history,exact:true}).waitFor();assert.ok((await history.locator('[data-history-field=interview-result]').first().textContent()).includes(locales[language].hrWorkflow.result));
   for(const width of [1440,768,390,320]){await h.page.setViewportSize({width,height:1000});await h.page.evaluate(()=>document.fonts.ready);assert.equal(await h.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,language+'/'+width);
    if(process.env.INOP_RESULT_SCREENSHOTS&&[['az',1440],['en',768],['ru',390],['az',320]].some(([l,w])=>l===language&&w===width)){require('node:fs').mkdirSync(process.env.INOP_RESULT_SCREENSHOTS,{recursive:true});await history.screenshot({path:require('node:path').join(process.env.INOP_RESULT_SCREENSHOTS,`result-${language}-${width}.png`)});}
   }
  }
  assert.equal(h.wire.length,count);assert.equal(await history.locator('a,input,select,textarea').count(),0);
 });
 await t.test('Employee result history does not grant parent access and disappears on reassignment',async()=>{
  await h.models.User.updateOne({_id:h.actors.own._id},{$set:{role:'recruitment_employee',departmentId:'dep_hr'}});await Application.updateOne({_id:app._id},{$set:{departmentId:'dep_hr',assignedTo:h.actors.own._id}});const count=h.wire.length;await h.open('own',url);await history.locator('[data-history-field=interview-result]').first().waitFor();await h.page.waitForLoadState('networkidle');assert.equal(h.wire.length-count,4);assert.equal(await history.locator('a,input,select,textarea').count(),0);
  assert.equal((await h.request('own','GET','/candidates/'+c._id)).status,404);assert.equal((await h.request('own','GET','/jobs/'+j._id)).status,404);
  await Application.updateOne({_id:app._id},{$set:{assignedTo:h.actors.peer._id},$inc:{__v:1}});await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await h.page.locator('[data-hr-state=not-found]').waitFor();assert.equal(await history.count(),0);
 });
 assert.deepEqual(h.pageErrors,[]);
}));

test('Read-only Application current workflow summary uses current authorized detail without reconstructing History',async t=>withBrowserFixture(timezoneHarness,async h=>{
 const observed=[];h.page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))observed.push(u.pathname);});
 const locales=Object.fromEntries(['az','en','ru'].map(l=>[l,require('../src/i18n/locales/'+l+'.json')]));
 await h.models.Role.create({key:'summary_reader',name:'Synthetic assigned reader',permissions:[{resource:'application',action:'read',scope:'assigned'},{resource:'recruitment',action:'read',scope:'assigned'}]});await h.models.User.updateOne({_id:h.actors.own._id},{$set:{role:'summary_reader',departmentId:'dep_hr'}});
 const c=(await h.request('admin','POST','/candidates',{name:'Synthetic Summary Applicant',role:'Cashier'})).data,j=(await h.request('admin','POST','/jobs',{title:'Synthetic Summary Vacancy',department:'HR',description:'Synthetic'})).data;
 const app=(await h.request('admin','POST','/applications',{candidateId:c._id,jobId:j._id})).data,url='/app/recruitment/applications/'+app._id,panel=h.page.locator('[data-application-current-workflow]');
 await Application.updateOne({_id:app._id},{$set:{departmentId:'dep_hr',assignedTo:h.actors.own._id,status:'Interview',substatus:'completed',interview:{startsAt:new Date('2026-11-10T06:30:00Z'),timezone:'Asia/Baku',durationMinutes:30,interviewerId:h.actors.admin._id,result:'passed'},nextAction:{kind:'follow_up',dueAt:new Date('2026-11-11T07:00:00Z'),timezone:'Asia/Baku'},events:[]}});
 await t.test('authorized read-only user sees current interview and action despite empty History',async()=>{
  const count=h.wire.length;await h.open('own',url);await h.page.locator('[data-application-history]').waitFor();await h.page.waitForLoadState('networkidle');assert.equal(h.wire.length-count,3);assert.equal(await h.page.locator('[data-application-workflow]').count(),0);assert.equal(await panel.count(),1);
  assert.ok((await panel.textContent()).includes(locales.az.hrWorkflow.resultState.passed));assert.ok((await panel.textContent()).includes(locales.az.hrWorkflow.action.follow_up));assert.ok((await panel.textContent()).includes('Asia/Baku'));assert.equal(await panel.locator('a,input,button,select,textarea').count(),0);
 });
 await t.test('summary values are localized, responsive, readonly and add no requests',async()=>{
  assert.equal((await h.request('own','GET','/candidates/'+c._id)).status,403);assert.equal((await h.request('own','GET','/jobs/'+j._id)).status,404);
  assert.equal(await panel.locator('time').first().getAttribute('datetime'),'2026-11-10T06:30:00.000Z');
  const count=h.wire.length;
  for(const language of ['az','en','ru']){await h.page.evaluate(l=>window.changeLanguage(l),language);await panel.getByRole('heading',{name:locales[language].hrWorkflow.currentReadOnly,exact:true}).waitFor();
   for(const width of [1440,768,390,320]){await h.page.setViewportSize({width,height:1000});await h.page.evaluate(()=>document.fonts.ready);assert.equal(await h.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,language+'/'+width);
    if(process.env.INOP_SUMMARY_SCREENSHOTS&&[['az',1440],['en',768],['ru',390],['az',320]].some(([l,w])=>l===language&&w===width)){require('node:fs').mkdirSync(process.env.INOP_SUMMARY_SCREENSHOTS,{recursive:true});await panel.screenshot({path:require('node:path').join(process.env.INOP_SUMMARY_SCREENSHOTS,`summary-${language}-${width}.png`)});}
   }
  }
  assert.equal(h.wire.length,count);assert.equal(await panel.locator('a,button,input,select,textarea').count(),0);assert.ok(!(await panel.textContent()).includes(String(h.actors.admin._id)));
 });
 await t.test('malformed legacy values are neutral; missing result is not pending and explicit none stays none',async()=>{
  const base=(await h.request('own','GET','/applications/'+app._id)).data,pattern='**/api/applications/'+app._id;
  for(const values of [{interview:null,nextAction:null},{interview:{startsAt:{raw:'NEVER_RENDER'},timezone:'PRIVATE_UNKNOWN',durationMinutes:{value:30},result:'PRIVATE_UNKNOWN',interviewerId:'NEVER_RENDER',cvUrl:'NEVER_RENDER',rawExtraction:'NEVER_RENDER'},nextAction:{kind:{name:'NEVER_RENDER'},dueAt:'2026-11-11T10:00',notes:'NEVER_RENDER'}},{interview:{startsAt:'2026-11-10T06:30:00Z',timezone:'PRIVATE_UNKNOWN'},nextAction:{kind:'none'}}]){
   await h.page.route(pattern,r=>r.fulfill({contentType:'application/json',body:JSON.stringify({...base,...values})}));try{await h.open('own',url);await panel.waitFor();const text=await panel.textContent();assert.ok(!text.includes('PRIVATE_UNKNOWN'));assert.ok(!text.includes('NEVER_RENDER'));assert.ok(!text.includes(locales.az.hrWorkflow.resultState.pending));assert.ok(text.includes(locales.az.hrHistory.unavailable));if(values.nextAction?.kind==='none'){assert.ok(text.includes(locales.az.hrWorkflow.action.none));assert.equal(await panel.locator('time').textContent(),'2026-11-10T06:30:00.000Z');}}finally{await h.page.unroute(pattern);}
  }
 });
 await t.test('focus refresh hides stale summary until new authorized metadata arrives',async()=>{
  await h.open('own',url);await panel.waitFor();await h.page.waitForLoadState('networkidle');let release;const blocked=new Promise(r=>{release=r;}),pattern='**/api/applications/'+app._id;
  await Application.updateOne({_id:app._id},{$set:{'nextAction.kind':'call','interview.timezone':'America/Argentina/Buenos_Aires'}});
  await h.page.route(pattern,async r=>{await blocked;const response=await h.request('own','GET','/applications/'+app._id);await r.fulfill({status:response.status,contentType:'application/json',body:JSON.stringify(response.data)});});
  const count=observed.length,seen=h.page.waitForRequest(r=>r.url().endsWith('/applications/'+app._id)),done=h.page.waitForResponse(r=>r.url().endsWith('/applications/'+app._id));
  try{await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await seen;await panel.waitFor({state:'detached'});release();await done;await panel.waitFor();await h.page.waitForLoadState('networkidle');assert.ok((await panel.textContent()).includes(locales.az.hrWorkflow.action.call));assert.ok((await panel.textContent()).includes('America/Argentina/Buenos_Aires'));assert.deepEqual(observed.slice(count).sort(),['/api/auth/me','/api/applications/'+app._id,'/api/applications/'+app._id+'/history'].sort());t.diagnostic('Existing focus HTTP paths: '+observed.slice(count).map(p=>p.replace(app._id,':id')).join(', '));assert.equal(await h.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);if(process.env.INOP_SUMMARY_SCREENSHOTS)await panel.screenshot({path:require('node:path').join(process.env.INOP_SUMMARY_SCREENSHOTS,'summary-long-zone-320.png')});}finally{release();await done;await h.page.unroute(pattern);}
 });
 for(const status of [401,403,404])await t.test(status+' removes summary and its metadata',async()=>{
  const pattern='**/api/applications/'+app._id;await h.page.route(pattern,r=>r.fulfill({status,contentType:'application/json',body:'{}'}));try{await h.open('own',url);if(status===401){await h.page.waitForURL('**/login');await h.page.locator('#email').waitFor();}else await h.page.locator('[data-hr-state='+ (status===403?'forbidden':'not-found')+']').waitFor();assert.equal(await panel.count(),0);assert.ok(!(await h.page.locator('body').textContent()).includes('America/Argentina/Buenos_Aires'));}finally{await h.page.unroute(pattern);}
 });
 await t.test('assignment revocation removes the current summary on existing focus revalidation',async()=>{
  await h.open('own',url);await panel.waitFor();await h.page.waitForLoadState('networkidle');await Application.updateOne({_id:app._id},{$set:{assignedTo:h.actors.peer._id},$inc:{__v:1}});await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await h.page.locator('[data-hr-state=not-found]').waitFor();assert.equal(await panel.count(),0);
 });
 await t.test('update-capable user keeps existing editor and draft without duplicate summary',async()=>{
  await h.open('admin',url);const form=h.page.locator('[data-application-workflow]');await form.waitFor();await h.page.waitForLoadState('networkidle');assert.equal(await panel.count(),0);await form.locator('textarea').last().fill('Synthetic retained draft');await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await h.page.waitForLoadState('networkidle');assert.equal(await form.locator('textarea').last().inputValue(),'Synthetic retained draft');assert.equal(await panel.count(),0);
 });
 assert.deepEqual(h.pageErrors,[]);
}));

test('Application Job navigation requires independent populated parent authorization',async t=>withBrowserFixture(timezoneHarness,async h=>{
 const locales=Object.fromEntries(['az','en','ru'].map(l=>[l,require('../src/i18n/locales/'+l+'.json')])),title='Synthetic vacancy — Senior operations coordination and recruitment planning';
 const c=(await h.request('admin','POST','/candidates',{name:'Synthetic Navigation Applicant',role:'Cashier'})).data,j=(await h.request('admin','POST','/jobs',{title,department:'HR',description:'Synthetic'})).data;
 const app=(await h.request('admin','POST','/applications',{candidateId:c._id,jobId:j._id})).data,url='/app/recruitment/applications/'+app._id,jobUrl='/app/recruitment/jobs/'+j._id,link=h.page.locator('[data-application-job-link]');
 const observed=[];h.page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))observed.push(u.pathname);});
 await t.test('permitted populated Job has existing profile navigation without fetching another parent',async()=>{
  const start=observed.length;await h.open('admin',url);await h.page.locator('[data-application-history]').waitFor();await h.page.waitForLoadState('networkidle');assert.equal(observed.length-start,4);assert.equal(await link.count(),1);assert.equal(await link.getAttribute('href'),jobUrl);assert.equal(await link.textContent(),title);assert.equal(observed.slice(start).filter(p=>p==='/api/jobs/'+j._id).length,0);
 });
 await t.test('long Job link is keyboard accessible, localized and responsive without layout requests',async()=>{
  const count=observed.length;for(const language of ['az','en','ru']){await h.page.evaluate(l=>window.changeLanguage(l),language);await h.page.getByRole('heading',{name:locales[language].hrWorkflow.application,exact:true}).waitFor();for(const width of [1440,768,390,320]){await h.page.setViewportSize({width,height:1000});await h.page.evaluate(()=>document.fonts.ready);await link.focus();assert.equal(await link.evaluate(e=>e===document.activeElement),true);assert.equal(await h.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,language+'/'+width);if(process.env.INOP_JOB_NAV_SCREENSHOTS&&[['az',1440],['en',768],['ru',390],['az',320]].some(([l,w])=>l===language&&w===width)){require('node:fs').mkdirSync(process.env.INOP_JOB_NAV_SCREENSHOTS,{recursive:true});await h.page.screenshot({fullPage:true,animations:'disabled',path:require('node:path').join(process.env.INOP_JOB_NAV_SCREENSHOTS,`job-nav-${language}-${width}.png`)});}}}assert.equal(observed.length,count);
 });
 await t.test('explicit navigation uses the existing Job page and preserves normal destination requests',async()=>{
  await h.models.Role.create({key:'job_navigation_reader',name:'Synthetic job reader',permissions:[{resource:'application',action:'read',scope:'assigned'},{resource:'recruitment',action:'read',scope:'all'}]});await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{role:'job_navigation_reader',departmentId:'dep_hr'}});await Application.updateOne({_id:app._id},{$set:{departmentId:'dep_hr',assignedTo:h.actors.peer._id}});
  await h.open('peer',url);await link.waitFor();await h.page.waitForLoadState('networkidle');assert.equal(await h.page.locator('[data-application-workflow]').count(),0);assert.equal(await h.page.locator('[data-application-current-workflow]').count(),1);if(process.env.INOP_JOB_NAV_SCREENSHOTS)await h.page.screenshot({fullPage:true,path:require('node:path').join(process.env.INOP_JOB_NAV_SCREENSHOTS,'job-nav-readonly-320.png')});const count=observed.length;await link.press('Enter');await h.page.waitForURL('**'+jobUrl);await h.page.getByRole('heading',{name:title,exact:true}).waitFor();await h.page.waitForLoadState('networkidle');assert.deepEqual(observed.slice(count).sort(),['/api/jobs/'+j._id,'/api/hr/v2/application-ranking'].sort());
 });
 await t.test('handoff-only Employee and department-scoped Manager receive no parent link or direct Job access',async()=>{
  for(const [actor,role]of [['own','recruitment_employee'],['department','recruitment_manager']]){await require('../../Backend/models/candidate.model').updateOne({_id:c._id},{$set:{departmentId:'dep_hr'}});await require('../../Backend/models/job.model').updateOne({_id:j._id},{$set:{departmentId:actor==='own'?'dep_hr':'dep_A'}});await h.models.User.updateOne({_id:h.actors[actor]._id},{$set:{role,departmentId:'dep_hr'}});await Application.updateOne({_id:app._id},{$set:{assignedTo:h.actors[actor]._id}});const response=await h.request(actor,'GET','/applications/'+app._id);assert.equal(response.status,200);assert.equal(response.data.jobId,null);await h.open(actor,url);await h.page.locator('[data-application-history]').waitFor();await h.page.waitForLoadState('networkidle');assert.equal(await link.count(),0);assert.equal((await h.request(actor,'GET','/jobs/'+j._id)).status,404);if(actor==='own'){await h.page.locator('[data-application-handoff]').waitFor();assert.equal(await h.page.locator('[data-application-handoff] a').count(),0);if(process.env.INOP_JOB_NAV_SCREENSHOTS)await h.page.screenshot({fullPage:true,path:require('node:path').join(process.env.INOP_JOB_NAV_SCREENSHOTS,'job-nav-restricted-320.png')});}await h.open(actor,jobUrl);await h.page.locator('[data-hr-state=not-found]').first().waitFor();}
 });
 await t.test('opaque, malformed and handoff-only parent values do not grant navigation',async()=>{
  const base=(await h.request('admin','GET','/applications/'+app._id)).data,pattern='**/api/applications/'+app._id;
  for(const jobId of [j._id,null,{...base.jobId,_id:'invalid',id:'invalid'}]){await h.page.route(pattern,r=>r.fulfill({contentType:'application/json',body:JSON.stringify({...base,jobId})}));try{await h.open('admin',url);await h.page.locator('[data-application-history]').waitFor();assert.equal(await link.count(),0);}finally{await h.page.unroute(pattern);}}
 });
 await t.test('refresh hides navigation while preserving editor draft and respects revoked Job scope',async()=>{
  await h.open('admin',url);await link.waitFor();const form=h.page.locator('[data-application-workflow]');await form.locator('textarea').last().fill('Synthetic navigation draft');await h.page.waitForLoadState('networkidle');let release;const hold=new Promise(r=>{release=r;}),pattern='**/api/applications/'+app._id;
  await h.page.route(pattern,async r=>{await hold;const response=await h.request('admin','GET','/applications/'+app._id);await r.fulfill({contentType:'application/json',body:JSON.stringify(response.data)});});const seen=h.page.waitForRequest(r=>r.url().endsWith('/applications/'+app._id)),done=h.page.waitForResponse(r=>r.url().endsWith('/applications/'+app._id));try{await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await seen;await link.waitFor({state:'detached'});assert.equal(await form.locator('textarea').last().inputValue(),'Synthetic navigation draft');release();await done;await link.waitFor();assert.equal(await form.locator('textarea').last().inputValue(),'Synthetic navigation draft');}finally{release();await done;await h.page.unroute(pattern);}
  await Application.updateOne({_id:app._id},{$set:{assignedTo:h.actors.peer._id}});await h.open('peer',url);await link.waitFor();await h.page.waitForLoadState('networkidle');await h.models.Role.updateOne({key:'job_navigation_reader'},{$set:{permissions:[{resource:'application',action:'read',scope:'assigned'},{resource:'recruitment',action:'read',scope:'assigned'}]}});await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await link.waitFor({state:'detached'});await h.page.waitForLoadState('networkidle');assert.equal(await link.count(),0);assert.equal((await h.request('peer','GET','/jobs/'+j._id)).status,404);await h.open('peer',jobUrl);await h.page.locator('[data-hr-state=not-found]').first().waitFor();
 });
 await t.test('populated-looking legacy data cannot replace a missing recruitment read grant; expired session clears link',async()=>{
  const base=(await h.request('admin','GET','/applications/'+app._id)).data,pattern='**/api/applications/'+app._id;
  await h.models.Role.create({key:'application_only_navigation',name:'Synthetic application only',permissions:[{resource:'application',action:'read',scope:'assigned'}]});await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{role:'application_only_navigation'}});
  await h.page.route(pattern,r=>r.fulfill({contentType:'application/json',body:JSON.stringify(base)}));try{await h.open('peer',url);await h.page.locator('[data-application-history]').waitFor();assert.equal(await link.count(),0);assert.equal((await h.request('peer','GET','/jobs/'+j._id)).status,403);}finally{await h.page.unroute(pattern);}
  await h.page.route(pattern,r=>r.fulfill({status:401,contentType:'application/json',body:'{}'}));try{await h.open('admin',url);await h.page.waitForURL('**/login');await h.page.locator('#email').waitFor();assert.equal(await link.count(),0);}finally{await h.page.unroute(pattern);}
 });
 assert.deepEqual(h.pageErrors,[]);
}));

test('record eligibility gates controls, revocation, refresh and malformed legacy responses',async t=>withBrowserFixture(harness,async h=>{
 await h.models.Role.create({key:'eligibility_ui',name:'Synthetic mixed scopes',permissions:[{resource:'candidate',action:'read',scope:'all'},{resource:'recruitment',action:'read',scope:'all'},{resource:'application',action:'read',scope:'all'},{resource:'application',action:'update',scope:'assigned'}]});
 await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{role:'eligibility_ui',departmentId:'dep_hr'}});
 const c=(await h.request('admin','POST','/candidates',{name:'Synthetic action eligibility',role:'Cashier'})).data;
 const j=(await h.request('admin','POST','/jobs',{title:'Synthetic scoped vacancy',department:'HR',description:'Synthetic'})).data;
 const a=(await h.request('admin','POST','/applications',{candidateId:c._id,jobId:j._id})).data;
 const detail='/app/recruitment/applications/'+a._id;
 const row=()=>h.page.locator('tbody tr').filter({hasText:c.name});
 const form=()=>h.page.locator('[data-application-workflow]');
 let writes=0;h.page.on('request',r=>{if(['PATCH','POST','DELETE'].includes(r.method())&&r.url().includes('/api/applications/'))writes++});
 await t.test('read-all/update-assigned: unavailable status and workflow never initiate mutations',async()=>{
   await h.open('peer','/app/recruitment/applications');await row().waitFor();assert.equal(await row().locator('select').count(),0);assert.equal(writes,0);
   await h.open('peer',detail);await h.page.locator('.hr-application-detail').waitFor();assert.equal(await form().count(),0);
 });
 await t.test('assigned update works; refresh disables retained draft then reassignment removes editing',async()=>{
   await Application.updateOne({_id:a._id},{$set:{assignedTo:h.actors.peer._id}});
   await h.open('peer',detail);await form().waitFor();await form().getByLabel('HR qeydləri',{exact:true}).fill('Synthetic preserved draft');
   let release;const hold=new Promise(r=>release=r);let seen;const started=new Promise(r=>seen=r);
   await h.page.route('**/api/applications/'+a._id,async route=>{seen();await hold;await route.fallback()});
   const focusedAt=await h.page.evaluate(()=>{window.dispatchEvent(new Event('focus'));return performance.now()});await started;assert.equal(await form().getByRole('button',{name:'Yadda saxla',exact:true}).isEnabled(),false);
   release();await h.page.unroute('**/api/applications/'+a._id);await form().getByRole('button',{name:'Yadda saxla',exact:true}).waitFor();
   await h.page.waitForFunction(()=>!document.querySelector('[data-application-workflow] fieldset')?.disabled);
   assert.equal(await form().getByLabel('HR qeydləri',{exact:true}).inputValue(),'Synthetic preserved draft');
   await Application.updateOne({_id:a._id},{$set:{assignedTo:h.actors.admin._id}});
   // Respect the existing 250ms focus-event coalescing window; do not change app timeouts.
   await h.page.waitForFunction(at=>performance.now()-at>=250,focusedAt);
   await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await form().waitFor({state:'detached'});assert.equal(writes,0);
 });
 await t.test('missing, unknown and wrong-revision flags fail closed',async()=>{
   for(const flags of [undefined,{version:'unknown',update:true},{version:'application-actions-v1',applicationId:a._id,revision:999,update:true,delete:true}]){
     await h.page.route('**/api/hr/v2/applications?*',async route=>{const u=new URL(route.request().url());const data=(await h.request('peer','GET',u.pathname.slice(4)+u.search)).data;for(const item of data.items)item.actionEligibility=flags;await route.fulfill({json:data})});
     await h.open('peer','/app/recruitment/applications');await row().waitFor();assert.equal(await row().locator('select').count(),0);await h.page.unroute('**/api/hr/v2/applications?*');
   }
 });
 await t.test('late response from a superseded permission context cannot restore editing',async()=>{
   await Application.updateOne({_id:a._id},{$set:{assignedTo:h.actors.peer._id}});
   await h.open('peer',detail);await form().waitFor();
   let finish;const gate=new Promise(r=>finish=r);let observed;const started=new Promise(r=>observed=r);let oldBody;
   await h.page.route('**/api/applications/'+a._id,async route=>{
     if(!oldBody){oldBody=(await h.request('peer','GET','/applications/'+a._id)).data;observed();await gate;try{await route.fulfill({json:oldBody})}catch{/* Aborted superseded request is expected. */}}
     else await route.fallback();
   });
   await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await started;
   const current=await h.profile('peer');current.permissions=current.permissions.filter(p=>p.resource!=='application'||p.action!=='update');
   await h.models.Role.updateOne({key:'eligibility_ui'},{$set:{permissions:current.permissions}});
   await h.page.evaluate(u=>window.setTestUser(u),current);await form().waitFor({state:'detached'});
   finish();await h.page.unroute('**/api/applications/'+a._id);
   await h.page.locator('[data-application-current-workflow]').waitFor();assert.equal(await form().count(),0);assert.equal(writes,0);
   const original=[...current.permissions,{resource:'application',action:'update',scope:'assigned'}];await h.models.Role.updateOne({key:'eligibility_ui'},{$set:{permissions:original}});
 });
 await t.test('401/403/404 refresh clears prior editing eligibility',async()=>{
   for(const status of [401,403,404]){
     await h.open('peer',detail);await form().waitFor();
     await h.page.route('**/api/applications/'+a._id,r=>r.fulfill({status,json:{message:'Synthetic denied'}}));
     // visibility/focus coalescing is per mounted resource, so a fresh document has no previous focus event.
     await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await form().waitFor({state:'detached'});assert.equal(writes,0);
     await h.page.unroute('**/api/applications/'+a._id);
   }
 });
 await t.test('authorized status control saves once and never sends eligibility metadata',async()=>{
   await Application.updateOne({_id:a._id},{$set:{assignedTo:h.actors.peer._id}});
   await h.open('peer','/app/recruitment/applications');await row().locator('select').waitFor();
   const response=h.page.waitForResponse(r=>r.url().endsWith('/applications/'+a._id+'/status')&&r.request().method()==='PATCH');await row().locator('select').selectOption('screening');const saved=await response;assert.equal(saved.status(),200);assert.equal(Object.hasOwn(saved.request().postDataJSON(),'actionEligibility'),false);assert.equal(writes,1);
 });
 assert.deepEqual(h.pageErrors,[]);
}));

test('Application clear-all replaces search and status atomically on scoped table and board',async t=>withBrowserFixture(harness,async h=>{
  await h.models.Role.create({key:'app_clear_reader',name:'Synthetic scoped workflow reader',permissions:[{resource:'candidate',action:'read',scope:'all'},{resource:'recruitment',action:'read',scope:'all'},{resource:'application',action:'read',scope:'assigned'}]});
  await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{role:'app_clear_reader',departmentId:'dep_hr'}});
  const c=(await h.request('admin','POST','/candidates',{name:'Synthetic reset applicant',role:'Cashier'})).data;
  for(const [name,status,owner] of [['Alpha','Screening','peer'],['Beta','Applied','peer'],['Hidden','Screening','admin']]){
    const j=(await h.request('admin','POST','/jobs',{title:'Synthetic '+name+' workflow vacancy',department:'HR',description:'Synthetic only'})).data;
    await Application.create({candidateId:c._id,jobId:j._id,status,assignedTo:h.actors[owner]._id,createdBy:h.actors.admin._id,departmentId:'dep_hr'});
  }
  let requests=[];
  h.page.on('request',r=>{const u=new URL(r.url());if(['/api/hr/v2/applications','/api/hr/v2/application-board'].includes(u.pathname))requests.push({path:u.pathname,q:u.searchParams.get('q')||'',status:u.searchParams.get('status')});});
  for(const [view,pending] of [['table',false],['table',true],['board',false],['board',true]])await t.test(`${view}: ${pending?'pending':'settled'} search clear is one current scoped query`,async()=>{
    const path=view==='board'?'/api/hr/v2/application-board':'/api/hr/v2/applications';
    const response=predicate=>h.page.waitForResponse(r=>{const u=new URL(r.url());return u.pathname===path&&r.status()===200&&predicate(u.searchParams)});
    const beta=()=>view==='board'?h.page.locator('.hr-board-card-job').filter({hasText:'Synthetic Beta workflow vacancy'}):h.page.locator('tbody tr').filter({hasText:'Synthetic Beta workflow vacancy'});
    await h.open('peer','/app/recruitment/applications'+(view==='board'?'?view=board':''));await beta().waitFor();
    let done=response(q=>q.get('status')==='Screening');await h.page.locator('select').filter({has:h.page.locator('option[value="processing"]')}).selectOption('screening');await done;
    done=response(q=>q.get('q')==='Alpha'&&q.get('status')==='Screening');await h.page.getByRole('searchbox').fill('Alpha');await done;
    if(pending)await h.page.getByRole('searchbox').fill('Beta');
    requests=[];done=response(q=>!q.get('q')&&!q.get('status'));
    await h.page.getByRole('button',{name:require('../src/i18n/locales/az.json').common.actions.clear,exact:true}).and(h.page.locator('.btn-secondary')).click();await done;await beta().waitFor();
    console.log(JSON.stringify({view,pending,clearRequests:requests}));
    assert.deepEqual(requests,[{path,q:'',status:null}]);
    assert.equal(await h.page.getByRole('searchbox').inputValue(),'');
    assert.equal(await h.page.getByText('Synthetic Hidden workflow vacancy',{exact:false}).count(),0);
    assert.equal(await h.page.locator(view==='board'?'[data-application-card]':'tbody tr').count(),2);
    assert.equal(await h.page.locator('[data-rfd-drag-handle-draggable-id]').count(),0);
    assert.equal(await h.page.locator('[data-application-workflow]').count(),0);
  });
  assert.deepEqual(h.pageErrors,[]);
}));

test('Metadata-only workflow edits preserve independent schedule instants, timezone and precision',async t=>withBrowserFixture(harness,async h=>{
 const c=(await h.request('admin','POST','/candidates',{name:'Synthetic scheduling applicant',role:'Cashier'})).data;
 const j=(await h.request('admin','POST','/jobs',{title:'Synthetic scheduling vacancy',description:'Synthetic only',department:'HR'})).data;
 const app=(await h.request('admin','POST','/applications',{candidateId:c._id,jobId:j._id})).data;
 const url='/app/recruitment/applications/'+app._id,form=()=>h.page.locator('[data-application-workflow]');
 const normal={startsAt:new Date('2026-11-10T06:30:47.123Z'),timezone:'Asia/Baku',durationMinutes:30,interviewerId:h.actors.admin._id,result:'pending'};
 const nextAction={kind:'call',dueAt:new Date('2026-11-11T11:15:39.456Z'),timezone:'Europe/London',notes:'Synthetic existing action'};
 const reset=async(interview=normal,action=nextAction)=>Application.updateOne({_id:app._id},{$set:{status:'Interview',substatus:'scheduled',interview,nextAction:action,notes:'Synthetic original HR note',assignedTo:h.actors.admin._id,events:[]}});
 const open=async(actor='admin')=>{await h.open(actor,url);await form().waitFor();};
 const save=async()=>{const response=h.page.waitForResponse(r=>r.url().endsWith('/applications/'+app._id+'/workflow')&&r.request().method()==='PATCH');await form().locator('button[type=submit]').click();return response;};
 await t.test('notes-only save cannot shift a different-zone deadline or truncate interview seconds',async()=>{
   await reset();await open();await form().getByLabel('HR qeydləri',{exact:true}).fill('Synthetic note only');const response=await save();assert.equal(response.status(),200);
   const stored=await Application.findById(app._id).lean();console.log(JSON.stringify({case:'notes-only',interviewBefore:normal.startsAt.toISOString(),interviewAfter:stored.interview.startsAt.toISOString(),dueBefore:nextAction.dueAt.toISOString(),dueAfter:stored.nextAction.dueAt.toISOString(),actionZoneAfter:stored.nextAction.timezone}));
   assert.equal(stored.nextAction.dueAt.toISOString(),nextAction.dueAt.toISOString());assert.equal(stored.nextAction.timezone,nextAction.timezone);assert.equal(stored.interview.startsAt.toISOString(),normal.startsAt.toISOString());assert.equal(stored.notes,'Synthetic note only');assert.equal(stored.events.at(-1).delivery,undefined,'Notes must not queue a rescheduling notification');
   assert.equal(Object.hasOwn(response.request().postDataJSON(),'interview'),false);assert.equal(Object.hasOwn(response.request().postDataJSON(),'nextAction'),false);
 });
 await t.test('explicit-offset DST fold remains editable without rescheduling; result-only patch preserves its instant',async()=>{
   const fold={...normal,startsAt:new Date('2026-10-25T00:30:47.123Z'),timezone:'Europe/London'};await reset(fold,null);
   const backend=await h.request('admin','PATCH','/applications/'+app._id+'/workflow',{interview:{startsAt:fold.startsAt.toISOString(),timezone:fold.timezone,durationMinutes:30,interviewerId:String(h.actors.admin._id),result:'pending'}});assert.equal(backend.status,200,'Existing backend must accept explicit-offset fold instants');
   await open();await form().getByLabel('HR qeydləri',{exact:true}).fill('Synthetic fold note');let response=await save();console.log(JSON.stringify({case:'fold note-only',status:response.status()}));assert.equal(response.status(),200);assert.equal((await Application.findById(app._id)).interview.startsAt.toISOString(),fold.startsAt.toISOString());
   await open();await form().getByLabel('Müsahibə nəticəsi',{exact:true}).selectOption('passed');response=await save();assert.equal(response.status(),200);const stored=await Application.findById(app._id);assert.equal(stored.interview.startsAt.toISOString(),fold.startsAt.toISOString());assert.equal(stored.interview.result,'passed');assert.deepEqual(response.request().postDataJSON().interview,{result:'passed'});
 });
 await t.test('due input agrees with selected timezone; action-note edit preserves original due instant and zone',async()=>{
   await reset();await open();assert.equal(await form().getByLabel('Son tarix (seçilmiş saat qurşağında)',{exact:true}).inputValue(),'2026-11-11T15:15');
   await form().getByLabel('Növbəti addımın qeydi',{exact:true}).fill('Synthetic action-note edit');const response=await save();assert.equal(response.status(),200);
   const stored=await Application.findById(app._id);assert.equal(stored.nextAction.dueAt.toISOString(),nextAction.dueAt.toISOString());assert.equal(stored.nextAction.timezone,nextAction.timezone);assert.equal(stored.nextAction.notes,'Synthetic action-note edit');assert.equal(stored.interview.startsAt.toISOString(),normal.startsAt.toISOString());
   const payload=response.request().postDataJSON();assert.equal(payload.nextAction.dueAt,nextAction.dueAt.toISOString());assert.equal(Object.hasOwn(payload.nextAction,'localDueAt'),false);
 });
 await t.test('explicit date edits still use selected-zone conversion and reject DST gaps/folds',async()=>{
   await reset();await open();await form().getByLabel('Son tarix (seçilmiş saat qurşağında)',{exact:true}).fill('2026-11-11T16:15');let response=await save();assert.equal(response.status(),200);assert.equal((await Application.findById(app._id)).nextAction.dueAt.toISOString(),'2026-11-11T12:15:00.000Z');
   for(const local of ['2026-03-29T01:30','2026-10-25T01:30']){
     await reset({...normal,timezone:'Europe/London'},null);await open();await form().getByLabel('Müsahibə vaxtı',{exact:true}).fill(local);response=await save();assert.equal(response.status(),400);assert.equal(await form().getByLabel('Müsahibə vaxtı',{exact:true}).inputValue(),local);assert.equal((await Application.findById(app._id)).interview.startsAt.toISOString(),normal.startsAt.toISOString());
   }
 });
 await t.test('assigned Employee can save notes while parent resources stay independently protected',async()=>{
   await reset();await h.models.User.updateOne({_id:h.actors.own._id},{$set:{role:'recruitment_employee',departmentId:'dep_hr'}});await Application.updateOne({_id:app._id},{$set:{assignedTo:h.actors.own._id}});
   assert.equal((await h.request('own','GET','/candidates/'+c._id)).status,404);assert.equal((await h.request('own','GET','/jobs/'+j._id)).status,404);
   await open('own');await form().getByLabel('HR qeydləri',{exact:true}).fill('Synthetic assigned HR note');const response=await save();assert.equal(response.status(),200);
   const stored=await Application.findById(app._id).lean();assert.equal(stored.notes,'Synthetic assigned HR note');assert.equal(stored.interview.startsAt.toISOString(),normal.startsAt.toISOString());assert.equal(stored.nextAction.dueAt.toISOString(),nextAction.dueAt.toISOString());assert.equal(stored.events.at(-1).actor,String(h.actors.own._id));assert.equal(stored.events.at(-1).delivery,undefined);
   const body=response.request().postDataJSON();assert.equal(Object.hasOwn(body,'interview'),false);assert.equal(Object.hasOwn(body,'nextAction'),false);assert.equal(Object.hasOwn(body,'assignedTo'),false);
 });
 assert.deepEqual(h.pageErrors,[]);
}));
