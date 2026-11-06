const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const shell=`import React from'react';import{createRoot}from'react-dom/client';import App from'/src/App.tsx';import api from'/src/api/axios.ts';import i18n from'/src/i18n/index.ts';api.defaults.baseURL='/api';window.localeTest=l=>i18n.changeLanguage(l);createRoot(document.getElementById('root')).render(React.createElement(App));`;
const overlay={loadSource:id=>id.endsWith('/src/App.tsx')?fs.readFileSync(id,'utf8').replace('const router = createBrowserRouter(ROUTES);','const router = createBrowserRouter(ROUTES);window.navigateTest=to=>router.navigate(to);'):undefined};
test('Recruiter can compare vacancy evidence and open a scoped work queue',{timeout:120000},async t=>withBrowserFixture(shell,async h=>{
 const p=h.page,j=(await h.request('admin','POST','/jobs',{title:'Product acceptance vacancy',department:'HR',description:'Synthetic workflow',requiredSkills:['HACCP'],requiredCertificates:['Food safety certificate'],experienceYears:2})).data;
 const apps=[];for(const [name,skills] of [['Synthetic A',['HACCP']],['Synthetic B',['Food safety']],['Synthetic C',[]],['Synthetic D',[]]]){const c=(await h.request('admin','POST','/candidates',{name,role:'Cashier',skills,certificates:name==='Synthetic A'?['Food safety certificate']:[],experience:1})).data;const a=(await h.request('admin','POST','/applications',{candidateId:c._id,jobId:j._id})).data;apps.push(a);}
 await h.open('admin','/app/recruitment/jobs/'+j._id);await p.locator('[data-application-score]').first().waitFor();
 await p.evaluate(()=>window.localeTest('en'));
 const comparison=p.getByRole('region',{name:'Compare candidates'});
 await t.test('explicit comparison loads only selected full evidence, with unknowns and no hiring override',async()=>{
  await comparison.waitFor();const before=h.wire.filter(r=>/^\/api\/applications\/[^/]+$/.test(r.path)&&r.method==='GET').length;
  assert.equal(before,0,'Selection alone must not fetch full evidence');await comparison.getByRole('checkbox',{name:'Synthetic A',exact:true}).focus();await comparison.getByRole('checkbox',{name:'Synthetic A',exact:true}).press('Space');assert.equal(await comparison.getByRole('button',{name:'Compare selected',exact:true}).isEnabled(),false);
  await comparison.getByRole('checkbox',{name:'Synthetic B',exact:true}).check();await comparison.getByRole('button',{name:'Compare selected',exact:true}).click();await comparison.getByRole('article',{name:'Synthetic B',exact:true}).waitFor();
  assert.equal(h.wire.filter(r=>/^\/api\/applications\/[^/]+$/.test(r.path)&&r.method==='GET').length-before,2);
  assert.match(await comparison.getByRole('article',{name:'Synthetic A',exact:true}).textContent(),/haccp/i);assert.match(await comparison.getByRole('article',{name:'Synthetic A',exact:true}).textContent(),/food safety certificate/i);assert.match(await comparison.getByRole('article',{name:'Synthetic B',exact:true}).textContent(),/Missing criteria: haccp/i);
  await comparison.getByRole('checkbox',{name:'Synthetic C',exact:true}).check();assert.equal(await comparison.getByRole('checkbox',{name:'Synthetic D',exact:true}).isDisabled(),true);
  await comparison.getByRole('button',{name:'Compare selected',exact:true}).click();await comparison.getByRole('article',{name:'Synthetic C',exact:true}).waitFor();assert.match(await comparison.getByRole('article',{name:'Synthetic C',exact:true}).textContent(),/Unknown/i);
 });
 const out=process.env.INOP_QA_SCREENSHOTS;if(out)fs.mkdirSync(out,{recursive:true});
 await t.test('real accessible snapshots, AZ/EN/RU and responsive comparison; no viewport/locale fetches',async()=>{
  const before=h.wire.length;
  for(const [width,lang,title]of [[1440,'en','Compare candidates'],[768,'az','Namizədləri müqayisə et'],[390,'ru','Сравнить кандидатов'],[320,'az','Namizədləri müqayisə et']]){
   await p.setViewportSize({width,height:950});await p.evaluate(l=>window.localeTest(l),lang);const card=p.getByRole('region',{name:title});await card.waitFor();await p.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
   if(width===320)assert.ok(await p.locator('.ranking-row__info').first().evaluate(el=>el.getBoundingClientRect().width>=120),'Ranking candidate identity must remain readable at 320px');
   const snapshot=await card.ariaSnapshot();assert.match(snapshot,/checkbox.*checked/);assert.match(snapshot,/article/);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   if(out)await p.screenshot({path:path.join(out,'comparison-'+lang+'-'+width+'.png'),fullPage:true});
  }
  assert.equal(h.wire.length,before);
 });
 await t.test('focus reauthorization hides stale comparison on denial and explicit retry recovers',async()=>{
  await p.evaluate(()=>window.localeTest('en'));await p.route('**/api/applications/'+apps[0]._id,r=>r.fulfill({status:404,contentType:'application/json',body:'{"message":"Synthetic revoked scope"}'}));
  const denied=p.waitForResponse(r=>r.url().endsWith('/applications/'+apps[0]._id)&&r.status()===404);await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await denied;await comparison.locator('[role=alert]').waitFor();assert.equal(await comparison.getByRole('article').count(),0);
  await p.unroute('**/api/applications/'+apps[0]._id);await comparison.getByRole('button',{name:/retry|try again/i}).click();await comparison.getByRole('article',{name:'Synthetic A',exact:true}).waitFor();
 });
 await t.test('human next-action persistence, History and overdue queue completion work end to end',async()=>{
  await p.evaluate(()=>window.localeTest('en'));await comparison.getByRole('article',{name:'Synthetic A',exact:true}).getByRole('link',{name:'Open application',exact:true}).click();await p.locator('[data-application-workflow]').waitFor();
  await p.getByRole('combobox',{name:'Next action',exact:true}).selectOption('follow_up');await p.getByLabel('Due time (in selected timezone)',{exact:true}).fill('2026-01-02T10:30');await p.getByLabel('Next-action notes',{exact:true}).fill('Synthetic callback task');await p.getByLabel('HR notes',{exact:true}).fill('Synthetic preserved recruiter note');
  const saved=p.waitForResponse(r=>r.request().method()==='PATCH'&&r.url().includes('/applications/'));await p.locator('[data-application-workflow] button[type=submit]').click();assert.equal((await saved).status(),200);
  const Application=require('../../Backend/models/application.model');let row=await Application.findById(apps[0]._id).lean();assert.equal(row.nextAction.kind,'follow_up');assert.equal(row.notes,'Synthetic preserved recruiter note');
  await p.evaluate(()=>window.navigateTest('/app/recruitment/applications'));await p.getByRole('combobox',{name:'Work queue',exact:true}).waitFor();await p.getByRole('combobox',{name:'Work queue',exact:true}).selectOption('overdue');await p.waitForResponse(r=>r.url().includes('attention=overdue')&&r.status()===200);await p.getByText('Synthetic A',{exact:true}).waitFor();assert.equal(await p.getByText('Synthetic B',{exact:true}).count(),0);
  if(out)await p.screenshot({path:path.join(out,'queue-en-320.png'),fullPage:true});
  await p.getByRole('button',{name:'Open application',exact:true}).click();await p.locator('[data-application-workflow]').waitFor();assert.equal(await p.getByLabel('Next-action notes',{exact:true}).inputValue(),'Synthetic callback task');await p.getByRole('combobox',{name:'Next action',exact:true}).selectOption('none');
  const completed=p.waitForResponse(r=>r.request().method()==='PATCH'&&r.url().includes('/applications/'));await p.locator('[data-application-workflow] button[type=submit]').click();assert.equal((await completed).status(),200);
  row=await Application.findById(apps[0]._id).lean();assert.equal(row.nextAction.kind,'none');assert.equal(row.notes,'Synthetic preserved recruiter note');
  const history=await h.request('admin','GET','/applications/'+apps[0]._id+'/history');assert.ok(history.data.items.some(e=>e.after?.nextAction?.kind==='none'));
  await p.evaluate(()=>window.navigateTest('/app/recruitment/applications?attention=overdue'));await p.locator('[data-hr-state=loading]').waitFor({state:'hidden'});await p.getByRole('combobox',{name:'Work queue'}).waitFor();await p.waitForFunction(()=>!document.querySelector('[data-hr-state=loading]'));assert.equal(await p.getByText('Synthetic A',{exact:true}).count(),0);
 });
 await t.test('analytics drill-through opens the live authorized interview queue without loading operations',async()=>{
  await p.evaluate(()=>window.navigateTest('/app/recruitment/analytics'));const link=p.getByRole('link',{name:'Upcoming interviews',exact:true});await link.waitFor();
  assert.equal(h.wire.filter(r=>r.path.includes('/analytics/operations')).length,0);await link.click();await p.getByRole('combobox',{name:'Work queue',exact:true}).waitFor();assert.equal(await p.getByRole('combobox',{name:'Work queue',exact:true}).inputValue(),'interviews');
 });
 await t.test('actual vacancy form creates a draft then publishes an edit with fractional experience intact',async()=>{
  await p.evaluate(()=>window.navigateTest('/app/recruitment/jobs/new'));await p.locator('#job-position').waitFor();await p.locator('#job-position').fill('Synthetic operational draft');await p.locator('#job-experience').fill('0.5');await p.locator('#job-department').fill('HR');await p.locator('#job-location').fill('Baku');await p.locator('#job-description').fill('Synthetic daily-workflow acceptance');await p.locator('#job-status').selectOption('draft');
  const created=p.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/jobs');await p.locator('.job-form-page button[type=submit]').click();const response=await created;assert.equal(response.status(),201);const job=await response.json();assert.equal(job.status,'Draft');assert.equal(job.experienceYears,0.5);
  await p.waitForURL('**/app/recruitment/jobs');await p.evaluate(id=>window.navigateTest('/app/recruitment/jobs/'+id+'/edit'),job._id);await p.locator('#job-position').waitFor();assert.equal(await p.locator('#job-experience').inputValue(),'0.5');await p.locator('#job-status').selectOption('open');
  const saved=p.waitForResponse(r=>r.request().method()==='PUT'&&new URL(r.url()).pathname==='/api/jobs/'+job._id);await p.locator('.job-form-page button[type=submit]').click();assert.equal((await saved).status(),200);const row=await require('../../Backend/models/job.model').findById(job._id).lean();assert.equal(row.status,'Open');assert.equal(row.experienceYears,0.5);await p.waitForURL('**/app/recruitment/jobs');
 });
 await t.test('personal work queue distinguishes assigned work from the wider readable cohort',async()=>{
  await require('../../Backend/models/application.model').updateOne({_id:apps[1]._id},{$set:{assignedTo:h.actors.peer._id,nextAction:{kind:'call',dueAt:new Date('2026-01-02T06:30:00Z'),notes:''}}});
  await p.evaluate(()=>window.navigateTest('/app/recruitment/applications?attention=overdue'));await p.getByText('Synthetic B',{exact:true}).waitFor();
  const filtered=p.waitForResponse(r=>r.url().includes('assignee=me')&&r.status()===200);await p.getByRole('combobox',{name:'Work queue',exact:true}).selectOption('my-overdue');await filtered;await p.waitForFunction(()=>!document.querySelector('[data-hr-state=loading]'));assert.equal(await p.getByText('Synthetic B',{exact:true}).count(),0);
 });
 await t.test('read-only handoff never grants comparison parent access or mutation controls',async()=>{
  await h.models.User.updateOne({_id:h.actors.assigned._id},{$set:{departmentId:'dep_hr',role:'recruitment_employee'}});
  await require('../../Backend/models/job.model').updateOne({_id:j._id},{$set:{departmentId:'dep_hr'}});
  await require('../../Backend/models/candidate.model').updateMany({},{$set:{departmentId:'dep_hr'}});
  const Application=require('../../Backend/models/application.model');await Application.updateMany({_id:{$in:apps.slice(0,2).map(a=>a._id)}},{$set:{assignedTo:h.actors.assigned._id,departmentId:'dep_hr'}});
  await h.models.Role.updateOne({key:'recruitment_employee'},{permissions:[{resource:'application',action:'read',scope:'assigned'},{resource:'recruitment',action:'read',scope:'all'}]});
  await h.open('assigned','/app/recruitment/jobs/'+j._id);await p.evaluate(()=>window.localeTest('en'));await p.locator('[data-application-score]').first().waitFor();assert.equal(await p.getByRole('region',{name:'Compare candidates'}).count(),0,'No comparison is advertised without independent readable Candidate parents');
  const detail=await h.request('assigned','GET','/applications/'+apps[0]._id);assert.equal(detail.status,200);assert.equal(detail.data.candidateId,null);assert.ok(detail.data.handoffContext);assert.equal((await h.request('assigned','GET','/applications/'+apps[2]._id)).status,404);
  await p.evaluate(id=>window.navigateTest('/app/recruitment/applications/'+id),apps[0]._id);await p.locator('[data-application-handoff]').waitFor();assert.equal(await p.locator('[data-application-workflow]').count(),0);
 });
 assert.deepEqual(h.pageErrors,[]);
},overlay));
