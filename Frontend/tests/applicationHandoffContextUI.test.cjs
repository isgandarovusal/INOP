const test=require('node:test'),assert=require('node:assert/strict');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const Job=require('../../Backend/models/job.model'),Candidate=require('../../Backend/models/candidate.model'),Application=require('../../Backend/models/application.model');
const {calculateApplicationMatch}=require('../../Backend/services/applicationMatch.service');
const shell=`import React from'react';import{createRoot}from'react-dom/client';import App from'/src/App.tsx';import api from'/src/api/axios.ts';import i18n from'/src/i18n/index.ts';api.defaults.baseURL='/api';window.navigateTest=()=>{};window.localeTest=l=>i18n.changeLanguage(l);createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(App)));`;
test('Application-only handoff context is read-only, private, responsive and revoked without losing a permitted hiring draft',async t=>withBrowserFixture(shell,async h=>{
 for(const [a,role]of [['own','recruitment_employee'],['peer','recruitment_employee'],['department','recruitment_manager']])await h.models.User.updateOne({_id:h.actors[a]._id},{$set:{role,departmentId:'dep_hr'}});
 const fields={departmentId:'dep_hr',createdBy:h.actors.admin._id,assignedTo:h.actors.admin._id};
 const j=await Job.create({...fields,title:'Synthetic Context Vacancy',department:'HR',description:'PRIVATE_RAW_TEXT',brandId:'kfc',requiredSkills:['Cash handling']}),c=await Candidate.create({...fields,name:'Synthetic Context Person',role:'Cashier',email:'ctx@example.invalid',phone:'+994500000000',skills:['Cash handling'],experience:2});
 const make=async(job=j)=>{const matching=calculateApplicationMatch(job,c,{application:{jobId:job._id,candidateId:c._id}});return Application.create({...fields,assignedTo:h.actors.own._id,jobId:job._id,candidateId:c._id,matching,score:matching.score,scoreStatus:matching.scoreStatus});};
 const app=await make(),j2=await Job.create({...fields,title:'Second synthetic vacancy',department:'HR',description:'Synthetic',requiredSkills:['Cash handling']}),other=await make(j2);
 const url=id=>'/app/recruitment/applications/'+id,panel=h.page.locator('[data-application-handoff]'),form=h.page.locator('[data-application-workflow]'),rows=[];
 h.page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))rows.push({method:r.method(),path:u.pathname});});
 async function open(actor,id=app._id){const start=rows.length;await h.open(actor,url(id));await form.waitFor();await h.page.waitForLoadState('networkidle');return rows.slice(start);}
 await t.test('one detail read, approved contacts/professional facts, no profile/edit/file/recalculate links or extra explanation request',async()=>{
  const requests=await open('own');await panel.waitFor();assert.equal(requests.filter(r=>r.path==='/api/applications/'+app._id).length,1);assert.equal(requests.length,4);
  assert.ok((await panel.textContent()).includes(c.name));assert.ok((await panel.textContent()).includes(c.email));assert.ok((await panel.textContent()).includes(c.phone));assert.ok((await panel.textContent()).includes(j.title));assert.ok(!(await panel.textContent()).includes('PRIVATE_RAW_TEXT'));
  assert.equal(await panel.locator('a,button,input,textarea').count(),0);assert.equal(await h.page.locator('a[href*="/candidates/"],a[href*="/jobs/"]').count(),0);
  const count=rows.length;await panel.locator('details summary').click();assert.ok((await panel.textContent()).includes('Cash handling'));await h.page.waitForLoadState('networkidle');assert.equal(rows.length,count);assert.equal(await panel.locator('[data-application-score] strong').textContent(),'100%');
 });
 await t.test('AZ/EN/RU x 1440/768/390/320 keeps one workflow, a typed draft and no extra requests',async()=>{
  const field=form.locator('textarea').last();await field.fill('Retained private hiring draft');const before=rows.length;
  for(const lang of ['az','en','ru']){await h.page.evaluate(l=>window.localeTest(l),lang);for(const width of [1440,768,390,320]){await h.page.setViewportSize({width,height:1000});await h.page.evaluate(()=>document.fonts.ready);assert.equal(await h.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,lang+'/'+width);assert.equal(await panel.isVisible(),true);assert.equal(await form.count(),1);assert.equal(await field.inputValue(),'Retained private hiring draft');if(process.env.INOP_MATCH_SCREENSHOTS&&[1440,320].includes(width)){await h.page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});require('node:fs').mkdirSync(process.env.INOP_MATCH_SCREENSHOTS,{recursive:true});await h.page.screenshot({animations:'disabled',path:require('node:path').join(process.env.INOP_MATCH_SCREENSHOTS,`handoff-${lang}-${width}.png`),fullPage:true});}}}
  assert.equal(rows.length,before);
 });
 await t.test('focus/reload hides sensitive old context during pending verification, preserves workflow element/draft and restores once',async()=>{
  const pattern='**/api/applications/'+app._id;let release,entered,settled;const gate=new Promise(r=>release=r),seen=new Promise(r=>entered=r),done=new Promise(r=>settled=r);
  await h.page.route(pattern,async route=>{entered();try{await gate;await route.fallback();}finally{settled();}});
  const node=await form.elementHandle(),count=rows.filter(r=>r.path==='/api/applications/'+app._id).length;
  try{await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await seen;await h.page.locator('[data-handoff-refreshing]').waitFor();assert.equal(await panel.count(),0);assert.ok(!(await h.page.locator('body').textContent()).includes(c.email));assert.ok(!(await h.page.locator('body').textContent()).includes(c.name));assert.equal(await node.evaluate(e=>e.isConnected),true);assert.equal(await form.locator('textarea').last().inputValue(),'Retained private hiring draft');release();await done;await panel.waitFor();await h.page.waitForLoadState('networkidle');assert.equal(await form.locator('textarea').last().inputValue(),'Retained private hiring draft');assert.equal(rows.filter(r=>r.path==='/api/applications/'+app._id).length,count+1);}finally{release();await done;await h.page.unroute(pattern);}
 });
 await t.test('31-second idle adds no requests',async()=>{const count=rows.length;await h.page.waitForTimeout(31000);assert.equal(rows.length,count);});
 await t.test('late old route response cannot restore context after navigation',async()=>{
  const stale=await h.request('own','GET','/applications/'+app._id),pattern='**/api/applications/'+app._id;let release,entered,settled;const gate=new Promise(r=>release=r),seen=new Promise(r=>entered=r),done=new Promise(r=>settled=r);
  await h.page.route(pattern,async route=>{entered();try{await gate;await route.fulfill({contentType:'application/json',body:stale.buffer}).catch(()=>{});}finally{settled();}});
  try{await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await seen;await h.page.locator('.hr-application-detail .page-header a[href="/app/recruitment/applications"]').click();await h.page.waitForURL('**/app/recruitment/applications');await h.page.locator('.recruitment-list-page').waitFor();release();await done;assert.equal(await panel.count(),0);assert.equal(await form.count(),0);}finally{release();await done;await h.page.unroute(pattern);}
  await open('own',other._id);await panel.waitFor();assert.equal(await form.locator('textarea').last().inputValue(),'');
 });
 await t.test('Admin and Manager retain ordinary parent links; non-assignee and foreign department have no context',async()=>{
  for(const a of ['admin','department']){await open(a);assert.equal(await panel.count(),0);assert.equal(await h.page.locator('a[href="/app/recruitment/candidates/'+c._id+'"]').count(),1);}
  await h.open('peer',url(app._id));await h.page.locator('[data-hr-state=not-found]').waitFor();assert.equal(await panel.count(),0);
  await Application.updateOne({_id:app._id},{$set:{departmentId:'other'}});await open('own');assert.equal(await panel.count(),0);await Application.updateOne({_id:app._id},{$set:{departmentId:'dep_hr'}});
 });
 for(const status of [401,403,404])await t.test(status+' clears the handoff panel',async()=>{
  const pattern='**/api/applications/'+app._id;await h.page.route(pattern,r=>r.fulfill({status,contentType:'application/json',body:'{}'}));
  try{await h.open('own',url(app._id));if(status===401){await h.page.waitForURL('**/login');await h.page.locator('#email').waitFor();}else await h.page.locator('[data-hr-state="'+(status===403?'forbidden':'not-found')+'"]').waitFor();assert.equal(await panel.count(),0);assert.ok(!(await h.page.locator('body').textContent()).includes(c.email));}finally{await h.page.unroute(pattern);}
 });
 await t.test('forbidden fields or wrong binding in context fail closed, not normalized as parent resources',async()=>{
  const pattern='**/api/applications/'+app._id,r=await h.request('own','GET','/applications/'+app._id);assert.equal(r.status,200);
  for(const mutate of [x=>{x.handoffContext.candidate.cvUrl='PRIVATE_LEAK';},x=>{x.handoffContext.applicationId=String(other._id);},x=>{x.handoffContext.matching.jobHash='PRIVATE_LEAK';},x=>{x._id=String(other._id);x.handoffContext.applicationId=String(other._id);}]){
   const body=structuredClone(r.data);mutate(body);await h.page.route(pattern,q=>q.fulfill({contentType:'application/json',body:JSON.stringify(body)}));try{await h.open('own',url(app._id));await h.page.locator('[data-hr-state=error]').waitFor();assert.equal(await panel.count(),0);assert.ok(!(await h.page.locator('body').textContent()).includes('PRIVATE_LEAK'));}finally{await h.page.unroute(pattern);}
  }
 });
 await t.test('reassignment revokes current open context on revalidation',async()=>{
  await open('own');await panel.waitFor();const row=await Application.findById(app._id).lean();assert.equal((await h.request('admin','PATCH','/applications/'+app._id+'/assignment',{assignedTo:String(h.actors.peer._id),reason:'Synthetic handoff revocation',expectedRevision:row.__v})).status,200);
  await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await h.page.locator('[data-hr-state=not-found]').waitFor();assert.equal(await panel.count(),0);assert.ok(!(await h.page.locator('body').textContent()).includes(c.email));
 });
 assert.deepEqual(h.pageErrors,[]);assert.equal(rows.some(r=>r.method==='POST'||r.method==='PATCH'||r.method==='PUT'),false,'Browser context must issue no mutation');
}));
