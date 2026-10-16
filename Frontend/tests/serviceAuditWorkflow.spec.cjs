const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const hr=require('../../Backend/services/serviceAuditAssessment.service');
const harness=`import React from 'react';import{createRoot}from'react-dom/client';import{createBrowserRouter,RouterProvider}from'react-router-dom';import{AuthContext}from'/src/Context/AuthContext.ts';import'/src/i18n/index.ts';import i18n from '/src/i18n/index.ts';import'/src/App.css';import ROUTES from'/src/Routes/Routes.tsx';import api from'/src/api/axios.ts';api.defaults.baseURL='/api';const router=createBrowserRouter(ROUTES);window.navigateTest=to=>router.navigate(to);window.localeTest=lang=>i18n.changeLanguage(lang);createRoot(document.getElementById('root')).render(React.createElement(AuthContext.Provider,{value:{user:window.testUser,isLoading:false,logout:async()=>{},login:async()=>{}}},React.createElement(React.Suspense,null,React.createElement(RouterProvider,{router}))));`;
test('Real Service UI/API: source forms, draft resume, immutable submit, analytics, responsive locales and denial',{timeout:240000},async()=>withBrowserFixture(harness,async h=>{
 const output=process.env.INOP_HR_AUDIT_SCREENS||'/tmp/inop-service-audit-p04-screens';fs.mkdirSync(output,{recursive:true});
 const Restaurant=require('../../Backend/models/restaurant.model');const executions={};
 for(const source of hr.sources){
  const provision=await h.request('admin','POST',`/audit-service/templates/${source.brandId}`,{});assert.equal(provision.status,201);
  const restaurantId=`browser-${source.brandId}`;await Restaurant.create({id:restaurantId,name:`Synthetic ${source.brandName}`,organizationId:'gfc',brandId:source.brandId});
  const created=await h.request('admin','POST','/audit-service/audits',{brandId:source.brandId,restaurantId,date:'2026-10-15'});assert.equal(created.status,201);
  const started=await h.request('admin','POST','/audit-execution',{auditId:created.data.data._id});assert.equal(started.status,201);executions[source.brandId]=started.data.data;
 }
 const{page}=h;page.setDefaultTimeout(12000);const checks=[];
 for(const width of [1440,768,390,320])for(const lang of ['az','en','ru'])for(const brand of ['kfc','pizza-hut','simit-sarayi']){
  await page.setViewportSize({width,height:1000});await h.open('admin',`/app/audit/execution/${executions[brand]._id}`);await page.locator('.audit-hr-question').first().waitFor();await page.evaluate(lang=>window.localeTest(lang),lang);
  const source=hr.sourceFor(brand);assert.equal(await page.locator('.audit-hr-question h3').first().textContent(),`1. ${source.sections[0].questions[0].label}`);assert.equal(await page.locator('.audit-hr-final-evidence input[type=file]').count(),4);assert.equal(await page.getByText('Лист1',{exact:false}).count(),0);
  assert.equal(await page.locator('.audit-hr-question').count(),hr.sourceFor(brand).sections.reduce((n,s)=>n+s.questions.length,0));
  if(brand==='kfc'){
   const criterion=page.locator('#service-kfc-r67-label');assert.match(await criterion.textContent(),/düzgün təşkil edilib/);assert.doesNotMatch(await criterion.textContent(),/edilməyib/);
   assert.equal(await page.locator('select[aria-labelledby="service-kfc-r79-label"]').count(),0);
   assert.equal(await page.locator('select[aria-labelledby="service-kfc-r67-label"] option[value="0.5"]').count(),1);
  }
  const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,smallButtons:[...document.querySelectorAll('.audit-hr-page button')].filter(e=>e.getBoundingClientRect().height>0&&e.getBoundingClientRect().height<43).length}));
  assert.equal(geometry.overflow,false,`${brand}/${lang}/${width}`);assert.equal(geometry.smallButtons,0);
  await page.screenshot({path:path.join(output,`${brand}-${lang}-${width}.png`),fullPage:false});checks.push({brand,lang,width,...geometry});
 }
 // Real draft save/reload preserves answer and notes. Keyboard modal guards unsaved navigation.
 const execution=executions['pizza-hut'];await h.open('admin',`/app/audit/execution/${execution._id}`);await page.locator('.audit-hr-question').first().waitFor();await page.evaluate(()=>window.localeTest('en'));
 await page.locator('.audit-hr-question select').first().selectOption('0.5');await page.locator('.audit-hr-question textarea').first().fill('synthetic browser note');
 await page.getByRole('link',{name:'Audit and follow-up',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByRole('dialog').getByRole('button').last().click();
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.waitForResponse(r=>r.url().endsWith('/service-draft')&&r.status()===200).catch(()=>{});
 await page.waitForFunction(()=>document.querySelector('.audit-hr-question select')?.value==='0.5');
 const stored=await h.request('admin','GET',`/audit-execution/${execution._id}`);assert.equal(stored.data.data.answers[0].answer,'0.5');assert.equal(stored.data.data.answers[0].comment,'synthetic browser note');
 await h.open('admin',`/app/audit/execution/${execution._id}`);await page.locator('.audit-hr-question').first().waitFor();await page.evaluate(()=>window.localeTest('en'));
 const selects=page.locator('.audit-hr-question .audit-filter-grid > label:first-child select');
 for(let i=1;i<await selects.count();i++)await selects.nth(i).selectOption('na');
 await page.getByRole('button',{name:'Complete form',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByRole('dialog').getByRole('button',{name:'Complete form',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('form button[type="submit"]'));
 const submitted=await h.request('admin','GET',`/audit-execution/${execution._id}`);assert.equal(submitted.data.data.overallPercentage,50);assert.equal(submitted.data.data.status,'completed');
 for(const width of [1440,768,390,320])for(const suffix of ['service','service/analytics']){
  await page.setViewportSize({width,height:1000});await h.open('admin',`/app/audit/${suffix}`);await page.locator('.audit-hr-page').waitFor();assert.equal(await page.locator('.audit-management-links a[href^="/app/audit/hr"]').count(),0);await page.waitForFunction(()=>!document.querySelector('[data-audit-state="loading"]'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(output,`${suffix.replace('/','-')}-${width}.png`),fullPage:true});
 }
 await h.open('hr','/app/audit/service');assert.ok(page.url().includes('/unauthorized')||await page.locator('.audit-hr-page').count()===0);
 assert.deepEqual(h.pageErrors,[]);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checks,pageErrors:h.pageErrors},null,2));console.log('Service visual artifacts:',output,'36 source/locale/viewport checks + 8 list/analytics checks');
}));
test('Service final evidence UI uploads real bytes, saves version links and displays storage failure',{timeout:90000},async()=>withBrowserFixture(harness,async h=>{
 const Restaurant=require('../../Backend/models/restaurant.model'),Evidence=require('../../Backend/models/auditEvidence.model'),storage=require('../../Backend/services/auditEvidenceStorage.service');
 await Restaurant.create({id:'ui-final-ss',name:'Synthetic final UI',brandId:'simit-sarayi',organizationId:'gfc'});
 await h.request('admin','POST','/audit-service/templates/simit-sarayi',{});
 const created=await h.request('admin','POST','/audit-service/audits',{brandId:'simit-sarayi',restaurantId:'ui-final-ss',date:'2026-10-15'});assert.equal(created.status,201);
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
  await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.waitForResponse(r=>r.url().endsWith('/service-draft')&&r.status()===200).catch(()=>{});
  const saved=await h.request('admin','GET',`/audit-execution/${execution._id}`);assert.equal(saved.data.data.serviceDetails.finalEvidence.documentIds.length,3);assert.ok(saved.data.data.serviceDetails.finalEvidence.photoId);assert.equal(Object.keys(saved.data.data.serviceDetails.sectionPhotos).length,1);assert.equal(saved.data.data.serviceDetails.evidenceLinks.length,1);
  await h.open('admin',`/app/audit/execution/${execution._id}`);await page.locator('.audit-hr-final-evidence').waitFor();await page.evaluate(()=>window.localeTest('en'));
  const old=process.env.RENDER;process.env.RENDER='true';const before=await Evidence.countDocuments({auditId:execution.auditId});
  try{const response=page.waitForResponse(r=>r.url().endsWith(`/audit-evidence/${execution.auditId}`)&&r.request().method()==='POST');await page.locator('.audit-hr-final-evidence input[type=file]').nth(1).setInputFiles({name:'blocked.txt',mimeType:'text/plain',buffer:Buffer.from('synthetic')});assert.equal((await response).status(),503);await page.getByRole('alert').filter({hasText:'File was not uploaded'}).waitFor();assert.equal(await Evidence.countDocuments({auditId:execution.auditId}),before);}finally{if(old===undefined)delete process.env.RENDER;else process.env.RENDER=old;}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(h.pageErrors,[]);
  const output=process.env.INOP_HR_AUDIT_SCREENS||'/tmp/inop-service-audit-p04-screens';fs.mkdirSync(output,{recursive:true});await page.locator('.audit-hr-final-evidence').screenshot({path:path.join(output,'final-evidence-320.png')});
 }finally{for(const file of await Evidence.find({auditId:execution.auditId}).lean())await storage.forReference(file.storageReference,execution.auditId).remove(file.storageReference);}
}));

