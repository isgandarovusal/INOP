const test = require('node:test'), assert = require('node:assert/strict');
const { withBrowserFixture } = require('./helpers/browser.cjs');
const harness = `import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';import {AuthContext} from '/src/Context/AuthContext.ts';import '/src/i18n/index.ts';import Jobs from '/src/Pages/Recruitment/Jobs/JobDetail.tsx';import Candidate from '/src/Pages/Recruitment/Candidates/CandidateDetail.tsx';import Apps from '/src/Pages/Recruitment/Applications/ApplicationsList.tsx';import api from '/src/api/axios.ts';api.defaults.baseURL='/api';function App(){window.navigateTest=useNavigate();const [user,setUser]=React.useState(window.testUser);window.setTestUser=setUser;return React.createElement(AuthContext.Provider,{value:{user,isLoading:false}},React.createElement(Routes,null,React.createElement(Route,{path:'/app/recruitment/jobs/:id',element:React.createElement(Jobs)}),React.createElement(Route,{path:'/app/recruitment/candidates/:id',element:React.createElement(Candidate)}),React.createElement(Route,{path:'/app/recruitment/applications',element:React.createElement(Apps)})));}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));`;
test('Trusted Application matching is consistent across vacancy, profile, table and board', async t => withBrowserFixture(harness, async h => {
  const createJob = async (skills, experience = 0) => (await h.request('admin', 'POST', '/jobs', { title: 'Cashier', department: 'HR', description: 'Cashier duties', requiredSkills: skills, experienceYears: experience })).data;
  const candidate = (await h.request('admin', 'POST', '/candidates', { name: 'Contextual applicant', role: 'Cashier', skills: ['Kassa'], experience: null })).data;
  const job = await createJob(['Cash handling']); const other = await createJob(['HACCP']);
  const apply = async j => (await h.request('admin', 'POST', '/applications', { jobId: j._id, candidateId: candidate._id })).data;
  const app = await apply(job), zero = await apply(other);
  const badge = id => h.page.locator(`[data-application-score="${id}"]`);
  await t.test('table distinguishes a genuine zero from a missing score and exposes criterion evidence', async () => {
    h.wire.length = 0; await h.open('admin', '/app/recruitment/applications'); await badge(app._id).waitFor();
    assert.equal(h.wire.filter(r => r.path === '/api/applications/' + app._id).length, 0, 'Evidence is not fetched for collapsed summaries');
    assert.equal(await badge(app._id).locator('strong').textContent(), '100%'); assert.equal(await badge(zero._id).locator('strong').textContent(), '0%');
    await badge(app._id).locator('summary').filter({ hasText: 'Uyğunluğun izahı' }).click(); await badge(app._id).getByText(/cash handling/).waitFor(); assert.match(await badge(app._id).textContent(), /cash handling/); assert.equal(h.wire.filter(r => r.path === '/api/applications/' + app._id).length, 1);
  });
  await t.test('JobDetail and Candidate profile show the same per-vacancy scores', async () => {
    await h.open('admin', '/app/recruitment/jobs/' + job._id); await badge(app._id).waitFor(); assert.equal(await badge(app._id).locator('strong').textContent(), '100%'); assert.equal(await badge(zero._id).count(), 0);
    await h.open('admin', '/app/recruitment/candidates/' + candidate._id); await badge(app._id).waitFor(); assert.equal(await badge(zero._id).locator('strong').textContent(), '0%');
  });
  await t.test('Application board keeps the same Candidate separate for two vacancies', async () => {
    await h.open('admin', '/app/recruitment/applications'); await badge(app._id).waitFor(); await h.page.getByRole('button', { name: 'Application Kanban', exact: true }).click();
    await h.page.locator('[data-application-kanban]').waitFor(); assert.equal(await h.page.locator('article.recruitment-kanban__card').count(), 2);
    assert.equal(await badge(app._id).locator('strong').textContent(), '100%'); assert.equal(await badge(zero._id).locator('strong').textContent(), '0%');
  });
  await t.test('Job changes invalidate display; authorized recalculation updates the persisted result', async () => {
    await h.request('admin', 'PUT', '/jobs/' + job._id, { requiredSkills: ['HACCP'] });
    await h.open('admin', '/app/recruitment/applications'); await badge(app._id).waitFor(); assert.equal(await badge(app._id).getAttribute('data-score-status'), 'stale');
    assert.ok(!await badge(app._id).textContent().then(s => s.includes('100%')));
    await badge(app._id).locator('summary').filter({ hasText: 'Yenidən hesabla' }).click(); await badge(app._id).getByRole('button', { name: 'Yenidən hesabla', exact: true }).click();
    await h.page.locator(`[data-application-score="${app._id}"][data-score-status=calculated]`).waitFor(); assert.equal(await badge(app._id).locator('strong').textContent(), '0%');
  });
  await t.test('incomplete relevant experience can be explicitly reviewed with a required reason', async () => {
    const needsExperience = await createJob(['Cash handling'], 2), incomplete = await apply(needsExperience);
    await h.open('admin', '/app/recruitment/applications'); await badge(incomplete._id).waitFor(); assert.equal(await badge(incomplete._id).locator('strong').textContent(), 'Məlumat natamamdır');
    await badge(incomplete._id).locator('summary').filter({ hasText: 'Yenidən hesabla' }).click();
    await badge(incomplete._id).getByRole('spinbutton').fill('2'); assert.equal(await badge(incomplete._id).getByRole('button', { name: 'Yenidən hesabla', exact: true }).isDisabled(), true);
    await badge(incomplete._id).getByRole('textbox').fill('HR verified employment dates'); await badge(incomplete._id).getByRole('button', { name: 'Yenidən hesabla', exact: true }).click();
    await h.page.locator(`[data-application-score="${incomplete._id}"][data-score-status=calculated]`).waitFor(); assert.equal(await badge(incomplete._id).locator('strong').textContent(), '100%');
  });
  await t.test('a denied lazy evidence request retains the primary row, hides the old score without an unintended aggregate/detail refetch', async () => {
    const pattern = '**/api/applications/' + app._id;
    await h.page.route(pattern, r => r.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"Evidence revoked"}' }));
    try {
      await h.open('admin', '/app/recruitment/applications'); await badge(app._id).waitFor();
      await badge(app._id).locator('summary').filter({ hasText: 'Uyğunluğun izahı' }).click(); await badge(app._id).locator('details[open] [data-hr-state=forbidden]').waitFor();
      assert.equal(await h.page.locator('tbody tr').count(), 3); assert.ok(!await badge(app._id).textContent().then(text => text.includes('100%')));
    } finally { await h.page.unroute(pattern); }
  });
  await t.test('late evidence cannot write after permission revocation', async () => {
    let release, entered; const gate = new Promise(r => release = r), started = new Promise(r => entered = r), pattern = '**/api/applications/' + app._id;
    const response = await h.request('admin', 'GET', '/applications/' + app._id);
    await h.page.route(pattern, async r => { entered(); await gate; await r.fulfill({ contentType: 'application/json', body: JSON.stringify(response.data) }); });
    try {
      await h.open('admin', '/app/recruitment/applications'); await badge(app._id).waitFor(); await badge(app._id).locator('summary').filter({ hasText: 'Uyğunluğun izahı' }).click(); await started;
      const profile = await h.profile('admin'); profile.permissions = []; await h.page.evaluate(p => window.setTestUser(p), profile); await h.page.locator('[data-hr-state=forbidden]').waitFor(); release(); await h.page.waitForLoadState('networkidle'); assert.equal(await badge(app._id).count(), 0);
    } finally { release(); await h.page.unroute(pattern); }
  });
  await t.test('parent permissions and permission revocation remove scores and evidence immediately', async () => {
    await h.models.Role.create({ key: 'matching_app_only', name: 'App only', permissions: [{ resource: 'application', action: 'read', scope: 'all' }] });
    await h.models.User.updateOne({ _id: h.actors.peer._id }, { $set: { role: 'matching_app_only' } });
    await h.open('peer', '/app/recruitment/applications'); await badge(app._id).waitFor(); assert.equal(await badge(app._id).getAttribute('data-score-status'), 'restricted');
    assert.equal(await badge(app._id).locator('details').count(), 0); assert.equal(await h.page.getByText('Contextual applicant', { exact: true }).count(), 0);
    const profile = await h.profile('peer'); profile.permissions = []; await h.page.evaluate(p => window.setTestUser(p), profile); await h.page.locator('[data-hr-state=forbidden]').waitFor(); assert.equal(await badge(app._id).count(), 0);
  });
  assert.deepEqual(h.pageErrors, []);
}));

