const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs/promises'), path = require('node:path');
const { withProductionHRFixture } = require('./helpers/productionHRFixture.cjs');
const Job = require('../../Backend/models/job.model'), Candidate = require('../../Backend/models/candidate.model'), Application = require('../../Backend/models/application.model');
const az = require('../src/i18n/locales/az.json');
const group = process.env.INOP_HR_UI_PACKAGE || 'candidates';
const captureOnly = process.env.INOP_CAPTURE_ONLY === 'true';
test('Screenshot-specific HR acceptance in the real production shell: ' + group, async t => withProductionHRFixture(async h => {
  const dir = process.env.INOP_HR_SCREENSHOTS;
  if (!dir || !path.isAbsolute(dir)) throw Error('Owned screenshot output required');
  await fs.mkdir(dir, { recursive: true });
  const evidence = [];
  const enabled = name => group === name || group === 'all';
  async function capture(name) {
    await h.page.waitForLoadState('networkidle');
    const measured = await h.page.evaluate(() => {
      const rect = e => { const r = e.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; };
      return { viewport: [innerWidth,innerHeight], overflow: document.documentElement.scrollWidth > innerWidth + 1,
        controls: [...document.querySelectorAll('main :is(button,input,select,textarea)')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({name:(e.getAttribute('aria-label')||e.textContent||e.name).trim().slice(0,80),...rect(e)})),
        jobGrid: document.querySelector('.job-form-page form') && { columns:getComputedStyle(document.querySelector('.job-form-page form')).gridTemplateColumns, gap:getComputedStyle(document.querySelector('.job-form-page form')).rowGap, ...rect(document.querySelector('.job-form-page form')) },
        fullRows: [...document.querySelectorAll('.job-form-page .form-group--full')].map(e=>({span:getComputedStyle(e).gridColumn,...rect(e)})) };
    });
    evidence.push({ name, ...measured });
    await h.page.screenshot({ path:path.join(dir,name+'.png'), fullPage:true });
    if (!captureOnly) assert.equal(measured.overflow,false,name+' horizontal page overflow');
    return measured;
  }
  if (enabled('candidates')) for (const width of [390,768,1910]) await t.test('S3 empty Candidate '+width, async()=>{
    await h.page.setViewportSize({width,height:900});await h.open('admin','/app/recruitment/candidates');await h.page.getByText('Namizəd yoxdur',{exact:true}).waitFor();
    const measured=await capture('candidates-empty-'+width);
    if(!captureOnly){assert.equal(await h.page.getByRole('button',{name:'Yeni Namizəd',exact:true}).count(),1);const board=h.page.getByRole('button',{name:'Application Kanban',exact:true});assert.ok((await board.boundingBox()).width<230);assert.equal(await board.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');assert.ok(measured.controls.every(c=>c.width<=width));}
  });
  if (enabled('applications')) for (const width of [390,768,1910]) await t.test('S1 empty Applications '+width, async()=>{
    await h.page.setViewportSize({width,height:900});await h.open('admin','/app/recruitment/applications');await h.page.getByText('Hələ müraciət yoxdur',{exact:true}).waitFor();await capture('applications-empty-'+width);
  });
  if (enabled('jobs')) for (const width of [390,768,1711]) await t.test('S5 complete Job create grid '+width, async()=>{
    await h.page.setViewportSize({width,height:900});await h.open('admin','/app/recruitment/jobs/new');await h.page.locator('[data-recruitment-locations]').waitFor();await h.page.getByRole('button',{name:'Vakansiyanı dərc et',exact:true}).waitFor();const measured=await capture('job-create-'+width);
    if(!captureOnly){assert.ok(parseFloat(measured.jobGrid.gap)>=16&&parseFloat(measured.jobGrid.gap)<=24);assert.ok(measured.fullRows.every(r=>r.span==='1 / -1'));assert.ok(measured.jobGrid.height<1800,'Bounded form height rather than scattered large rows');assert.equal(await h.page.locator('[data-job-skills-assistant]').getByRole('button',{name:'AI bacarıq təklifini soruş',exact:true}).count(),1);}
  });
  if (enabled('analytics')) for (const width of [390,768,1875]) await t.test('S4 real zero Analytics '+width, async()=>{
    await h.page.setViewportSize({width,height:900});await h.open('admin','/app/recruitment/analytics');await h.page.locator('[data-hr-kpi=applications] strong').waitFor();await h.page.locator('[data-hr-score-bucket="80"]').waitFor();await capture('analytics-zero-'+width);assert.equal(await h.page.locator('[data-hr-kpi=applications] strong').textContent(),'0');
  });
  if(enabled('shell')) for(const width of [390,768,1440]) await t.test('S2/S7 login and sidebar '+width,async()=>{
    await h.page.setViewportSize({width,height:900});await h.open('anonymous','/login');await h.page.locator('.auth-brand-panel svg').waitFor();await capture('login-'+width);
    if(!captureOnly){assert.ok(!(await h.page.locator('body').innerText()).includes('KFC'));assert.ok(!(await h.page.locator('body').innerText()).includes('Pizza Hut'));assert.ok(!(await h.page.locator('body').innerText()).includes('Simit Sarayı'));}
    await h.open('admin','/app/recruitment/jobs');await h.page.locator('.admin-table-container').waitFor();await capture('sidebar-'+width);
  });
  const provenance={createdBy:h.actors.admin._id,departmentId:'dep_hr'};
  const jobs=await Job.insertMany(Array.from({length:3},(_,i)=>({title:'Synthetic vacancy '+i,department:'HR',description:'Synthetic responsibilities',requiredSkills:['HACCP'],preferredSkills:['Customer service'],...provenance})));
  const people=await Candidate.insertMany(Array.from({length:35},(_,i)=>({name:'Synthetic applicant '+String(i).padStart(2,'0'),role:'Synthetic long restaurant position with multiple branches',skills:['HACCP','Food safety'],education:'Synthetic unknown dates',status:'new',...provenance})));
  await Application.insertMany(people.map((c,i)=>({candidateId:c._id,jobId:jobs[i%3]._id,status:'Applied',...provenance})));
  if(enabled('candidates')) await t.test('S3/S6 candidate search, list/grid, create/edit/review functions',async()=>{
    await h.page.setViewportSize({width:1910,height:900});await h.open('admin','/app/recruitment/candidates');await h.page.locator('.hr-candidate-grid article').first().waitFor();await capture('candidates-filled');
    if(!captureOnly){assert.equal(await h.page.getByRole('button',{name:'Yeni Namizəd',exact:true}).count(),1);
      const count=h.wire.filter(r=>r.path==='/api/hr/v2/candidates').length;
      await h.page.getByRole('button',{name:az.recruitment.candidates.listMode,exact:true}).click();await h.page.locator('tbody tr').first().waitFor();assert.equal(await h.page.locator('tbody tr').count(),30);assert.equal(h.wire.filter(r=>r.path==='/api/hr/v2/candidates').length,count);await capture('candidates-table');
      await h.page.getByRole('combobox',{name:az.hrPage.statusFilter,exact:true}).selectOption('rejected');await h.page.getByText('Namizəd yoxdur',{exact:true}).waitFor();assert.equal(await h.page.getByRole('button',{name:'Yeni Namizəd',exact:true}).count(),1);assert.ok(h.wire.some(r=>r.path==='/api/hr/v2/candidates'&&r.query.includes('status=rejected')));
      await h.page.getByRole('combobox',{name:az.hrPage.statusFilter,exact:true}).selectOption('all');await h.page.locator('tbody tr').first().waitFor();
      const downloadPromise=h.page.waitForEvent('download');await h.page.getByRole('button',{name:az.recruitment.candidates.exportExcel,exact:true}).click();const download=await downloadPromise;assert.equal(await download.failure(),null);assert.ok((await fs.readFile(await download.path())).length>100);}
    await h.page.getByRole('button',{name:'Yeni Namizəd',exact:true}).first().click();await h.page.locator('.candidate-fields').waitFor();await capture('candidate-create');
    for(const width of [390,768,1910]){await h.page.setViewportSize({width,height:900});await h.open('admin','/app/recruitment/candidates/'+people[0]._id+'/edit');await h.page.locator('.candidate-fields textarea').first().waitFor();await capture('candidate-edit-'+width);}
  });
  if(enabled('applications')) await t.test('S1 bounded table, page sort, search, next/previous and board intent',async()=>{
    await h.page.setViewportSize({width:1910,height:900});await h.open('admin','/app/recruitment/applications');await h.page.locator('tbody tr').first().waitFor();await capture('applications-filled');
    assert.equal(await h.page.locator('tbody tr').count(),30);await h.page.getByRole('button',{name:'Növbəti',exact:true}).click();await h.page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===5);await capture('applications-page-two');
    await h.page.getByRole('button',{name:'Application Kanban',exact:true}).click();await h.page.locator('.hr-application-board').waitFor();await capture('applications-board');
  });
  if(enabled('jobs')) await t.test('S5 job edit retains professional fields and localized real configuration action',async()=>{
    await h.page.setViewportSize({width:1711,height:900});await h.open('admin','/app/recruitment/jobs/'+jobs[0]._id+'/edit');await h.page.locator('input[name=position]').waitFor();assert.equal(await h.page.locator('input[name=position]').inputValue(),'Synthetic vacancy 0');await capture('job-edit');
    await h.page.getByRole('button',{name:'AI konfiqurasiyasını yoxla',exact:true}).click();await h.page.waitForFunction(()=>document.querySelector('[data-ai-availability]')?.textContent.includes('konfiqurasiya'));
    await capture('job-ai-configuration');
  });
  if(enabled('analytics')) await t.test('S4 independent live DTOs, genuine data/filter/tab functions',async()=>{
    await h.page.setViewportSize({width:1875,height:900});await h.open('admin','/app/recruitment/analytics');await h.page.locator('[data-hr-kpi=applications] strong').waitFor();assert.equal(await h.page.locator('[data-hr-kpi=applications] strong').textContent(),'35');await capture('analytics-filled');await h.page.getByRole('tab',{name:'Əməliyyatlar',exact:true}).click();await h.page.locator('[data-hr-hire-time]').waitFor();await capture('analytics-operations');
  });
  await fs.writeFile(path.join(dir,'geometry.json'),JSON.stringify(evidence,null,2));
  assert.deepEqual(h.pageErrors,[]);
}));
