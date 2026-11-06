const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const shell=`import React from'react';import{createRoot}from'react-dom/client';import App from'/src/App.tsx';import api from'/src/api/axios.ts';import i18n from'/src/i18n/index.ts';api.defaults.baseURL='/api';window.localeTest=l=>i18n.changeLanguage(l);createRoot(document.getElementById('root')).render(React.createElement(App));`;
const overlay={loadSource:id=>id.endsWith('/src/App.tsx')?fs.readFileSync(id,'utf8').replace('const router = createBrowserRouter(ROUTES);','const router = createBrowserRouter(ROUTES);window.navigateTest=to=>router.navigate(to);'):undefined};
async function capture(p,name,width,locale){const out=process.env.INOP_QA_SCREENSHOTS;if(!out)return;fs.mkdirSync(out,{recursive:true});await p.setViewportSize({width,height:950});await p.evaluate(l=>window.localeTest(l),locale);await p.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations??1)).map(a=>a.finished.catch(()=>{})));});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await p.screenshot({path:path.join(out,name+'.png'),fullPage:true});}
test('Login remains actionable during slow session restoration',{timeout:60000},async()=>withBrowserFixture(shell,async h=>{
 const p=h.page;let release;const gate=new Promise(r=>release=r);let restoreStarted=false;
 await p.route('**/api/auth/me',async r=>{restoreStarted=true;await gate;await r.fallback();});
 await h.open('admin','/login');await p.locator('#email').fill('synthetic@example.test');await p.locator('#password').fill('synthetic-only');assert.equal(restoreStarted,true);
 const enabled=await p.locator('button[type=submit]').isEnabled();release();assert.equal(enabled,true,'valid login must not wait for session restoration');
},overlay));
test('Dashboard navigation and focus preserve useful content without repeat reads',{timeout:60000},async()=>withBrowserFixture(shell,async h=>{
 const p=h.page;const reads=()=>h.wire.filter(r=>r.path.endsWith('/dashboard-summary')).length;
 await h.open('admin','/app/dashboard');await p.waitForFunction(()=>document.querySelector('.main-dashboard .page-header__actions button:not([disabled])'));const initial=reads();assert.equal(initial,4);
 await p.evaluate(()=>window.navigateTest('/app/recruitment/jobs'));await p.locator('[type=search]').waitFor();
 let release;const gate=new Promise(r=>release=r);await p.route('**/api/**/dashboard-summary',async r=>{await gate;await r.fallback();});
 await p.evaluate(()=>window.navigateTest('/app/dashboard'));await p.locator('.main-dashboard').waitFor();
 const loading=await p.locator('.main-dashboard').getByText('Yüklənir...', {exact:true}).count();release();assert.equal(loading,0,'return navigation must preserve loaded sections');
 await p.waitForFunction(()=>document.querySelector('.main-dashboard .page-header__actions button:not([disabled])'));assert.equal(reads(),initial,'fresh return must not refetch');
 await p.evaluate(()=>{window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));});
 await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal(reads(),initial,'focus must not refetch Dashboard aggregates');
},overlay));

