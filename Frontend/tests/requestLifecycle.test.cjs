const test=require('node:test'),assert=require('node:assert/strict');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const harness=`import React from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,useNavigate}from'react-router-dom';import{AuthContext}from'/src/Context/AuthContext.ts';import Dashboard from'/src/Pages/Dashboard/Dashboard.tsx';import i18n from'/src/i18n/index.ts';import api from'/src/api/axios.ts';api.defaults.baseURL='/api';window.i18nTest=i18n;function App(){const[user,setUser]=React.useState(window.testUser);window.setTestUser=setUser;window.navigateTest=useNavigate();return React.createElement(AuthContext.Provider,{value:{user,isLoading:false}},React.createElement(Dashboard));}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));`;
test('Dashboard and shared GET lifecycles preserve authorization under StrictMode',async t=>withBrowserFixture(harness,async h=>{
 for(const scope of ['own','department','assigned'])await h.models.Role.updateOne({key:`test_${scope}`},{$push:{permissions:{$each:['recruitment','candidate','application'].map(resource=>({resource,action:'read',scope}))}}});
 await t.test('StrictMode emits one server request per summary; translation emits none',async()=>{
  await h.open('admin','/dashboard');await h.page.waitForLoadState('networkidle');
  const reads=h.wire.filter(item=>item.path.endsWith('/dashboard-summary'));assert.equal(reads.length,4);
  const count=h.wire.length;await h.page.evaluate(()=>window.i18nTest.changeLanguage('az'));await h.page.waitForTimeout(200);assert.equal(h.wire.length,count);
  assert.deepEqual(h.pageErrors,[]);
 });
 await t.test('Focus revalidates each summary instead of serving a cached result',async()=>{
  const before=h.wire.filter(item=>item.path.endsWith('/dashboard-summary')).length;
  const responses=Promise.all(['jobs','candidates','applications','audits'].map(resource=>h.page.waitForResponse(response=>response.url().endsWith(`/${resource}/dashboard-summary`))));
  await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await responses;await h.page.waitForLoadState('networkidle');
  assert.equal(h.wire.filter(item=>item.path.endsWith('/dashboard-summary')).length-before,4);
 });
 await t.test('Old user response is canceled and never replaces a new user summary',async()=>{
  const Candidate=require('../../Backend/models/candidate.model');await Candidate.create({name:'Own scoped candidate',role:'local',createdBy:h.actors.own._id,departmentId:'dep_A'});
  let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
  await h.page.route('**/api/candidates/dashboard-summary',async route=>{
   if(route.request().headers().authorization!==`Bearer ${h.tokens.admin}`)return route.fallback();
   entered();await gate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({total:999,shortlistedCount:999,statusBreakdown:[],recentCandidates:[]})});
  });
  try{
   await h.open('admin','/dashboard');await started;const user=await h.profile('own');
   await h.page.evaluate(({user,token})=>{localStorage.setItem('inop_auth_token',token);window.setTestUser(user);},{user,token:h.tokens.own});
   await h.page.waitForFunction(()=>document.querySelectorAll('.kpi-card__value')[1]?.textContent==='1');
   release();await h.page.waitForLoadState('networkidle');assert.equal(await h.page.locator('.kpi-card__value').nth(1).textContent(),'1');
   user.permissions=[];await h.page.evaluate(user=>window.setTestUser(user),user);await h.page.waitForTimeout(50);
   assert.equal(await h.page.locator('.kpi-card__value').count(),0);
  }finally{release();await h.page.unroute('**/api/candidates/dashboard-summary');}
 });
 await t.test('Concurrent consumers share GET, independent cancellation and no settled cache',async()=>{
  let calls=0;await h.page.route('**/api/controlled-read',async route=>{calls++;await new Promise(r=>setTimeout(r,100));await route.fulfill({status:200,contentType:'application/json',body:'{"value":7}'});});
  const result=await h.page.evaluate(async()=>{
   const{readJson}=await import('/src/api/readRequest.ts');const controller=new AbortController();
   const first=readJson('/controlled-read',{scopeKey:'own-permissions',signal:controller.signal}).catch(e=>e.code);
   const second=readJson('/controlled-read',{scopeKey:'own-permissions'});controller.abort();
   const results=await Promise.all([first,second]);await readJson('/controlled-read',{scopeKey:'own-permissions'});return results;
  });assert.deepEqual(result,['ERR_CANCELED',{value:7}]);assert.equal(calls,2);
  await h.page.unroute('**/api/controlled-read');
 });
 await t.test('The last canceled consumer aborts the underlying network request',async()=>{
  let entered,release;const started=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
  await h.page.route('**/api/controlled-cancel',async route=>{entered();await gate;await route.fulfill({status:200,contentType:'application/json',body:'{}'});});
  const failed=h.page.waitForEvent('requestfailed',{predicate:request=>request.url().endsWith('/controlled-cancel')});
  try{
   await h.page.evaluate(async()=>{const{readJson}=await import('/src/api/readRequest.ts');window.cancelController=new AbortController();window.cancelResult=readJson('/controlled-cancel',{scopeKey:'cancel-context',signal:window.cancelController.signal}).catch(e=>e.code);});
   await started;await h.page.evaluate(()=>window.cancelController.abort());await failed;
   assert.equal(await h.page.evaluate(()=>window.cancelResult),'ERR_CANCELED');
  }finally{release();await h.page.unroute('**/api/controlled-cancel');}
 });
 await t.test('Permission fingerprint and JWT separate pending reads; late 401 preserves new JWT',async()=>{
  let calls=0;await h.page.route('**/api/controlled-context',async route=>{calls++;await new Promise(r=>setTimeout(r,100));await route.fulfill({status:200,contentType:'application/json',body:'{}'});});
  await h.page.evaluate(async()=>{const{readJson}=await import('/src/api/readRequest.ts');await Promise.all([readJson('/controlled-context',{scopeKey:'before'}),readJson('/controlled-context',{scopeKey:'after'})]);});assert.equal(calls,2);
  await h.page.unroute('**/api/controlled-context');
  let authorization;await h.page.route('**/api/controlled-401',async route=>{authorization=route.request().headers().authorization;await new Promise(r=>setTimeout(r,100));await route.fulfill({status:401,contentType:'application/json',body:'{}'});});
  const token=await h.page.evaluate(async({oldToken,newToken})=>{const{readJson}=await import('/src/api/readRequest.ts');localStorage.setItem('inop_auth_token',oldToken);const pending=readJson('/controlled-401',{scopeKey:'old-user'}).catch(()=>null);localStorage.setItem('inop_auth_token',newToken);await pending;return localStorage.getItem('inop_auth_token');},{oldToken:h.tokens.admin,newToken:h.tokens.own});
  assert.equal(authorization,`Bearer ${h.tokens.admin}`);assert.equal(token,h.tokens.own);await h.page.unroute('**/api/controlled-401');
  await h.page.route('**/api/auth/me',async route=>{authorization=route.request().headers().authorization;await new Promise(r=>setTimeout(r,100));await route.fulfill({status:401,contentType:'application/json',body:'{}'});});
  const meToken=await h.page.evaluate(async({oldToken,newToken})=>{const{getCurrentUser}=await import('/src/Services/authService.ts');localStorage.setItem('inop_auth_token',oldToken);const pending=getCurrentUser();localStorage.setItem('inop_auth_token',newToken);await pending;return localStorage.getItem('inop_auth_token');},{oldToken:h.tokens.admin,newToken:h.tokens.own});
  assert.equal(authorization,`Bearer ${h.tokens.admin}`);assert.equal(meToken,h.tokens.own);await h.page.unroute('**/api/auth/me');
 });
}));
