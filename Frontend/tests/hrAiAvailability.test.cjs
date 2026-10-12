const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const az=require('../src/i18n/locales/az.json');
test('AI configuration is explicit, on-demand and never generates output or blocks manual vacancy editing',async t=>{
 const source=await fs.readFile(path.join(__dirname,'hrAiUI.test.cjs'),'utf8');
 await withBrowserFixture(source.match(/const harness=`([\s\S]*?)`;/)[1],async h=>{
  const status=(state='not_configured')=>({version:'hr-ai-status-v1',provider:state==='configured_not_verified'?'openai':null,state,realE2EVerified:false,cvReviewApproved:false});
  await h.open('admin','/app/recruitment/jobs/new');await h.page.locator('[data-ai-availability]').waitFor();
  assert.equal(h.wire.filter(r=>r.path==='/api/hr/ai/status').length,0);
  assert.equal(await h.page.locator('[data-ai-action=job-skills]').isDisabled(),true);
  await h.page.getByText(az.hrAi.contextRequired,{exact:true}).waitFor();
  await t.test('Unconfigured provider explains setup and manual entry, never hardcoded skills',async()=>{
   await h.page.getByRole('button',{name:az.hrAi.checkSetup,exact:true}).click();
   await h.page.getByText(az.hrAi.setupState.not_configured,{exact:true}).waitFor();
   assert.equal(await h.page.locator('[data-ai-proposal]').count(),0);
   assert.equal(await h.page.getByRole('button',{name:'Vakansiyanı dərc et',exact:true}).isEnabled(),true);
   assert.equal(h.wire.filter(r=>r.path==='/api/hr/ai/job-skills').length,0);
  });
  await t.test('Configured metadata is not real E2E proof; language/draft edits issue zero new checks',async()=>{
   const pattern='**/api/hr/ai/status';await h.page.route(pattern,r=>r.fulfill({contentType:'application/json',body:JSON.stringify(status('configured_not_verified'))}));
   await h.page.getByRole('button',{name:az.hrAi.checkSetup,exact:true}).click();await h.page.getByText(az.hrAi.setupState.configured_not_verified,{exact:true}).waitFor();
   const count=h.wire.length;await h.page.getByLabel('Vakansiyanın adı *',{exact:true}).fill('Synthetic cashier');await h.page.evaluate(()=>window.changeLanguage('en'));
   assert.equal(h.wire.length,count);assert.equal(await h.page.locator('[data-ai-proposal]').count(),0);await h.page.evaluate(()=>window.changeLanguage('az'));await h.page.unroute(pattern);
  });
  await t.test('500/read failure stays auxiliary and retry is explicit',async()=>{
   const pattern='**/api/hr/ai/status';await h.page.route(pattern,r=>r.fulfill({status:500,body:'Synthetic failure'}));
   await h.page.getByRole('button',{name:az.hrAi.checkSetup,exact:true}).click();await h.page.getByText(az.hrAi.setupError,{exact:true}).waitFor();
   assert.equal(await h.page.locator('input[name=position]').inputValue(),'Synthetic cashier');await h.page.unroute(pattern);
  });
  assert.deepEqual(h.pageErrors,[]);
 });
});
