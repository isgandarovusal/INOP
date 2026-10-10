const test=require('node:test'),assert=require('node:assert/strict');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const Job=require('../../Backend/models/job.model');
const harness=`import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';import {AuthContext} from '/src/Context/AuthContext.ts';import i18n from '/src/i18n/index.ts';import JobForm from '/src/Pages/Recruitment/Jobs/JobForm.tsx';import Jobs from '/src/Pages/Recruitment/Jobs/JobsList.tsx';import api from '/src/api/axios.ts';import '/src/App.css';import '/src/Styles/recruitment.css';api.defaults.baseURL='/api';window.changeLanguage=l=>i18n.changeLanguage(l);function App(){window.navigateTest=useNavigate();const [user,setUser]=React.useState(window.testUser);window.setTestUser=setUser;return React.createElement(AuthContext.Provider,{value:{user,isLoading:false}},React.createElement(Routes,null,React.createElement(Route,{path:'/app/recruitment/jobs/new',element:React.createElement(JobForm)}),React.createElement(Route,{path:'/app/recruitment/jobs/:id/edit',element:React.createElement(JobForm)}),React.createElement(Route,{path:'/app/recruitment/jobs',element:React.createElement(Jobs)})));}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));`;
const proposal={version:'job-skills-v1',status:'suggested',requiredSkills:[{name:'Food safety',reason:'Professional duties',confidence:0.8}],preferredSkills:[{name:'HACCP',reason:'HR supplied context',confidence:null}],uncertainty:['Review relevance.'],requiresApproval:true,provenance:{provider:'openai',model:'synthetic-test-model',mode:'mock_test_only',contextHash:'a'.repeat(64)}};
test('AI job skills UI is explicit, human-reviewed and bound to immutable route/auth/draft context',async t=>withBrowserFixture(harness,async h=>{
 const pattern='**/api/hr/ai/job-skills',assistant=()=>h.page.locator('[data-job-skills-assistant]');
 const open=async()=>{await h.open('admin','/app/recruitment/jobs/new');await h.page.getByLabel('Vakansiyanın adı *',{exact:true}).fill('Synthetic cashier');await h.page.getByLabel('Vakansiya haqqında',{exact:true}).fill('Cash handling and food safety');};
 const generate=()=>h.page.locator('button.recruitment-ai-action').click();
 let proposalCalls=0;
 const reply=(body=proposal,status=200)=>h.page.route(pattern,r=>{proposalCalls++;return r.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});});
 await t.test('missing real provider shows unavailable instead of hardcoded skills; manual form remains usable',async()=>{
  await open();await generate();
  if(process.env.INOP_BASELINE_ONLY){await h.page.waitForTimeout(800);assert.equal(await h.page.locator('.tag-chip').count(),0,'Unconfigured provider must never manufacture skills');return;}
  await h.page.getByRole('alert').filter({hasText:'AI konfiqurasiya edilməyib'}).waitFor();assert.equal(await h.page.locator('.tag-chip').count(),0);assert.equal(await h.page.locator('[data-ai-proposal]').count(),0);assert.equal(h.wire.filter(r=>r.path==='/api/hr/ai/job-skills').length,1);assert.equal(await h.page.getByRole('button',{name:'Vakansiyanı dərc et',exact:true}).isEnabled(),true);
 });
 if(process.env.INOP_BASELINE_ONLY)return;
 await t.test('review explains confidence/unknown and mock identity without automatically changing fields',async()=>{
  await reply();await generate();await h.page.getByText('MOCK TEST — real AI nəticəsi deyil',{exact:true}).waitFor();assert.ok((await assistant().textContent()).includes('Naməlum'));assert.ok((await assistant().textContent()).includes('80%'));assert.equal(await h.page.locator('input[name=position]').inputValue(),'Synthetic cashier');assert.equal(await h.page.locator('.tag-chip').count(),2);assert.equal(await h.page.locator('[data-ai-proposal]').count(),1);
  // Only proposal chips exist: the editable main form still has zero skills.
  assert.equal(await h.page.locator('.tag-chip').evaluateAll(nodes=>nodes.filter(n=>!n.closest('[data-ai-proposal]')).length),0);
 });
 await t.test('HR edits a proposal then approves; only explicit submit persists skills',async()=>{
  const input=h.page.getByLabel('Təklif edilən məcburi bacarıqlar',{exact:true});await input.fill('Cash handling');await input.press('Enter');
  await h.page.getByRole('button',{name:'Yoxladığım bacarıqları formaya əlavə et',exact:true}).click();assert.equal(await h.page.locator('[data-ai-proposal]').count(),0);assert.equal(await Job.countDocuments({title:'Synthetic cashier'}),0);
  await h.page.getByRole('button',{name:'Vakansiyanı dərc et',exact:true}).click();await h.page.waitForURL('**/app/recruitment/jobs');const row=await Job.findOne({title:'Synthetic cashier'}).lean();assert.deepEqual(row.requiredSkills,['Food safety','Cash handling']);assert.deepEqual(row.preferredSkills,['HACCP']);
 });
 await t.test('language changes keep the proposal and do not refetch; AZ/EN/RU states resolve',async()=>{
  await open();await generate();await h.page.locator('[data-ai-proposal]').waitFor();const start=h.wire.length,aiStart=proposalCalls;
  for(const [lang,label]of[['en','Add reviewed skills to form'],['ru','Добавить проверенные навыки в форму'],['az','Yoxladığım bacarıqları formaya əlavə et']]){await h.page.evaluate(l=>window.changeLanguage(l),lang);await h.page.getByRole('button',{name:label,exact:true}).waitFor();assert.ok(!(await assistant().textContent()).includes('hrAi.'));}assert.equal(h.wire.length,start);assert.equal(proposalCalls,aiStart);
 });
 await t.test('changed professional context invalidates a completed proposal',async()=>{await h.page.getByLabel('Vakansiya haqqında',{exact:true}).fill('Different responsibilities');assert.equal(await h.page.locator('[data-ai-proposal]').count(),0);});
 await t.test('long bounded provider text stays inside four viewport widths and genuine zero confidence is visible',async()=>{
  await h.page.unroute(pattern);await reply({...proposal,requiredSkills:[{name:'x'.repeat(100),reason:'r'.repeat(600),confidence:0}],provenance:{...proposal.provenance,model:'m'.repeat(100)}});await generate();await h.page.locator('[data-ai-proposal]').waitFor();assert.ok((await assistant().textContent()).includes('0%'));
  for(const width of [320,390,768,1280]){await h.page.setViewportSize({width,height:900});assert.equal(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
  await h.page.getByRole('button',{name:'Təklifi bağla',exact:true}).click();await h.page.unroute(pattern);
 });
 await t.test('a late old response cannot overwrite a new title or make its proposal approvable',async()=>{
  await h.page.unroute(pattern);let release,entered=false;const gate=new Promise(r=>release=r);await h.page.route(pattern,async r=>{entered=true;await gate;await r.fulfill({contentType:'application/json',body:JSON.stringify(proposal)}).catch(()=>{});});
  await generate();await h.page.waitForTimeout(50);assert.equal(entered,true);await h.page.getByLabel('Vakansiyanın adı *',{exact:true}).fill('Changed vacancy');release();await h.page.waitForTimeout(150);assert.equal(await h.page.locator('[data-ai-proposal]').count(),0);assert.equal(await h.page.locator('input[name=position]').inputValue(),'Changed vacancy');assert.equal(await assistant().getAttribute('aria-busy'),'false');
 });
 for(const [status,code,part] of [[503,'AI_TIMEOUT','vaxt limitini'],[429,'AI_RATE_LIMIT','limiti'],[502,'AI_INVALID_OUTPUT','yoxlamadan'],[409,'AI_CONTEXT_CHANGED','dəyişib'],[500,'UNEXPECTED','əlçatan deyil']])await t.test(`HTTP ${status} is localized, keeps the main draft and never approves stale output`,async()=>{
  await h.page.unroute(pattern);await reply({code,message:'Synthetic English provider message'},status);await generate();await h.page.getByRole('alert').filter({hasText:part}).waitFor();assert.equal(await h.page.locator('[data-ai-proposal]').count(),0);assert.equal(await h.page.locator('input[name=position]').inputValue(),'Changed vacancy');assert.ok(!(await h.page.locator('[role=alert]').textContent()).includes('Synthetic English'));assert.equal(await assistant().getAttribute('aria-busy'),'false');
 });
 await t.test('insufficient context has no fabricated criteria and no approval button',async()=>{
  await h.page.unroute(pattern);await reply({...proposal,status:'insufficient_context',requiredSkills:[],preferredSkills:[]});await generate();await h.page.getByText('Kontekst kifayət deyil.',{exact:false}).waitFor();assert.equal(await h.page.locator('[data-ai-proposal] .tag-chip').count(),0);assert.equal(await h.page.getByRole('button',{name:'Yoxladığım bacarıqları formaya əlavə et',exact:true}).count(),0);
 });
 await t.test('editing a persisted Job uses its authenticated endpoint and preserves manual preferred/location fields',async()=>{
  await h.page.unroute(pattern);const row=await Job.create({title:'Edit synthetic',description:'Food safety',department:'Operations',location:'Baku',type:'Part-time',preferredSkills:['Customer service'],experienceYears:0,createdBy:h.actors.admin._id});
  let request;await h.page.route('**/api/jobs/*/ai-skills',r=>{request=r.request();return r.fulfill({contentType:'application/json',body:JSON.stringify(proposal)});});
  await h.open('admin',`/app/recruitment/jobs/${row._id}/edit`);await h.page.locator('input[name=position]').waitFor();await generate();await h.page.locator('[data-ai-proposal]').waitFor();assert.equal(new URL(request.url()).pathname,`/api/jobs/${row._id}/ai-skills`);assert.equal(request.method(),'POST');assert.equal(request.headers().authorization,'Bearer '+h.tokens.admin);const body=request.postDataJSON();assert.equal(body.title,'Edit synthetic');assert.equal(body.workplace,'Baku');assert.equal(body.experienceYears,0);assert.deepEqual(body.preferredSkills,['Customer service']);assert.equal(body.role,undefined);
  await h.page.getByRole('button',{name:'Yoxladığım bacarıqları formaya əlavə et',exact:true}).click();await h.page.getByRole('button',{name:'Yenilə',exact:true}).click();await h.page.waitForURL('**/app/recruitment/jobs');const latest=await Job.findById(row._id).lean();assert.deepEqual(latest.preferredSkills,['Customer service','HACCP']);assert.deepEqual(latest.requiredSkills,['Food safety']);assert.equal(latest.type,'Part-time');assert.equal(latest.department,'Operations');assert.equal(latest.experienceYears,0);assert.equal(latest.location,'Baku');await h.page.unroute('**/api/jobs/*/ai-skills');
 });
 for(const [status,state]of[[401,'unauthenticated'],[403,'forbidden'],[404,'not-found']])await t.test(`HTTP ${status} fails closed instead of leaving the form editable`,async()=>{
  await h.page.unroute(pattern);await open();await reply({code:'AI_PARENT_UNAVAILABLE',message:'Not allowed'},status);await generate();await h.page.locator(`[data-hr-state="${state}"]`).waitFor();assert.equal(await h.page.locator('form').count(),0);assert.equal(await h.page.locator('[data-ai-proposal]').count(),0);
 });
 await t.test('current client permission loss aborts a pending AI request and hides all old proposal controls',async()=>{
  await h.page.unroute(pattern);await open();let release;const gate=new Promise(r=>release=r);await h.page.route(pattern,async r=>{await gate;await r.fulfill({contentType:'application/json',body:JSON.stringify(proposal)}).catch(()=>{});});await generate();await h.page.evaluate(()=>window.setTestUser({...window.testUser,permissions:[]}));await h.page.locator('[data-hr-state="forbidden"]').waitFor();release();await h.page.waitForTimeout(100);assert.equal(await h.page.locator('form').count(),0);assert.equal(await h.page.locator('[data-ai-proposal]').count(),0);
 });
 assert.deepEqual(h.pageErrors,[]);
}));
