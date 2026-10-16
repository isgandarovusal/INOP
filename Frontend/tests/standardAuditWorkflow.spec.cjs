const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{withBrowserFixture}=require('./helpers/browser.cjs');
const standard=require('../../Backend/services/standardAuditAssessment.service');
const harness=`import React from 'react';import{createRoot}from'react-dom/client';import{createBrowserRouter,RouterProvider}from'react-router-dom';import{AuthContext}from'/src/Context/AuthContext.ts';import'/src/i18n/index.ts';import i18n from '/src/i18n/index.ts';import'/src/App.css';import ROUTES from'/src/Routes/Routes.tsx';import api from'/src/api/axios.ts';api.defaults.baseURL='/api';const router=createBrowserRouter(ROUTES);window.navigateTest=to=>router.navigate(to);window.localeTest=lang=>i18n.changeLanguage(lang);createRoot(document.getElementById('root')).render(React.createElement(AuthContext.Provider,{value:{user:window.testUser,isLoading:false,logout:async()=>{},login:async()=>{}}},React.createElement(React.Suspense,null,React.createElement(RouterProvider,{router}))));`;
test('Standard real API/forms: every brand, AZ/EN/RU, responsive catalog, draft/resume and canonical completion',{timeout:240000},async()=>withBrowserFixture(harness,async h=>{
 const Restaurant=require('../../Backend/models/restaurant.model'),executions={};const output='/tmp/inop-standard-p05-screens';fs.mkdirSync(output,{recursive:true});
 for(const source of standard.sources){await h.request('admin','POST',`/audit-standard/templates/${source.brandId}`,{});const restaurantId=`ui-std-${source.brandId}`;await Restaurant.create({id:restaurantId,name:`Synthetic ${source.brandName}`,organizationId:'gfc',brandId:source.brandId});const created=await h.request('admin','POST','/audit-standard/audits',{brandId:source.brandId,restaurantId,date:'2026-10-16'});assert.equal(created.status,201);const start=await h.request('admin','POST','/audit-execution',{auditId:created.data.data._id});assert.equal(start.status,201);executions[source.brandId]=start.data.data;}
 const{page}=h;const checks=[];
 for(const width of [1440,768,390,320])for(const lang of ['az','en','ru'])for(const brand of ['kfc','pizza-hut','simit-sarayi']){
  await page.setViewportSize({width,height:1000});await h.open('admin',`/app/audit/execution/${executions[brand]._id}`);await page.locator('.audit-hr-question').first().waitFor();await page.evaluate(lang=>window.localeTest(lang),lang);
  const count=standard.sourceFor(brand).sections.reduce((n,s)=>n+s.questions.length,0);assert.equal(await page.locator('.audit-hr-question').count(),count);assert.equal(await page.locator('.audit-hr-final-evidence input[type=file]').count(),4);
  const options=await page.locator('.audit-hr-question select').first().locator('option').evaluateAll(options=>options.map(o=>o.value));assert.deepEqual(options,['','critical','major','minor','compliant','na']);
  const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,smallButtons:[...document.querySelectorAll('.audit-hr-page button')].filter(e=>e.getBoundingClientRect().height>0&&e.getBoundingClientRect().height<43).length}));assert.equal(geometry.overflow,false,`${brand}/${lang}/${width}`);assert.equal(geometry.smallButtons,0);checks.push({brand,lang,width,...geometry});await page.screenshot({path:path.join(output,`${brand}-${lang}-${width}.png`),fullPage:false});
 }
 const e=executions['simit-sarayi'];await h.open('admin',`/app/audit/execution/${e._id}`);await page.locator('.audit-hr-question').first().waitFor();await page.evaluate(()=>window.localeTest('en'));
 const first=page.locator('.audit-hr-question').first();await first.locator('select').first().selectOption('compliant');await first.locator('textarea').first().fill('Synthetic saved browser note');const savedResponse=page.waitForResponse(r=>r.url().endsWith('/standard-draft')&&r.status()===200);await page.getByRole('button',{name:'Save draft',exact:true}).click();await savedResponse;
 await h.open('admin',`/app/audit/execution/${e._id}`);await page.locator('.audit-hr-question').first().waitFor();await page.evaluate(()=>window.localeTest('en'));assert.equal(await page.locator('.audit-hr-question select').first().inputValue(),'compliant');assert.equal(await page.locator('.audit-hr-question textarea').first().inputValue(),'Synthetic saved browser note');
 for(let i=1;i<71;i++){const q=page.locator('.audit-hr-question').nth(i);await q.locator('select').first().selectOption(i===1?'major':'na');if(i===1)await q.locator('textarea').first().fill('Synthetic nonconformity description');else await q.getByLabel('N/A reason and applicability basis',{exact:true}).fill('Synthetic objective absence');}
 await page.getByRole('button',{name:'Complete form',exact:true}).click();await page.getByRole('dialog').waitFor();const submittedResponse=page.waitForResponse(r=>r.url().endsWith('/submit')&&r.request().method()==='PUT');await page.getByRole('dialog').getByRole('button',{name:'Complete form',exact:true}).click();assert.equal((await submittedResponse).status(),200);await page.waitForFunction(()=>!document.querySelector('form button[type="submit"]'));
 const stored=(await h.request('admin','GET',`/audit-execution/${e._id}`)).data.data;assert.equal(stored.overallPercentage,50);assert.equal(stored.standardAssessment.na,69);assert.equal(stored.standardAssessment.major,1);
 for(const width of [1440,768,390,320])for(const suffix of ['standard','standard/new','standard/analytics']){await page.setViewportSize({width,height:1000});await h.open('admin',`/app/audit/${suffix}`);await page.locator('[data-audit-direction="standard"]').waitFor();await page.waitForFunction(()=>!document.querySelector('[data-audit-state="loading"]'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(output,`${suffix.replace('/','-')}-${width}.png`),fullPage:false});}
 assert.deepEqual(h.pageErrors,[]);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checks,pageErrors:h.pageErrors},null,2));console.log('Standard matrix: 36 brand/locale/viewport forms + 12 list/create/analytics checks');
}));

