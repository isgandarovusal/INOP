const {test,expect}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const fs=require('node:fs/promises'),path=require('node:path');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const az=require('../src/i18n/locales/az.json');
const folder='/workspace/work/acceptance';
const style=async locator=>locator.evaluate(e=>{const s=getComputedStyle(e);return{background:s.backgroundColor,borderColor:s.borderTopColor,borderWidth:s.borderTopWidth,radius:s.borderTopLeftRadius,padding:s.padding,color:s.color,outline:s.outlineStyle,outlineWidth:s.outlineWidth,cursor:s.cursor};});

test('Visual acceptance: actual HR surfaces, reference logo and live submit button states',async()=>{
 const harness=(await fs.readFile(path.join(__dirname,'hrNavigationPerformance.test.cjs'),'utf8')).match(/const harness=`([\s\S]*?)`;/)[1];
 await fs.mkdir(folder,{recursive:true});
 await withBrowserFixture(harness,async h=>{
  const c=(await h.request('admin','POST','/candidates',{name:'Synthetic visual audit',role:'Cashier',skills:['Cash handling'],reviewedFields:['skills']})).data;
  const j=(await h.request('admin','POST','/jobs',{title:'Synthetic visual vacancy',description:'Synthetic visual acceptance only',department:'HR',requiredSkills:['Cash handling']})).data;
  const a=(await h.request('admin','POST','/applications',{candidateId:c._id,jobId:j._id})).data;
  const report={surfaces:[],buttons:{},screenshots:[]};
  const cases=[['vacancies','/app/recruitment/jobs','.admin-table-container'],['applications','/app/recruitment/applications','.admin-table-container'],['job-form','/app/recruitment/jobs/new','#job-position'],['candidate-form','/app/recruitment/candidates/new','.candidate-form-section'],['candidate-detail',`/app/recruitment/candidates/${c._id}`,'.detail-card'],['job-detail',`/app/recruitment/jobs/${j._id}`,'.detail-card'],['application-detail',`/app/recruitment/applications/${a._id}`,'.hr-application-detail'],['candidates','/app/recruitment/candidates','.hr-candidates-table'],['kanban','/app/recruitment/applications?view=board','[data-application-card]'],['analytics','/app/recruitment/analytics','[data-hr-kpi=applications]']];
  for(const width of [1440,390])for(const [name,url,ready] of cases){
   await h.page.setViewportSize({width,height:1000});await h.open('admin',url);await h.page.locator(ready).first().waitFor();
   if(name==='job-form'){await h.page.locator('.job-location-actions > details > summary').first().click();await h.page.locator('.job-location-actions > details > summary').last().click();}
   const filters=h.page.locator('[data-hr-filters] > summary');if(await filters.count())await filters.first().click();
   if(name==='candidate-form'){const editors=h.page.locator('.cv-history-editor');for(let i=0;i<await editors.count();i++)await editors.nth(i).locator(':scope > button').click();}
   const surfaces=await h.page.locator('.hr-section,.candidate-form-section,.detail-card,.hr-filter-panel__body,.job-inline-form,.hr-analytics-sections > section,.hr-analytics-kpis article,.cv-history-editor > fieldset').evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e);return{class:e.className,background:s.backgroundColor,borderColor:s.borderTopColor,borderWidth:s.borderTopWidth,radius:s.borderTopLeftRadius,padding:s.padding};}));
   report.surfaces.push({name,width,surfaces});
   if(name==='job-form'){for(const panel of surfaces){expect(panel.background).toBe('rgb(243, 247, 253)');expect(panel.borderColor).toBe('rgb(215, 226, 241)');expect(panel.borderWidth).toBe('1px');expect(panel.radius).toBe('12px');expect(['16px','20px']).toContain(panel.padding);}}
   for(const panel of surfaces){expect(panel.radius).toBe('12px');}
   expect(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   const logo=h.page.locator(width>900?'aside .inop-logo':'.admin-topbar .inop-logo');expect(await logo.getAttribute('aria-label')).toBe('INOP');expect(await logo.getAttribute('viewBox')).toBe('0 0 224 64');
   await h.page.evaluate(()=>scrollTo(0,0));const file=`${name}-${width}.png`;await h.page.screenshot({path:path.join(folder,file),fullPage:true});report.screenshots.push(file);
  }
  await h.page.setViewportSize({width:1440,height:1000});await h.open('admin','/app/recruitment/jobs/new');await h.page.locator('#job-position').waitFor();
  const publish=h.page.getByRole('button',{name:az.recruitment.jobForm.publish,exact:true}),cancel=h.page.getByRole('button',{name:az.recruitment.jobForm.cancel,exact:true});
  report.buttons.primary=await style(publish);report.buttons.cancel=await style(cancel);
  expect(report.buttons.primary.background).toBe('rgb(67, 56, 202)');expect(report.buttons.cancel.background).toBe('rgb(153, 27, 27)');
  await publish.hover();await h.page.waitForTimeout(250);report.buttons.primaryHover=await style(publish);expect(report.buttons.primaryHover.background).toBe('rgb(55, 48, 163)');
  await cancel.hover();await h.page.waitForTimeout(250);report.buttons.cancelHover=await style(cancel);expect(report.buttons.cancelHover.background).toBe('rgb(127, 29, 29)');
  await h.page.keyboard.press('Tab');await publish.focus();report.buttons.focus=await style(publish);expect(report.buttons.focus.outline).toBe('solid');expect(report.buttons.focus.outlineWidth).toBe('2px');
  await h.page.screenshot({path:path.join(folder,'job-actions-focus.png'),fullPage:true});
  await h.page.locator('#job-position').fill('Synthetic pending audit');await h.page.locator('#job-description').fill('Synthetic only');
  let release,entered;const gate=new Promise(r=>release=r),captured=new Promise(r=>entered=r);
  await h.page.route('**/api/jobs',async route=>{if(route.request().method()!=='POST')return route.fallback();entered();await gate;await route.fallback().catch(()=>{});});
  try{
   await publish.click();await captured;expect(await publish.isDisabled()).toBe(true);expect(await cancel.isDisabled()).toBe(true);await h.page.mouse.move(0,0);await h.page.waitForTimeout(250);
   report.buttons.disabled=await style(publish);report.buttons.cancelDisabled=await style(cancel);await fs.writeFile(path.join(folder,'computed-styles.json'),JSON.stringify(report,null,2));
   await h.page.screenshot({path:path.join(folder,'job-actions-disabled.png'),fullPage:true});
   expect(report.buttons.disabled.background).not.toBe(report.buttons.primary.background);expect(report.buttons.disabled.cursor).toBe('not-allowed');
   await publish.hover({force:true});await h.page.waitForTimeout(250);report.buttons.disabledHover=await style(publish);expect(report.buttons.disabledHover.background).toBe(report.buttons.disabled.background);
  }finally{release();await h.page.unroute('**/api/jobs');await fs.writeFile(path.join(folder,'computed-styles.json'),JSON.stringify(report,null,2));}
  expect(h.pageErrors).toEqual([]);
 });
});

test('Mobile candidate history uses the shared panel radius and spacing token',async()=>{
 const harness=(await fs.readFile(path.join(__dirname,'hrNavigationPerformance.test.cjs'),'utf8')).match(/const harness=`([\s\S]*?)`;/)[1];
 await withBrowserFixture(harness,async h=>{
  await h.page.setViewportSize({width:390,height:1000});await h.open('admin','/app/recruitment/candidates/new');await h.page.locator('.candidate-form-section').first().waitFor();
  const editors=h.page.locator('.cv-history-editor');for(let i=0;i<await editors.count();i++)await editors.nth(i).locator(':scope > button').click();
  const fields=h.page.locator('.cv-history-editor > fieldset');expect(await fields.count()).toBe(3);
  for(let i=0;i<await fields.count();i++){const computed=await style(fields.nth(i));expect(computed.radius).toBe('12px');expect(computed.padding).toBe('16px');expect(computed.borderColor).toBe('rgb(215, 226, 241)');}
  expect(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await h.page.evaluate(()=>scrollTo(0,0));await h.page.screenshot({path:path.join(folder,'candidate-form-390.png'),fullPage:true});
  expect(h.pageErrors).toEqual([]);
 });
});
