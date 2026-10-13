const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const{withBrowserFixture}=require('./helpers/browser.cjs'),az=require('../src/i18n/locales/az.json');
const harness=()=>fs.readFile(path.join(__dirname,'hrNavigationPerformance.test.cjs'),'utf8').then(s=>s.match(/const harness=`([\s\S]*?)`;/)[1]);
test('Enterprise analytics renders genuine scoped charts and tables with responsive filters and keyboard tabs',async()=>withBrowserFixture(await harness(),async h=>{
 const c=(await h.request('admin','POST','/candidates',{name:'Analytics private fixture',role:'Cashier',skills:['Cash handling'],reviewedFields:['skills']})).data;
 for(const brandId of ['kfc','pizza-hut']){const job=(await h.request('admin','POST','/jobs',{title:'Synthetic '+brandId,description:'Synthetic analytics vacancy',department:'HR',brandId,requiredSkills:['Cash handling']})).data;const a=(await h.request('admin','POST','/applications',{candidateId:c._id,jobId:job._id})).data;assert.ok(a._id);}
 for(const width of [1440,768,390]){
  await h.page.setViewportSize({width,height:1000});await h.open('admin','/app/recruitment/analytics');await h.page.locator('[data-hr-kpi=applications] strong').waitFor();await h.page.locator('[data-hr-histogram]').waitFor();assert.equal(await h.page.locator('[data-hr-kpi=applications] strong').textContent(),'2');
  assert.equal(await h.page.locator('.hr-panel--brands tbody tr').count(),2);assert.ok(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.ok(!(await h.page.locator('.hr-analytics-page').textContent()).includes('Analytics private fixture'));
  const tab=h.page.getByRole('tab',{name:az.hrWorkspace.overview,exact:true});await tab.focus();await tab.press('ArrowRight');await h.page.locator('[data-hr-hire-time]').waitFor();assert.equal(await h.page.getByRole('tab',{name:az.hrWorkspace.operations,exact:true}).getAttribute('aria-selected'),'true');await h.page.keyboard.press('Home');await h.page.locator('[data-hr-histogram]').waitFor();
  await fs.mkdir('/workspace/work/premium/screens',{recursive:true});await h.page.evaluate(()=>scrollTo(0,0));await h.page.screenshot({path:`/workspace/work/premium/screens/analytics-${width}.png`,fullPage:true});
 }
 await h.page.getByRole('button',{name:'KFC',exact:true}).click();await h.page.waitForFunction(()=>document.querySelector('[data-hr-kpi=applications] strong')?.textContent==='1');
 await h.page.locator('[data-hr-filters] > summary').click();await h.page.getByLabel(az.hrAnalytics.from,{exact:true}).fill('2026-11-10');await h.page.getByLabel(az.hrAnalytics.to,{exact:true}).fill('2026-01-01');await h.page.locator('#hr-analytics-date-error').waitFor();assert.equal(await h.page.getByLabel(az.hrAnalytics.to,{exact:true}).getAttribute('aria-invalid'),'true');
 await h.page.getByRole('button',{name:az.common.actions.clear,exact:true}).click();await h.page.waitForFunction(()=>document.querySelector('[data-hr-kpi=applications] strong')?.textContent==='2');
 await h.page.locator('.hr-analytics-hero').getByRole('button',{name:az.common.actions.refresh,exact:true}).click();await h.page.locator('[data-hr-histogram]').waitFor();assert.deepEqual(h.pageErrors,[]);
}));
