const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const{withBrowserFixture}=require('./helpers/browser.cjs'),az=require('../src/i18n/locales/az.json');
const harness=()=>fs.readFile(path.join(__dirname,'hrNavigationPerformance.test.cjs'),'utf8').then(s=>s.match(/const harness=`([\s\S]*?)`;/)[1]);
test('Candidate premium counts, long text, sticky actions, grid permissions and real Excel export',async()=>withBrowserFixture(await harness(),async h=>{
 const screenshotDir=process.env.INOP_PREMIUM_SCREENSHOT_DIR||'/workspace/work/premium/screens';
 const c=(await h.request('admin','POST','/candidates',{name:'Synthetic Premium Candidate',role:'Long senior job title '.repeat(7),email:'long-synthetic-candidate-email@example.invalid',skills:['Cash handling','LongUnbrokenSkill'.repeat(7)],reviewedFields:['skills']})).data;
 const job=(await h.request('admin','POST','/jobs',{title:'Synthetic Premium Vacancy',department:'HR',description:'Synthetic vacancy for scoped UI validation',requiredSkills:['Cash handling']})).data;
 assert.ok(c._id);assert.ok(job._id);const app=(await h.request('admin','POST','/applications',{candidateId:c._id,jobId:job._id})).data;assert.ok(app._id);
 for(const width of [1440,768,390]){
  await h.page.setViewportSize({width,height:1000});await h.open('admin','/app/recruitment/candidates');await h.page.locator('.hr-candidates-table').waitFor();assert.equal(await h.page.locator('[data-candidate-total]').textContent(),'1');assert.equal(await h.page.locator('[data-candidate-shown]').textContent(),'1');
  assert.ok(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await h.page.locator('.hr-candidate-hero .page-header__subtitle').evaluate(e=>getComputedStyle(e).color),'rgb(196, 211, 235)');const region=h.page.locator('.admin-table-container');await region.evaluate(e=>e.scrollLeft=e.scrollWidth);
  assert.equal(await region.evaluate(e=>{const a=e.querySelector('tbody .hr-candidate-actions-cell').getBoundingClientRect(),s=e.querySelector('tbody td:nth-child(5)').getBoundingClientRect();return s.right<=a.left+1}),true);
  await h.page.getByRole('button',{name:az.hrArchive.archive+' '+c.name,exact:true}).focus();await h.page.keyboard.press('Enter');await h.page.getByRole('dialog').waitFor();await h.page.keyboard.press('Escape');await h.page.evaluate(()=>scrollTo(0,0));await fs.mkdir(screenshotDir,{recursive:true});await h.page.screenshot({path:path.join(screenshotDir,`candidates-${width}.png`),fullPage:true});
  await h.page.getByRole('button',{name:az.hrWorkflow.candidateCards,exact:true}).click();assert.equal(await h.page.locator('.hr-candidate-grid .hr-candidate-actions button').count(),2);await h.page.screenshot({path:path.join(screenshotDir,`candidate-grid-${width}.png`),fullPage:true});
  await h.open('admin','/app/recruitment/applications?view=board');await h.page.locator('[data-application-card]').waitFor();await h.page.screenshot({path:path.join(screenshotDir,`kanban-${width}.png`),fullPage:true});
 }
 await h.open('admin','/app/recruitment/candidates');await h.page.locator('.hr-candidates-table').waitFor();await h.page.locator('tbody td:nth-child(2) .hr-cell-disclosure summary').press('Enter');assert.equal(await h.page.locator('tbody td:nth-child(2) .hr-cell-disclosure').evaluate(e=>e.open),true);assert.ok(h.page.url().endsWith('/candidates'));
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

test('Candidate skill-mode changes respect the combined UTF-8 filter budget',async t=>withBrowserFixture(filterShell,async h=>{
 const Candidate=require('../../Backend/models/candidate.model');
 const skills=Array.from({length:5},(_,i)=>'S'+i+'Ж'.repeat(i===0?97:100));
 const certificates=Array.from({length:5},(_,i)=>'C'+i+'Ж'.repeat(100));
 const bytes=mode=>Buffer.byteLength(JSON.stringify(skills)+JSON.stringify(certificates)+mode,'utf8');
 assert.equal(bytes('or'),2048);assert.equal(bytes('and'),2049);
 await h.models.Role.create({key:'filter_budget_reader',name:'Synthetic scoped reader',permissions:[{resource:'candidate',action:'read',scope:'assigned'}]});
 await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{role:'filter_budget_reader',departmentId:'dep_hr'}});
 const values={role:'Cashier',skills,certificates,reviewedFields:['skills','certificates'],departmentId:'dep_hr'};
 await Candidate.create({name:'Synthetic UTF8 budget candidate',assignedTo:h.actors.peer._id,...values});
 await Candidate.create({name:'Synthetic hidden UTF8 candidate',assignedTo:h.actors.admin._id,...values});
 const queries=[],responses=[];h.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/api/hr/v2/candidates')queries.push(u.searchParams)});h.page.on('response',r=>{if(new URL(r.url()).pathname==='/api/hr/v2/candidates')responses.push(r.status())});
 const done=predicate=>h.page.waitForResponse(r=>{const u=new URL(r.url());return u.pathname==='/api/hr/v2/candidates'&&r.status()===200&&predicate(u.searchParams)});
 const panel=h.page.locator('[data-candidate-filters]'),locales=Object.fromEntries(['az','en','ru'].map(l=>[l,require('../src/i18n/locales/'+l+'.json')]));
 await h.open('peer','/app/recruitment/candidates');await h.page.locator('.hr-candidates-table').waitFor();await panel.locator('summary').click();
 const add=async(field,value)=>{const input=panel.getByRole('textbox',{name:locales.az.hrCandidateFilters[field],exact:true});const response=done(q=>JSON.parse(q.get(field)||'[]').includes(value));await input.fill(value);await input.press('Enter');await response;};
 await add('skills',skills[0]);let pending=done(q=>q.get('skillsMode')==='or');await panel.getByRole('combobox').selectOption('or');await pending;
 for(const value of skills.slice(1))await add('skills',value);for(const value of certificates)await add('certificates',value);
 await t.test('oversized AND keeps the last valid OR query, scoped results and localized guidance',async()=>{
   const reads=queries.length;await panel.getByRole('combobox').selectOption('and');
   if(await panel.getByRole('combobox').inputValue()==='and'){
     await h.page.locator('[data-hr-state=error]').waitFor();console.log(JSON.stringify({orBytes:bytes('or'),andBytes:bytes('and'),oversizedResponse:responses.at(-1)}));
   }
   assert.equal(await panel.getByRole('combobox').inputValue(),'or');await panel.getByRole('alert').waitFor();assert.equal(queries.length,reads);assert.ok(responses.every(status=>status===200));
   for(const [width,lang] of [[1440,'az'],[768,'en'],[390,'ru'],[320,'az']]){
     await h.page.setViewportSize({width,height:1000});await h.page.evaluate(l=>window.localeTest(l),lang);assert.ok((await panel.getByRole('alert').textContent()).includes(locales[lang].hrCandidateFilters.limit));assert.ok(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
     if(process.env.INOP_FILTER_BUDGET_SCREENSHOTS){await h.page.evaluate(()=>{document.activeElement?.blur();scrollTo({top:0,behavior:'instant'});});await h.page.waitForFunction(()=>scrollY===0);await fs.mkdir(process.env.INOP_FILTER_BUDGET_SCREENSHOTS,{recursive:true});await h.page.screenshot({path:path.join(process.env.INOP_FILTER_BUDGET_SCREENSHOTS,`budget-${width}-${lang}.png`),fullPage:true,animations:'disabled'});}
   }
   assert.equal(queries.length,reads);assert.equal(await h.page.locator('[data-candidate-total]').textContent(),'1');assert.equal(await h.page.getByText('Synthetic hidden UTF8 candidate',{exact:true}).count(),0);
 });
 await t.test('removing a label allows AND again with one valid request and unchanged Candidate values',async()=>{
   await h.page.evaluate(()=>window.localeTest('az'));pending=done(q=>JSON.parse(q.get('skills')||'[]').length===4);await panel.locator('.tag-chip button').first().click();await pending;
   if(await panel.getByRole('combobox').inputValue()!=='or'){pending=done(q=>q.get('skillsMode')==='or');await panel.getByRole('combobox').selectOption('or');await pending;}
   const was=queries.length;pending=done(q=>q.get('skillsMode')==='and');await panel.getByRole('combobox').selectOption('and');await pending;
   assert.equal(queries.length,was+1);assert.equal(await panel.getByRole('alert').count(),0);assert.equal(await panel.getByRole('combobox').inputValue(),'and');
   const stored=await Candidate.findOne({name:'Synthetic UTF8 budget candidate'}).lean();assert.deepEqual(stored.skills,skills);assert.deepEqual(stored.certificates,certificates);assert.equal(await h.page.getByText('Synthetic hidden UTF8 candidate',{exact:true}).count(),0);
 });
 await t.test('certification-only payload uses the exact budget without charging absent skills or mode',async()=>{
   let response=done(q=>!q.has('skills')&&!q.has('certificates'));await h.page.getByRole('button',{name:locales.az.hrCandidateFilters.clear,exact:true}).click();await response;
   const only=Array.from({length:10},(_,i)=>i===0?'C'+'Ж'.repeat(99):'C'+i+'Ж'.repeat(100));assert.equal(Buffer.byteLength(JSON.stringify(only)),2048);
   const input=panel.getByRole('textbox',{name:locales.az.hrCandidateFilters.certificates,exact:true});
   for(const [index,value] of only.entries()){
     if(index<9)response=done(q=>JSON.parse(q.get('certificates')||'[]').includes(value));
     await input.fill(value);await input.press('Enter');if(index<9)await response;
   }
   assert.equal(await panel.locator('.tag-chip').count(),10);await h.page.waitForLoadState('networkidle');
   assert.equal(await panel.getByRole('alert').count(),0);assert.equal(Buffer.byteLength(queries.at(-1).get('certificates')),2048);assert.equal(queries.at(-1).has('skillsMode'),false);assert.equal(queries.at(-1).has('skills'),false);assert.ok(responses.every(code=>code===200));
 });
 assert.deepEqual(h.pageErrors,[]);
}));

test('Candidate table keeps its existing readable minimum width within a scoped scroll region',async()=>withBrowserFixture(filterShell,async h=>{
 const Candidate=require('../../Backend/models/candidate.model');
 await h.models.Role.create({key:'table_geometry_reader',name:'Synthetic scoped reader',permissions:[{resource:'candidate',action:'read',scope:'assigned'}]});
 await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{role:'table_geometry_reader',departmentId:'dep_hr'}});
 const values={role:'Cashier',skills:['A'+'Ж'.repeat(100),'B'+'Ж'.repeat(100),'C'+'Ж'.repeat(100)],reviewedFields:['skills'],departmentId:'dep_hr'};
 await Candidate.create({name:'Synthetic readable candidate',assignedTo:h.actors.peer._id,...values});await Candidate.create({name:'Synthetic hidden candidate',assignedTo:h.actors.admin._id,...values});
 await h.open('peer','/app/recruitment/candidates');await h.page.locator('.hr-candidates-table').waitFor();const reads=h.wire.length,measurements=[];
 for(const width of [1440,768,390,320]){
   await h.page.setViewportSize({width,height:1000});const table=h.page.locator('.hr-candidates-table'),region=h.page.locator('.admin-table-container');
   measurements.push({viewport:width,minWidth:await table.evaluate(e=>getComputedStyle(e).minWidth),tableWidth:await table.evaluate(e=>e.getBoundingClientRect().width)});
   assert.ok(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await region.evaluate(e=>e.scrollLeft=e.scrollWidth);
   assert.equal(await region.evaluate(e=>{const a=e.querySelector('.hr-candidate-actions-cell').getBoundingClientRect(),s=e.querySelector('tbody td:nth-child(5)').getBoundingClientRect();return s.right<=a.left+1}),true);
   assert.equal(await h.page.getByText('Synthetic hidden candidate',{exact:true}).count(),0);
   if(process.env.INOP_CANDIDATE_TABLE_SCREENSHOTS){await region.evaluate(e=>e.scrollLeft=0);await h.page.evaluate(()=>{document.activeElement?.blur();scrollTo({top:0,behavior:'instant'});});await fs.mkdir(process.env.INOP_CANDIDATE_TABLE_SCREENSHOTS,{recursive:true});await h.page.screenshot({path:path.join(process.env.INOP_CANDIDATE_TABLE_SCREENSHOTS,`table-${width}.png`),fullPage:true,animations:'disabled'});}
 }
 console.log(JSON.stringify({candidateTableGeometry:measurements,resizeApiRequests:h.wire.length-reads}));assert.equal(h.wire.length,reads);
 assert.ok(measurements.every(m=>m.minWidth==='860px'&&m.tableWidth>=860),'Recruitment generic table rules must not override the existing Candidate-specific 860px minimum');assert.deepEqual(h.pageErrors,[]);
}));

test('Long Candidate skill previews stay compact with keyboard-readable full text and no extra reads',async t=>withBrowserFixture(filterShell,async h=>{
 const Candidate=require('../../Backend/models/candidate.model');
 const skills=['A'+'Ж'.repeat(100),'Synthetic professional qualification '.repeat(3),'C'+'Ж'.repeat(100)],name='Synthetic compact candidate';
 await h.models.Role.create({key:'skills_preview_reader',name:'Synthetic scoped reader',permissions:[{resource:'candidate',action:'read',scope:'assigned'}]});
 await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{role:'skills_preview_reader',departmentId:'dep_hr'}});
 await Candidate.create({name,role:'Cashier',skills,reviewedFields:['skills'],departmentId:'dep_hr',assignedTo:h.actors.peer._id});
 await Candidate.create({name:'Synthetic short skills',role:'Cashier',skills:['Cash handling','Food safety'],departmentId:'dep_hr',assignedTo:h.actors.peer._id});
 await Candidate.create({name:'Synthetic hidden skills',role:'Cashier',skills:['Hidden qualification'],departmentId:'dep_hr',assignedTo:h.actors.admin._id});
 await h.open('peer','/app/recruitment/candidates');const row=()=>h.page.locator('tbody tr').filter({hasText:name});await row().waitFor();
 const baselineReads=h.wire.length,heights=[],preview=()=>row().locator('[data-candidate-skills-preview]');
 await t.test('closed long-skill rows fit a small part of the viewport while short chips stay unchanged',async()=>{
   for(const width of [1440,768,390,320]){await h.page.setViewportSize({width,height:1000});heights.push({width,height:await row().evaluate(e=>e.getBoundingClientRect().height)});assert.ok(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
   console.log(JSON.stringify({closedSkillRowHeights:heights}));assert.ok(heights.every(r=>r.height<=300),'Collapsed skill previews must not create 500–1000px rows');
   const short=h.page.locator('tbody tr').filter({hasText:'Synthetic short skills'});assert.equal(await short.locator('[data-candidate-skills-preview]').count(),0);assert.deepEqual(await short.locator('td:nth-child(4) .tag-chip').allTextContents(),['Cash handling','Food safety']);
 });
 await t.test('native disclosure reveals exact existing values without navigating or requesting data',async()=>{
   await h.page.setViewportSize({width:1440,height:1000});assert.equal(await preview().count(),1);const summary=preview().locator('summary');await summary.focus();await summary.press('Enter');
   assert.equal(await preview().evaluate(e=>e.open),true);assert.equal(await summary.textContent(),skills.join(' · '));assert.ok((await summary.ariaSnapshot()).includes('Synthetic professional qualification'));assert.equal(await preview().locator('p').count(),0);assert.ok(h.page.url().endsWith('/app/recruitment/candidates'));
   if(process.env.INOP_CANDIDATE_SKILL_SCREENSHOTS){await fs.mkdir(process.env.INOP_CANDIDATE_SKILL_SCREENSHOTS,{recursive:true});await h.page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await h.page.screenshot({path:path.join(process.env.INOP_CANDIDATE_SKILL_SCREENSHOTS,'skills-open-1440.png'),fullPage:true,animations:'disabled'});}
   await summary.press('Space');assert.equal(await preview().evaluate(e=>e.open),false);assert.equal(h.wire.length,baselineReads);
 });
 await t.test('localized responsive read-only previews preserve scope, records and request counts',async()=>{
   for(const [width,lang] of [[1440,'az'],[768,'en'],[390,'ru'],[320,'az']]){
     await h.page.setViewportSize({width,height:1000});await h.page.evaluate(l=>window.localeTest(l),lang);
     assert.equal(await h.page.locator('tbody tr').count(),2);assert.equal(await h.page.getByText('Synthetic hidden skills',{exact:true}).count(),0);assert.equal(await row().locator('.hr-candidate-actions button').count(),1);assert.ok(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
     if(process.env.INOP_CANDIDATE_SKILL_SCREENSHOTS){await h.page.locator('.admin-table-container').evaluate(e=>e.scrollLeft=0);await h.page.evaluate(()=>{document.activeElement?.blur();scrollTo({top:0,behavior:'instant'});});await h.page.screenshot({path:path.join(process.env.INOP_CANDIDATE_SKILL_SCREENSHOTS,`skills-closed-${width}-${lang}.png`),fullPage:true,animations:'disabled'});}
   }
   assert.equal(h.wire.length,baselineReads);const stored=await Candidate.findOne({name}).lean();assert.deepEqual(stored.skills,skills);
   await h.models.Role.updateOne({key:'skills_preview_reader'},{$set:{permissions:[]}});await h.open('peer','/app/recruitment/candidates');await h.page.locator('[data-hr-state=forbidden]').waitFor();assert.equal(await h.page.locator('[data-candidate-skills-preview]').count(),0);
 });
 assert.deepEqual(h.pageErrors,[]);
}));
