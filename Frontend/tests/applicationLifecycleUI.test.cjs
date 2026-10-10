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
    assert.equal(await h.page.locator('tbody tr').count(), 1); assert.ok((await h.page.locator('tbody').textContent()).includes('Second workplace'));
  });
  await t.test('search and sort operate on the scoped Application dataset', async () => {
    await h.open('admin', '/app/recruitment/applications'); await h.page.getByRole('searchbox').waitFor();
    await h.page.getByRole('searchbox').fill('Second workplace'); assert.equal(await h.page.locator('tbody tr').count(), 1);
    assert.ok((await h.page.locator('tbody').textContent()).includes('Second workplace'));
    await h.page.getByRole('searchbox').fill(''); await h.page.getByLabel('Sıralama', { exact: true }).selectOption('newest');
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
    assert.equal(await h.page.locator('[data-rfd-drag-handle-draggable-id]').count(), 0); await h.page.getByRole('button', { name: 'Application Kanban', exact: true }).click();
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