test('Service auditor actual auth exposes assigned source audits only and denies HR direction',{timeout:90000},async()=>withBrowserFixture(harness.replace('user:window.testUser','user:window.__serviceAuthUser||window.testUser'),async h=>{
 const Restaurant=require('../../Backend/models/restaurant.model');await h.request('admin','POST','/audit-service/templates/pizza-hut',{});const audits=[];
 for(const id of ['assigned-service','foreign-service']){await Restaurant.create({id,name:'Synthetic scoped restaurant',organizationId:'gfc',brandId:'pizza-hut'});const r=await h.request('admin','POST','/audit-service/audits',{brandId:'pizza-hut',restaurantId:id,date:'2026-10-15'});assert.equal(r.status,201);audits.push(r.data.data);}
 await h.assign('auditor',await h.models.Audit.findById(audits[0]._id));const me=await h.request('auditor','GET','/auth/me');assert.equal(me.data.user.auditDirection,'service');await h.page.addInitScript(user=>{window.__serviceAuthUser=user;},me.data.user);
 await h.open('auditor','/app/audit/service');await h.page.locator('.audit-table-scroll tbody tr').waitFor();assert.equal(await h.page.locator('.audit-table-scroll tbody tr').count(),1);
 await h.open('auditor','/app/audit/service/analytics');await h.page.locator('.audit-foundation-kpis article strong').first().waitFor();assert.equal(await h.page.locator('.audit-foundation-kpis article strong').first().textContent(),'1');
 assert.equal((await h.request('auditor','GET',`/audits/${audits[1]._id}`)).status,404);
 await h.open('auditor','/app/audit/hr');await h.page.waitForURL('**/unauthorized');assert.deepEqual(h.pageErrors,[]);
}));

