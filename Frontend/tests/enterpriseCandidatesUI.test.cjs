const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const{withBrowserFixture}=require('./helpers/browser.cjs'),az=require('../src/i18n/locales/az.json');
const harness=()=>fs.readFile(path.join(__dirname,'hrNavigationPerformance.test.cjs'),'utf8').then(s=>s.match(/const harness=`([\s\S]*?)`;/)[1]);
test('Candidate premium counts, long text, sticky actions, grid permissions and real Excel export',async()=>withBrowserFixture(await harness(),async h=>{
 const c=(await h.request('admin','POST','/candidates',{name:'Synthetic Premium Candidate',role:'Long senior job title '.repeat(7),email:'long-synthetic-candidate-email@example.invalid',skills:['Cash handling','LongUnbrokenSkill'.repeat(7)],reviewedFields:['skills']})).data;
 const job=(await h.request('admin','POST','/jobs',{title:'Synthetic Premium Vacancy',department:'HR',description:'Synthetic vacancy for scoped UI validation',requiredSkills:['Cash handling']})).data;
 assert.ok(c._id);assert.ok(job._id);const app=(await h.request('admin','POST','/applications',{candidateId:c._id,jobId:job._id})).data;assert.ok(app._id);
 for(const width of [1440,768,390]){
  await h.page.setViewportSize({width,height:1000});await h.open('admin','/app/recruitment/candidates');await h.page.locator('.hr-candidates-table').waitFor();assert.equal(await h.page.locator('[data-candidate-total]').textContent(),'1');assert.equal(await h.page.locator('[data-candidate-shown]').textContent(),'1');
  assert.ok(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await h.page.locator('.hr-candidate-hero .page-header__subtitle').evaluate(e=>getComputedStyle(e).color),'rgb(196, 211, 235)');const region=h.page.locator('.admin-table-container');await region.evaluate(e=>e.scrollLeft=e.scrollWidth);
  assert.equal(await region.evaluate(e=>{const a=e.querySelector('tbody .hr-candidate-actions-cell').getBoundingClientRect(),s=e.querySelector('tbody td:nth-child(5)').getBoundingClientRect();return s.right<=a.left+1}),true);
  await h.page.getByRole('button',{name:az.hrArchive.archive+' '+c.name,exact:true}).focus();await h.page.keyboard.press('Enter');await h.page.getByRole('dialog').waitFor();await h.page.keyboard.press('Escape');await h.page.evaluate(()=>scrollTo(0,0));await fs.mkdir('/workspace/work/premium/screens',{recursive:true});await h.page.screenshot({path:`/workspace/work/premium/screens/candidates-${width}.png`,fullPage:true});
  await h.page.getByRole('button',{name:az.hrWorkflow.candidateCards,exact:true}).click();assert.equal(await h.page.locator('.hr-candidate-grid .hr-candidate-actions button').count(),2);await h.page.screenshot({path:`/workspace/work/premium/screens/candidate-grid-${width}.png`,fullPage:true});
  await h.open('admin','/app/recruitment/applications?view=board');await h.page.locator('[data-application-card]').waitFor();await h.page.screenshot({path:`/workspace/work/premium/screens/kanban-${width}.png`,fullPage:true});
 }
 await h.open('admin','/app/recruitment/candidates');await h.page.locator('.hr-candidates-table').waitFor();await h.page.locator('.hr-cell-disclosure summary').press('Enter');assert.equal(await h.page.locator('.hr-cell-disclosure').evaluate(e=>e.open),true);assert.ok(h.page.url().endsWith('/candidates'));
 const download=h.page.waitForEvent('download');await h.page.locator('.recruitment-action--export').click();const file=await download;const bytes=await fs.readFile(await file.path());assert.equal(bytes.subarray(0,2).toString(),'PK');
 await h.page.getByRole('searchbox').fill('No matching synthetic person');await h.page.locator('.empty-state').waitFor();assert.equal(await h.page.locator('[data-candidate-total]').textContent(),'0');await h.page.getByRole('button',{name:require('../src/i18n/locales/az.json').hrCandidateFilters.clear,exact:true}).click();await h.page.locator('.hr-candidates-table').waitFor();
 await h.page.evaluate(()=>window.setTestUser({...window.testUser,permissions:[{resource:'candidate',action:'read',scope:'all'},{resource:'recruitment',action:'read',scope:'all'}]}));await h.page.locator('.hr-candidates-table').waitFor();assert.equal(await h.page.getByRole('button',{name:az.hrArchive.archive+' '+c.name,exact:true}).count(),0);assert.equal(await h.page.getByRole('button',{name:az.common.actions.viewDetails+' '+c.name,exact:true}).count(),1);assert.deepEqual(h.pageErrors,[]);
}));

