const test = require('node:test'), assert = require('node:assert/strict');
const { withBrowserFixture } = require('./helpers/browser.cjs');
const harness = `import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';import {AuthContext} from '/src/Context/AuthContext.ts';import i18n from '/src/i18n/index.ts';import '/src/Styles/recruitment.css';import Analytics from '/src/Pages/Recruitment/Analytics/HRAnalytics.tsx';import HRRoute from '/src/Routes/HRRoute.tsx';import api from '/src/api/axios.ts';api.defaults.baseURL='/api';window.changeLanguage=l=>i18n.changeLanguage(l);function App(){window.navigateTest=useNavigate();const [user,setUser]=React.useState(window.testUser);window.setTestUser=setUser;return React.createElement(AuthContext.Provider,{value:{user,isLoading:false}},React.createElement(Routes,null,React.createElement(Route,{element:React.createElement(HRRoute,{resource:'application'})},React.createElement(Route,{path:'/app/recruitment/analytics',element:React.createElement(Analytics)}))));}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));`;
test('GFC analytics UI uses real scoped envelopes without PII, fake providers or stale metrics', async t => withBrowserFixture(harness, async h => {
  const path = '/app/recruitment/analytics', kpi = key => h.page.locator(`[data-hr-kpi="${key}"] strong`);
  await t.test('empty state and unknown duration are distinct from genuine zero', async () => {
    await h.open('admin', path); await h.page.locator('[data-hr-analytics-empty]').waitFor(); assert.equal(await kpi('applications').textContent(), '0');
    assert.ok((await h.page.locator('[data-hr-hire-time]').textContent()).includes('Məlumat yoxdur')); assert.ok(!((await h.page.locator('[data-hr-hire-time]').textContent()).includes('0 gün')));
  });
  const candidate = (await h.request('admin', 'POST', '/candidates', { name: 'Analytics_PRIVATE_PROFILE', email: 'analytics@private.invalid', role: 'Cashier', skills: ['Kassa'] })).data;
  const jobs = [];
  for (const [brandId, status] of [['kfc', 'Applied'], ['pizza-hut', 'Interview'], ['simit-sarayi', 'Hired']]) {
    const branch = (await h.request('admin', 'POST', '/hr/branches', { code: 'ui-' + brandId, name: brandId + ' branch', brandId, kind: 'restaurant' })).data;
    const job = (await h.request('admin', 'POST', '/jobs', { title: brandId + ' Cashier', department: 'HR', description: 'Hiring', brandId, branchId: branch._id, requiredSkills: ['Cash handling'] })).data; jobs.push(job);
    const app = (await h.request('admin', 'POST', '/applications', { jobId: job._id, candidateId: candidate._id })).data;
    if (status !== 'Applied') assert.equal((await h.request('admin', 'PATCH', `/applications/${app._id}/status`, { status: status === 'Hired' ? 'Offered' : status })).status, 200);
    if (status === 'Hired') assert.equal((await h.request('admin', 'PATCH', `/applications/${app._id}/status`, { status })).status, 200);
  }
  await t.test('GFC cohort shows three brands, real funnel/scores and does not render Candidate PII', async () => {
    h.wire.length = 0; await h.open('admin', path); await kpi('applications').waitFor(); assert.equal(await kpi('applications').textContent(), '3');
    assert.equal(await h.page.locator('[data-hr-stage=Hired] td').textContent(), '1'); assert.equal(await h.page.locator('[data-hr-score-bucket="80"]').textContent(), '80–100%: 3');
    assert.ok((await h.page.locator('[data-hr-hire-time]').textContent()).includes('0 gün')); assert.equal(h.wire.filter(r => r.path === '/api/hr/analytics').length, 1);
    assert.equal(h.wire.filter(r => ['/api/candidates', '/api/jobs', '/api/applications'].includes(r.path)).length, 0);
    const body = await h.page.locator('body').textContent(); assert.ok(!body.includes('Analytics_PRIVATE_PROFILE')); assert.ok(!body.includes('analytics@private.invalid'));
    assert.ok(body.includes('İnteqrasiya edilməyib')); assert.ok(body.includes('davamlı storage təsdiqlənməyib'));
  });
  await t.test('each brand is filtered on the server, including branch and vacancy selection', async () => {
    for (const brand of ['KFC', 'Pizza Hut', 'Simit Sarayı']) {
      await h.page.getByRole('button', { name: brand, exact: true }).click(); await h.page.waitForFunction(() => document.querySelector('[data-hr-kpi=applications] strong')?.textContent === '1');
      assert.equal(await h.page.getByRole('button', { name: brand, exact: true }).getAttribute('aria-pressed'), 'true');
    }
    await h.page.getByRole('button', { name: 'KFC', exact: true }).click(); await kpi('applications').waitFor();
    await h.page.getByLabel('Filial / iş yeri', { exact: true }).selectOption(String(jobs[0].branchId)); await kpi('applications').waitFor();
    await h.page.getByLabel('Vakansiya', { exact: true }).selectOption(jobs[0]._id); await kpi('applications').waitFor(); assert.equal(await kpi('applications').textContent(), '1');
  });
  await t.test('date/source/status filters update metrics and invalid range remains editable', async () => {
    await h.page.getByRole('button', { name: 'Təmizlə', exact: true }).click(); await kpi('applications').waitFor();
    await h.page.getByLabel('Status', { exact: true }).selectOption('Hired'); await kpi('applications').waitFor(); assert.equal(await kpi('applications').textContent(), '1');
    await h.page.getByLabel('Müraciət mənbəyi', { exact: true }).selectOption('outlook'); await h.page.locator('[data-hr-analytics-empty]').waitFor();
    await h.page.getByRole('button', { name: 'Təmizlə', exact: true }).click(); await kpi('applications').waitFor();
    await h.page.getByLabel('Başlanğıc tarix (UTC)', { exact: true }).fill('2026-11-10'); await h.page.getByLabel('Son tarix (UTC)', { exact: true }).fill('2026-01-01');
    await h.page.locator('[data-hr-state=error]').waitFor(); assert.equal(await h.page.getByLabel('Başlanğıc tarix (UTC)', { exact: true }).count(), 1);
    await h.page.getByRole('button', { name: 'Təmizlə', exact: true }).click(); await kpi('applications').waitFor(); assert.equal(await kpi('applications').textContent(), '3');
  });
  await t.test('language change reuses data without new requests, and all three locale keys resolve', async () => {
    const before = h.wire.length;
    for (const language of ['en', 'ru', 'az']) { await h.page.evaluate(l => window.changeLanguage(l), language); assert.ok(!((await h.page.locator('body').textContent()).includes('hrAnalytics.'))); }
    assert.equal(h.wire.length, before); assert.equal(await kpi('applications').textContent(), '3');
  });
  await t.test('Candidate-restricted aggregate counts show limited coverage without fake zero score', async () => {
    await h.models.Role.create({ key: 'analytics_ui_limited', name: 'Limited', permissions: ['application', 'recruitment'].map(resource => ({ resource, action: 'read', scope: 'all' })) });
    await h.models.User.updateOne({ _id: h.actors.peer._id }, { $set: { role: 'analytics_ui_limited' } });
    await h.open('peer', path); await kpi('applications').waitFor(); assert.equal(await kpi('applications').textContent(), '3');
    await h.page.getByRole('status').filter({ hasText: 'namizəd məlumatı üçün giriş məhduddur' }).waitFor(); assert.equal(await h.page.locator('[data-hr-score=restricted]').textContent(), 'Qiymətləndirməyə giriş yoxdur: 3');
  });
  await t.test('old filter response cannot overwrite a newer selected brand', async () => {
    const old = (await h.request('admin', 'GET', '/hr/analytics')).data; let release, entered; const gate = new Promise(resolve => { release = resolve; }), captured = new Promise(resolve => { entered = resolve; });
    await h.page.route('**/api/hr/analytics', async r => { entered(); await gate; await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(old) }).catch(() => {}); });
    await h.open('admin', path); await captured; await h.page.getByRole('button', { name: 'KFC', exact: true }).click(); await kpi('applications').waitFor(); assert.equal(await kpi('applications').textContent(), '1');
    release(); await h.page.waitForTimeout(100); assert.equal(await kpi('applications').textContent(), '1'); await h.page.unroute('**/api/hr/analytics');
  });
  await t.test('permission revocation clears old metrics immediately', async () => {
    const profile = await h.profile('admin'); profile.permissions = []; await h.page.evaluate(p => window.setTestUser(p), profile); await h.page.locator('[data-hr-state=forbidden]').waitFor(); assert.equal(await kpi('applications').count(), 0);
  });
  await t.test('500 error offers retry while filters remain accessible', async () => {
    await h.page.route('**/api/hr/analytics', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Synthetic outage"}' })); await h.open('admin', path);
    await h.page.locator('[data-hr-state=server-error]').waitFor(); assert.equal(await h.page.getByLabel('Status', { exact: true }).count(), 1); await h.page.unroute('**/api/hr/analytics');
    await h.page.getByRole('button', { name: 'Yenidən cəhd et', exact: true }).click(); await kpi('applications').waitFor(); assert.equal(await kpi('applications').textContent(), '3');
  });
  await t.test('missing required DTO fields fail as a handled contract error instead of crashing the page', async () => {
    await h.page.route('**/api/hr/analytics', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: 'hr-analytics-v1', totals: { applications: 10 }, coverage: {}, funnel: [] }) }));
    await h.open('admin', path); await h.page.locator('[data-hr-state=error]').waitFor(); assert.equal(await kpi('applications').count(), 0); await h.page.unroute('**/api/hr/analytics');
  });
  await t.test('composite Job permission denial remains 403 with the existing bearer token', async () => {
    await h.models.Role.create({ key: 'analytics_ui_app_only', name: 'App only', permissions: [{ resource: 'application', action: 'read', scope: 'all' }] });
    await h.models.User.updateOne({ _id: h.actors.peer._id }, { $set: { role: 'analytics_ui_app_only' } });
    await h.open('peer', path); await h.page.locator('[data-hr-state=forbidden]').waitFor(); assert.equal(await kpi('applications').count(), 0);
    await h.open('admin', path); await kpi('applications').waitFor();
  });
  await t.test('mobile presentation is readable without horizontal page overflow', async () => {
    await h.page.setViewportSize({ width: 390, height: 844 }); assert.equal(await h.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  });
  assert.deepEqual(h.pageErrors, []);
}));