test('Service detail creates findings and saves corrective-action execution evidence',{timeout:90000},async()=>withBrowserFixture(harness,async h=>{
 const Restaurant=require('../../Backend/models/restaurant.model'),Evidence=require('../../Backend/models/auditEvidence.model');await Restaurant.create({id:'ui-service-action',name:'Synthetic action restaurant',brandId:'pizza-hut',organizationId:'gfc'});await h.request('admin','POST','/audit-service/templates/pizza-hut',{});
 const created=await h.request('admin','POST','/audit-service/audits',{brandId:'pizza-hut',restaurantId:'ui-service-action',date:'2026-10-15'});assert.equal(created.status,201);const audit=created.data.data;
 const proof=await Evidence.create({auditId:audit._id,storageKey:'synthetic-fixture-only',name:'Synthetic existing proof',size:1,mimeType:'text/plain',uploadedBy:String(h.actors.admin._id)});
 const{page}=h;await page.setViewportSize({width:320,height:1000});await h.open('admin',`/app/audit/audits/${audit.id}`);await page.locator('.service-follow-up').waitFor();await page.evaluate(()=>window.localeTest('en'));
 const follow=page.locator('.service-follow-up');await follow.locator('select').selectOption(String(proof._id));await follow.locator('input').fill('Synthetic UI finding');await follow.locator('textarea').fill('Synthetic UI observation');await follow.getByRole('button',{name:'Add finding',exact:true}).click();await follow.getByRole('heading',{name:'Synthetic UI finding',exact:true}).waitFor();
 const findings=await h.request('admin','GET',`/audit-findings/${audit._id}`);assert.deepEqual(findings.data.data[0].evidenceIds,[String(proof._id)]);
 const actions=page.locator('section.audit-hr-page').filter({has:page.getByRole('heading',{name:'Corrective actions',exact:true})});await actions.locator('.audit-filter-grid input').first().fill('Synthetic UI action');await page.waitForFunction(id=>[...document.querySelectorAll('section.audit-hr-page select option')].some(o=>o.value===id),String(h.actors.admin._id));await actions.locator('.audit-filter-grid select').first().selectOption(String(h.actors.admin._id));await actions.getByRole('button',{name:'Add action',exact:true}).click();await actions.getByRole('heading',{name:'Synthetic UI action',exact:true}).waitFor();
 const response=page.waitForResponse(r=>r.url().includes('/audit-actions/')&&r.request().method()==='PUT');await actions.getByRole('button',{name:'Completed',exact:true}).click();assert.equal((await response).status(),200);
 const saved=await h.request('admin','GET',`/audit-actions/audit/${audit._id}`);assert.deepEqual(saved.data.data[0].evidenceIds,[String(proof._id)]);assert.equal(saved.data.data[0].status,'completed');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(h.pageErrors,[]);
}));
