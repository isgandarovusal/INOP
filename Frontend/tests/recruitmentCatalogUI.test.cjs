const test = require('node:test'), assert = require('node:assert/strict');
const { withBrowserFixture } = require('./helpers/browser.cjs');
const Job = require('../../Backend/models/job.model');
const harness = `import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';import {AuthContext} from '/src/Context/AuthContext.ts';import '/src/i18n/index.ts';import Form from '/src/Pages/Recruitment/Jobs/JobForm.tsx';import Jobs from '/src/Pages/Recruitment/Jobs/JobsList.tsx';import api from '/src/api/axios.ts';api.defaults.baseURL='/api';function App(){window.navigateTest=useNavigate();return React.createElement(AuthContext.Provider,{value:{user:window.testUser,isLoading:false}},React.createElement(Routes,null,React.createElement(Route,{path:'/app/recruitment/jobs/new',element:React.createElement(Form)}),React.createElement(Route,{path:'/app/recruitment/jobs/:id/edit',element:React.createElement(Form)}),React.createElement(Route,{path:'/app/recruitment/jobs',element:React.createElement(Jobs)})));}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));`;
test('Brand and workplace selectors persist create/edit and filter scoped vacancy cards', async t => withBrowserFixture(harness, async h => {
  const branch = (await h.request('admin', 'POST', '/hr/branches', { code: 'kfc-test', name: 'Test restaurant', brandId: 'kfc', kind: 'restaurant' })).data;
  let job;
  await t.test('all three brands are available; new vacancy stores selected brand and branch', async () => {
    await h.open('admin', '/app/recruitment/jobs/new'); await h.page.locator('#job-brand option[value="simit-sarayi"]').waitFor({ state: 'attached' });
    assert.deepEqual(await h.page.locator('#job-brand option').allTextContents(), ['Təyin edilməyib', 'KFC', 'Pizza Hut', 'Simit Sarayı']);
    await h.page.locator('#job-brand').selectOption('kfc'); await h.page.locator('#job-branch').selectOption(branch._id);
    await h.page.locator('input[name=position]').fill('KFC cashier'); await h.page.locator('textarea').fill('Customer service');
    await h.page.locator('button[type=submit]').click(); await h.page.waitForURL('**/app/recruitment/jobs');
    job = await Job.findOne({ title: 'KFC cashier' }); assert.equal(job.brandId, 'kfc'); assert.equal(String(job.branchId), branch._id);
  });
  await t.test('editing title retains brand and branch; changing brand explicitly clears old branch', async () => {
    await h.open('admin', `/app/recruitment/jobs/${job._id}/edit`); await h.page.locator('#job-branch').waitFor();
    assert.equal(await h.page.locator('#job-brand').inputValue(), 'kfc'); assert.equal(await h.page.locator('#job-branch').inputValue(), branch._id);
    await h.page.locator('input[name=position]').fill('Updated cashier'); await h.page.locator('button[type=submit]').click(); await h.page.waitForURL('**/app/recruitment/jobs');
    assert.equal(String((await Job.findById(job._id)).branchId), branch._id);
    await h.open('admin', `/app/recruitment/jobs/${job._id}/edit`); await h.page.locator('#job-brand option[value="pizza-hut"]').waitFor({ state: 'attached' });
    await h.page.locator('#job-brand').selectOption('pizza-hut'); assert.equal(await h.page.locator('#job-branch').inputValue(), '');
    await h.page.locator('button[type=submit]').click(); await h.page.waitForURL('**/app/recruitment/jobs');
    const current = await Job.findById(job._id); assert.equal(current.brandId, 'pizza-hut'); assert.equal(current.branchId, null);
  });
  await t.test('legacy jobs stay unspecified; brand filter shows only matching records', async () => {
    await Job.create({ title: 'Legacy office', department: 'Office', description: 'Legacy', createdBy: h.actors.admin._id });
    await h.open('admin', '/app/recruitment/jobs'); await h.page.getByText('Updated cashier', { exact: true }).waitFor();
    await h.page.locator('[data-hr-filters] > summary').click();await h.page.getByRole('combobox', { name: 'Brend', exact: true }).selectOption('pizza-hut');
    assert.equal(await h.page.getByText('Legacy office', { exact: true }).count(), 0);
    await h.page.getByRole('combobox', { name: 'Brend', exact: true }).selectOption('unset'); await h.page.getByText('Legacy office', { exact: true }).waitFor();
    assert.equal(await h.page.getByText('Updated cashier', { exact: true }).count(), 0);
  });
  await t.test('HR can add an office location without assigning a restaurant brand', async () => {
    await h.open('hr', '/app/recruitment/jobs/new'); await h.page.locator('#job-brand option[value=kfc]').waitFor({ state: 'attached' });
    await h.page.locator('summary').filter({ hasText: 'Filial əlavə et' }).click();
    await h.page.getByRole('textbox', { name: 'Filial kodu', exact: true }).fill('hr-office'); await h.page.getByRole('textbox', { name: 'Filial adı', exact: true }).fill('HR office');
    await h.page.getByRole('combobox', { name: 'İş yeri növü' }).selectOption('office'); await h.page.getByRole('button', { name: 'Filial əlavə et', exact: true }).click();
    await h.page.locator('#job-branch option').filter({ hasText: 'HR office' }).waitFor({ state: 'attached' });
    assert.equal(await h.page.locator('#job-brand').inputValue(), ''); assert.notEqual(await h.page.locator('#job-branch').inputValue(), '');
  });
  assert.deepEqual(h.pageErrors, []);
}));
