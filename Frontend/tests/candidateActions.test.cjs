const test=require('node:test'),assert=require('node:assert/strict');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const Candidate=require('../../Backend/models/candidate.model');
const harness=`import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';import {AuthContext} from '/src/Context/AuthContext.ts';import '/src/i18n/index.ts';import Detail from '/src/Pages/Recruitment/Candidates/CandidateDetail.tsx';import api from '/src/api/axios.ts';api.defaults.baseURL='/api';function App(){window.navigateTest=useNavigate();const [user,setUser]=React.useState(window.testUser);window.setTestUser=setUser;return React.createElement(AuthContext.Provider,{value:{user,isLoading:false}},React.createElement(Routes,null,React.createElement(Route,{path:'/app/recruitment/candidates/:id',element:React.createElement(Detail)}),React.createElement(Route,{path:'/app/recruitment/candidates',element:React.createElement('p',null,'Candidate list reached')})));}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));`;
test('Candidate detail actions stay in the initiating permission and profile context',async t=>withBrowserFixture(harness,async h=>{
 const p={createdBy:h.actors.admin._id,departmentId:'dep_A',assignedTo:h.actors.admin._id};
 const first=await Candidate.create({name:'First action profile',role:'Cashier',...p}),second=await Candidate.create({name:'Second action profile',role:'Manager',...p});
 const open=async id=>{await h.open('admin','/app/recruitment/candidates/'+id);await h.page.getByRole('heading',{name:id.equals(first._id)?'First action profile':'Second action profile',exact:true}).waitFor();};
 await t.test('a PDF response arriving after permission revocation cannot start a download',async()=>{
  const url='**/api/candidate-export/'+first._id+'/pdf';const bytes=(await h.request('admin','GET','/candidate-export/'+first._id+'/pdf')).buffer;
  let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);const downloads=[];const observed=d=>downloads.push(d);h.page.on('download',observed);
  await h.page.route(url,async r=>{entered();await gate;await r.fulfill({contentType:'application/pdf',body:bytes});});
  try{await open(first._id);await h.page.locator('.candidate-detail-action--export').click();await started;const profile=await h.profile('admin');profile.permissions=[];await h.page.evaluate(p=>window.setTestUser(p),profile);await h.page.locator('[data-hr-state=forbidden]').waitFor();release();await h.page.waitForLoadState('networkidle');assert.equal(downloads.length,0);}finally{release();h.page.off('download',observed);await h.page.unroute(url);}
 });
 if(process.env.INOP_BASELINE_ONLY)return;
 await t.test('a late export from another profile cannot download or leave the new export button busy',async()=>{
  const url='**/api/candidate-export/'+first._id+'/pdf';const bytes=(await h.request('admin','GET','/candidate-export/'+first._id+'/pdf')).buffer;
  let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);const downloads=[];const observed=d=>downloads.push(d);h.page.on('download',observed);
  await h.page.route(url,async r=>{entered();await gate;await r.fulfill({contentType:'application/pdf',body:bytes});});
  try{await open(first._id);await h.page.locator('.candidate-detail-action--export').click();await started;await h.page.evaluate(id=>window.navigateTest('/app/recruitment/candidates/'+id),String(second._id));await h.page.getByRole('heading',{name:'Second action profile',exact:true}).waitFor();release();await h.page.waitForLoadState('networkidle');assert.equal(downloads.length,0);assert.equal(await h.page.locator('.candidate-detail-action--export').isDisabled(),false);}finally{release();h.page.off('download',observed);await h.page.unroute(url);}
 });
 await t.test('late successful delete response cannot navigate away from a newer profile',async()=>{
  const url='**/api/candidates/'+first._id;let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
  await h.page.route(url,async r=>{if(r.request().method()!=='DELETE')return r.fallback();entered();await gate;await r.fulfill({contentType:'application/json',body:'{"message":"Synthetic completed mutation"}'});});
  const accept=d=>d.accept();h.page.on('dialog',accept);
  try{await open(first._id);await h.page.locator('.candidate-detail-action--delete').click();await started;await h.page.evaluate(id=>window.navigateTest('/app/recruitment/candidates/'+id),String(second._id));await h.page.getByRole('heading',{name:'Second action profile',exact:true}).waitFor();release();await h.page.waitForLoadState('networkidle');assert.ok(h.page.url().endsWith('/'+second._id));assert.equal(await h.page.locator('.candidate-detail-action--delete').isDisabled(),false);assert.ok(await Candidate.exists({_id:first._id}),'Synthetic delayed response does not delete fixture records');}finally{release();h.page.off('dialog',accept);await h.page.unroute(url);}
 });
 for(const status of [401,403,404,500])await t.test(`export HTTP ${status} is a distinct secondary state and keeps authorized profile`,async()=>{
  const url='**/api/candidate-export/'+first._id+'/pdf';await h.page.route(url,r=>r.fulfill({status,contentType:'application/json',body:'{"message":"Synthetic export failure"}'}));
  try{await open(first._id);await h.page.locator('.candidate-detail-action--export').click();await h.page.locator(`[data-candidate-action-error] [data-hr-state=${{401:'unauthenticated',403:'forbidden',404:'not-found',500:'server-error'}[status]}]`).waitFor();assert.equal(await h.page.getByRole('heading',{name:'First action profile',exact:true}).count(),1);assert.equal(await h.page.locator('.candidate-detail-action--export').isDisabled(),false);}finally{await h.page.unroute(url);}
 });
 await t.test('an authorized export downloads actual server PDF using Bearer and a normal delete still persists',async()=>{
  await open(second._id);const downloaded=h.page.waitForEvent('download');await h.page.locator('.candidate-detail-action--export').click();const file=await downloaded;assert.equal(file.suggestedFilename(),'candidate-'+second._id+'.pdf');
  const data=await require('node:fs/promises').readFile(await file.path());assert.ok(data.subarray(0,5).equals(Buffer.from('%PDF-')));assert.ok(h.wire.some(r=>r.actor==='admin'&&r.path==='/api/candidate-export/'+second._id+'/pdf'));
  const disposable=await Candidate.create({name:'Disposable fixture profile',role:'Cashier',...p});await h.open('admin','/app/recruitment/candidates/'+disposable._id);await h.page.getByRole('heading',{name:'Disposable fixture profile',exact:true}).waitFor();
  const accept=d=>d.accept();h.page.once('dialog',accept);await h.page.locator('.candidate-detail-action--delete').click();await h.page.waitForURL('**/app/recruitment/candidates');assert.equal(await Candidate.exists({_id:disposable._id}),null);
 });
 assert.deepEqual(h.pageErrors,[]);
}));
