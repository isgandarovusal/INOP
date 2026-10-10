const test = require('node:test'), assert = require('node:assert/strict');
const { withBrowserFixture } = require('./helpers/browser.cjs');
const harness = `import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';import {AuthContext} from '/src/Context/AuthContext.ts';import '/src/i18n/index.ts';import Jobs from '/src/Pages/Recruitment/Jobs/JobDetail.tsx';import Candidate from '/src/Pages/Recruitment/Candidates/CandidateDetail.tsx';import Apps from '/src/Pages/Recruitment/Applications/ApplicationsList.tsx';import api from '/src/api/axios.ts';api.defaults.baseURL='/api';function App(){window.navigateTest=useNavigate();const [user,setUser]=React.useState(window.testUser);window.setTestUser=setUser;return React.createElement(AuthContext.Provider,{value:{user,isLoading:false}},React.createElement(Routes,null,React.createElement(Route,{path:'/app/recruitment/jobs/:id',element:React.createElement(Jobs)}),React.createElement(Route,{path:'/app/recruitment/candidates/:id',element:React.createElement(Candidate)}),React.createElement(Route,{path:'/app/recruitment/applications',element:React.createElement(Apps)})));}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));`;
test('Trusted Application matching is consistent across vacancy, profile, table and board', async t => withBrowserFixture(harness, async h => {
  const createJob = async (skills, experience = 0) => (await h.request('admin', 'POST', '/jobs', { title: 'Cashier', department: 'HR', description: 'Cashier duties', requiredSkills: skills, experienceYears: experience })).data;
  const candidate = (await h.request('admin', 'POST', '/candidates', { name: 'Contextual applicant', role: 'Cashier', skills: ['Kassa'], experience: null })).data;
  const job = await createJob(['Cash handling']); const other = await createJob(['HACCP']);
  const apply = async j => (await h.request('admin', 'POST', '/applications', { jobId: j._id, candidateId: candidate._id })).data;
  const app = await apply(job), zero = await apply(other);
  const badge = id => h.page.locator(`[data-application-score="${id}"]`);
  await t.test('table distinguishes a genuine zero from a missing score and exposes criterion evidence', async () => {
    h.wire.length = 0; await h.open('admin', '/app/recruitment/applications'); await badge(app._id).waitFor();
    assert.equal(h.wire.filter(r => r.path === '/api/applications/' + app._id).length, 0, 'Evidence is not fetched for collapsed summaries');
    assert.equal(await badge(app._id).locator('strong').textContent(), '100%'); assert.equal(await badge(zero._id).locator('strong').textContent(), '0%');
    await badge(app._id).locator('summary').filter({ hasText: 'Uyğunluğun izahı' }).click(); await badge(app._id).getByText(/cash handling/).waitFor(); assert.match(await badge(app._id).textContent(), /cash handling/); assert.equal(h.wire.filter(r => r.path === '/api/applications/' + app._id).length, 1);
  });
  await t.test('JobDetail and Candidate profile show the same per-vacancy scores', async () => {
    await h.open('admin', '/app/recruitment/jobs/' + job._id); await badge(app._id).waitFor(); assert.equal(await badge(app._id).locator('strong').textContent(), '100%'); assert.equal(await badge(zero._id).count(), 0);
    await h.open('admin', '/app/recruitment/candidates/' + candidate._id); await badge(app._id).waitFor(); assert.equal(await badge(zero._id).locator('strong').textContent(), '0%');
  });
  await t.test('Application board keeps the same Candidate separate for two vacancies', async () => {
    await h.open('admin', '/app/recruitment/applications'); await badge(app._id).waitFor(); await h.page.getByRole('button', { name: 'Application Kanban', exact: true }).click();
    await h.page.locator('[data-application-kanban]').waitFor(); assert.equal(await h.page.locator('article.recruitment-kanban__card').count(), 2);
    assert.equal(await badge(app._id).locator('strong').textContent(), '100%'); assert.equal(await badge(zero._id).locator('strong').textContent(), '0%');
  });
  await t.test('Job changes invalidate display; authorized recalculation updates the persisted result', async () => {
    await h.request('admin', 'PUT', '/jobs/' + job._id, { requiredSkills: ['HACCP'] });
    await h.open('admin', '/app/recruitment/applications'); await badge(app._id).waitFor(); assert.equal(await badge(app._id).getAttribute('data-score-status'), 'stale');
    assert.ok(!await badge(app._id).textContent().then(s => s.includes('100%')));
    await badge(app._id).locator('summary').filter({ hasText: 'Yenidən hesabla' }).click(); await badge(app._id).getByRole('button', { name: 'Yenidən hesabla', exact: true }).click();
    await h.page.locator(`[data-application-score="${app._id}"][data-score-status=calculated]`).waitFor(); assert.equal(await badge(app._id).locator('strong').textContent(), '0%');
  });
  await t.test('incomplete relevant experience can be explicitly reviewed with a required reason', async () => {
    const needsExperience = await createJob(['Cash handling'], 2), incomplete = await apply(needsExperience);
    await h.open('admin', '/app/recruitment/applications'); await badge(incomplete._id).waitFor(); assert.equal(await badge(incomplete._id).locator('strong').textContent(), 'Məlumat natamamdır');
    await badge(incomplete._id).locator('summary').filter({ hasText: 'Yenidən hesabla' }).click();
    await badge(incomplete._id).getByRole('spinbutton').fill('2'); assert.equal(await badge(incomplete._id).getByRole('button', { name: 'Yenidən hesabla', exact: true }).isDisabled(), true);
    await badge(incomplete._id).getByRole('textbox').fill('HR verified employment dates'); await badge(incomplete._id).getByRole('button', { name: 'Yenidən hesabla', exact: true }).click();
    await h.page.locator(`[data-application-score="${incomplete._id}"][data-score-status=calculated]`).waitFor(); assert.equal(await badge(incomplete._id).locator('strong').textContent(), '100%');
  });
  await t.test('a denied lazy evidence request retains the primary row, hides the old score without an unintended aggregate/detail refetch', async () => {
    const pattern = '**/api/applications/' + app._id;
    await h.page.route(pattern, r => r.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"Evidence revoked"}' }));
    try {
      await h.open('admin', '/app/recruitment/applications'); await badge(app._id).waitFor();
      await badge(app._id).locator('summary').filter({ hasText: 'Uyğunluğun izahı' }).click(); await badge(app._id).locator('details[open] [data-hr-state=forbidden]').waitFor();
      assert.equal(await h.page.locator('tbody tr').count(), 3); assert.ok(!await badge(app._id).textContent().then(text => text.includes('100%')));
    } finally { await h.page.unroute(pattern); }
  });
  await t.test('late evidence cannot write after permission revocation', async () => {
    let release, entered; const gate = new Promise(r => release = r), started = new Promise(r => entered = r), pattern = '**/api/applications/' + app._id;
    const response = await h.request('admin', 'GET', '/applications/' + app._id);
    await h.page.route(pattern, async r => { entered(); await gate; await r.fulfill({ contentType: 'application/json', body: JSON.stringify(response.data) }); });
    try {
      await h.open('admin', '/app/recruitment/applications'); await badge(app._id).waitFor(); await badge(app._id).locator('summary').filter({ hasText: 'Uyğunluğun izahı' }).click(); await started;
      const profile = await h.profile('admin'); profile.permissions = []; await h.page.evaluate(p => window.setTestUser(p), profile); await h.page.locator('[data-hr-state=forbidden]').waitFor(); release(); await h.page.waitForLoadState('networkidle'); assert.equal(await badge(app._id).count(), 0);
    } finally { release(); await h.page.unroute(pattern); }
  });
  await t.test('parent permissions and permission revocation remove scores and evidence immediately', async () => {
    await h.models.Role.create({ key: 'matching_app_only', name: 'App only', permissions: [{ resource: 'application', action: 'read', scope: 'all' }] });
    await h.models.User.updateOne({ _id: h.actors.peer._id }, { $set: { role: 'matching_app_only' } });
    await h.open('peer', '/app/recruitment/applications'); await badge(app._id).waitFor(); assert.equal(await badge(app._id).getAttribute('data-score-status'), 'restricted');
    assert.equal(await badge(app._id).locator('details').count(), 0); assert.equal(await h.page.getByText('Contextual applicant', { exact: true }).count(), 0);
    const profile = await h.profile('peer'); profile.permissions = []; await h.page.evaluate(p => window.setTestUser(p), profile); await h.page.locator('[data-hr-state=forbidden]').waitFor(); assert.equal(await badge(app._id).count(), 0);
  });
  assert.deepEqual(h.pageErrors, []);
}));