test('Four audit creation routes use actual auth and never expose other directions or brands',{timeout:120000},async()=>withBrowserFixture(harness.replace('user:window.testUser','user:window.__separationUser||window.testUser'),async h=>{
 const Restaurant=require('../../Backend/models/restaurant.model'),Profile=require('../../Backend/models/auditorProfile.model');const{page}=h;await Restaurant.create({id:'scope-ph',name:'Synthetic PH',organizationId:'gfc',brandId:'pizza-hut'});
 await h.open('admin','/app/audit/audits/new');await page.locator('[data-audit-create="directions"]').waitFor();assert.equal(await page.locator('[data-audit-create="directions"] a[href$="/new"]').count(),4);assert.equal(await page.locator('input[type=range]').count(),0);
 for(const [direction,route] of [['hr','hr'],['service','service'],['standard','standard'],['occupational-safety','safety']]){
  await h.models.Assignment.updateMany({auditor:h.actors.auditor._id},{$set:{status:'revoked'}});await Profile.updateOne({_id:h.actors.auditor._id},{$set:{direction}});const parent=await h.audit('admin',direction,{restaurantId:'restaurant-admin'});await h.assign('auditor',parent);const me=await h.request('auditor','GET','/auth/me');assert.equal(me.status,200);assert.equal(me.data.user.auditDirection,direction);await page.addInitScript(user=>{window.__separationUser=user;},me.data.user);
  await h.open('auditor','/app/audit/audits/new');await page.waitForURL(`**/app/audit/${route}/new`);await page.locator('.audit-workspace').waitFor();
  if(direction!=='occupational-safety'){await page.locator('select[required]').first().waitFor();await page.waitForFunction(()=>document.querySelector('select[required] option[value="kfc"]'));const values=await page.locator('select[required]').first().locator('option').evaluateAll(options=>options.map(o=>o.value));assert.deepEqual(values,['','kfc']);}
  for(const other of ['hr','service','standard','safety'].filter(other=>other!==route)){await h.open('auditor',`/app/audit/${other}/new`);await page.waitForURL('**/unauthorized');}
  await h.open('auditor',`/app/audit/audits/new?direction=${route==='hr'?'service':'hr'}`);await page.waitForURL('**/unauthorized');
 }
 assert.deepEqual(h.pageErrors,[]);
}));

