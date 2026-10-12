const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {withBrowserFixture}=require('./helpers/browser.cjs');
test('Application table loads no Kanban code; board intent loads it with one independently scoped data request',async()=>{
 const source=await fs.readFile(path.join(__dirname,'hrNavigationPerformance.test.cjs'),'utf8');
 await withBrowserFixture(source.match(/const harness=`([\s\S]*?)`;/)[1],async h=>{
  const chunks=[];h.page.on('request',r=>{if(r.url().includes('/src/Components/ApplicationKanban.tsx'))chunks.push(r.url())});
  await h.open('admin','/app/recruitment/applications');await h.page.locator('.admin-table-container').waitFor();
  assert.equal(chunks.length,0,'Table does not need the drag-and-drop module');
  await h.page.getByRole('button',{name:require('../src/i18n/locales/az.json').hrMatch.board,exact:true}).click();
  await h.page.locator('.hr-application-board').waitFor();
  assert.equal(chunks.length,1);assert.equal(h.wire.filter(r=>r.path==='/api/hr/v2/application-board').length,1);
  assert.deepEqual(h.pageErrors,[]);
 });
});
test('Failed board module has finite error/reload recovery and retains the board URL',async()=>{
 const source=await fs.readFile(path.join(__dirname,'hrNavigationPerformance.test.cjs'),'utf8');
 await withBrowserFixture(source.match(/const harness=`([\s\S]*?)`;/)[1],async h=>{
  const pattern='**/src/Components/ApplicationKanban.tsx';
  await h.page.route(pattern,r=>r.fulfill({status:503,body:'Synthetic unavailable public code'}));
  await h.open('admin','/app/recruitment/applications?view=board');
  await h.page.locator('[data-hr-state=error]').waitFor();
  assert.equal(await h.page.locator('.hr-application-board').count(),0);
  await h.page.unroute(pattern);
  await h.page.getByRole('button',{name:'Yenidən cəhd et',exact:true}).click();
  await h.page.locator('.hr-application-board').waitFor();
  assert.equal(new URL(h.page.url()).searchParams.get('view'),'board');
  assert.deepEqual(h.pageErrors,[]);
 });
});
