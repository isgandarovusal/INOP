const test = require('node:test'), assert = require('node:assert/strict');
const { withBrowserFixture } = require('./helpers/browser.cjs');
const Job = require('../../Backend/models/job.model'), Candidate = require('../../Backend/models/candidate.model'), Application = require('../../Backend/models/application.model');
const harness = `
import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';
import {AuthContext} from '/src/Context/AuthContext.ts';import i18n from '/src/i18n/index.ts';
import JobDetail from '/src/Pages/Recruitment/Jobs/JobDetail.tsx';import JobForm from '/src/Pages/Recruitment/Jobs/JobForm.tsx';import Jobs from '/src/Pages/Recruitment/Jobs/JobsList.tsx';
import CandidateDetail from '/src/Pages/Recruitment/Candidates/CandidateDetail.tsx';import CandidateForm from '/src/Pages/Recruitment/Candidates/CandidateForm.tsx';import Candidates from '/src/Pages/Recruitment/Candidates/CandidatesList.tsx';
import Applications from '/src/Pages/Recruitment/Applications/ApplicationsList.tsx';import HRRoute from '/src/Routes/HRRoute.tsx';import {hasPermission} from '/src/Utils/permissions.ts';
import api from '/src/api/axios.ts';api.defaults.baseURL='/api';window.changeLanguage=language=>i18n.changeLanguage(language);window.hasPermission=hasPermission;
function App(){const [user,setUser]=React.useState(window.testUser);window.setTestUser=setUser;window.navigateTest=useNavigate();
return React.createElement(AuthContext.Provider,{value:{user,isLoading:false}},React.createElement(Routes,null,
 React.createElement(Route,{element:React.createElement(HRRoute,{resource:'recruitment'})},React.createElement(Route,{path:'/app/recruitment/jobs',element:React.createElement(Jobs)}),React.createElement(Route,{path:'/app/recruitment/jobs/:id',element:React.createElement(JobDetail)})),
 React.createElement(Route,{path:'/app/recruitment/jobs/:id/edit',element:React.createElement(JobForm)}),
 React.createElement(Route,{path:'/app/recruitment/candidates',element:React.createElement(Candidates)}),React.createElement(Route,{path:'/app/recruitment/candidates/new',element:React.createElement(CandidateForm)}),
 React.createElement(Route,{path:'/app/recruitment/candidates/:id',element:React.createElement(CandidateDetail)}),React.createElement(Route,{path:'/app/recruitment/candidates/:id/edit',element:React.createElement(CandidateForm)}),
 React.createElement(Route,{path:'/app/recruitment/applications',element:React.createElement(Applications)})));}
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));
`;
test('HR pages isolate data, drafts, errors and permission contexts', async t => withBrowserFixture(harness, async h => {
  const provenance = { createdBy: h.actors.admin._id, assignedTo: h.actors.admin._id, departmentId: 'dep_A' };
  const first = await Job.create({ title: 'First vacancy', department: 'Operations', location: 'Baku', type: 'Part-time', description: 'First description', preferredSkills: ['Food safety'], experienceYears: 0, ...provenance });
  const second = await Job.create({ title: 'Second vacancy', department: 'Office', description: 'Second description', ...provenance });
  const candidate = await Candidate.create({ name: 'Ranked applicant', role: 'Cashier', status: 'new', ...provenance });
  const other = await Candidate.create({ name: 'Other profile', role: 'Manager', ...provenance });
  const app = await Application.create({ jobId: first._id, candidateId: candidate._id, score: 47, ...provenance });
  await Application.create({ jobId: first._id, candidateId: other._id, score: 72, ...provenance });
  const jobPath = id => `/app/recruitment/jobs/${id}`;
  await t.test('JobDetail shows applications and excludes already-applied Candidate from selection', async () => {
    await h.open('admin', jobPath(first._id)); await h.page.getByText('Ranked applicant', { exact: true }).waitFor();
    assert.equal(await h.page.locator('select option').filter({ hasText: 'Ranked applicant' }).count(), 0);
    assert.deepEqual(await h.page.locator('.ranking-row__name').allTextContents(), ['Other profile', 'Ranked applicant']);
  });
  await t.test('failed supporting request keeps primary Job and ranked applications visible', async () => {
    await h.page.route('**/api/candidates', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Synthetic auxiliary outage"}' }));
    await h.open('admin', jobPath(first._id)); await h.page.getByText('First description', { exact: true }).waitFor();
    await h.page.getByText('Ranked applicant', { exact: true }).waitFor(); assert.ok(await h.page.locator('[role=alert]').count());
    await h.page.unroute('**/api/candidates');
  });
  await t.test('Application list uses one request and normalized parent links', async () => {
    h.wire.length = 0;
    await h.open('admin', '/app/recruitment/applications'); await h.page.getByText('Ranked applicant', { exact: true }).waitFor();
    assert.equal(h.wire.filter(r => r.path === '/api/applications').length, 1);
    assert.equal(h.wire.filter(r => r.path === '/api/jobs').length, 0);
    await h.page.getByText('Ranked applicant', { exact: true }).click();
    await h.page.waitForURL(`**/candidates/${candidate._id}`);
  });
  await t.test('Job edit preserves metadata, preferred skills and real zero', async () => {
    await h.open('admin', jobPath(first._id) + '/edit'); await h.page.locator('input[name=position]').waitFor();
    assert.equal(await h.page.locator('input[name=experience]').inputValue(), '0');
    await h.page.locator('input[name=position]').fill('Edited vacancy');
    await h.page.locator('button[type=submit]').click(); await h.page.waitForURL('**/app/recruitment/jobs');
    const stored = await Job.findById(first._id);
    assert.equal(stored.title, 'Edited vacancy'); assert.equal(stored.department, 'Operations'); assert.equal(stored.location, 'Baku');
    assert.equal(stored.type, 'Part-time'); assert.equal(stored.experienceYears, 0); assert.deepEqual(stored.preferredSkills.toObject(), ['Food safety']);
  });
  await t.test('language and focus do not refetch or erase an edit draft', async () => {
    await h.open('admin', jobPath(first._id) + '/edit'); await h.page.locator('input[name=position]').waitFor();
    await h.page.locator('input[name=position]').fill('Unsaved draft'); const count = h.wire.length;
    await h.page.evaluate(async () => { await window.changeLanguage('en'); window.dispatchEvent(new Event('focus')); });
    await h.page.waitForLoadState('networkidle');
    assert.equal(await h.page.locator('input[name=position]').inputValue(), 'Unsaved draft'); assert.equal(h.wire.length, count);
  });
  for (const status of [401, 403, 404, 500]) for (const page of ['jobs', 'candidates']) await t.test(`${page} HTTP ${status} has distinct detail and blocked edit state`, async () => {
    await h.page.route(`**/api/${page}/error-test`, r => r.fulfill({ status, contentType: 'application/json', body: '{"message":"Synthetic primary failure"}' }));
    for (const suffix of ['', '/edit']) {
      await h.open('admin', `/app/recruitment/${page}/error-test${suffix}`);
      await h.page.locator(`[data-hr-state="${{401:'unauthenticated',403:'forbidden',404:'not-found',500:'server-error'}[status]}"]`).waitFor();
      assert.equal(await h.page.locator('form').count(), 0);
    }
    await h.page.unroute(`**/api/${page}/error-test`);
  });
  await t.test('late previous Job cannot overwrite new route', async () => {
    let release, entered; const gate = new Promise(r => release = r), started = new Promise(r => entered = r);
    await h.page.route(`**/api/jobs/${first._id}`, async route => { entered(); await gate; await route.fulfill({ contentType: 'application/json', body: JSON.stringify(first.toObject()) }); });
    try {
      await h.open('admin', jobPath(first._id)); await started;
      await h.page.evaluate(id => window.navigateTest('/app/recruitment/jobs/' + id), String(second._id));
      await h.page.getByText('Second description', { exact: true }).waitFor(); release(); await h.page.waitForLoadState('networkidle');
      assert.equal(await h.page.getByText('First description', { exact: true }).count(), 0);
    } finally { release(); await h.page.unroute(`**/api/jobs/${first._id}`); }
  });
  await t.test('Candidate permission loss immediately hides profile and forbids edit', async () => {
    await h.open('admin', `/app/recruitment/candidates/${other._id}`); await h.page.getByText('Other profile', { exact: true }).waitFor();
    const profile = await h.profile('admin'); profile.permissions = [];
    await h.page.evaluate(p => window.setTestUser(p), profile); await h.page.locator('[data-hr-state=forbidden]').waitFor();
    assert.equal(await h.page.getByText('Other profile', { exact: true }).count(), 0);
    await h.page.evaluate(id => window.navigateTest('/app/recruitment/candidates/' + id + '/edit'), String(other._id));
    await h.page.locator('[data-hr-state=forbidden]').waitFor(); assert.equal(await h.page.locator('form').count(), 0);
  });
  await t.test('application-only role sees redacted parents rather than dropped records', async () => {
    await h.models.Role.updateOne({ key: 'test_own' }, { $push: { permissions: { resource: 'application', action: 'read', scope: 'all' } } });
    await h.open('own', '/app/recruitment/applications'); await h.page.locator('tbody tr').filter({ hasText: '47' }).waitFor();
    assert.equal(await h.page.locator('tbody tr').count(), 2);
    assert.equal(await h.page.getByText('Ranked applicant', { exact: true }).count(), 0);
    assert.equal(await h.page.locator('tbody select').count(), 0);
    assert.equal((await Application.findById(app._id)).status, 'Applied');
  });
  await t.test('none scope is not a UI permission and unrelated create grant cannot expose Job edit', async () => {
    await h.open('admin', jobPath(second._id)); await h.page.getByText('Second description', { exact: true }).waitFor();
    const profile = await h.profile('admin'); profile.permissions = [{ resource: 'recruitment', action: 'read', scope: 'all' }, { resource: 'candidate', action: 'create', scope: 'all' }];
    await h.page.evaluate(p => window.setTestUser(p), profile); await h.page.getByText('Second description', { exact: true }).waitFor();
    assert.equal(await h.page.locator('button').filter({ hasText: /Edit|Redaktə|Редакт/ }).count(), 0);
    assert.equal(await h.page.evaluate(p => window.hasPermission(p, 'candidate', 'read'), { permissions: [{ resource: 'candidate', action: 'read', scope: 'none' }] }), false);
  });
  await t.test('CV A to B race applies only B; submit disabled while parsing and cancel clears pending', async () => {
    let release, entered; const gate = new Promise(r => release = r), started = new Promise(r => entered = r); let count = 0;
    await h.page.route('**/api/candidates/parse-cv', async r => {
      const sequence = ++count;
      if (sequence === 1) { entered(); await gate; }
      await r.fulfill({ contentType: 'application/json', body: JSON.stringify({ name: sequence === 1 ? 'Stale A' : 'Current B', role: 'Cashier', phone: '+994501234567', skills: [], languages: [], certificates: [] }) });
    });
    try {
      await h.open('admin', '/app/recruitment/candidates/new');
      await h.page.locator('input[type=file]').setInputFiles({ name: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nSynthetic A') }); await started;
      assert.equal(await h.page.locator('button[type=submit]').isDisabled(), true);
      await h.page.locator('input[type=file]').setInputFiles({ name: 'b.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nSynthetic B') });
      await h.page.waitForFunction(() => document.querySelector('input[name=name]')?.value === 'Current B'); release(); await h.page.waitForLoadState('networkidle');
      assert.equal(await h.page.locator('input[name=name]').inputValue(), 'Current B');
    } finally { release(); await h.page.unroute('**/api/candidates/parse-cv'); }
  });
  await t.test('removing a pending CV invalidates its late parse and preserves manual fields', async () => {
    let release, entered; const gate = new Promise(r => release = r), started = new Promise(r => entered = r);
    await h.page.route('**/api/candidates/parse-cv', async r => { entered(); await gate; await r.fulfill({ contentType: 'application/json', body: '{"name":"Removed stale CV","role":"Stale role"}' }); });
    try {
      await h.open('admin', '/app/recruitment/candidates/new'); await h.page.locator('input[name=name]').fill('Manual name');
      await h.page.locator('input[type=file]').setInputFiles({ name: 'cancel.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nSynthetic') }); await started;
      await h.page.locator('.candidate-cv-upload__remove').click(); release(); await h.page.waitForLoadState('networkidle');
      assert.equal(await h.page.locator('input[name=name]').inputValue(), 'Manual name');
      assert.equal(await h.page.locator('button[type=submit]').isDisabled(), false);
    } finally { release(); await h.page.unroute('**/api/candidates/parse-cv'); }
  });
  await t.test('late previous Candidate edit cannot replace a new Candidate edit', async () => {
    let release, entered; const gate = new Promise(r => release = r), started = new Promise(r => entered = r);
    await h.page.route(`**/api/candidates/${candidate._id}`, async r => { entered(); await gate; await r.fulfill({ contentType: 'application/json', body: JSON.stringify(candidate.toObject()) }); });
    try {
      await h.open('admin', `/app/recruitment/candidates/${candidate._id}/edit`); await started;
      await h.page.evaluate(id => window.navigateTest('/app/recruitment/candidates/' + id + '/edit'), String(other._id));
      await h.page.waitForFunction(() => document.querySelector('input[name=name]')?.value === 'Other profile'); release(); await h.page.waitForLoadState('networkidle');
      assert.equal(await h.page.locator('input[name=name]').inputValue(), 'Other profile');
    } finally { release(); await h.page.unroute(`**/api/candidates/${candidate._id}`); }
  });
  assert.deepEqual(h.pageErrors, []);
}));
