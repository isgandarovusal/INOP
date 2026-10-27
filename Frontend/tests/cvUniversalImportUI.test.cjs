const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{withBrowserFixture}=require('./helpers/browser.cjs');
const root=path.resolve(__dirname,'../..'),Source=require('../../Backend/models/hrCvIntake.model'),Batch=require('../../Backend/models/hrCvImport.model'),{createIntake}=require('../../Backend/services/hrCvIntake.service'),{docx}=require('../../Backend/tests/helpers/cvDocuments.cjs');
const shell=`import React from'react';import{createRoot}from'react-dom/client';import App from'/src/App.tsx';import api from'/src/api/axios.ts';import i18n from'/src/i18n/index.ts';api.defaults.baseURL='/api';window.navigateTest=()=>{};window.changeLocale=lng=>i18n.changeLanguage(lng);createRoot(document.getElementById('root')).render(React.createElement(App));`;
test('Real AuthProvider bulk intake: partial rejection, original persistence, human review, locale/viewport and idle stability',async()=>withBrowserFixture(shell,async h=>{
 await Source.createIndexes();await Batch.createIndexes();await h.models.User.updateOne({_id:h.actors.own._id},{$set:{role:'recruitment_manager',departmentId:'dep_hr'}});
 const objects=new Map(),queue=createIntake({enabled:true,evidenceMode:'test',store:{put:async(k,b)=>objects.set(k.key,Buffer.from(b)),get:async k=>{if(!objects.has(k.key))throw Object.assign(Error(),{code:'STORAGE_NOT_FOUND'});return objects.get(k.key);}},scanner:{scan:async(_b,{sha256})=>({verdict:'clean',sha256,engine:'synthetic',version:'1'})}}),profiles=require('../../Backend/services/hrCvIntakeProfiles.service'),previous=profiles.profile;profiles.profile=()=>queue;
 const Job=require('../../Backend/models/job.model'),Application=require('../../Backend/models/application.model'),job=await Job.create({title:'Synthetic Cashier',brandId:'kfc',department:'HR',departmentId:'dep_hr',createdBy:h.actors.own._id,assignedTo:h.actors.own._id,status:'Open',description:'Synthetic vacancy',requiredSkills:['HACCP']});
 const out=process.env.INOP_UNIVERSAL_SCREENSHOTS||process.env.INOP_QA_SCREENSHOTS;if(out)fs.mkdirSync(out,{recursive:true});
 try{
 await h.open('own','/app/recruitment/cv-intake');await h.page.locator('[data-cv-import]').waitFor();await h.page.waitForLoadState('networkidle');
 assert.equal(await h.page.locator('.admin-sidebar a[href="/app/dashboard"]').count(),0);for(const route of ['/api/hr/cv-intake','/api/hr/v2/jobs','/api/hr/v2/brands'])assert.equal(h.wire.filter(x=>x.method==='GET'&&x.path===route).length,1,'one initial scoped read: '+route);
 await h.page.locator('[data-cv-import] select').nth(0).selectOption('kfc');await h.page.locator('[data-cv-import] select').nth(1).selectOption('kfc');await h.page.locator('[data-cv-import] select').nth(2).selectOption(String(job._id));
 const bytes=docx('Name: Synthetic Applicant\nSkills\nHACCP');await h.page.locator('[data-cv-import] input[type=file][multiple]').setInputFiles([{name:'synthetic.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:bytes},{name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('synthetic invalid')}]);
 await h.page.locator('[data-cv-import] input[type=file]:not([multiple])').setInputFiles({name:'routing.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:'hr-import-routing-v1',rows:[{filename:'synthetic.docx',context:{sourceType:'kfc',brandId:'kfc',jobId:String(job._id)}}]}))});
 await h.page.locator('[data-cv-import] button').filter({hasText:/Önbaxış|önbaxış|Preview/}).click();await h.page.locator('[data-import-preview]').waitFor();assert.equal(await Source.countDocuments(),0);
 await h.page.locator('[data-cv-import] .btn-primary').click();await h.page.locator('[data-import-count=accepted]').filter({hasText:'1'}).waitFor();assert.equal(await h.page.locator('[data-import-count=failed]').textContent(),'1');assert.equal(await h.page.locator('[data-import-count=completed]').textContent(),'0');assert.equal(await Source.countDocuments(),1);
 await queue.runOnce(1);
 // Receipt rendering precedes onAccepted's list effect. Exercise delayed delivery
 // and finish that explicit refresh before starting the zero-request idle window.
 const listPattern='**/api/hr/cv-intake?*';
 const delayedList=async route=>{await new Promise(resolve=>setTimeout(resolve,300));await route.fallback();};
 await h.page.route(listPattern,delayedList);
 const refreshedList=h.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/hr/cv-intake'&&r.request().method()==='GET'&&r.status()===200);
 await h.page.locator('[data-import-receipt] button').click();await h.page.locator('[data-import-count=reviewRequired]').filter({hasText:'1'}).waitFor();
 assert.equal((await (await refreshedList).json()).summary.pendingReview,1);
 await h.page.locator('[data-source-summary]').filter({hasText:': 1 ·'}).waitFor();
 await h.page.unroute(listPattern,delayedList);
 const before=h.wire.filter(x=>x.path.startsWith('/api/hr/')).length,navs=await h.page.evaluate(()=>performance.getEntriesByType('navigation').length);await h.page.waitForTimeout(31000);assert.equal(h.wire.filter(x=>x.path.startsWith('/api/hr/')).length,before);assert.equal(await h.page.evaluate(()=>performance.getEntriesByType('navigation').length),navs);assert.equal(await h.page.locator('[data-import-count=accepted]').textContent(),'1');
 for(const lng of ['az','en','ru']){const n=h.wire.filter(x=>x.path.startsWith('/api/hr/')).length;await h.page.evaluate(l=>window.changeLocale(l),lng);for(const width of [1440,768,390,320]){await h.page.setViewportSize({width,height:900});await h.page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations??1)).map(a=>a.finished.catch(()=>{})));window.scrollTo(0,0);});assert.ok(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${lng}/${width} overflow`);if(out)await h.page.screenshot({path:path.join(out,`intake-${lng}-${width}.png`),fullPage:true});}assert.equal(h.wire.filter(x=>x.path.startsWith('/api/hr/')).length,n,'locale must not refetch');}
 const r=await Batch.findOne().lean(),source=await Source.findById(r.rows[0].sourceId).select('+blob').lean();assert.deepEqual(objects.get(source.blob.key),bytes);assert.equal(r.rows[0].state,'accepted');
 await h.open('own','/app/recruitment/cv-intake/'+source._id);await h.page.locator('[data-source-detail]').waitFor();for(const lng of ['az','en','ru']){const reads=h.wire.length;await h.page.evaluate(l=>window.changeLocale(l),lng);for(const width of [1440,768,390,320]){await h.page.setViewportSize({width,height:900});await h.page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations??1)).map(a=>a.finished.catch(()=>{})));window.scrollTo(0,0);});assert.equal(await h.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`source detail ${lng}/${width}`);if(out)await h.page.screenshot({path:path.join(out,`source-detail-${lng}-${width}.png`),fullPage:true});}assert.equal(h.wire.length,reads,'source detail locale requests');}
 await h.open('own','/app/recruitment/candidates/new?intakeId='+source._id);await h.page.locator('input[name=role]').waitFor();await h.page.locator('input[name=role]').fill('Cashier');await h.page.locator('input[name=confirmReview]').check();await h.page.locator('button[type=submit]').click();await h.page.waitForURL(/\/app\/recruitment\/candidates\/[a-f0-9]{24}$/);const app=await Application.findOne().lean();assert.equal(String(app.jobId),String(job._id));assert.equal(app.source.key,'kfc');assert.equal(app.source.verification,'hr_declared');assert.equal(app.status,'Applied');
 // Exercise the existing ATS-v2 calculation and workflow, never invent a score.
 await h.open('own','/app/recruitment/applications/'+app._id);
 await h.page.locator('[data-application-workflow]').waitFor();
 const badge=h.page.locator('[data-application-score]');
 await badge.locator('details').last().locator('summary').click();
 const refreshed=h.page.waitForResponse(r=>r.request().method()==='GET'&&r.url().endsWith('/api/applications/'+app._id));
 await badge.getByRole('button').click();await refreshed;await h.page.waitForLoadState('networkidle');
 await badge.locator('strong').filter({hasText:'100%'}).waitFor();
 assert.equal(await h.page.locator('form[data-application-workflow]').count(),1,'one workflow after matching revision');
 const calculated=await Application.findById(app._id).lean();
 assert.equal(calculated.matching.version,'ats-v2');assert.equal(calculated.score,100);
 assert.deepEqual(calculated.matching.criteria[0].matched,['haccp']);
 assert.deepEqual(calculated.matching.criteria[0].missing,[]);
 if(!await badge.locator('details').first().evaluate(e=>e.open))await badge.locator('details').first().locator('summary').click();
 await badge.locator('details').first().getByText(/ats-v2/).waitFor();
 const stageStart=performance.now();
 await h.page.locator('form[data-application-workflow] select').first().selectOption('screening');
 assert.deepEqual(await h.page.locator('form[data-application-workflow]').evaluate(e=>Array.from(e.querySelectorAll(':invalid')).map(x=>({name:x.getAttribute('aria-label'),type:x.type,message:x.validationMessage}))),[],'Workflow browser validity');
 const updated=h.page.waitForResponse(r=>r.request().method()==='PATCH'&&r.url().endsWith('/workflow'),{timeout:10000}).catch(e=>{throw Error('Workflow response missing: '+e.message)});
 updated.catch(()=>{});
 await h.page.locator('form[data-application-workflow] button[type=submit]').click();assert.equal((await updated).status(),200);
 await h.page.waitForFunction(()=>document.querySelector('form[data-application-workflow] select')?.value==='screening');
 assert.equal((await Application.findById(app._id)).status,'Screening');
 assert.equal(await h.page.locator('form[data-application-workflow]').count(),1,'one workflow after stage revision');
 const summary=await h.request('own','GET','/applications/dashboard-summary');
 assert.equal(summary.status,200);assert.equal(summary.data.pipeline.total,1);assert.equal(summary.data.pipeline.shortlistedCount,0);
 assert.equal((await require('../../Backend/models/candidate.model').findById(app.candidateId)).status,'new');
 console.log(JSON.stringify({scenario:'intake to matching and stage',calculatedScore:100,algorithm:'ats-v2',stage:'Screening',stageResponseMs:Math.round(performance.now()-stageStart)}));
 const explanation=badge.locator('details').first();if(!await explanation.evaluate(e=>e.open))await explanation.locator('summary').click();
 for(const lng of ['az','en','ru']){const reads=h.wire.length;await h.page.evaluate(l=>window.changeLocale(l),lng);await badge.locator('[data-match-method]').waitFor();assert.equal(await badge.locator('strong').textContent(),'100%');for(const width of [1440,768,390,320]){await h.page.setViewportSize({width,height:900});await h.page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations??1)).map(a=>a.finished.catch(()=>{})));window.scrollTo(0,0);});assert.equal(await h.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);if(out)await h.page.screenshot({path:path.join(out,`matching-and-stage-${lng}-${width}.png`),fullPage:true});}assert.equal(h.wire.length,reads,'matching locale must not refetch');}

 await h.open('own','/app/recruitment/analytics');await h.page.locator('[data-hr-kpi=applications] strong').filter({hasText:'1'}).waitFor();await h.page.locator('[data-hr-source=kfc]').filter({hasText:'1'}).waitFor();
 await h.open('own','/app/recruitment/cv-intake');await h.page.locator('[data-cv-import]').waitFor();await h.page.locator('[data-cv-import] input[type=file][multiple]').setInputFiles({name:'reset-only.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:bytes});await h.page.locator('[data-cv-import] button').filter({hasText:/Önbaxış|önbaxış|Preview/}).click();await h.page.locator('[data-import-preview]').waitFor();await h.page.getByRole('button',{name:/^Yeni idxal$|^New import$|^Новый импорт$/}).click();assert.equal(await h.page.locator('[data-cv-import] input[type=file][multiple]').evaluate(e=>e.files.length),0);assert.equal(await h.page.locator('[data-cv-import] .audit-file-picker button').evaluate(e=>e===document.activeElement),true);
 await h.page.locator('[data-cv-import] > button').filter({hasText:/tarixç|history|историю/}).click();await h.page.locator('[data-cv-import] > ul button').first().click();await h.page.locator('[data-import-count=completed]').filter({hasText:'1'}).waitFor();
 await h.page.route('**/api/hr/cv-intake/imports/'+r.batchId,route=>route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({code:'INTAKE_AUTH_REVOKED'})}));await h.page.locator('[data-import-receipt] button').click();await h.page.locator('[data-cv-import-denied]').waitFor();assert.equal(await h.page.locator('[data-import-receipt]').count(),0);assert.equal(await h.page.locator('[data-cv-import] input[type=file]').count(),0);
 console.log(JSON.stringify({scenario:'universal intake UI',idleMs:31000,idleDataRequests:0,localeDataRequests:0,acceptedOriginals:1,rejectedFiles:1,reviewedProfiles:1,applications:1}));assert.deepEqual(h.pageErrors,[]);
 }finally{profiles.profile=previous;}
},{loadSource:id=>{if(/\.(tsx|ts)$/.test(id)){const s=fs.readFileSync(id,'utf8');if(/import\.meta\.env\.VITE_HR_DURABLE_INTAKE_ENABLED/.test(s))return s.replace(/import\.meta\.env\.VITE_HR_DURABLE_INTAKE_ENABLED\s*===\s*'true'/g,'true');}}}));

test('Real AuthProvider keeps existing CV receipts visible with processing disabled, no uploads and no idle/locale refetch',async()=>withBrowserFixture(shell,async h=>{
 await Source.createIndexes();
 await h.models.User.updateOne({_id:h.actors.own._id},{$set:{role:'recruitment_manager',departmentId:'dep_hr'}});
 const bytes=docx('Name: Synthetic readable receipt\nSkills\nHACCP'),objects=new Map();
 const online=createIntake({enabled:true,evidenceMode:'test',store:{put:async(k,b)=>objects.set(k.key,Buffer.from(b)),get:async k=>{if(!objects.has(k.key))throw Object.assign(Error(),{code:'STORAGE_NOT_FOUND'});return objects.get(k.key);}}});
 const receipt=await online.enqueue({headers:{authorization:'Bearer '+h.tokens.own}},{buffer:bytes,originalname:'synthetic-existing.docx',mimetype:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'},require('node:crypto').randomUUID());
 const profiles=require('../../Backend/services/hrCvIntakeProfiles.service'),previous=profiles.profile;profiles.profile=()=>createIntake();
 const out=process.env.INOP_UNIVERSAL_SCREENSHOTS||process.env.INOP_QA_SCREENSHOTS;if(out)fs.mkdirSync(out,{recursive:true});
 try{
 await h.open('own','/app/recruitment/cv-intake');await h.page.locator('[data-source-id]').waitFor();
 assert.equal(await h.page.locator('[data-intake-processing-disabled]').count(),1);
 assert.equal(await h.page.locator('input[type=file]').count(),0);
 assert.equal(await h.page.locator('[data-source-id] button:not([data-source-view])').isDisabled(),true);
 const reads=h.wire.filter(x=>x.method==='GET'&&x.path!=='/api/auth/me').length;
 await h.page.waitForTimeout(30000);
 for(const lng of ['az','en','ru']){await h.page.evaluate(l=>window.changeLocale(l),lng);for(const width of [1440,768,390,320]){await h.page.setViewportSize({width,height:900});await h.page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations??1)).map(a=>a.finished.catch(()=>{})));window.scrollTo(0,0);});assert.equal(await h.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);if(out)await h.page.screenshot({path:path.join(out,`processing-disabled-${lng}-${width}.png`),fullPage:true});}}
 assert.equal(h.wire.filter(x=>x.method==='GET'&&x.path!=='/api/auth/me').length,reads);
 await h.page.locator('[data-source-view]').click();await h.page.locator('[data-source-detail]').waitFor();
 assert.equal(await h.page.locator('[data-intake-processing-disabled]').count(),1);
 assert.equal(await h.page.locator('[data-source-resume]').count(),0);
 assert.equal(await h.page.locator('[data-intake-source-review]').count(),0);
 assert.equal((await h.request('own','GET','/hr/cv-intake/'+receipt.id)).status,200);
 assert.equal((await h.request('own','GET','/hr/cv-intake/'+receipt.id+'/original')).status,503);
 assert.equal(h.wire.some(x=>x.method==='POST'),false);
 console.log(JSON.stringify({scenario:'processing disabled read-only',idleMs:30000,idleRequests:0,localeRequests:0,initialScopedReads:reads,uploadRequests:0}));assert.deepEqual(h.pageErrors,[]);
 }finally{profiles.profile=previous;}
}));
