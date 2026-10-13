const {test,expect}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const fs=require('node:fs/promises'),path=require('node:path');const{withBrowserFixture}=require('./helpers/browser.cjs');
const az=require('../src/i18n/locales/az.json');
test('Final enterprise HR route smoke uses isolated real data and existing Chromium',async()=>{
 const harness=(await fs.readFile(path.join(__dirname,'hrNavigationPerformance.test.cjs'),'utf8')).match(/const harness=`([\s\S]*?)`;/)[1];
 await withBrowserFixture(harness,async h=>{
  const c=(await h.request('admin','POST','/candidates',{name:'Final synthetic candidate',role:'Cashier',skills:['Cash handling'],reviewedFields:['skills']})).data;
  const job=(await h.request('admin','POST','/jobs',{title:'Final synthetic vacancy',description:'Synthetic final UI validation',department:'HR',requiredSkills:['Cash handling']})).data;
  const app=(await h.request('admin','POST','/applications',{candidateId:c._id,jobId:job._id})).data;expect(app._id).toBeTruthy();
  const cases=[['jobs','/app/recruitment/jobs','.admin-table-container'],['job-form','/app/recruitment/jobs/new','#job-position'],['candidates','/app/recruitment/candidates','.hr-candidates-table'],['applications','/app/recruitment/applications','.admin-table-container'],['kanban','/app/recruitment/applications?view=board','[data-application-card]'],['analytics','/app/recruitment/analytics','[data-hr-histogram]']];
  for(const width of [1440,768,390])for(const [name,url,ready] of cases){
   await h.page.setViewportSize({width,height:1000});await h.open('admin',url);await h.page.locator(ready).waitFor();expect(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   const badButtons=await h.page.locator('main button:visible').evaluateAll(es=>es.filter(e=>!e.disabled&&!((e.getAttribute('aria-label')||e.getAttribute('title')||e.textContent).trim())).length);expect(badButtons).toBe(0);
   await fs.mkdir('/workspace/work/premium/screens',{recursive:true});await h.page.evaluate(()=>scrollTo(0,0));await h.page.screenshot({path:`/workspace/work/premium/screens/final-${name}-${width}.png`,fullPage:true});
  }
  await h.open('admin','/app/recruitment/jobs/new');await h.page.locator('#job-position').fill('Final keyboard publish');await h.page.locator('#job-description').fill('Synthetic keyboard-submit validation');await h.page.locator('#job-description').focus();await h.page.keyboard.press('Tab');expect(await h.page.evaluate(()=>document.activeElement?.tagName)).not.toBe('BODY');
  await h.page.getByRole('button',{name:az.recruitment.jobForm.publish,exact:true}).click();await h.page.waitForURL('**/app/recruitment/jobs');expect((await h.request('admin','GET','/jobs')).data.length).toBe(2);
  await h.open('admin','/app/recruitment/analytics');await h.page.locator('[data-hr-histogram]').waitFor();
  for(const language of ['ENG','RUS','AZE']){const button=h.page.locator('aside').getByRole('button',{name:language,exact:true});if(await h.page.locator('aside').evaluate(e=>!e.inert))await button.click();else{await h.page.getByRole('button',{name:/Menyu|Toggle menu|меню/i}).click();await button.click();await h.page.keyboard.press('Escape');await h.page.waitForFunction(()=>document.querySelector('aside').inert);}expect(await h.page.locator('.hr-analytics-page').textContent()).not.toMatch(/hrAnalytics\.|hrWorkspace\./);}
  expect(h.pageErrors).toEqual([]);
 });
});