test('Standard final evidence UI uploads real bytes, saves version links and displays storage failure',{timeout:90000},async()=>withBrowserFixture(harness,async h=>{
 const Restaurant=require('../../Backend/models/restaurant.model'),Evidence=require('../../Backend/models/auditEvidence.model'),storage=require('../../Backend/services/auditEvidenceStorage.service');
 await Restaurant.create({id:'ui-final-ss',name:'Synthetic final UI',brandId:'simit-sarayi',organizationId:'gfc'});
 await h.request('admin','POST','/audit-standard/templates/simit-sarayi',{});
 const created=await h.request('admin','POST','/audit-standard/audits',{brandId:'simit-sarayi',restaurantId:'ui-final-ss',date:'2026-10-15'});assert.equal(created.status,201);
 const started=await h.request('admin','POST','/audit-execution',{auditId:created.data.data._id});assert.equal(started.status,201);const execution=started.data.data;
 const{page}=h;
 try{
  await page.setViewportSize({width:320,height:1000});await h.open('admin',`/app/audit/execution/${execution._id}`);await page.locator('.audit-hr-question').first().waitFor();await page.evaluate(()=>window.localeTest('en'));
  await page.setViewportSize({width:1440,height:1000});const layout=await page.locator('.service-section-layout').first().evaluate(e=>({main:e.children[0].getBoundingClientRect().right,side:e.children[1].getBoundingClientRect().left}));assert.ok(layout.side>=layout.main);await page.setViewportSize({width:320,height:1000});
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  for(const selector of ['.audit-hr-question .service-photo input[type=file]','.service-section-notes .service-photo input[type=file]']){const response=page.waitForResponse(r=>r.url().endsWith(`/audit-evidence/${execution.auditId}`)&&r.request().method()==='POST');await page.locator(selector).first().setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:png});assert.equal((await response).status(),201);await page.waitForFunction(()=>!document.querySelector('.service-photo input:disabled'));}
  const inputs=page.locator('.audit-hr-final-evidence input[type=file]');
  for(const i of [3,2,1,0]){
   const response=page.waitForResponse(r=>r.url().endsWith(`/audit-evidence/${execution.auditId}`)&&r.request().method()==='POST');
   const buffer=i===0?Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'):Buffer.from(`Synthetic UI document ${i}`);
   await inputs.nth(i).setInputFiles({name:i===0?'synthetic.png':`synthetic-${i}.txt`,mimeType:i===0?'image/png':'text/plain',buffer});assert.equal((await response).status(),201);
   await page.waitForFunction(i=>document.querySelectorAll('.audit-hr-final-evidence select')[i]?.value.length>0,i);
  }
  await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.waitForResponse(r=>r.url().endsWith('/standard-draft')&&r.status()===200).catch(()=>{});
  const saved=await h.request('admin','GET',`/audit-execution/${execution._id}`);assert.equal(saved.data.data.standardDetails.finalEvidence.documentIds.length,3);assert.ok(saved.data.data.standardDetails.finalEvidence.photoId);assert.equal(Object.keys(saved.data.data.standardDetails.sectionPhotos).length,1);assert.equal(saved.data.data.standardDetails.evidenceLinks.length,1);
  await h.open('admin',`/app/audit/execution/${execution._id}`);await page.locator('.audit-hr-final-evidence').waitFor();await page.evaluate(()=>window.localeTest('en'));
  const old=process.env.RENDER;process.env.RENDER='true';const before=await Evidence.countDocuments({auditId:execution.auditId});
  try{const response=page.waitForResponse(r=>r.url().endsWith(`/audit-evidence/${execution.auditId}`)&&r.request().method()==='POST');await page.locator('.audit-hr-final-evidence input[type=file]').nth(1).setInputFiles({name:'blocked.txt',mimeType:'text/plain',buffer:Buffer.from('synthetic')});assert.equal((await response).status(),503);await page.getByRole('alert').filter({hasText:'File was not uploaded'}).waitFor();assert.equal(await Evidence.countDocuments({auditId:execution.auditId}),before);}finally{if(old===undefined)delete process.env.RENDER;else process.env.RENDER=old;}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(h.pageErrors,[]);
  const output=process.env.INOP_HR_AUDIT_SCREENS||'/tmp/inop-standard-p05-screens';fs.mkdirSync(output,{recursive:true});await page.locator('.audit-hr-final-evidence').screenshot({path:path.join(output,'final-evidence-320.png')});
 }finally{for(const file of await Evidence.find({auditId:execution.auditId}).lean())await storage.forReference(file.storageReference,execution.auditId).remove(file.storageReference);}
}));

test('Legacy edit URLs safely redirect source audits and never display mixed score controls',{timeout:90000},async()=>withBrowserFixture(harness,async h=>{
 await h.request('admin','POST','/audit-standard/templates/kfc',{});const created=await h.request('admin','POST','/audit-standard/audits',{brandId:'kfc',restaurantId:'restaurant-admin',date:'2026-10-16'});assert.equal(created.status,201);const parent=created.data.data;
 await h.open('admin',`/app/audit/audits/${parent.id}/edit`);await h.page.waitForURL(`**/app/audit/audits/${parent.id}`);await h.page.locator('.service-follow-up').waitFor();assert.equal(await h.page.locator('input[type=range]').count(),0);assert.deepEqual(h.pageErrors,[]);
}));
