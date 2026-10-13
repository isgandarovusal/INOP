const {test,expect}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const fs=require('node:fs/promises'),path=require('node:path');const{withBrowserFixture}=require('./helpers/browser.cjs');
const az=require('../src/i18n/locales/az.json');
test('Final enterprise HR route smoke uses isolated real data and existing Chromium',async()=>{
 const harness=(await fs.readFile(path.join(__dirname,'hrNavigationPerformance.test.cjs'),'utf8')).match(/const harness=`([\s\S]*?)`;/)[1];
 await withBrowserFixture(harness,async h=>{
  const c=(await h.request('admin','POST','/candidates',{name:'Final synthetic candidate',role:'Cashier',skills:['Cash handling'],reviewedFields:['skills']})).data;
  const job=(await h.request('admin','POST','/jobs',{title:'Final synthetic vacancy',description:'Synthetic final UI validation',department:'HR',requiredSkills:['Cash handling']})).data;
  const app=(await h.request('admin','POST','/applications',{candidateId:c._id,jobId:job._id})).data;expect(app._id).toBeTruthy();
  const cases=[['jobs','/app/recruitment/jobs','.admin-table-container'],['job-form','/app/recruitment/jobs/new','#job-position'],['candidates','/app/recruitment/candidates','.hr-candidates-table'],['applications','/app/recruitment/applications','.admin-table-container'],['kanban','/app/recruitment/applications?view=board','[data-application-card]'],['analytics','/app/recruitment/analytics','[data-hr-histogram]'],['candidate-form','/app/recruitment/candidates/new','.candidate-form-section'],['candidate-detail',`/app/recruitment/candidates/${c._id}`,'.detail-card'],['job-detail',`/app/recruitment/jobs/${job._id}`,'.detail-card'],['application-detail',`/app/recruitment/applications/${app._id}`,'.hr-application-detail']];
  for(const width of [1440,768,390])for(const [name,url,ready] of cases){
   await h.page.setViewportSize({width,height:1000});await h.open('admin',url);await h.page.locator(ready).first().waitFor();expect(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   const badButtons=await h.page.locator('main button:visible').evaluateAll(es=>es.filter(e=>!e.disabled&&!((e.getAttribute('aria-label')||e.getAttribute('title')||e.textContent).trim())).length);expect(badButtons).toBe(0);
   await fs.mkdir('/workspace/work/premium/screens',{recursive:true});await h.page.evaluate(()=>scrollTo(0,0));await h.page.screenshot({path:`/workspace/work/premium/screens/final-${name}-${width}.png`,fullPage:true});
  }
  for(const width of [1440,768,390]) {
   await h.page.setViewportSize({width,height:1000});await h.open('admin','/app/recruitment/jobs/new');await h.page.locator('#job-position').waitFor();
   const details=h.page.locator('.job-location-actions > details');await details.first().locator('summary').click();await details.last().locator('summary').click();
   expect(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   await h.page.screenshot({path:`/workspace/work/premium/screens/final-inline-catalog-${width}.png`,fullPage:true});
   const logo=h.page.locator(width>900?'aside .inop-logo':'.admin-topbar .inop-logo');expect(await logo.getAttribute('viewBox')).toBe('0 0 224 64');expect(await logo.getAttribute('aria-label')).toBe('INOP');
   if(width<=900){await h.page.getByRole('button',{name:/Menyu|Toggle menu|меню/i}).click();await h.page.locator('aside .inop-logo').waitFor();await h.page.screenshot({path:`/workspace/work/premium/screens/final-brand-drawer-${width}.png`});await h.page.keyboard.press('Escape');await h.page.waitForFunction(()=>document.querySelector('aside').inert);}
  }
  await h.open('admin','/app/recruitment/jobs/new');await h.page.locator('#job-position').fill('Final keyboard publish');await h.page.locator('#job-description').fill('Synthetic keyboard-submit validation');await h.page.locator('#job-description').focus();await h.page.keyboard.press('Tab');expect(await h.page.evaluate(()=>document.activeElement?.tagName)).not.toBe('BODY');
  await h.page.getByRole('button',{name:az.recruitment.jobForm.publish,exact:true}).click();await h.page.waitForURL('**/app/recruitment/jobs');expect((await h.request('admin','GET','/jobs')).data.length).toBe(2);
  await h.open('admin','/app/recruitment/analytics');await h.page.locator('[data-hr-histogram]').waitFor();
  for(const language of ['ENG','RUS','AZE']){const button=h.page.locator('aside').getByRole('button',{name:language,exact:true});if(await h.page.locator('aside').evaluate(e=>!e.inert))await button.click();else{await h.page.getByRole('button',{name:/Menyu|Toggle menu|меню/i}).click();await button.click();await h.page.keyboard.press('Escape');await h.page.waitForFunction(()=>document.querySelector('aside').inert);}expect(await h.page.locator('.hr-analytics-page').textContent()).not.toMatch(/hrAnalytics\.|hrWorkspace\./);}
  expect(h.pageErrors).toEqual([]);
 });
});

test('Final branding drawer viewport and complete form section surfaces remain accessible', async () => {
 const harness=(await fs.readFile(path.join(__dirname,'hrNavigationPerformance.test.cjs'),'utf8')).match(/const harness=`([\s\S]*?)`;/)[1];
 await withBrowserFixture(harness, async h => {
  for (const width of [768,390]) {
   await h.page.setViewportSize({width,height:1000});await h.open('admin','/app/recruitment/jobs/new');await h.page.locator('#job-position').waitFor();
   expect(await h.page.locator('.hr-section').count()).toBe(5);
   expect(await h.page.locator('.hr-section').evaluateAll(es=>new Set(es.map(e=>getComputedStyle(e).backgroundColor)).size)).toBe(1);
   await h.page.getByRole('button',{name:/Menyu|Toggle menu|меню/i}).click();
   const aside=h.page.locator('aside');expect(await aside.evaluate(e=>e.inert)).toBe(false);
   expect(await aside.locator('.inop-logo').getAttribute('aria-label')).toBe('INOP');
   expect(await aside.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
   await h.page.screenshot({path:`/workspace/work/premium/screens/final-brand-drawer-${width}.png`});
   await h.page.keyboard.press('Escape');await h.page.waitForFunction(()=>document.querySelector('aside').inert);
  }
  expect(h.pageErrors).toEqual([]);
 });
});