const detailHarness=`import React from'react';import{createRoot}from'react-dom/client';import App from'/src/App.tsx';import api from'/src/api/axios.ts';import i18n from'/src/i18n/index.ts';api.defaults.baseURL='/api';window.navigateTest=()=>{};window.localeTest=l=>i18n.changeLanguage(l);createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(App)));`;
test('Experience and evidence explanations are localized, factual and request-neutral in Application Detail', async t => withBrowserFixture(detailHarness, async h => {
  const rows=[];h.page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))rows.push({method:r.method(),path:u.pathname});});
  const job=(await h.request('admin','POST','/jobs',{title:'Synthetic matching vacancy',department:'HR',description:'Synthetic duties',requiredSkills:['Cash handling'],experienceYears:5})).data;
  const candidate=(await h.request('admin','POST','/candidates',{name:'Synthetic matching person',role:'Cashier',skills:['Cash handling'],experience:3})).data;
  const app=(await h.request('admin','POST','/applications',{jobId:job._id,candidateId:candidate._id})).data;
  const response=(await h.request('admin','GET','/applications/'+app._id)).data;
  const pattern='**/api/applications/'+app._id;
  const badge=h.page.locator('[data-application-score="'+app._id+'"]');
  const sourceLabels={az:'Uyğun vəzifə üzrə təcrübə',en:'Experience in a matching role',ru:'Опыт на соответствующей должности'};
  const expected={az:['Namizəd: 3 il','Tələb: 5 il'],en:['Candidate: 3 years','Required: 5 years'],ru:['Кандидат: 3 года','Требуется: 5 лет']};
  for(const [name,value,required,known,source,status] of [
    ['below',3,5,true,'candidate.experience:matching-role','calculated'],
    ['meeting',5,5,true,'application.hr-review','calculated'],
    ['fraction',1.5,2,true,'candidate.employmentHistory:dated-matching-role','calculated'],
    ['zero',0,5,true,'candidate.skills','calculated'],
    ['unknown-zero',0,5,false,'__proto__','incomplete'],
    ['unknown',null,5,false,'UNTRUSTED_SOURCE_KEY','incomplete'],
    ['missing-required',3,null,true,'candidate.education','calculated'],
    ['invalid',-1,5,true,'candidate.certificates','incomplete'],
    ['stale',3,5,true,'candidate.employmentHistory:unknown','stale']]) await t.test(name,async()=>{
      const body=structuredClone(response);body.score=60;body.scoreStatus=status;
      // Keep the server score fixed: presentation must never recompute it from experience.
      body.matching={...body.matching,summary:false,version:'ats-v2',reason:status==='incomplete'?'facts_missing':null,criteria:[{key:'experience',weight:1,known,value,required,ratio:0.6,source}]};
      await h.page.route(pattern,r=>r.fulfill({contentType:'application/json',body:JSON.stringify(body)}));
      try {
        rows.length=0;await h.open('admin','/app/recruitment/applications/'+app._id);await badge.waitFor();await badge.locator('details summary').first().click();
        await badge.locator('[data-match-method]').waitFor();await h.page.waitForLoadState('networkidle');
        const count=rows.length;assert.equal(count,4,'Auth, detail, history and interviewers only');
        for(const lang of ['az','en','ru']) {
          await h.page.evaluate(l=>window.localeTest(l),lang);
          const line=badge.locator('details[open] p').filter({hasText:/100%/});await line.waitFor();
          const text=(await line.textContent()).replaceAll('\u00a0',' ');assert.ok(!text.includes(source),'No raw evidence key');assert.ok(!text.includes('hrMatch.'));
          if(name==='below'){for(const part of expected[lang])assert.ok(text.includes(part),text);assert.ok(text.includes(sourceLabels[lang]));}
          if(name==='fraction')assert.match(text,{az:/1[.,]5 il/,en:/1\.5 years/,ru:/1,5 года/}[lang]);
          if(name==='zero')assert.ok(text.includes({az:'Namizəd: 0 il',en:'Candidate: 0 years',ru:'Кандидат: 0 лет'}[lang]),text);
          if(name==='meeting')assert.ok(text.includes({az:'Namizəd: 5 il · Tələb: 5 il',en:'Candidate: 5 years · Required: 5 years',ru:'Кандидат: 5 лет · Требуется: 5 лет'}[lang]),text);
          if(name==='unknown'||name==='unknown-zero'||name==='invalid'){
            assert.ok(!text.includes('-1'));assert.ok(!text.includes(lang==='en'?'Candidate: 0':lang==='az'?'Namizəd: 0':'Кандидат: 0'));
            assert.ok(text.includes({az:'Namizəd: Məlum deyil',en:'Candidate: Unknown',ru:'Кандидат: Неизвестно'}[lang]),text);
          }
          if(name==='missing-required')assert.ok(text.includes({az:'Tələb: Məlum deyil',en:'Required: Unknown',ru:'Требуется: Неизвестно'}[lang]),text);
          assert.equal(await badge.locator('strong').textContent(),status==='calculated'?'60%':{az:{stale:'Yenidən qiymətləndirmə gözləyir',incomplete:'Məlumat natamamdır'},en:{stale:'Awaiting recalculation',incomplete:'Incomplete information'},ru:{stale:'Ожидает пересчёта',incomplete:'Недостаточно данных'}}[lang][status]);
          for(const width of [1440,768,390,320]){
            await h.page.setViewportSize({width,height:1000});
            assert.equal(await h.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,lang+'/'+width);
            if(process.env.INOP_MATCH_SCREENSHOTS&&['below','meeting','fraction','unknown','stale'].includes(name)&&[1440,320].includes(width)){
              const fs=require('node:fs');fs.mkdirSync(process.env.INOP_MATCH_SCREENSHOTS,{recursive:true});
              await h.page.screenshot({animations:'disabled',path:require('node:path').join(process.env.INOP_MATCH_SCREENSHOTS,`${name}-${lang}-${width}.png`),fullPage:true});
            }
          }
        }
        assert.equal(rows.length,count,'Locale, layout and explanation add no requests');assert.ok(rows.every(r=>r.method==='GET'));
      }finally{await h.page.unroute(pattern);}
    });
  assert.deepEqual(h.pageErrors,[]);
}));

