const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const hr=require('../../Backend/services/hrAuditAssessment.service');
const harness=`import React from 'react';import{createRoot}from'react-dom/client';import{createBrowserRouter,RouterProvider}from'react-router-dom';import{AuthContext}from'/src/Context/AuthContext.ts';import'/src/i18n/index.ts';import i18n from '/src/i18n/index.ts';import'/src/App.css';import ROUTES from'/src/Routes/Routes.tsx';import api from'/src/api/axios.ts';api.defaults.baseURL='/api';const router=createBrowserRouter(ROUTES);window.navigateTest=to=>router.navigate(to);window.localeTest=lang=>i18n.changeLanguage(lang);createRoot(document.getElementById('root')).render(React.createElement(AuthContext.Provider,{value:{user:window.testUser,isLoading:false,logout:async()=>{},login:async()=>{}}},React.createElement(React.Suspense,null,React.createElement(RouterProvider,{router}))));`;
test('Real HR UI/API: source forms, draft resume, immutable submit, analytics, responsive locales and denial',{timeout:240000},async()=>withBrowserFixture(harness,async h=>{
 const output=process.env.INOP_HR_AUDIT_SCREENS||'/tmp/inop-hr-audit-p03-screens';fs.mkdirSync(output,{recursive:true});
 const Restaurant=require('../../Backend/models/restaurant.model');const executions={};
 for(const source of hr.sources){
  const provision=await h.request('admin','POST',`/audit-hr/templates/${source.brandId}`,{});assert.equal(provision.status,201);
  const restaurantId=`browser-${source.brandId}`;await Restaurant.create({id:restaurantId,name:`Synthetic ${source.brandName}`,organizationId:'gfc',brandId:source.brandId});
  const created=await h.request('admin','POST','/audit-hr/audits',{brandId:source.brandId,restaurantId,date:'2026-10-15'});assert.equal(created.status,201);
  const started=await h.request('admin','POST','/audit-execution',{auditId:created.data.data._id});assert.equal(started.status,201);executions[source.brandId]=started.data.data;
 }
 const{page}=h;page.setDefaultTimeout(12000);const checks=[];
 for(const width of [1440,768,390,320])for(const lang of ['az','en','ru'])for(const brand of ['kfc','pizza-hut','simit-sarayi']){
  await page.setViewportSize({width,height:1000});await h.open('admin',`/app/audit/execution/${executions[brand]._id}`);await page.locator('.audit-hr-question').first().waitFor();await page.evaluate(lang=>window.localeTest(lang),lang);
  assert.equal(await page.locator('.audit-hr-question').count(),hr.sourceFor(brand).sections.reduce((n,s)=>n+s.questions.length,0));
  const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,smallButtons:[...document.querySelectorAll('.audit-hr-page button')].filter(e=>e.getBoundingClientRect().height>0&&e.getBoundingClientRect().height<43).length}));
  assert.equal(geometry.overflow,false,`${brand}/${lang}/${width}`);assert.equal(geometry.smallButtons,0);
  await page.screenshot({path:path.join(output,`${brand}-${lang}-${width}.png`),fullPage:false});checks.push({brand,lang,width,...geometry});
 }
 // Real draft save/reload preserves answer and notes. Keyboard modal guards unsaved navigation.
 const execution=executions['pizza-hut'];await h.open('admin',`/app/audit/execution/${execution._id}`);await page.locator('.audit-hr-question').first().waitFor();await page.evaluate(()=>window.localeTest('en'));
 await page.locator('.audit-hr-question select').first().selectOption('0.5');await page.locator('.audit-hr-question textarea').first().fill('synthetic browser note');
 await page.getByRole('link',{name:'Audit and follow-up',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByRole('dialog').getByRole('button').last().click();
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.waitForResponse(r=>r.url().endsWith('/draft')&&r.status()===200).catch(()=>{});
 await page.waitForFunction(()=>document.querySelector('.audit-hr-question select')?.value==='0.5');
 const stored=await h.request('admin','GET',`/audit-execution/${execution._id}`);assert.equal(stored.data.data.answers[0].answer,'0.5');assert.equal(stored.data.data.answers[0].comment,'synthetic browser note');
 await h.open('admin',`/app/audit/execution/${execution._id}`);await page.locator('.audit-hr-question').first().waitFor();await page.evaluate(()=>window.localeTest('en'));
 const selects=page.locator('.audit-hr-question .audit-filter-grid > label:first-child select');
 for(let i=1;i<await selects.count();i++)await selects.nth(i).selectOption('na');
 await page.getByRole('button',{name:'Complete form',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByRole('dialog').getByRole('button',{name:'Complete form',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('form button[type="submit"]'));
 const submitted=await h.request('admin','GET',`/audit-execution/${execution._id}`);assert.equal(submitted.data.data.overallPercentage,50);assert.equal(submitted.data.data.status,'completed');
 for(const width of [1440,768,390,320])for(const suffix of ['hr','hr/analytics']){
  await page.setViewportSize({width,height:1000});await h.open('admin',`/app/audit/${suffix}`);await page.locator('.audit-hr-page').waitFor();await page.waitForFunction(()=>!document.querySelector('[data-audit-state="loading"]'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(output,`${suffix.replace('/','-')}-${width}.png`),fullPage:true});
 }
 await h.open('auditor','/app/audit/hr');assert.ok(page.url().includes('/unauthorized')||await page.locator('.audit-hr-page').count()===0);
 assert.deepEqual(h.pageErrors,[]);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checks,pageErrors:h.pageErrors},null,2));console.log('HR visual artifacts:',output,'36 source/locale/viewport checks + 8 list/analytics checks');
}));
test('HR detail action UI and authenticated HR report preserve source workflow',{timeout:90000},async()=>withBrowserFixture(harness,async h=>{
 const Restaurant=require('../../Backend/models/restaurant.model');await Restaurant.create({id:'ui-ph',name:'Synthetic action restaurant',brandId:'pizza-hut',organizationId:'gfc'});
 assert.equal((await h.request('admin','POST','/audit-hr/templates/pizza-hut',{})).status,201);
 const created=await h.request('admin','POST','/audit-hr/audits',{brandId:'pizza-hut',restaurantId:'ui-ph',date:'2026-10-15'});assert.equal(created.status,201);const audit=created.data.data;
 const{page}=h;await page.setViewportSize({width:320,height:1000});await h.open('admin',`/app/audit/audits/${audit.id}`);await page.locator('.audit-hr-page').first().waitFor();await page.evaluate(()=>window.localeTest('en'));
 const panel=page.locator('section.audit-hr-page').filter({has:page.getByRole('heading',{name:'Corrective actions',exact:true})});await panel.waitFor();
 await panel.locator('.audit-filter-grid input').first().fill('Synthetic UI corrective action');
 await page.waitForFunction(id=>[...document.querySelectorAll('section.audit-hr-page select option')].some(o=>o.value===id),String(h.actors.admin._id));
 await panel.locator('.audit-filter-grid select').first().selectOption(String(h.actors.admin._id));
 await panel.getByRole('button',{name:'Add action',exact:true}).click();await panel.getByRole('heading',{name:'Synthetic UI corrective action',exact:true}).waitFor();
 await panel.getByRole('button',{name:'Completed',exact:true}).click();
 await page.waitForResponse(r=>r.url().includes('/audit-actions/')&&r.request().method()==='PUT').catch(()=>{});
 const actions=await h.request('admin','GET',`/audit-actions/audit/${audit._id}`);assert.equal(actions.data.data[0].status,'completed');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await h.open('admin',`/app/audit/report/${audit._id}`);await page.locator('.audit-report').waitFor();await page.waitForFunction(()=>document.querySelector('.audit-report')?.textContent.includes('—'));
 assert.equal(await page.getByRole('button',{name:/Recalculate/}).count(),0);assert.deepEqual(h.pageErrors,[]);
}));
test('HR auditor UI uses actual auth direction and exposes only assigned HR parents',{timeout:90000},async()=>withBrowserFixture(harness.replace('user:window.testUser','user:window.__hrAuthUser||window.testUser'),async h=>{
 const Profile=require('../../Backend/models/auditorProfile.model');await Profile.updateOne({_id:h.actors.auditor._id},{$set:{direction:'hr'}});
 const assigned=await h.audit('admin','hr',{id:'assigned-hr-browser'});await h.assign('auditor',assigned);await h.audit('foreign','hr',{id:'foreign-hr-browser'});
 const me=await h.request('auditor','GET','/auth/me');assert.equal(me.status,200);assert.equal(me.data.user.auditDirection,'hr');
 await h.page.addInitScript(user=>{window.__hrAuthUser=user;},me.data.user);
 await h.open('auditor','/app/audit/hr');await h.page.locator('.audit-table-scroll tbody tr').waitFor();assert.equal(await h.page.locator('.audit-table-scroll tbody tr').count(),1);
 assert.equal(await h.page.locator('a[href^="/app/audit/service"],a[href^="/app/audit/standard"],a[href^="/app/audit/safety"]').count(),0);
 await h.open('auditor','/app/audit/hr/analytics');await h.page.locator('.audit-foundation-kpis article').first().waitFor();assert.equal(await h.page.locator('.audit-foundation-kpis article strong').first().textContent(),'1');
 await h.open('auditor','/app/audit/service');await h.page.waitForURL('**/unauthorized');assert.deepEqual(h.pageErrors,[]);
}));
