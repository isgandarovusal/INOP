const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const { withBrowserFixture } = require('./helpers/browser.cjs');
const Job = require('../../Backend/models/job.model'), Candidate = require('../../Backend/models/candidate.model'), Application = require('../../Backend/models/application.model');
const harness = `import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';import {AuthContext} from '/src/Context/AuthContext.ts';import i18n from '/src/i18n/index.ts';import '/src/App.css';import Jobs from '/src/Pages/Recruitment/Jobs/JobsList.tsx';import Candidates from '/src/Pages/Recruitment/Candidates/CandidatesList.tsx';import Apps from '/src/Pages/Recruitment/Applications/ApplicationsList.tsx';import CandidateDetail from '/src/Pages/Recruitment/Candidates/CandidateDetail.tsx';import JobDetail from '/src/Pages/Recruitment/Jobs/JobDetail.tsx';import JobForm from '/src/Pages/Recruitment/Jobs/JobForm.tsx';import CandidateForm from '/src/Pages/Recruitment/Candidates/CandidateForm.tsx';import Detail from '/src/Pages/Recruitment/Applications/ApplicationDetail.tsx';import api from '/src/api/axios.ts';api.defaults.baseURL='/api';window.changeLanguage=l=>i18n.changeLanguage(l);function App(){window.navigateTest=useNavigate();const [user,setUser]=React.useState(window.testUser);window.setTestUser=setUser;return React.createElement(AuthContext.Provider,{value:{user,isLoading:false}},React.createElement(Routes,null,React.createElement(Route,{path:'/app/recruitment/jobs',element:React.createElement(Jobs)}),React.createElement(Route,{path:'/app/recruitment/candidates',element:React.createElement(Candidates)}),React.createElement(Route,{path:'/app/recruitment/applications',element:React.createElement(Apps)}),React.createElement(Route,{path:'/app/recruitment/jobs/:id',element:React.createElement(JobDetail)}),React.createElement(Route,{path:'/app/recruitment/jobs/new',element:React.createElement(JobForm)}),React.createElement(Route,{path:'/app/recruitment/candidates/:id',element:React.createElement(CandidateDetail)}),React.createElement(Route,{path:'/app/recruitment/candidates/new',element:React.createElement(CandidateForm)}),React.createElement(Route,{path:'/app/recruitment/applications/:id',element:React.createElement(Detail)})));}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));`;
test('HR lists expose named controls, skeleton and contained responsive content', async t => withBrowserFixture(harness, async h => {
  const p={createdBy:h.actors.admin._id,departmentId:'dep_A'},job=await Job.create({title:'Responsive vacancy',description:'Synthetic',department:'HR',...p}),candidate=await Candidate.create({name:'Responsive applicant',role:'Cashier',...p});
  await Candidate.create({name:'Unlinked keyboard applicant',role:'Cashier',...p});const application=await Application.create({jobId:job._id,candidateId:candidate._id,...p});
  const open=async(kind,view='table')=>{await h.open('admin',`/app/recruitment/${kind}?view=${view}`);await h.page.getByText(kind==='jobs'?'Responsive vacancy':'Responsive applicant',{exact:true}).first().waitFor();};
  for(const kind of ['jobs','candidates','applications'])await t.test(kind+' loading shows an accessible bounded skeleton and clears on success',async()=>{
    let release,entered;const gate=new Promise(r=>release=r),ready=new Promise(r=>entered=r),pattern=`**/api/hr/v2/${kind}?*`;
    await h.page.route(pattern,async r=>{entered();await gate;await r.fallback();});
    try{await h.open('admin',`/app/recruitment/${kind}`);await ready;const loading=h.page.locator('[data-hr-state=loading]');assert.equal(await loading.getAttribute('aria-busy'),'true');assert.equal(await loading.locator('[data-hr-skeleton] [data-skeleton-row]').count(),4);assert.equal(await loading.locator('[data-hr-skeleton]').getAttribute('aria-hidden'),'true');release();await h.page.getByText(kind==='jobs'?'Responsive vacancy':'Responsive applicant',{exact:true}).first().waitFor();assert.equal(await h.page.locator('[data-hr-skeleton]').count(),0);}finally{release();await h.page.unroute(pattern);}
  });
  for(const kind of ['jobs','candidates','applications'])await t.test(kind+' filter controls have names in AZ, EN and RU',async()=>{
    await open(kind);const requests=h.wire.length;
    for(const language of ['az','en','ru']){await h.page.evaluate(l=>window.changeLanguage(l),language);for(const select of await h.page.locator('.filter-bar select').all())assert.ok((await select.getAttribute('aria-label'))?.trim(),'Every filter select needs an accessible name');}
    assert.equal(h.wire.length,requests);await h.page.evaluate(()=>window.changeLanguage('az'));
  });
  for(const width of [320,390,768,1280])for(const kind of ['jobs','candidates','applications'])await t.test(`${kind} at ${width}px keeps overflow in keyboard-accessible table/board regions`,async()=>{
    await h.page.setViewportSize({width,height:844});await open(kind);
    if(kind==='candidates'){await h.page.locator('.view-switcher button').nth(1).click();assert.equal(await h.page.locator('.view-switcher button').nth(1).getAttribute('aria-pressed'),'true');}
    const layout=await h.page.evaluate(()=>({page:document.documentElement.scrollWidth,width:innerWidth,table:document.querySelector('.admin-table-container')&&getComputedStyle(document.querySelector('.admin-table-container')).overflowX}));
    assert.ok(layout.page<=layout.width+1,JSON.stringify(layout));
    {const region=h.page.locator('.admin-table-container');assert.equal(await region.getAttribute('tabindex'),'0');assert.ok(await region.getAttribute('aria-label'));assert.ok(['auto','scroll'].includes(layout.table));await region.focus();assert.equal(await region.evaluate(el=>el===document.activeElement),true);}
    if(kind==='applications'){await open(kind,'board');const board=h.page.locator('[data-application-kanban]');assert.equal(await board.getAttribute('tabindex'),'0');assert.ok(await board.getAttribute('aria-label'));assert.ok(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await board.focus();await board.press('ArrowRight');}
  });
  for(const [kind,path] of [['Job','/app/recruitment/jobs/new'],['Candidate','/app/recruitment/candidates/new'],['Application','/app/recruitment/applications/'+application._id]])await t.test(kind+' form has accessible field names and fits small screens',async()=>{
    for(const width of [320,390,768,1280]){
      await h.page.setViewportSize({width,height:844});await h.open('admin',path);await h.page.locator('form').waitFor();
      const unnamed=await h.page.locator('form input:not([type=file]):not([type=hidden]),form select,form textarea').evaluateAll(fields=>fields.filter(el=>el.getBoundingClientRect().width&&!(el.getAttribute('aria-label')||el.getAttribute('title')||Array.from(el.labels||[]).map(l=>l.textContent).join('')).trim()).map(el=>({tag:el.tagName,name:el.name})));
      assert.deepEqual(unnamed,[]);assert.ok(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
  });
  await t.test('Candidate CV chooser is keyboard reachable without uploading anything',async()=>{
    await h.open('admin','/app/recruitment/candidates/new');await h.page.locator('form').waitFor();let reached=false;
    for(let n=0;n<40;n++){await h.page.keyboard.press('Tab');if(await h.page.evaluate(()=>document.activeElement?.getAttribute('type')==='file')){reached=true;break;}}
    assert.equal(reached,true);const chooser=h.page.waitForEvent('filechooser',{timeout:3000});await h.page.keyboard.press('Space');await chooser;assert.equal(h.wire.filter(r=>r.method==='POST').length,0);
  });
  await t.test('Job detail Candidate lookup has an accessible name',async()=>{
    await h.open('admin','/app/recruitment/jobs/'+job._id);const chooser=h.page.locator('.detail-card select');await chooser.waitFor();assert.ok(await chooser.getAttribute('aria-label'));assert.ok(await chooser.locator('option').filter({hasText:'Unlinked keyboard applicant'}).count());
  });
  await t.test('CV history date controls use localized year/month labels',async()=>{
    await h.open('admin','/app/recruitment/candidates/new');await h.page.locator('form').waitFor();await h.page.getByRole('button',{name:'Əlavə et',exact:true}).first().click();
    for(const language of ['az','en','ru']){
      await h.page.evaluate(l=>window.changeLanguage(l),language);const labels=await h.page.locator('input[aria-label],select[aria-label]').evaluateAll(inputs=>inputs.map(i=>i.getAttribute('aria-label')));
      const words={az:['il','ay'],en:['year','month'],ru:['год','месяц']}[language];assert.ok(labels.some(l=>l.endsWith(' '+words[0])));assert.ok(labels.some(l=>l.endsWith(' '+words[1])));
    }
  });
  await t.test('Job and Candidate detail fit each tested viewport without hiding primary data',async()=>{
    for(const width of [320,390,768,1280])for(const [kind,id,label]of [['jobs',job._id,'Responsive vacancy'],['candidates',candidate._id,'Responsive applicant']]){
      await h.page.setViewportSize({width,height:844});await h.open('admin','/app/recruitment/'+kind+'/'+id);await h.page.getByText(label,{exact:true}).first().waitFor();assert.ok(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
  });
  await t.test('reduced motion disables decorative skeleton animation',async()=>{await h.page.emulateMedia({reducedMotion:'reduce'});await h.page.evaluate(()=>{const row=document.createElement('div');row.className='hr-skeleton-row';row.id='motion-probe';document.body.append(row);});assert.equal(await h.page.locator('#motion-probe').evaluate(el=>getComputedStyle(el).animationName),'none');});
  assert.deepEqual(h.pageErrors,[]);
}));

const memoHarness=`import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,useNavigate} from 'react-router-dom';import {AuthContext} from '/src/Context/AuthContext.ts';import i18n from '/src/i18n/index.ts';import Badge from '/src/Components/MatchScoreBadge.tsx';const application={id:'synthetic-memo',jobId:'job',candidateId:'candidate',status:'applied',scoreStatus:'pending',score:null,revision:0};const updated=()=>{};function Probe(){window.navigateTest=useNavigate();const [tick,setTick]=React.useState(0),[user,setUser]=React.useState(window.testUser);window.setTestUser=setUser;const value=React.useMemo(()=>({user,isLoading:false}),[user]);return React.createElement(AuthContext.Provider,{value},React.createElement('button',{onClick:()=>setTick(tick+1)},'Unrelated '+tick),React.createElement(Badge,{application,onUpdated:updated}));}window.changeLanguage=l=>i18n.changeLanguage(l);createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(Probe))));`;
test('Score badge skips unrelated renders but honors language and permission context',async()=>withBrowserFixture(memoHarness,async h=>{
  await h.open('admin','/memo');await h.page.locator('[data-application-score]').waitFor();const initial=await h.page.evaluate(()=>window.hrBadgeRenders);assert.ok(initial>0);
  await h.page.getByRole('button',{name:'Unrelated 0'}).click();await h.page.getByRole('button',{name:'Unrelated 1'}).waitFor();assert.equal(await h.page.evaluate(()=>window.hrBadgeRenders),initial);
  await h.page.evaluate(()=>window.changeLanguage('en'));assert.ok(await h.page.evaluate(()=>window.hrBadgeRenders)>initial);const english=await h.page.locator('[data-application-score]').textContent();assert.ok(english.includes('Awaiting'));
  const profile=await h.profile('admin');profile.permissions=[];await h.page.evaluate(p=>window.setTestUser(p),profile);assert.ok(await h.page.evaluate(()=>window.hrBadgeRenders)>initial);assert.equal(h.wire.length,0);assert.deepEqual(h.pageErrors,[]);
},{loadSource(id){if(!id.endsWith('/Components/MatchScoreBadge.tsx'))return;const source=fs.readFileSync(id,'utf8'),needle='const { t } = useTranslation();';assert.equal(source.split(needle).length,2);return source.replace(needle,'window.hrBadgeRenders=(window.hrBadgeRenders||0)+1; '+needle);}}));
