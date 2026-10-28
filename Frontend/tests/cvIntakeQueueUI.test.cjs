const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const harness=`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';import {AuthContext} from '/src/Context/AuthContext.ts';import i18n from '/src/i18n/index.ts';import Queue from '/src/Pages/Recruitment/Candidates/CvIntakeQueue.tsx';import api from '/src/api/axios.ts';api.defaults.baseURL='/api';window.changeLanguage=l=>i18n.changeLanguage(l);function App(){const [user,setUser]=useState(window.testUser);window.changeUser=setUser;window.navigateTest=useNavigate();return React.createElement(AuthContext.Provider,{value:{user,isLoading:false}},React.createElement(Routes,null,React.createElement(Route,{path:'/queue',element:React.createElement(Queue)}),React.createElement(Route,{path:'/app/recruitment/candidates/new',element:React.createElement('p',{'data-resume-target':true},'Resume')})));}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));`;
const enabled={loadSource:id=>id.endsWith('/CvIntakeQueue.tsx')?fs.readFileSync(id,'utf8').replace(/import\.meta\.env\.VITE_HR_DURABLE_INTAKE_ENABLED\s*===\s*'true'/g,'true'):undefined};
const source=i=>({id:i.toString(16).padStart(24,'0'),taskVersion:'intake-rules-1',state:'ready',code:'INTAKE_REVIEW_REQUIRED',attempts:1,uploadAttempts:1,requiresApproval:true,evidenceMode:'test',updatedAt:'2026-10-11T00:00:00.000Z',original:{originalName:'Synthetic '+i+'.docx',size:100,sha256:'a'.repeat(64),mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}});
const payload=(items=[],page=1,total=items.length)=>({version:'hr-page-v1',items,page,pageSize:30,total,hasMore:page*30<total,nextCursor:null,evidenceMode:'test',summary:{filtered:true,pendingReview:total,recoveryPending:0,counts:{reserved:0,queued:0,running:0,retry:0,ready:total,blocked:0,quarantined:0,failed:0,cancelled:0}}});
test('Private source queue is bounded, metadata-only, current-scope and translates without refetch',async t=>withBrowserFixture(harness,async h=>{
 let requests=[],reply=()=>payload([source(1)]);
 await h.page.route('**/api/hr/cv-intake?*',async route=>{requests.push(new URL(route.request().url()));const result=await reply(route);if(result)await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});});
 await t.test('bounded metadata page, one StrictMode read, language changes zero reads and source resume never POSTs',async()=>{await h.open('admin','/queue');await h.page.locator('[data-source-id]').waitFor();await h.page.waitForLoadState('networkidle');assert.equal(h.wire.filter(r=>r.path==='/api/hr/v2/jobs').length,1);assert.equal(h.wire.filter(r=>r.path==='/api/hr/v2/brands').length,1);assert.equal(requests.length,1);assert.equal(requests[0].searchParams.get('pageSize'),'30');assert.equal(await h.page.locator('[data-source-summary]').count(),1);assert.ok((await h.page.locator('body').textContent()).includes('MOCK TEST'));const count=requests.length;for(const l of ['az','en','ru']){await h.page.evaluate(l=>window.changeLanguage(l),l);await h.page.waitForTimeout(30);assert.equal(requests.length,count);}await h.page.locator('[data-source-id] button:not([data-source-view])').click();await h.page.locator('[data-resume-target]').waitFor();assert.ok(h.page.url().endsWith('?intakeId='+source(1).id));assert.equal(h.wire.some(v=>v.method==='POST'),false);});
 await t.test('empty state, debounce one search, state filter and page reset',async()=>{reply=()=>payload();await h.open('admin','/queue');await h.page.locator('[data-source-summary]').waitFor();assert.equal(await h.page.locator('[data-source-id]').count(),0);const count=requests.length;await h.page.locator('input[type=search]').fill('abc');await h.page.waitForTimeout(80);assert.equal(requests.length,count);await h.page.waitForFunction(()=>document.querySelector('[data-hr-state]')===null);await h.page.waitForTimeout(300);assert.equal(requests.at(-1).searchParams.get('q'),'abc');assert.equal(requests.length,count+1);await h.page.locator('select').filter({has:h.page.locator('option[value=failed]')}).selectOption('failed');await h.page.waitForTimeout(100);assert.equal(requests.at(-1).searchParams.get('status'),'failed');assert.equal(requests.at(-1).searchParams.get('page'),'1');});
 await t.test('page controls request only next bounded page',async()=>{reply=r=>new URL(r.request().url()).searchParams.get('page')==='2'?payload([source(31)],2,31):payload(Array.from({length:30},(_,i)=>source(i+1)),1,31);await h.open('admin','/queue');await h.page.locator('[data-source-id]').first().waitFor();assert.equal(await h.page.locator('[data-source-id]').count(),30);await h.page.locator('[data-hr-pagination] button').last().click();await h.page.locator('[data-source-id="'+source(31).id+'"]').waitFor();assert.equal(await h.page.locator('[data-source-id]').count(),1);assert.equal(requests.at(-1).searchParams.get('page'),'2');});
 for(const [status,state]of [[401,'unauthenticated'],[403,'forbidden'],[404,'not-found'],[500,'server-error'],[503,'server-error']])await t.test(status+' uses distinct translated primary state and no raw message',async()=>{reply=async route=>{await route.fulfill({status,contentType:'application/json',body:JSON.stringify({message:'PRIVATE_PROVIDER_DETAIL'})});return null;};await h.open('admin','/queue');await h.page.locator('[data-hr-state="'+state+'"]').waitFor();assert.equal(await h.page.locator('[data-source-id]').count(),0);assert.ok(!(await h.page.locator('body').textContent()).includes('PRIVATE_PROVIDER_DETAIL'));});
 await t.test('private facts accidentally supplied by API are rejected, never rendered',async()=>{reply=()=>payload([{...source(1),result:{parsed:{name:'PRIVATE_PERSON'}}}]);await h.open('admin','/queue');await h.page.locator('[data-hr-state="error"]').waitFor();assert.ok(!(await h.page.locator('body').textContent()).includes('PRIVATE_PERSON'));});
 await t.test('permission loss removes prior data and denies resume; a late reply cannot restore it',async()=>{reply=()=>payload([source(1)]);await h.open('admin','/queue');await h.page.locator('[data-source-id]').waitFor();let release;reply=()=>new Promise(resolve=>{release=()=>resolve(payload([source(2)]));});await h.page.locator('.hr-list-controls button').click();await h.page.waitForTimeout(80);await h.page.evaluate(()=>window.changeUser({...window.testUser,permissions:[{resource:'candidate',action:'*',scope:'none'}]}));await h.page.locator('[data-hr-state="forbidden"]').waitFor();release?.();await h.page.waitForTimeout(100);assert.equal(await h.page.locator('[data-source-id]').count(),0);});
 for(const [catalog,status,state]of [['brands',503,'server-error'],['jobs',403,'forbidden']])await t.test(catalog+' outage keeps authorized metadata visible and retries only the failed catalog',async()=>{
  const pattern='**/api/hr/v2/'+catalog+'?*';reply=()=>payload([source(1)]);
  await h.page.route(pattern,r=>r.fulfill({status,contentType:'application/json',body:JSON.stringify({message:'PRIVATE_CATALOG_DETAIL'})}));
  try{
   await h.open('admin','/queue');await h.page.locator('[data-source-id]').waitFor();
   const error=h.page.locator('[data-intake-catalog-error="'+catalog+'"]');
   await error.locator('[data-hr-state="'+state+'"]').waitFor();
   assert.equal(await h.page.locator('[data-source-id]').count(),1);
   assert.ok(!(await h.page.locator('body').textContent()).includes('PRIVATE_CATALOG_DETAIL'));
   const count=requests.length;await h.page.unroute(pattern);
   await error.getByRole('button').click();await error.waitFor({state:'detached'});
   assert.equal(requests.length,count,'Catalog retry must not reload intake metadata');
   assert.equal(await h.page.locator('[data-source-id]').count(),1);
  }finally{await h.page.unroute(pattern);}
 });
 assert.deepEqual(h.pageErrors,[]);
},enabled));
test('Processing disabled leaves filters and scoped metadata readable without upload or false success',async()=>withBrowserFixture(harness,async h=>{
 let reads=0;await h.page.route('**/api/hr/cv-intake?*',route=>{reads++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload([source(1)]))});});
 await h.open('admin','/queue');await h.page.locator('[data-source-id]').waitFor();await h.page.locator('[data-intake-processing-disabled]').waitFor();
 assert.equal(reads,1);
 assert.equal(await h.page.locator('input[type=file]').count(),0);
 assert.equal(await h.page.locator('input[type=search]').count(),1);
 assert.equal(await h.page.locator('[data-source-id] button:not([data-source-view])').isDisabled(),true);
 assert.equal(h.wire.some(v=>v.method==='POST'),false);assert.deepEqual(h.pageErrors,[]);
}));

