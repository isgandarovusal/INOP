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
