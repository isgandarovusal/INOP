const test=require('node:test'),assert=require('node:assert/strict');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const Job=require('../../Backend/models/job.model');
const harness=`import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';import {AuthContext} from '/src/Context/AuthContext.ts';import '/src/i18n/index.ts';import HRRoute from '/src/Routes/HRRoute.tsx';import Jobs from '/src/Pages/Recruitment/Jobs/JobsList.tsx';import {canAccessSection,hasPermission} from '/src/Utils/permissions.ts';import api from '/src/api/axios.ts';api.defaults.baseURL='/api';function App(){const [user,setUser]=React.useState(window.testUser);window.setTestUser=setUser;window.navigateTest=useNavigate();return React.createElement(AuthContext.Provider,{value:{user,isLoading:false}},React.createElement('div',null,canAccessSection(user,'recruitment')&&React.createElement('span',{'data-hr-menu':true},'Recruitment'),React.createElement('span',{'data-audit-access':hasPermission(user,'audit','read')}),React.createElement(Routes,null,React.createElement(Route,{element:React.createElement(HRRoute,{resource:'recruitment'})},React.createElement(Route,{path:'/app/recruitment/jobs',element:React.createElement(Jobs)})))));}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));`;
test('HR navigation, route and in-flight replies fail closed when canonical department changes',async t=>withBrowserFixture(harness,async h=>{
 const job=await Job.create({title:'Private recruitment vacancy',department:'Operations',description:'Synthetic private description'});
 await h.open('admin','/app/recruitment/jobs');await h.page.getByText(job.title,{exact:true}).waitFor();
 const profile=await h.profile('admin');profile.role='hr_manager';profile.departmentId='dep_hr';profile.hrAccess=true;
 for(const scope of ['all','own','department','assigned'])await t.test(scope+' grants cannot bypass Audit department membership',async()=>{
  const denied={...profile,departmentId:'dep_audit',permissions:[{resource:'*',action:'*',scope}]};h.wire.length=0;
  await h.page.evaluate(p=>window.setTestUser(p),denied);await h.page.locator('[data-hr-state=forbidden]').waitFor();
  assert.equal(await h.page.locator('[data-hr-menu]').count(),0);assert.equal(await h.page.getByText(job.title,{exact:true}).count(),0);assert.equal(h.wire.length,0);
  assert.equal(await h.page.locator('[data-audit-access]').getAttribute('data-audit-access'),'true');
 });
 await t.test('HR membership alone grants no resource; stale server metadata cannot bypass department',async()=>{
  await h.page.evaluate(p=>window.setTestUser(p),{...profile,permissions:[]});await h.page.locator('[data-hr-state=forbidden]').waitFor();assert.equal(await h.page.locator('[data-hr-menu]').count(),0);
 });
 await t.test('Current HR membership/grant restores access, then pending reply is suppressed on department loss',async()=>{
  await h.page.evaluate(p=>window.setTestUser(p),profile);await h.page.getByText(job.title,{exact:true}).waitFor();
  let enter,release;const ready=new Promise(r=>enter=r),gate=new Promise(r=>release=r);
  await h.page.route('**/api/hr/v2/jobs?*',async r=>{enter();await gate;await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{_id:String(job._id),title:'Stale confidential vacancy',status:'open'}],page:1,pageSize:30,total:1,totalPages:1})});});
  try {await h.page.getByRole('button',{name:'Yenilə',exact:true}).click();await ready;
   await h.page.evaluate(p=>window.setTestUser(p),{...profile,departmentId:'dep_audit'});await h.page.locator('[data-hr-state=forbidden]').waitFor();release();
   await h.page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   assert.equal(await h.page.getByText('Stale confidential vacancy',{exact:true}).count(),0);
  }finally{release();await h.page.unroute('**/api/hr/v2/jobs?*');}
 });
 assert.deepEqual(h.pageErrors,[]);
}));
