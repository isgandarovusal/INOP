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
  const enabled = name => group === name || group === 'all' || group === 'C' && ['candidates','applications'].includes(name) || group === 'D' && ['jobs'].includes(name) || group === 'E' && ['analytics','ai'].includes(name) || group === 'states' && ['candidates','applications','jobs','analytics','ai'].includes(name);
  async function capture(name) {
    await h.page.waitForLoadState('networkidle');await h.page.evaluate(()=>window.scrollTo(0,0));
    const measured = await h.page.evaluate(() => {
      const rect = e => { const r = e.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; };
      return { viewport: [innerWidth,innerHeight], overflow: document.documentElement.scrollWidth > innerWidth + 1,
        controls: [...document.querySelectorAll('main :is(button,input,select,textarea)')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({name:(e.getAttribute('aria-label')||e.textContent||e.name).trim().slice(0,80),...rect(e)})),
        jobGrid: document.querySelector('.job-form-page form') && { columns:getComputedStyle(document.querySelector('.job-form-page form')).gridTemplateColumns, gap:getComputedStyle(document.querySelector('.job-form-page form')).rowGap, ...rect(document.querySelector('.job-form-page form')) },
        fullRows: [...document.querySelectorAll('.job-form-page .form-group--full')].map(e=>({span:getComputedStyle(e).gridColumn,...rect(e)})) };
    });
    evidence.push({ name, ...measured });
    await h.page.screenshot({ path:path.join(dir,name+'.png'), fullPage:true });
    if(process.env.INOP_HR_DELIVERABLES){const exported=process.env.INOP_HR_DELIVERABLES;assert.ok(path.isAbsolute(exported));await fs.mkdir(exported,{recursive:true});await h.page.screenshot({path:path.join(exported,name+'.jpg'),fullPage:true,type:'jpeg',quality:78});}
    if (!captureOnly) assert.equal(measured.overflow,false,name+' horizontal page overflow');
    return measured;
  }
  if (enabled('candidates')) for (const width of [390,768,Number(process.env.INOP_HR_DESKTOP_WIDTH || 1910)]) await t.test('S3 empty Candidate '+width, async()=>{
    await h.page.setViewportSize({width,height:900});await h.open('admin','/app/recruitment/candidates');await h.page.getByText('Namizəd yoxdur',{exact:true}).waitFor();
    const measured=await capture('candidates-empty-'+width);
    if(!captureOnly){assert.equal(await h.page.getByRole('button',{name:'Yeni Namizəd',exact:true}).count(),1);const board=h.page.getByRole('button',{name:'Application Kanban',exact:true});assert.ok((await board.boundingBox()).width<230);assert.equal(await board.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');assert.ok(measured.controls.every(c=>c.width<=width));}
  });
  if (enabled('applications')) for (const width of [390,768,Number(process.env.INOP_HR_DESKTOP_WIDTH || 1910)]) await t.test('S1 empty Applications '+width, async()=>{
    await h.page.setViewportSize({width,height:900});await h.open('admin','/app/recruitment/applications');await h.page.getByText('Hələ müraciət yoxdur',{exact:true}).waitFor();await capture('applications-empty-'+width);if(!captureOnly){const hint=h.page.getByText(az.recruitment.applications.noApplicationsHint,{exact:true}),box=await hint.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1,'Empty hint stays in viewport rather than wide hidden table');}
  });
  if (enabled('jobs')) for (const width of [390,768,Number(process.env.INOP_HR_DESKTOP_WIDTH || 1711)]) await t.test('S5 complete Job create grid '+width, async()=>{
    await h.page.setViewportSize({width,height:900});await h.open('admin','/app/recruitment/jobs/new');await h.page.locator('[data-recruitment-locations]').waitFor();await h.page.getByRole('button',{name:'Vakansiyanı dərc et',exact:true}).waitFor();const measured=await capture('job-create-'+width);
    if(!captureOnly){assert.ok(parseFloat(measured.jobGrid.gap)>=16&&parseFloat(measured.jobGrid.gap)<=24);assert.ok(measured.fullRows.every(r=>r.span==='1 / -1'));assert.ok(measured.jobGrid.height<1850,'Bounded form height rather than scattered large rows');assert.equal(await h.page.locator('[data-job-skills-assistant]').getByRole('button',{name:'AI bacarıq təklifini soruş',exact:true}).count(),1);}
  });
  if (enabled('analytics')) for (const width of [390,768,Number(process.env.INOP_HR_DESKTOP_WIDTH || 1875)]) await t.test('S4 real zero Analytics '+width, async()=>{
    await h.page.setViewportSize({width,height:900});await h.open('admin','/app/recruitment/analytics');await h.page.locator('[data-hr-kpi=applications] strong').waitFor();await h.page.locator('[data-hr-analytics-empty] .empty-state__hint').waitFor();await capture('analytics-zero-'+width);assert.equal(await h.page.locator('[data-hr-kpi=applications] strong').textContent(),'0');assert.equal(await h.page.locator('[data-hr-histogram], [data-hr-stage], .hr-panel--sources').count(),0,'Zero cohort uses one compact honest empty state');assert.ok((await h.page.locator('[data-hr-analytics-empty]').boundingBox()).height<220);
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
    await h.page.setViewportSize({width:Number(process.env.INOP_HR_DESKTOP_WIDTH || 1910),height:900});await h.open('admin','/app/recruitment/candidates');await h.page.locator('tbody tr').first().waitFor();await capture('candidates-filled');await h.page.getByRole('button',{name:az.hrWorkflow.candidateCards,exact:true}).click();await h.page.locator('.hr-candidate-grid article').first().waitFor();
    if(!captureOnly){assert.equal(await h.page.getByRole('button',{name:'Yeni Namizəd',exact:true}).count(),1);
      const count=h.wire.filter(r=>r.path==='/api/hr/v2/candidates').length;
      await h.page.getByRole('button',{name:az.recruitment.candidates.listMode,exact:true}).click();await h.page.locator('tbody tr').first().waitFor();assert.equal(await h.page.locator('tbody tr').count(),30);assert.equal(h.wire.filter(r=>r.path==='/api/hr/v2/candidates').length,count);await capture('candidates-table');
      await h.page.getByRole('combobox',{name:az.hrPage.statusFilter,exact:true}).selectOption('rejected');await h.page.getByText('Namizəd yoxdur',{exact:true}).waitFor();assert.equal(await h.page.getByRole('button',{name:'Yeni Namizəd',exact:true}).count(),1);assert.ok(h.wire.some(r=>r.path==='/api/hr/v2/candidates'&&r.query.includes('status=rejected')));
      await h.page.getByRole('combobox',{name:az.hrPage.statusFilter,exact:true}).selectOption('all');await h.page.locator('tbody tr').first().waitFor();
      const downloadPromise=h.page.waitForEvent('download');await h.page.getByRole('button',{name:az.recruitment.candidates.exportExcel,exact:true}).click();const download=await downloadPromise;assert.equal(await download.failure(),null);assert.ok((await fs.readFile(await download.path())).length>100);}
    await h.page.getByRole('button',{name:'Yeni Namizəd',exact:true}).first().click();await h.page.locator('.candidate-fields').waitFor();await capture('candidate-create');
    for(const width of [390,768,Number(process.env.INOP_HR_DESKTOP_WIDTH || 1910)]){await h.page.setViewportSize({width,height:900});await h.open('admin','/app/recruitment/candidates/'+people[0]._id+'/edit');await h.page.locator('.candidate-fields textarea').first().waitFor();await capture('candidate-edit-'+width);}
  });
  if(enabled('applications')) await t.test('S1 bounded table, page sort, search, next/previous and board intent',async()=>{
    await h.page.setViewportSize({width:Number(process.env.INOP_HR_DESKTOP_WIDTH || 1910),height:900});await h.open('admin','/app/recruitment/applications');await h.page.locator('tbody tr').first().waitFor();await capture('applications-filled');
    assert.equal(await h.page.locator('tbody tr').count(),30);await h.page.getByRole('button',{name:'Növbəti',exact:true}).click();await h.page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===5);await capture('applications-page-two');
    await h.page.getByRole('button',{name:'Application Kanban',exact:true}).click();await h.page.locator('.hr-application-board').waitFor();await capture('applications-board');
  });
  if(enabled('jobs')) await t.test('S5 job edit retains professional fields and localized real configuration action',async()=>{
    await h.page.setViewportSize({width:1711,height:900});await h.open('admin','/app/recruitment/jobs/'+jobs[0]._id+'/edit');await h.page.locator('input[name=position]').waitFor();assert.equal(await h.page.locator('input[name=position]').inputValue(),'Synthetic vacancy 0');await capture('job-edit');
    await h.page.getByRole('button',{name:'AI konfiqurasiyasını yoxla',exact:true}).click();await h.page.waitForFunction(()=>document.querySelector('[data-ai-availability]')?.textContent.includes('konfiqurasiya'));
    await capture('job-ai-configuration');
    if(!captureOnly){await h.page.getByRole('button',{name:'AI bacarıq təklifini soruş',exact:true}).click();await h.page.locator('[data-job-skills-assistant] [role=alert]').waitFor();assert.equal(await h.page.locator('[data-ai-proposal]').count(),0);
      for(const language of ['en','ru','az']){await h.page.evaluate(l=>window.changeLanguage(l),language);const body=await h.page.locator('[data-job-skills-assistant]').innerText();assert.ok(!body.includes('hrAi.'));}await capture('job-ai-unconfigured');
      await h.open('admin','/app/recruitment/jobs/new');await h.page.locator('input[name=position]').fill('Synthetic draft from actual UI');await h.page.locator('#job-description').fill('Synthetic draft responsibilities');await h.page.getByRole('button',{name:'Draft saxla',exact:true}).click();await h.page.waitForURL('**/app/recruitment/jobs');assert.equal((await Job.findOne({title:'Synthetic draft from actual UI'}).lean()).status,'Draft');await h.open('admin','/app/recruitment/jobs/new');await h.page.locator('input[name=position]').fill('Synthetic published on Enter');await h.page.locator('#job-description').fill('Synthetic publish responsibilities');await h.page.locator('input[name=position]').press('Enter');await h.page.waitForURL('**/app/recruitment/jobs');assert.equal((await Job.findOne({title:'Synthetic published on Enter'}).lean()).status,'Open');}

  });
  if(enabled('analytics')) await t.test('S4 independent live DTOs, genuine data/filter/tab functions',async()=>{
    await h.page.setViewportSize({width:Number(process.env.INOP_HR_DESKTOP_WIDTH || 1875),height:900});await h.open('admin','/app/recruitment/analytics');await h.page.locator('[data-hr-kpi=applications] strong').waitFor();assert.equal(await h.page.locator('[data-hr-kpi=applications] strong').textContent(),'35');await h.page.locator('[data-hr-empty-scores] .empty-state__hint').waitFor();assert.equal(await h.page.locator('[data-hr-histogram]').count(),0,'Missing scores have no zero histogram');assert.equal(await h.page.locator('[data-hr-score]').evaluateAll(rows=>rows.reduce((n,r)=>n+Number(r.textContent.split(':').at(-1)),0)),35,'All 35 uncalculated records retain their actual backend state counts');await capture('analytics-filled');await h.page.getByRole('tab',{name:'Əməliyyatlar',exact:true}).click();await h.page.locator('[data-hr-hire-time]').waitFor();await capture('analytics-operations');
  });

  if(group==='allroutes'||group==='all') {
    const application=await Application.findOne().lean();
    for(const width of [390,768,Number(process.env.INOP_HR_DESKTOP_WIDTH || 1910)])for(const [name,url,selector] of [
      ['jobs','jobs','.admin-table-container'],['job-create','jobs/new','.job-form-page form'],['job-detail','jobs/'+jobs[0]._id,'.job-detail-page'],['job-edit','jobs/'+jobs[0]._id+'/edit','.job-form-page form'],
      ['candidates','candidates','.hr-candidates-page'],['candidate-create','candidates/new','.candidate-fields'],['candidate-detail','candidates/'+people[0]._id,'.candidate-detail-page'],['candidate-edit','candidates/'+people[0]._id+'/edit','.candidate-fields'],
      ['applications','applications','.admin-table-container'],['application-board','applications?view=board','.hr-application-board'],['application-detail','applications/'+application._id,'.hr-application-detail'],['analytics','analytics','[data-hr-kpi=applications] strong'],
      ['intake-disabled','cv-intake','[data-hr-feature-disabled]'],['intake-detail-disabled','cv-intake/'+people[0]._id,'[data-hr-feature-disabled]'],
    ].filter(([name])=>!process.env.INOP_HR_ROUTE_NAMES || process.env.INOP_HR_ROUTE_NAMES.split(',').includes(name)))await t.test(name+' production '+width,async()=>{await h.page.setViewportSize({width,height:900});await h.open('admin','/app/recruitment/'+url);await h.page.locator(selector).first().waitFor();await capture(name+'-route-'+width);if(name==='application-detail'){const save=h.page.getByRole('button',{name:az.common.actions.save,exact:true});assert.ok((await save.boundingBox()).height<=48,'Save action is not stretched by textarea grid row');assert.equal(await save.getAttribute('class'),'btn-primary');assert.ok(await h.page.locator('.page-header__actions').isVisible());}});
  }
  if(enabled('ai')) await t.test('AI review has explicit real configuration failure and one source-bound workflow',async()=>{
    const crypto=require('node:crypto'),{docx}=require('../../Backend/tests/helpers/cvDocuments.cjs'),{uploadsDir}=require('../../Backend/middleware/privateUpload.middleware');
    const bytes=docx('Name: Synthetic applicant\nSkills\nFood safety\nExperience\n0 years'),filename=crypto.randomUUID()+'.docx',file=path.join(uploadsDir,filename),hash=crypto.createHash('sha256').update(bytes).digest('hex');await fs.mkdir(uploadsDir,{recursive:true});await fs.writeFile(file,bytes,{flag:'wx',mode:0o600});
    try{await Candidate.updateOne({_id:people[0]._id},{cvUrl:'/uploads/'+filename,cvOriginal:{originalName:'synthetic.docx',sha256:hash},cvReview:{version:'rules-2',provider:'rule-based',processingStatus:'extracted',fields:{skills:{source:'cv-text',evidence:['Food safety']},experience:{source:'cv-text',evidence:['0 years']}}}});
      await h.page.setViewportSize({width:1440,height:900});await h.open('admin','/app/recruitment/candidates/'+people[0]._id+'/edit');await h.page.locator('[data-cv-ai-assistant]').waitFor();assert.equal(await h.page.locator('[data-ai-action=cv-professional-review]').count(),1);
      await h.page.locator('[data-ai-action=configuration-status]').click();await h.page.getByText(az.hrAi.setupState.not_configured,{exact:true}).waitFor();await h.page.locator('[data-ai-action=cv-professional-review]').click();await h.page.getByRole('alert').filter({hasText:az.hrCvAi.setupRequired}).waitFor();assert.equal(await h.page.locator('[data-cv-ai-proposal]').count(),0);
      for(const language of ['az','en','ru']){await h.page.evaluate(l=>window.changeLanguage(l),language);await capture('cv-ai-unconfigured-'+language);}await h.page.evaluate(()=>window.changeLanguage('az'));
      await require('../../Backend/models/hrCvProcessingJob.model').createIndexes();const queue=require('../../Backend/services/hrCvProcessing.service'),factory=queue.createProcessing;let response;try{queue.createProcessing=options=>factory({...options,enabled:true});response=await h.request('admin','POST','/candidates/'+people[0]._id+'/processing',{kind:'parse',expectedHash:hash,expectedRevision:0});}finally{queue.createProcessing=factory;}assert.ok([201,202].includes(response.status),JSON.stringify({status:response.status,code:response.data.code}));assert.ok(response.data.id);
      await h.open('admin','/app/recruitment/candidates/'+people[0]._id+'/edit?processingJobId='+response.data.id);await h.page.locator('[data-processing-approval-review]').waitFor();assert.equal(await h.page.locator('[data-cv-ai-assistant]').count(),0);await capture('cv-one-processing-review');
    }finally{await fs.unlink(file);}
  });
  await fs.writeFile(path.join(dir,'geometry.json'),JSON.stringify(evidence,null,2));
  assert.deepEqual(h.pageErrors,[]);
}));