const filterShell=`import React from'react';import{createRoot}from'react-dom/client';import App from'/src/App.tsx';import api from'/src/api/axios.ts';import i18n from'/src/i18n/index.ts';api.defaults.baseURL='/api';window.navigateTest=()=>{};window.localeTest=l=>i18n.changeLanguage(l);createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(App)));`;
test('Structured Candidate filters remain scoped, responsive, paginated and request-bounded',async t=>withBrowserFixture(filterShell,async h=>{
 const Candidate=require('../../Backend/models/candidate.model');
 const a=(await h.request('admin','POST','/candidates',{name:'Synthetic Filter A',role:'Cashier',skills:['Cash handling','C++'],certificates:['HACCP','ISO 22000']})).data;
 await Candidate.create({name:'Synthetic Filter B',role:'Cashier',departmentId:'dep_hr',assignedTo:h.actors.own._id,skills:['Cash handling'],certificates:['HACCP'],reviewedFields:['skills','certificates']});
 await Candidate.create({name:'Synthetic Unreviewed',role:'Cashier',skills:['Cash handling','C++'],certificates:['HACCP','ISO 22000']});
 await Candidate.insertMany(Array.from({length:31},(_,i)=>({name:'Synthetic Page '+i,role:'Cook',skills:['Kitchen'],reviewedFields:['skills']})));
 const locales=Object.fromEntries(['az','en','ru'].map(l=>[l,require('../src/i18n/locales/'+l+'.json')]));
 let lang='az';const panel=h.page.locator('[data-candidate-filters]'),total=h.page.locator('[data-candidate-total]'),rows=[];
 h.page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))rows.push({method:r.method(),path:u.pathname,query:u.search});});
 const listRequests=()=>rows.filter(r=>r.path==='/api/hr/v2/candidates').length;
 const count=async n=>h.page.waitForFunction(n=>document.querySelector('[data-candidate-total]')?.textContent===String(n),n);
 const add=async(field,value)=>{const input=panel.getByRole('textbox',{name:locales[lang].hrCandidateFilters[field],exact:true});await input.fill(value);await input.press('Enter');};
 const mode=()=>panel.getByRole('combobox',{name:locales[lang].hrCandidateFilters.mode,exact:true});
 const clear=()=>h.page.getByRole('button',{name:locales[lang].hrCandidateFilters.clear,exact:true}).click();
 const capture=async(name,width)=>{if(!process.env.INOP_CANDIDATE_FILTER_SCREENSHOTS)return;await h.page.setViewportSize({width,height:1000});await h.page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0);});await fs.mkdir(process.env.INOP_CANDIDATE_FILTER_SCREENSHOTS,{recursive:true});await h.page.screenshot({animations:'disabled',path:path.join(process.env.INOP_CANDIDATE_FILTER_SCREENSHOTS,`${name}-${lang}-${width}.png`),fullPage:true});};
 await h.open('admin','/app/recruitment/candidates');await count(34);await h.page.waitForLoadState('networkidle');assert.equal(rows.length,2);
 await t.test('collapsed/expanded panel adds no requests; a committed skill resets page two to page one',async()=>{
  await capture('collapsed',1440);const before=listRequests();await panel.locator('summary').click();await panel.locator('summary').click();await panel.locator('summary').click();assert.equal(listRequests(),before);
  await h.page.locator('[data-hr-pagination]').getByRole('button',{name:locales.az.common.actions.next,exact:true}).click();await h.page.waitForFunction(()=>document.querySelector('[data-hr-pagination] [role=status]')?.textContent.includes('2'));
  await h.page.waitForLoadState('networkidle');const reads=listRequests();await add('skills','Cash handling');await count(2);assert.equal(listRequests(),reads+1);assert.equal(new URLSearchParams(rows.filter(r=>r.path==='/api/hr/v2/candidates').at(-1).query).get('page'),'1');
 });
 await t.test('AND/OR and combined certification predicates use server totals and exact labels',async()=>{
  await add('skills','C++');await count(1);await mode().selectOption('or');await count(2);await capture('or',1440);
  await add('certificates','HACCP');await count(2);await add('certificates','ISO 22000');await count(1);assert.ok(!(await h.page.locator('tbody').textContent()).includes('Synthetic Unreviewed'));
 });
 await t.test('AZ EN RU and four widths keep active chips, accessibility and no extra requests',async()=>{
  const before=listRequests();for(lang of ['az','en','ru']){await h.page.evaluate(l=>window.localeTest(l),lang);assert.ok((await panel.locator('summary').textContent()).includes('2'));
   for(const width of [1440,768,390,320]){await h.page.setViewportSize({width,height:1000});assert.equal(await h.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,lang+'/'+width);assert.ok((await panel.textContent()).includes(locales[lang].hrCandidateFilters.certHelp));if(width===320||lang==='az'&&width===1440||lang==='en'&&width===768||lang==='ru'&&width===390)await capture('combined',width);}
  }assert.equal(listRequests(),before);
 });
 await t.test('long chips, empty results, limits, clear-all and pending text reset stay bounded',async()=>{
  const long='LongSyntheticQualification'.repeat(4);await add('skills',long);await mode().selectOption('and');await count(0);await h.page.locator('.empty-state').waitFor();assert.equal(await h.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await capture('empty-long-chip',320);
  const before=listRequests();await add('skills','x'.repeat(121));await panel.getByRole('alert').waitFor();assert.equal(listRequests(),before);
  await h.page.getByRole('searchbox').fill('Synthetic');await h.page.waitForResponse(r=>r.url().includes('/hr/v2/candidates?')&&new URL(r.url()).searchParams.get('q')==='Synthetic');await h.page.waitForLoadState('networkidle');
  const reads=listRequests();await clear();await count(34);await h.page.waitForTimeout(350);assert.equal(listRequests(),reads+1);assert.equal(new URLSearchParams(rows.filter(r=>r.path==='/api/hr/v2/candidates').at(-1).query).get('page'),'1','Clear all must not resurrect an earlier page-two position');assert.equal(await panel.locator('.tag-chip').count(),0);assert.equal(await mode().inputValue(),'and');await capture('cleared',320);
 });
 await t.test('late old filtered response cannot replace a newer committed query',async()=>{
  if(await h.page.getByRole('button',{name:locales[lang].hrCandidateFilters.clear,exact:true}).count()){await clear();await count(34);await h.page.waitForLoadState('networkidle');}
  const pattern='**/api/hr/v2/candidates?*';let release,entered,done;const gate=new Promise(r=>release=r),seen=new Promise(r=>entered=r),settled=new Promise(r=>done=r);
  const old=await h.request('admin','GET','/hr/v2/candidates?skills='+encodeURIComponent(JSON.stringify(['Cash handling'])));
  await h.page.route(pattern,async route=>{const q=new URL(route.request().url()).searchParams;if(q.get('skills')===JSON.stringify(['Cash handling'])){entered();try{await gate;await route.fulfill({contentType:'application/json',body:old.buffer}).catch(()=>{});}finally{done();}}else await route.fallback();});
  try{await add('skills','Cash handling');await seen;await add('skills','C++');await count(1);release();await settled;await h.page.waitForLoadState('networkidle');await count(1);assert.ok((await h.page.locator('tbody').textContent()).includes(a.name));}finally{release();await h.page.unroute(pattern);}
 });
 await t.test('assigned Employee and read-only role cannot expose hidden matches or gain write controls',async()=>{
  await h.models.User.updateOne({_id:h.actors.own._id},{$set:{role:'recruitment_employee',departmentId:'dep_hr'}});lang='az';await h.open('own','/app/recruitment/candidates');await count(1);await panel.locator('summary').click();await add('skills','C++');await count(0);await capture('employee-empty',320);
  await h.models.Role.create({key:'candidate_filter_readonly',name:'Synthetic read only',permissions:[{resource:'candidate',action:'read',scope:'assigned'}]});await h.models.User.updateOne({_id:h.actors.own._id},{$set:{role:'candidate_filter_readonly'}});
  await h.open('own','/app/recruitment/candidates');await count(1);await panel.locator('summary').click();assert.equal(await h.page.getByRole('button',{name:locales.az.recruitment.candidates.newCandidate,exact:true}).count(),0);await capture('read-only',320);
  await h.models.Role.updateOne({key:'candidate_filter_readonly'},{$set:{permissions:[]}});await h.open('own','/app/recruitment/candidates');await h.page.locator('[data-hr-state=forbidden]').waitFor();assert.equal(await panel.count(),0);
 });
 assert.deepEqual(h.pageErrors,[]);assert.ok(rows.every(r=>r.method==='GET'),'Filtering must never write Candidate or ATS data');
}));
