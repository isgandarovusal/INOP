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
    await h.page.locator('button.btn-primary[type=submit]').click(); await h.page.waitForURL('**/app/recruitment/jobs');
    job = await Job.findOne({ title: 'KFC cashier' }); assert.equal(job.brandId, 'kfc'); assert.equal(String(job.branchId), branch._id);
  });
  await t.test('editing title retains brand and branch; changing brand explicitly clears old branch', async () => {
    await h.open('admin', `/app/recruitment/jobs/${job._id}/edit`); await h.page.locator('#job-branch').waitFor();
    assert.equal(await h.page.locator('#job-brand').inputValue(), 'kfc'); assert.equal(await h.page.locator('#job-branch').inputValue(), branch._id);
    await h.page.locator('input[name=position]').fill('Updated cashier'); await h.page.locator('button.btn-primary[type=submit]').click(); await h.page.waitForURL('**/app/recruitment/jobs');
    assert.equal(String((await Job.findById(job._id)).branchId), branch._id);
    await h.open('admin', `/app/recruitment/jobs/${job._id}/edit`); await h.page.locator('#job-brand option[value="pizza-hut"]').waitFor({ state: 'attached' });
    await h.page.locator('#job-brand').selectOption('pizza-hut'); assert.equal(await h.page.locator('#job-branch').inputValue(), '');
    await h.page.locator('button.btn-primary[type=submit]').click(); await h.page.waitForURL('**/app/recruitment/jobs');
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

test('Job clear-all uses one effective scoped query instead of a stale debounced search',async t=>withBrowserFixture(harness,async h=>{
  await h.models.Role.create({key:'job_clear_reader',name:'Synthetic scoped job reader',permissions:[{resource:'recruitment',action:'read',scope:'assigned'}]});
  await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{role:'job_clear_reader',departmentId:'dep_hr'}});
  const visible={description:'Synthetic vacancy only',department:'HR',departmentId:'dep_hr',assignedTo:h.actors.peer._id};
  await Job.create({title:'Synthetic Alpha scope vacancy',status:'Open',...visible});
  await Job.create({title:'Synthetic Beta scope vacancy',status:'Closed',...visible});
  await Job.create({title:'Synthetic hidden scope vacancy',status:'Open',...visible,assignedTo:h.actors.admin._id});
  let requests=[];
  h.page.on('request',r=>{const url=new URL(r.url());if(url.pathname==='/api/hr/v2/jobs')requests.push({q:url.searchParams.get('q')||'',status:url.searchParams.get('status'),page:url.searchParams.get('page')});});
  const listResponse=predicate=>h.page.waitForResponse(r=>{const u=new URL(r.url());return u.pathname==='/api/hr/v2/jobs'&&predicate(u.searchParams)&&r.status()===200});
  for(const pending of [false,true])await t.test(pending?'clear cancels pending replacement search without transient queries':'clear settled search and status together without an intermediate request',async()=>{
    await h.open('peer','/app/recruitment/jobs');await h.page.getByText('Synthetic Beta scope vacancy',{exact:true}).waitFor();
    let response=listResponse(q=>q.get('status')==='Open');await h.page.locator('select').filter({has:h.page.locator('option[value="open"]')}).selectOption('open');await response;
    response=listResponse(q=>q.get('q')==='Alpha'&&q.get('status')==='Open');await h.page.getByRole('searchbox').fill('Alpha');await response;
    await h.page.getByText('Synthetic Alpha scope vacancy',{exact:true}).waitFor();
    if(pending)await h.page.getByRole('searchbox').fill('Beta');
    requests=[];response=listResponse(q=>!q.get('q')&&!q.get('status'));
    await h.page.getByRole('button',{name:require('../src/i18n/locales/az.json').common.actions.clear,exact:true}).and(h.page.locator('.btn-secondary')).click();await response;
    await h.page.getByText('Synthetic Beta scope vacancy',{exact:true}).waitFor();
    console.log(JSON.stringify({pendingSearch:pending,clearRequests:requests}));
    assert.deepEqual(requests,[{q:'',status:null,page:'1'}]);
    assert.equal(await h.page.getByRole('searchbox').inputValue(),'');
    assert.equal(await h.page.locator('tbody tr').count(),2);
    assert.equal(await h.page.getByText('Synthetic hidden scope vacancy',{exact:true}).count(),0);
    assert.equal(await h.page.locator('.icon-btn--danger').count(),0);
  });
  assert.deepEqual(h.pageErrors,[]);
}));
