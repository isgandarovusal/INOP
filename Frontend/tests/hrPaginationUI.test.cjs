const test = require('node:test'), assert = require('node:assert/strict');
const { withBrowserFixture } = require('./helpers/browser.cjs');
const Job = require('../../Backend/models/job.model'), Candidate = require('../../Backend/models/candidate.model'), Application = require('../../Backend/models/application.model');
const harness = `import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';import {AuthContext} from '/src/Context/AuthContext.ts';import i18n from '/src/i18n/index.ts';import '/src/Styles/recruitment.css';import Jobs from '/src/Pages/Recruitment/Jobs/JobsList.tsx';import Candidates from '/src/Pages/Recruitment/Candidates/CandidatesList.tsx';import JobDetail from '/src/Pages/Recruitment/Jobs/JobDetail.tsx';import CandidateDetail from '/src/Pages/Recruitment/Candidates/CandidateDetail.tsx';import Apps from '/src/Pages/Recruitment/Applications/ApplicationsList.tsx';import {getJobPage} from '/src/Services/hrPageService.ts';window.getJobPage=getJobPage;import api from '/src/api/axios.ts';api.defaults.baseURL='/api';window.changeLanguage=l=>i18n.changeLanguage(l);function App(){window.navigateTest=useNavigate();const [user,setUser]=React.useState(window.testUser);window.setTestUser=setUser;return React.createElement(AuthContext.Provider,{value:{user,isLoading:false}},React.createElement(Routes,null,React.createElement(Route,{path:'/app/recruitment/jobs',element:React.createElement(Jobs)}),React.createElement(Route,{path:'/app/recruitment/jobs/:id',element:React.createElement(JobDetail)}),React.createElement(Route,{path:'/app/recruitment/candidates/:id',element:React.createElement(CandidateDetail)}),React.createElement(Route,{path:'/app/recruitment/candidates',element:React.createElement(Candidates)}),React.createElement(Route,{path:'/app/recruitment/applications',element:React.createElement(Apps)})));}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));`;
test('HR pages use bounded scoped server pages and cancellable filters', async t => withBrowserFixture(harness, async h => {
  const p={createdBy:h.actors.admin._id,assignedTo:h.actors.admin._id,departmentId:'dep_A'};
  const jobs=await Job.insertMany(Array.from({length:35},(_,i)=>({title:`Vacancy ${String(i).padStart(2,'0')}`,department:'HR',description:'Heavy text '.repeat(2000),requiredSkills:['Cash handling'],...p,createdAt:new Date(2026,0,i+1)})));
  const people=await Candidate.insertMany(jobs.map((_,i)=>({name:`Applicant ${String(i).padStart(2,'0')}`,role:'Cashier',skills:['Cash handling'],...p,createdAt:new Date(2026,0,i+1)})));
  await Application.insertMany(jobs.map((j,i)=>({jobId:j._id,candidateId:people[i]._id,...p,createdAt:new Date(2026,0,i+1)})));
  await t.test('first Jobs page renders thirty rows rather than the entire collection', async()=>{
    await h.open('admin','/app/recruitment/jobs');await h.page.getByText('Vacancy 34',{exact:true}).waitFor();assert.equal(await h.page.locator('tbody tr').count(),30);
  });
  if(process.env.INOP_BASELINE_ONLY)return;
  await t.test('next page, previous page and server total are accurate and bounded',async()=>{
    await h.page.getByRole('button',{name:'Növbəti',exact:true}).click();await h.page.getByText('Vacancy 04',{exact:true}).waitFor();assert.equal(await h.page.locator('tbody tr').count(),5);
    assert.match(await h.page.locator('[data-hr-pagination]').textContent(),/35/);assert.equal(await h.page.getByRole('button',{name:'Növbəti',exact:true}).isDisabled(),true);
    await h.page.getByRole('button',{name:'Əvvəlki',exact:true}).click();await h.page.getByText('Vacancy 34',{exact:true}).waitFor();assert.equal(await h.page.locator('tbody tr').count(),30);
  });
  await t.test('debounced search resets paging and uses one scoped server query',async()=>{
    await h.page.getByRole('button',{name:'Növbəti',exact:true}).click();await h.page.getByText('Vacancy 04',{exact:true}).waitFor();h.wire.length=0;
    const input=h.page.getByRole('searchbox');await input.fill('V');await input.fill('Vac');await input.fill('Vacancy 34');
    await h.page.getByText('Vacancy 34',{exact:true}).waitFor();assert.equal(await h.page.locator('tbody tr').count(),1);
    assert.equal(h.wire.filter(r=>r.path==='/api/hr/v2/jobs').length,1);assert.equal(await h.page.getByRole('button',{name:'Əvvəlki',exact:true}).isDisabled(),true);
  });
  for(const [kind,selector] of [['candidates','.hr-candidate-grid article'],['applications','tbody tr']])await t.test(`${kind} renders bounded pages without legacy arrays`,async()=>{
    h.wire.length=0;await h.open('admin','/app/recruitment/'+kind);await h.page.getByText('Applicant 34',{exact:true}).waitFor();assert.equal(await h.page.locator(selector).count(),30);
    assert.equal(h.wire.filter(r=>r.path==='/api/'+kind).length,0);assert.equal(h.wire.filter(r=>r.path==='/api/hr/v2/'+kind).length,1);
    await h.page.getByRole('button',{name:'Növbəti',exact:true}).click();await h.page.getByText('Applicant 04',{exact:true}).waitFor();assert.equal(await h.page.locator(selector).count(),5);
  });
  await t.test('three locales do not refetch a list; permission change masks data immediately',async()=>{
    await h.open('admin','/app/recruitment/candidates');await h.page.getByText('Applicant 34',{exact:true}).waitFor();const count=h.wire.length;
    for(const lang of ['en','ru','az'])await h.page.evaluate(l=>window.changeLanguage(l),lang);
    await h.page.waitForLoadState('networkidle');assert.equal(h.wire.length,count);
    const profile=await h.profile('admin');profile.permissions=[];await h.page.evaluate(p=>window.setTestUser(p),profile);
    await h.page.locator('[data-hr-state=forbidden]').waitFor();assert.equal(await h.page.getByText('Applicant 34',{exact:true}).count(),0);
  });
  for(const status of [401,403,404,500])await t.test(`list HTTP ${status} remains distinct and errors retain editable search`,async()=>{
    const pattern='**/api/hr/v2/jobs?*';await h.page.route(pattern,r=>r.fulfill({status,contentType:'application/json',body:'{"message":"Synthetic list failure"}'}));
    await h.open('admin','/app/recruitment/jobs');await h.page.locator(`[data-hr-state=${{401:'unauthenticated',403:'forbidden',404:'not-found',500:'server-error'}[status]}]`).waitFor();
    assert.equal(await h.page.locator('tbody tr').count(),0);if(status>=404)assert.equal(await h.page.getByRole('searchbox').isEnabled(),true);
    await h.page.unroute(pattern);
  });
  await t.test('invalid page envelopes reject visibly; retry keeps the filter',async()=>{
    const pattern='**/api/hr/v2/jobs?*';await h.page.route(pattern,r=>r.fulfill({contentType:'application/json',body:'[]'}));
    await h.open('admin','/app/recruitment/jobs');await h.page.locator('[data-hr-state=error]').waitFor();await h.page.getByRole('searchbox').fill('Vacancy 34');await h.page.waitForTimeout(300);
    await h.page.unroute(pattern);await h.page.locator('[data-hr-state] button').click();await h.page.getByText('Vacancy 34',{exact:true}).waitFor();assert.equal(await h.page.getByRole('searchbox').inputValue(),'Vacancy 34');assert.equal(await h.page.locator('tbody tr').count(),1);
  });
  await t.test('late search response cannot replace a newer filter result',async()=>{
    let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);const pattern='**/api/hr/v2/jobs?*';
    await h.page.route(pattern,async r=>{if(new URL(r.request().url()).searchParams.get('q')!=='Vacancy 00')return r.fallback();const data=await h.request('admin','GET','/hr/v2/jobs?q=Vacancy%2000&pageSize=30&page=1');entered();await gate;await r.fulfill({contentType:'application/json',body:JSON.stringify(data.data)});});
    try{await h.open('admin','/app/recruitment/jobs');await h.page.getByText('Vacancy 34',{exact:true}).waitFor();await h.page.getByRole('searchbox').fill('Vacancy 00');await started;await h.page.getByRole('searchbox').fill('Vacancy 34');await h.page.getByText('Vacancy 34',{exact:true}).waitFor();release();await h.page.waitForLoadState('networkidle');assert.equal(await h.page.getByText('Vacancy 00',{exact:true}).count(),0);}finally{release();await h.page.unroute(pattern);}
  });
  await t.test('delete failure keeps the primary list and is guarded against a later auth context',async()=>{
    const url='**/api/jobs/'+jobs[34]._id;await h.page.route(url,r=>r.fulfill({status:500,contentType:'application/json',body:'{"message":"Synthetic delete failure"}'}));
    try{await h.open('admin','/app/recruitment/jobs');const row=h.page.locator('tbody tr').filter({hasText:'Vacancy 34'});await row.locator('.icon-btn--danger').click();await h.page.getByRole('dialog').locator('.btn-danger-solid').click();await h.page.getByRole('alert').filter({hasText:require('../src/i18n/locales/az.json').hrErrors.server}).waitFor();assert.ok(!(await h.page.locator('body').innerText()).includes('Synthetic delete failure'));assert.equal(await h.page.locator('tbody tr').count(),30);assert.ok(await Job.exists({_id:jobs[34]._id}));await h.page.getByRole('dialog').locator('.btn-cancel').click();}finally{await h.page.unroute(url);}
    let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
    await h.page.route(url,async r=>{entered();await gate;await r.fulfill({status:500,contentType:'application/json',body:'{"message":"Old mutation must not appear"}'});});
    try{const row=h.page.locator('tbody tr').filter({hasText:'Vacancy 34'});await row.locator('.icon-btn--danger').click();await h.page.getByRole('dialog').locator('.btn-danger-solid').click();await started;const profile=await h.profile('admin');profile.permissions=[];await h.page.evaluate(p=>window.setTestUser(p),profile);await h.page.locator('[data-hr-state=forbidden]').waitFor();release();await h.page.waitForLoadState('networkidle');assert.equal(await h.page.getByRole('dialog').count(),0);assert.equal(await h.page.getByText('Old mutation must not appear',{exact:true}).count(),0);}finally{release();await h.page.unroute(url);}
  });
  await t.test('mobile list controls wrap and accessible pagination remains available',async()=>{
    await h.page.setViewportSize({width:390,height:844});await h.open('admin','/app/recruitment/candidates');await h.page.getByText('Applicant 34',{exact:true}).waitFor();assert.equal(await h.page.locator('[data-hr-pagination]').getByRole('button',{name:/^(Əvvəlki|Növbəti)$/}).count(),2);
    assert.ok(await h.page.evaluate(()=>document.querySelector('[data-hr-pagination]').getBoundingClientRect().right<=innerWidth));
  });

  await t.test('off-page Job and branch options are searchable without unbounded catalog requests', async()=>{
    const Branch=require('../../Backend/models/recruitmentBranch.model'),Brand=require('../../Backend/models/recruitmentBrand.model');
    const branch=await Branch.create({code:'outside-page',name:'Off-page location',brandId:'kfc',kind:'restaurant',...p});
    await Brand.create({_id:'future-brand',name:'Future brand'});
    await h.page.setViewportSize({width:1200,height:900});await h.open('admin','/app/recruitment/applications');await h.page.getByText('Applicant 34',{exact:true}).waitFor();
    assert.equal(await h.page.getByLabel('Vakansiya filtri',{exact:true}).locator('option[value="'+jobs[0]._id+'"]').count(),0);
    await h.page.locator('[data-hr-filters] > summary').click();h.wire.length=0;await h.page.locator('summary').filter({hasText:'Bütün icazəli filtr seçimlərində axtar'}).click();
    await h.page.getByRole('textbox',{name:'Vakansiya axtar',exact:true}).fill('Vacancy 00');await h.page.getByLabel('Vakansiya filtri',{exact:true}).locator('option[value="'+jobs[0]._id+'"]').waitFor({state:'attached'});
    const found = h.page.waitForResponse(r=>r.url().includes('/hr/v2/branches?')&&new URL(r.url()).searchParams.get('q')==='Off-page');await h.page.getByRole('textbox',{name:'Filial axtar',exact:true}).fill('Off-page');const result=await found;assert.equal(result.status(),200);assert.equal((await result.json()).items[0]._id,String(branch._id));await h.page.getByRole('combobox',{name:'Filial / iş yeri',exact:true}).locator('option[value="'+branch._id+'"]').waitFor({state:'attached'});
    await h.page.getByRole('textbox',{name:'Brend axtar',exact:true}).fill('Future');await h.page.getByLabel('Brend',{exact:true}).locator('option[value="future-brand"]').waitFor({state:'attached'});
    assert.equal(h.wire.filter(r=>['/api/jobs','/api/hr/brands','/api/hr/branches'].includes(r.path)).length,0);
    await h.page.getByLabel('Vakansiya filtri',{exact:true}).selectOption(String(jobs[0]._id));await h.page.getByText('Applicant 00',{exact:true}).waitFor();assert.equal(await h.page.locator('tbody tr').count(),1);
  });
  await t.test('Job detail and Candidate matches use independent contextual pages and searchable lookup',async()=>{
    const bigJob=await Job.create({title:'Many applications',description:'Primary is always visible',department:'HR',...p});
    await Application.insertMany(people.map(c=>({jobId:bigJob._id,candidateId:c._id,...p})));
    h.wire.length=0;await h.open('admin','/app/recruitment/jobs/'+bigJob._id);await h.page.locator('.ranking-row').first().waitFor();assert.equal(await h.page.locator('.ranking-row').count(),30);
    assert.equal(h.wire.filter(r=>['/api/applications','/api/candidates'].includes(r.path)).length,0);
    const page=h.page.locator('.ranking-list').locator('..').locator('[data-hr-pagination]');await page.getByRole('button',{name:'Növbəti',exact:true}).click();await h.page.waitForFunction(()=>document.querySelectorAll('.ranking-row').length===5);
    await h.page.getByRole('searchbox').fill('Applicant 34');await h.page.waitForResponse(r=>r.url().includes('/hr/v2/candidates?')&&new URL(r.url()).searchParams.get('q')==='Applicant 34');assert.equal(await h.page.locator('.detail-card select option').filter({hasText:'Applicant 34'}).count(),0,'Already linked Candidate excluded on server across all pages');
    h.wire.length=0;await h.open('admin','/app/recruitment/candidates/'+people[0]._id);await h.page.locator('[data-candidate-matches] article').first().waitFor();assert.equal(await h.page.locator('[data-candidate-matches] article').count(),2);assert.equal(h.wire.filter(r=>r.path==='/api/applications').length,0);
  });
  assert.deepEqual(h.pageErrors,[]);
}));