test('Candidate matching navigation uses independently scoped Application records',async t=>withBrowserFixture(detailHarness,async h=>{
 const Application=require('../../Backend/models/application.model'),locales=Object.fromEntries(['az','en','ru'].map(l=>[l,require('../src/i18n/locales/'+l+'.json')]));
 const c=(await h.request('admin','POST','/candidates',{name:'Synthetic Matching Navigation Applicant',role:'Cashier',skills:['Cash handling']})).data;
 const makeJob=async title=>(await h.request('admin','POST','/jobs',{title,department:'HR',description:'Synthetic',requiredSkills:['Cash handling']})).data;
 const j=await makeJob('Synthetic vacancy — Cashier operations and customer service coordination'),other=await makeJob('Synthetic vacancy — Safety and training support');
 const first=(await h.request('admin','POST','/applications',{candidateId:c._id,jobId:j._id})).data,second=(await h.request('admin','POST','/applications',{candidateId:c._id,jobId:other._id})).data;
 const url='/app/recruitment/candidates/'+c._id,panel=h.page.locator('[data-candidate-matches]'),links=panel.locator('[data-candidate-application-link]'),observed=[];
 h.page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))observed.push(u.pathname);});
 await t.test('two authorized matching cards expose distinct existing Application detail targets without eager reads',async()=>{
  const start=observed.length;await h.open('admin',url);await panel.locator('article').nth(1).waitFor();await h.page.waitForLoadState('networkidle');assert.equal(observed.length-start,3);assert.equal(await links.count(),2);assert.equal(await panel.locator('[data-hr-pagination] [role=status]').textContent(),locales.az.hrPage.summary.replace('{{page}}','1').replace('{{shown}}','2').replace('{{total}}','2'));assert.deepEqual((await links.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')))).sort(),[first,second].map(a=>'/app/recruitment/applications/'+a._id).sort());assert.equal(observed.slice(start).filter(p=>/^\/api\/applications\//.test(p)).length,0);
 });
 await t.test('localized matching links stay keyboard accessible across four widths without requests',async()=>{
  const count=observed.length;for(const language of ['az','en','ru']){await h.page.evaluate(l=>window.localeTest(l),language);await panel.getByRole('heading',{name:locales[language].hrMatch.applications,exact:true}).waitFor();for(const width of [1440,768,390,320]){await h.page.setViewportSize({width,height:1000});await h.page.evaluate(()=>document.fonts.ready);await links.first().focus();assert.equal(await links.first().evaluate(e=>e===document.activeElement),true);assert.ok((await links.first().getAttribute('aria-label')).startsWith(locales[language].hrWorkflow.details));assert.equal(await h.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,language+'/'+width);if(process.env.INOP_CANDIDATE_NAV_SCREENSHOTS&&[['az',1440],['en',768],['ru',390],['az',320]].some(([l,w])=>l===language&&w===width)){require('node:fs').mkdirSync(process.env.INOP_CANDIDATE_NAV_SCREENSHOTS,{recursive:true});await panel.screenshot({path:require('node:path').join(process.env.INOP_CANDIDATE_NAV_SCREENSHOTS,`candidate-nav-${language}-${width}.png`)});}}}assert.equal(observed.length,count);
 });
 await t.test('assigned read-only scope excludes another Application and follows only its permitted target',async()=>{
  await h.models.Role.create({key:'matching_navigation_reader',name:'Synthetic assigned matching reader',permissions:[{resource:'candidate',action:'read',scope:'all'},{resource:'application',action:'read',scope:'assigned'}]});await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{role:'matching_navigation_reader',departmentId:'dep_hr'}});await Application.updateOne({_id:first._id},{$set:{assignedTo:h.actors.peer._id}});
  await h.open('peer',url);await links.first().waitFor();await h.page.waitForLoadState('networkidle');assert.equal(await links.count(),1);assert.equal(await panel.locator('[data-hr-pagination] [role=status]').textContent(),locales.az.hrPage.summary.replace('{{page}}','1').replace('{{shown}}','1').replace('{{total}}','1'));assert.equal(await links.first().getAttribute('href'),'/app/recruitment/applications/'+first._id);assert.ok(!(await panel.textContent()).includes(other.title));assert.ok((await panel.textContent()).includes(locales.az.hrStates.restricted));assert.equal((await h.request('peer','GET','/applications/'+second._id)).status,404);
  if(process.env.INOP_CANDIDATE_NAV_SCREENSHOTS)await panel.screenshot({path:require('node:path').join(process.env.INOP_CANDIDATE_NAV_SCREENSHOTS,'candidate-nav-restricted-320.png')});const count=observed.length,historyReady=h.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/applications/'+first._id+'/history');await links.first().press('Enter');await h.page.waitForURL('**/applications/'+first._id);assert.equal((await historyReady).status(),200);await h.page.locator('[data-application-history] li').first().waitFor();await h.page.waitForLoadState('networkidle');assert.deepEqual(observed.slice(count).sort(),['/api/applications/'+first._id,'/api/applications/'+first._id+'/history'].sort());assert.equal(await h.page.locator('[data-application-workflow]').count(),0);assert.equal(await h.page.locator('[data-application-current-workflow]').count(),1);
  await h.open('peer','/app/recruitment/applications/'+second._id);await h.page.locator('[data-hr-state=not-found]').waitFor();
 });
 await t.test('Candidate permission alone does not fetch matching Applications or grant direct access',async()=>{
  await h.models.Role.create({key:'matching_candidate_only',name:'Synthetic candidate only',permissions:[{resource:'candidate',action:'read',scope:'all'}]});await h.models.User.updateOne({_id:h.actors.own._id},{$set:{role:'matching_candidate_only',departmentId:'dep_hr'}});const count=observed.length;await h.open('own',url);await h.page.getByRole('heading',{name:c.name,exact:true}).waitFor();await h.page.waitForLoadState('networkidle');assert.equal(await panel.count(),0);assert.equal(observed.slice(count).filter(p=>p==='/api/hr/v2/applications').length,0);assert.equal((await h.request('own','GET','/applications/'+first._id)).status,403);await h.open('own','/app/recruitment/applications/'+first._id);await h.page.locator('[data-hr-state=forbidden]').waitFor();
 });
 await t.test('malformed legacy IDs and empty results produce no target links or invented records',async()=>{
  const response=await h.request('admin','GET','/hr/v2/applications?candidateId='+c._id),pattern='**/api/hr/v2/applications?*';assert.equal(response.status,200);
  for(const ids of [['invalid', 'also-invalid'],[]]){const raw={...response.data,items:response.data.items.slice(0,ids.length).map((item,index)=>({...item,_id:ids[index],id:ids[index]})),total:ids.length,hasMore:false,nextCursor:null};await h.page.route(pattern,r=>r.fulfill({contentType:'application/json',body:JSON.stringify(raw)}));try{await h.open('admin',url);await panel.waitFor();await h.page.waitForLoadState('networkidle');assert.equal(await links.count(),0);assert.equal(await panel.locator('article').count(),ids.length);if(ids.length===0){assert.ok((await panel.textContent()).includes(locales.az.hrMatch.empty));if(process.env.INOP_CANDIDATE_NAV_SCREENSHOTS)await panel.screenshot({path:require('node:path').join(process.env.INOP_CANDIDATE_NAV_SCREENSHOTS,'candidate-nav-empty-320.png')});}}finally{await h.page.unroute(pattern);}}
 });
 await t.test('revoked permission discards an older in-flight scoped page response',async()=>{
  const response=await h.request('peer','GET','/hr/v2/applications?candidateId='+c._id);assert.equal(response.status,200);let release;const hold=new Promise(r=>{release=r;}),pattern='**/api/hr/v2/applications?*';await h.page.route(pattern,async r=>{await hold;await r.fulfill({contentType:'application/json',body:JSON.stringify(response.data)});});
  try{const seen=h.page.waitForRequest(r=>new URL(r.url()).pathname==='/api/hr/v2/applications');await h.open('peer',url);await seen;await h.models.Role.updateOne({key:'matching_navigation_reader'},{$set:{permissions:[{resource:'candidate',action:'read',scope:'all'}]}});await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await panel.waitFor({state:'detached'});release();await h.page.waitForLoadState('networkidle');assert.equal(await links.count(),0);assert.equal((await h.request('peer','GET','/applications/'+first._id)).status,403);}finally{release();await h.page.unroute(pattern);}
 });
 for(const status of [401,403,404])await t.test(status+' destination response cannot expose an Application or editing controls',async()=>{
  const pattern='**/api/applications/'+first._id;await h.page.route(pattern,r=>r.fulfill({status,contentType:'application/json',body:'{}'}));try{await h.open('admin','/app/recruitment/applications/'+first._id);if(status===401){await h.page.waitForURL('**/login');await h.page.locator('#email').waitFor();}else await h.page.locator('[data-hr-state='+ (status===403?'forbidden':'not-found')+']').waitFor();assert.equal(await h.page.locator('[data-application-workflow],[data-application-current-workflow],[data-application-handoff]').count(),0);}finally{await h.page.unroute(pattern);}
 });
 assert.deepEqual(h.pageErrors,[]);
}));
