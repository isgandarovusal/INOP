const test = require('node:test'), assert = require('node:assert/strict');
const {withBrowserFixture} = require('./helpers/browser.cjs');
const harness = `import React from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,useNavigate}from'react-router-dom';import{AuthProvider}from'/src/Context/AuthContextProvider.tsx';import{useAuth}from'/src/Context/useAuth.ts';import api from'/src/api/axios.ts';api.defaults.baseURL='/api';function Probe(){window.navigateTest=useNavigate();const{user,isLoading}=useAuth();return React.createElement('p',{'data-session-ready':!isLoading&&Boolean(user)},JSON.stringify(user?.permissions||[]))}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(AuthProvider,null,React.createElement(Probe)))));`;
test('Real session coalesces only a pending opposite focus/visibility pair, never settled permissions', async()=>withBrowserFixture(harness,async h=>{
 const role=await h.models.Role.findOne({key:'test_own'}).lean();
 await h.open('own','/probe');await h.page.locator('[data-session-ready=true]').waitFor();
 assert.equal(h.wire.filter(r=>r.path==='/api/auth/me').length,1);
 let release,entered,requests=0;
 const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
 await h.page.route('**/api/auth/me',async route=>{requests++;entered();await gate;const r=await h.request('own','GET','/auth/me');try{await route.fulfill({status:r.status,contentType:'application/json',body:r.buffer})}catch{/* A deliberately superseded request may be canceled. */}});
 try{
  await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await started;
  await h.page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await h.page.waitForTimeout(80);
  assert.equal(requests,1,'A pending event pair must issue one actual /me request');
  await h.models.Role.updateOne({_id:role._id},{permissions:[]});release();
  await h.page.waitForFunction(()=>document.querySelector('[data-session-ready=true]').textContent==='[]');
  await h.models.Role.updateOne({_id:role._id},{permissions:role.permissions});
  await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await h.page.waitForFunction(()=>document.querySelector('[data-session-ready=true]').textContent!=='[]');
  assert.equal(requests,2,'An immediately subsequent settled refresh must read the server again');
 }finally{release();await h.page.unroute('**/api/auth/me');}
 assert.deepEqual(h.pageErrors,[]);
}));
test('Rejected inactive /me session clears stale identity; transient /me failures preserve it',async()=>withBrowserFixture(harness,async h=>{
 await h.open('own','/probe');await h.page.locator('[data-session-ready=true]').waitFor();
 const pattern='**/api/auth/me';await h.page.route(pattern,r=>r.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Synthetic transient session failure'})}));
 const failure=h.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/me'&&r.status()===500);
 await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await failure;await h.page.waitForTimeout(50);
 assert.equal(await h.page.locator('[data-session-ready=true]').count(),1);assert.equal(await h.page.evaluate(()=>Boolean(localStorage.getItem('inop_auth_token'))),true);
 await h.page.unroute(pattern);await h.models.User.updateOne({_id:h.actors.own._id},{isActive:false});
 const rejected=h.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/me'&&r.status()===403);
 await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await rejected;
 await h.page.waitForFunction(()=>document.querySelector('[data-session-ready=false]')?.textContent==='[]');
 assert.equal(await h.page.evaluate(()=>localStorage.getItem('inop_auth_token')),null);assert.deepEqual(h.pageErrors,[]);
}));
