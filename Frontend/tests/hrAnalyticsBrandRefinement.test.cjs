const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const harness=async file=>(await fs.readFile(path.join(__dirname,file),'utf8')).match(/const (?:loginHarness|harness)=`([\s\S]*?)`;/)[1];
const before='55d22c83b5e65b94ac8437154f842f41142df188';
test('Sidebar preserves shared SVG proportion and fits languages with classic scrollbar space',async t=>{
 await withBrowserFixture(await harness('hrNavigationPerformance.test.cjs'),async h=>{
  await h.page.setViewportSize({width:1440,height:900});await h.open('admin','/app/recruitment/jobs');await h.page.locator('.admin-table-container').waitFor();
  await t.test('Reserved scrollbar gutter reproduces old overflow and current language row fits',async()=>{
   const old=execFileSync('git',['show',before+':Frontend/src/Styles/layout.css'],{encoding:'utf8'});
   const latest=await fs.readFile(path.join(__dirname,'../src/Styles/layout.css'),'utf8');
   const result=await h.page.evaluate(async ({old,latest})=>{const aside=document.querySelector('aside');aside.style.scrollbarGutter='stable';const style=[...document.querySelectorAll('style[data-vite-dev-id]')].find(e=>e.textContent.includes(latest.trim()));if(!style)throw Error('Actual bundled layout stylesheet missing');const current=style.textContent;const read=()=>({client:aside.clientWidth,scroll:aside.scrollWidth});style.textContent=current.replace(latest.trim(),old.trim());await new Promise(requestAnimationFrame);const previous=read();style.textContent=current;await new Promise(requestAnimationFrame);return{previous,current:read()};},{old,latest});
   assert.ok(result.previous.scroll>result.previous.client,'Classic gutter must reproduce actual overflow');assert.ok(result.current.scroll<=result.current.client+1);await fs.writeFile('/workspace/work/premium/brand-sidebar-gutter.json',JSON.stringify(result,null,2));
  });
  for(const width of[320,768,1440])for(const locale of['AZE','ENG','RUS'])await t.test('Sidebar '+width+' '+locale,async()=>{
   await h.page.setViewportSize({width,height:900});if(width<=900){await h.page.keyboard.press('Escape');await h.page.waitForFunction(()=>document.querySelector('aside').inert);await h.page.getByRole('button',{name:/Menyu|Toggle menu|меню/i}).click();}
   const aside=h.page.locator('aside');await aside.getByRole('button',{name:locale,exact:true}).click();await aside.evaluate(e=>e.scrollTo(0,0));await h.page.evaluate(()=>new Promise(requestAnimationFrame));const logo=aside.locator('.inop-logo');await logo.waitFor();
   const size=await logo.boundingBox();assert.ok(size.y>=0);assert.ok(Math.abs(size.width/size.height-3.5)<.03);assert.ok(size.width<=144.1);
   assert.ok(await aside.evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert.ok(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await fs.mkdir('/workspace/work/premium/brand-regression-screens',{recursive:true});if(locale==='AZE')await h.page.screenshot({path:'/workspace/work/premium/brand-regression-screens/sidebar-'+width+'.png',fullPage:true});
   if(width<=900){await h.page.keyboard.press('Escape');await h.page.waitForFunction(()=>document.querySelector('aside').inert);}
  });assert.deepEqual(h.pageErrors,[]);
 });
});
test('Login has deep navy/white surfaces, readable form and responsive shared logo',async t=>{
 await withBrowserFixture(await harness('hrUnifiedBrand.test.cjs'),async h=>{
  for(const width of[320,768,1440])await t.test('Navy/white login '+width,async()=>{
   await h.page.setViewportSize({width,height:900});await h.open('admin','/login');await h.page.locator('#email').waitFor();
   assert.equal(await h.page.locator('.auth-brand-panel').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(19, 39, 69)');
   assert.equal(await h.page.locator('.auth-entry-panel').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
   assert.equal(await h.page.locator('.auth-brand-panel').evaluate(e=>getComputedStyle(e).backgroundImage),'none');
   assert.ok(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await fs.mkdir('/workspace/work/premium/brand-regression-screens',{recursive:true});await h.page.screenshot({path:'/workspace/work/premium/brand-regression-screens/login-'+width+'.png',fullPage:true});
   await h.page.locator('#email').fill('visual-only@example.invalid');await h.page.locator('#password').fill('synthetic-ui-only');await h.page.getByRole('button',{name:'Şifrəni göstər',exact:true}).click();assert.equal(await h.page.locator('#password').getAttribute('type'),'text');
  });assert.deepEqual(h.pageErrors,[]);
 });
 for(const name of['inop-320.webp','inop-640.webp'])assert.deepEqual(await fs.readFile(path.join(__dirname,'../src/assets/brand',name)),execFileSync('git',['show',before+':Frontend/src/assets/brand/'+name]));
});
