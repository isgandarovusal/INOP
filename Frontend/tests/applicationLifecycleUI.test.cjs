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