test('Login slow request, Enter, autofill, failure recovery and duplicate protection',{timeout:90000},async()=>withBrowserFixture(shell,async h=>{
 const p=h.page,password='Synthetic-Login-Only-42!';await h.models.User.updateOne({_id:h.actors.admin._id},{$set:{password:await require('node:module').createRequire(path.resolve(__dirname,'../../Backend/package.json'))('bcryptjs').hash(password,4)}});
 await p.route('**/api/auth/me',async r=>r.fulfill({status:503,contentType:'application/json',body:'{"message":"Synthetic unavailable"}'}));
 await h.open('admin','/login');await p.locator('#email').waitFor();
 await p.locator('button[type=submit]').click();assert.equal(await p.locator('#email[aria-invalid=true]').count(),1);
 await p.locator('#email').fill('not-an-email');await p.locator('#password').fill(password);await p.locator('#password').press('Enter');assert.equal(h.wire.filter(r=>r.path==='/api/auth/login').length,0);
 const enteredAt=performance.now();await p.locator('#email').fill(h.actors.admin.email);assert.equal(await p.locator('button[type=submit]').isEnabled(),true);const enabledMs=performance.now()-enteredAt;
 await p.locator('.auth-password-field__toggle').click();assert.equal(await p.locator('#password').getAttribute('type'),'text');await p.locator('.auth-password-field__toggle').click();
 let release;let attempts=0;const gate=new Promise(r=>release=r);
 await p.route('**/api/auth/login',async r=>{attempts++;await gate;await r.fulfill({status:503,contentType:'application/json',body:'{"message":"Synthetic login unavailable"}'});});
 await p.locator('#password').fill('');await p.evaluate(value=>{document.querySelector('#password').value=value;},password);
 const start=performance.now();await p.locator('#password').press('Enter');await p.locator('form[aria-busy=true]').waitFor();const progressMs=performance.now()-start;
 await p.evaluate(()=>{const f=document.querySelector('form');for(let i=0;i<5;i++)f.requestSubmit();});assert.equal(attempts,1);assert.equal(await p.locator('button[type=submit]').isDisabled(),true);release();await p.getByRole('alert').waitFor();assert.equal(await p.locator('button[type=submit]').isEnabled(),true);assert.equal(await p.locator('#password').inputValue(),password);assert.ok(!(await p.getByRole('alert').textContent()).includes('status code'));assert.equal(await p.locator('[role=status]').filter({hasText:'Synthetic login unavailable'}).count(),0);
 await capture(p,'login-recovery-az-1440',1440,'az');
 await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});assert.deepEqual(await p.evaluate(async()=>{const r=await axe.run('form',{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return r.violations.map(v=>v.id);}),[]);
 await p.unroute('**/api/auth/login');await p.unroute('**/api/auth/me');
 await p.locator('#password').fill('wrong-synthetic-password');await p.locator('button[type=submit]').click();await p.getByRole('alert').waitFor();assert.equal(await p.locator('button[type=submit]').isEnabled(),true);
 // DOM-only autofill can omit React change events. Submission reads form values.
 await p.locator('#password').fill('');await p.evaluate(v=>{document.querySelector('#password').value=v;},password);
 const redirectAt=performance.now();await p.locator('button[type=submit]').click();await p.waitForURL('**/app/dashboard');await p.waitForFunction(()=>document.querySelector('.main-dashboard .page-header__actions button:not([disabled])'));const redirectMs=performance.now()-redirectAt;
 await capture(p,'dashboard-en-768',768,'en');await capture(p,'dashboard-ru-390',390,'ru');await capture(p,'dashboard-az-320',320,'az');assert.deepEqual(await p.evaluate(async()=>{const r=await axe.run('.main-dashboard',{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return r.violations.map(v=>v.id);}),[]);
 assert.deepEqual(h.pageErrors,[]);console.log(JSON.stringify({code:'LOGIN_MEASUREMENTS',validInputToEnabledMs:enabledMs,submitToBusyMs:progressMs,localSubmitToDashboardMs:redirectMs,pendingAttempts:attempts,remoteColdStartMeasured:false}));
},overlay));
test('Dashboard stale revalidation, forced refresh, errors and session reset',{timeout:90000},async()=>withBrowserFixture(shell,async h=>{
 const p=h.page,reads=()=>h.wire.filter(r=>r.path.endsWith('/dashboard-summary')).length;
 await h.open('admin','/app/dashboard');await p.waitForFunction(()=>document.querySelector('.main-dashboard .page-header__actions button:not([disabled])'));
 await p.clock.install();await p.clock.fastForward(11000);
 await p.evaluate(()=>window.navigateTest('/app/recruitment/jobs'));await p.locator('[type=search]').waitFor();
 let release;const gate=new Promise(r=>release=r);await p.route('**/api/**/dashboard-summary',async r=>{await gate;await r.fallback();});
 await p.evaluate(()=>window.navigateTest('/app/dashboard'));await p.locator('.main-dashboard').waitFor();assert.equal(await p.getByText('Yüklənir...', {exact:true}).count(),0);assert.equal(await p.locator('.main-dashboard .page-header__actions button').getAttribute('aria-busy'),'true');release();await p.waitForFunction(()=>document.querySelector('.main-dashboard .page-header__actions button:not([disabled])'));const afterStale=reads();assert.equal(afterStale,8);
 await p.unroute('**/api/**/dashboard-summary');
 await p.route('**/api/candidates/dashboard-summary',async r=>r.fulfill({status:503,contentType:'application/json',body:'{"message":"Synthetic summary unavailable"}'}));
 await p.locator('.main-dashboard .page-header__actions button').click();await p.waitForFunction(()=>document.querySelector('.main-dashboard .page-header__actions button:not([disabled])'));assert.equal(reads()-afterStale,3);assert.equal(await p.getByText('Yüklənir...', {exact:true}).count(),0);await p.locator('.dashboard-error').waitFor();
 await p.unroute('**/api/candidates/dashboard-summary');await p.locator('.main-dashboard .page-header__actions button').click();await p.waitForFunction(()=>document.querySelector('.main-dashboard .page-header__actions button:not([disabled])'));assert.equal(await p.locator('.dashboard-error').count(),0);
 // Explicitly expire the session; cached data may not survive even same-token reauth.
 await p.evaluate(()=>window.dispatchEvent(new CustomEvent('inop:auth-expired')));await p.waitForURL('**/login');assert.equal(await p.locator('.main-dashboard').count(),0);
 assert.deepEqual(h.pageErrors,[]);console.log(JSON.stringify({code:'DASHBOARD_MEASUREMENTS',initialReads:4,freshReturnReads:0,focusReads:0,expiredSnapshotRevalidationReads:4,forcedRefreshReads:4,backgroundLoadingFlashes:0}));
},overlay));
test('Human duplicate review and personal workload use real authorized persistence',{timeout:90000},async()=>withBrowserFixture(shell,async h=>{
 const p=h.page,Review=require('../../Backend/models/candidateDuplicateReview.model');await Review.createIndexes();
 const Candidate=require('../../Backend/models/candidate.model'),Job=require('../../Backend/models/job.model'),Application=require('../../Backend/models/application.model'),own={createdBy:h.actors.admin._id,assignedTo:h.actors.admin._id,departmentId:'dep_A'};
 const a=await Candidate.create({name:'Synthetic review profile A',role:'Cashier',email:'duplicate@example.test',cvReview:{version:'rules-2',reviewStatus:'pending'},...own}),b=await Candidate.create({name:'Synthetic review profile B',role:'Cashier',email:a.email,...own}),job=await Job.create({title:'Synthetic workload role',description:'Synthetic',department:'HR',...own});
 await Application.create({candidateId:a._id,jobId:job._id,status:'Screening',...own,nextAction:{kind:'follow_up',dueAt:new Date(Date.now()-86400000)}});
 const out=process.env.INOP_QA_SCREENSHOTS;async function shot(name,width,locale){await p.setViewportSize({width,height:950});await p.evaluate(l=>window.localeTest(l),locale);await p.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations??1)).map(a=>a.finished.catch(()=>{})));});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,name+'.png'),fullPage:true});}}
 await h.open('admin','/app/recruitment/candidates/'+a._id);await p.locator('[data-candidate-duplicates]').waitFor();assert.equal(h.wire.filter(r=>r.path.endsWith('/duplicates')).length,0);
 await p.evaluate(()=>window.localeTest('en'));await p.locator('[data-candidate-duplicates] summary').click();await p.getByRole('link',{name:b.name,exact:true}).waitFor();
 await p.getByRole('combobox',{name:'Human review',exact:true}).selectOption('uncertain');await p.getByRole('textbox',{name:'Review note (internal)',exact:true}).fill('Synthetic identity review; profiles preserved');const saved=p.waitForResponse(r=>r.url().endsWith('/duplicate-reviews')&&r.status()===200);await p.getByRole('button',{name:'Record review',exact:true}).click();await saved;await p.locator('[data-duplicate-decision]').waitFor();assert.equal(await Review.countDocuments(),1);assert.equal(await Candidate.countDocuments(),2);
 await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const violations=await p.evaluate(async()=>{const r=await axe.run('[data-candidate-duplicates]',{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return r.violations.map(v=>({id:v.id,count:v.nodes.length}));});assert.deepEqual(violations,[]);
 await shot('duplicate-review-ru-390',390,'ru');await shot('duplicate-review-az-320',320,'az');
 await p.evaluate(()=>window.navigateTest('/app/recruitment/analytics'));await p.evaluate(()=>window.localeTest('en'));await p.getByRole('tab',{name:'Operations',exact:true}).click();await p.locator('[data-recruiter-workload]').waitFor();assert.match(await p.locator('[data-recruiter-workload]').textContent(),/Assigned applications: 1/);assert.match(await p.locator('[data-recruiter-workload]').textContent(),/Overdue next actions: 1/);
 await shot('personal-workload-en-768',768,'en');await shot('personal-workload-az-1440',1440,'az');assert.deepEqual(h.pageErrors,[]);
},overlay));