test('Intake vacancy lookup searches and pages one authorized catalog without losing selection or reloading metadata',async t=>withBrowserFixture(harness,async h=>{
 const Job=require('../../Backend/models/job.model');
 await h.models.Role.updateOne({key:'test_own'},{$set:{permissions:[{resource:'candidate',action:'read',scope:'own'},{resource:'recruitment',action:'read',scope:'own'}]}});
 const ownership={createdBy:h.actors.own._id,assignedTo:h.actors.own._id,departmentId:'dep_A'};
 const jobs=await Job.insertMany(Array.from({length:35},(_,i)=>({title:'Lookup vacancy '+String(i).padStart(2,'0'),department:'HR',description:'Synthetic',brandId:'kfc',status:'Open',createdAt:new Date(Date.UTC(2026,0,1,0,0,i)),...ownership})));
 const pizza=await Job.create({title:'Lookup Pizza vacancy',department:'HR',description:'Synthetic',brandId:'pizza-hut',...ownership});
 await Job.create({title:'FOREIGN_LOOKUP_SECRET',department:'HR',description:'Synthetic',brandId:'kfc',createdBy:h.actors.foreign._id,departmentId:'dep_B'});
 await Job.create({title:'Closed lookup vacancy',department:'HR',description:'Synthetic',brandId:'kfc',status:'Closed',...ownership});
 await Job.create({title:'Archived lookup vacancy',department:'HR',description:'Synthetic',brandId:'kfc',archivedAt:new Date(),...ownership});
 const requests=[];h.page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/hr/'))requests.push(u);});
 await h.page.route('**/api/hr/cv-intake?*',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(payload([source(1)]))}));
 const count=kind=>requests.filter(u=>u.pathname==='/api/hr/'+kind).length;
 const vacancy=h.page.locator('[data-intake-job-select]');
 const brand=h.page.locator('.hr-list-controls select').nth(1);
 const lookup=h.page.locator('[data-intake-job-lookup]'),search=lookup.locator('input');
 const change=async(action,predicate)=>{const [response]=await Promise.all([h.page.waitForResponse(r=>r.url().includes('/api/hr/v2/jobs?')&&predicate(new URL(r.url()))),action()]);assert.equal(response.status(),200);await h.page.waitForLoadState('networkidle');};
 await h.open('own','/queue');await h.page.locator('[data-source-summary]').waitFor();await h.page.waitForLoadState('networkidle');
 const initial=requests.length;assert.equal(initial,3);
 await t.test('the reused search endpoint preserves department/assigned/brand scopes and denies missing grants',async()=>{
  for(const scope of ['department','assigned'])await h.models.Role.updateOne({key:'test_'+scope},{$push:{permissions:{resource:'recruitment',action:'read',scope}}});
  await Job.updateOne({_id:jobs[10]._id},{$set:{assignedTo:h.actors.assigned._id}});
  const endpoint='/hr/v2/jobs?status=Open&q=Lookup%20vacancy&brandId=kfc&pageSize=30';
  const department=await h.request('department','GET',endpoint+'&page=2');assert.equal(department.status,200);assert.equal(department.data.total,35);assert.equal(department.data.items.length,5);
  const assigned=await h.request('assigned','GET',endpoint);assert.equal(assigned.status,200);assert.deepEqual(assigned.data.items.map(j=>j._id),[String(jobs[10]._id)]);
  assert.equal((await h.request('assigned','GET',endpoint.replace('brandId=kfc','brandId=pizza-hut'))).data.total,0);
  assert.equal((await h.request('none','GET',endpoint)).status,403);assert.equal((await h.request('anonymous','GET',endpoint)).status,401);
 });
 await t.test('initial page remains bounded and excludes foreign/closed/archived vacancies',async()=>{
  assert.equal(await vacancy.locator('option').count(),31);assert.equal(await vacancy.locator('option[value="'+jobs[0]._id+'"]').count(),0);
  assert.ok(!(await vacancy.textContent()).includes('FOREIGN_LOOKUP_SECRET'));assert.ok(!(await vacancy.textContent()).includes('Closed lookup'));assert.ok(!(await vacancy.textContent()).includes('Archived lookup'));
 });
 await t.test('opening lookup is request-free; one next-page request discovers the older vacancy',async()=>{
  await lookup.locator('summary').click();await h.page.waitForTimeout(50);assert.equal(requests.length,initial);
  const metadata=count('cv-intake');await change(()=>lookup.locator('[data-hr-pagination] button').last().click(),u=>u.searchParams.get('page')==='2');
  assert.equal(count('v2/jobs'),2);assert.equal(count('cv-intake'),metadata);
  assert.equal(await vacancy.locator('option[value="'+jobs[0]._id+'"]').count(),1);
 });
 await t.test('selection filters intake once, survives previous page and never duplicates its option',async()=>{
  const metadata=count('cv-intake'),catalog=count('v2/jobs'),response=h.page.waitForResponse(r=>r.url().includes('/hr/cv-intake?')&&new URL(r.url()).searchParams.get('jobId')===String(jobs[0]._id));
  await vacancy.selectOption(String(jobs[0]._id));assert.equal((await response).status(),200);await h.page.waitForLoadState('networkidle');
  assert.equal(count('cv-intake'),metadata+1);assert.equal(count('v2/jobs'),catalog);
  await change(()=>lookup.locator('[data-hr-pagination] button').first().click(),u=>u.searchParams.get('page')==='1');
  assert.equal(await vacancy.inputValue(),String(jobs[0]._id));assert.equal(await vacancy.locator('option:checked').textContent(),'Lookup vacancy 00');assert.equal(await vacancy.locator('option').count(),32);
 });
 await t.test('debounced server search resets catalog page, distinguishes empty and preserves selected label',async()=>{
  await change(()=>lookup.locator('[data-hr-pagination] button').last().click(),u=>u.searchParams.get('page')==='2');
  const catalog=count('v2/jobs'),metadata=count('cv-intake');
  await change(()=>search.fill('No synthetic match'),u=>u.searchParams.get('q')==='No synthetic match');
  assert.equal(requests.filter(u=>u.pathname.endsWith('/jobs')).at(-1).searchParams.get('page'),'1');assert.equal(count('v2/jobs'),catalog+1);assert.equal(count('cv-intake'),metadata);
  assert.equal(await vacancy.inputValue(),String(jobs[0]._id));assert.equal(await vacancy.locator('option:checked').textContent(),'Lookup vacancy 00');assert.equal(await lookup.locator('p[role=status]').count(),1);
  await change(()=>search.fill('Lookup vacancy 00'),u=>u.searchParams.get('q')==='Lookup vacancy 00');
  assert.equal(await vacancy.locator('option').count(),2);assert.equal(await vacancy.locator('option[value="'+jobs[0]._id+'"]').count(),1);
  assert.equal(await lookup.locator('p[role=status]').count(),0);
 });
 await t.test('late superseded search cannot replace current options or selected vacancy',async()=>{
  const old=await h.request('own','GET','/hr/v2/jobs?status=Open&q=Lookup%20vacancy%2001&pageSize=30');
  const pattern='**/api/hr/v2/jobs?*';let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
  await h.page.route(pattern,async r=>{if(new URL(r.request().url()).searchParams.get('q')!=='Lookup vacancy 01')return r.fallback();entered();await gate;await r.fulfill({contentType:'application/json',body:JSON.stringify(old.data)}).catch(()=>{});});
  try{await search.fill('Lookup vacancy 01');await started;await lookup.locator('[data-hr-state=loading]').waitFor();
   await change(()=>search.fill('Lookup vacancy 34'),u=>u.searchParams.get('q')==='Lookup vacancy 34');release();await h.page.waitForLoadState('networkidle');
   assert.equal(await vacancy.locator('option[value="'+jobs[1]._id+'"]').count(),0);assert.equal(await vacancy.locator('option[value="'+jobs[34]._id+'"]').count(),1);assert.equal(await vacancy.inputValue(),String(jobs[0]._id));
  }finally{release();await h.page.unroute(pattern);}
 });
 await t.test('catalog error/retry preserves metadata and selected vacancy, without an intake refetch',async()=>{
  const pattern='**/api/hr/v2/jobs?*';await h.page.route(pattern,r=>r.fulfill({status:503,contentType:'application/json',body:'{"message":"PRIVATE_LOOKUP_ERROR"}'}));
  try{await search.fill('Failure');const error=h.page.locator('[data-intake-catalog-error=jobs]');await error.locator('[data-hr-state=server-error]').waitFor();
   assert.equal(await h.page.locator('[data-source-id]').count(),1);assert.equal(await vacancy.inputValue(),String(jobs[0]._id));assert.equal(await vacancy.isDisabled(),true);assert.ok(!(await h.page.locator('body').textContent()).includes('PRIVATE_LOOKUP_ERROR'));
   const metadata=count('cv-intake');await h.page.unroute(pattern);await change(()=>error.getByRole('button').click(),u=>u.searchParams.get('q')==='Failure');await error.waitFor({state:'detached'});assert.equal(count('cv-intake'),metadata);
  }finally{await h.page.unroute(pattern);}
 });
 await t.test('brand change clears selected vacancy and scopes the same bounded lookup',async()=>{
  await change(()=>search.fill(''),u=>!u.searchParams.has('q'));
  await change(()=>brand.selectOption('pizza-hut'),u=>u.searchParams.get('brandId')==='pizza-hut');
  assert.equal(await vacancy.inputValue(),'');assert.equal(await vacancy.locator('option').count(),2);assert.equal(await vacancy.locator('option[value="'+pizza._id+'"]').count(),1);
  assert.equal(requests.filter(u=>u.pathname.endsWith('/cv-intake')).at(-1).searchParams.has('jobId'),false);
 });
 await t.test('locale, focus and idle do not refetch; narrowing authority removes selected labels',async()=>{
  const selected=h.page.waitForResponse(r=>r.url().includes('/hr/cv-intake?')&&new URL(r.url()).searchParams.get('jobId')===String(pizza._id));
  await vacancy.selectOption(String(pizza._id));assert.equal((await selected).status(),200);await h.page.waitForLoadState('networkidle');
  const count=requests.length;await search.focus();
  for(const l of ['az','en','ru'])await h.page.evaluate(l=>window.changeLanguage(l),l);
  await h.page.waitForTimeout(31000);assert.equal(requests.length,count,JSON.stringify(requests.slice(count).map(u=>u.pathname+u.search)));assert.equal(await search.evaluate(e=>document.activeElement===e),true);assert.equal(await vacancy.inputValue(),String(pizza._id));
  await h.page.evaluate(()=>window.changeUser({...window.testUser,permissions:[{resource:'candidate',action:'read',scope:'own'}]}));
  await lookup.waitFor({state:'detached'});assert.ok(!(await h.page.locator('body').textContent()).includes('Lookup Pizza vacancy'));
 });
 assert.ok(requests.filter(u=>u.pathname.endsWith('/jobs')).every(u=>u.searchParams.get('pageSize')==='30'&&u.searchParams.get('status')==='Open'));
 assert.deepEqual(h.pageErrors,[]);
}));
