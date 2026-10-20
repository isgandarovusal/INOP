const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const az=require('../src/i18n/locales/az.json');
const harness=()=>fs.readFile(path.join(__dirname,'hrNavigationPerformance.test.cjs'),'utf8').then(s=>s.match(/const harness=`([\s\S]*?)`;/)[1]);
test('Enterprise controls keep contrast, keyboard confirmation and responsive geometry',async()=>withBrowserFixture(await harness(),async h=>{
 const output=process.env.INOP_QA_SCREENSHOTS||await fs.mkdtemp(path.join(os.tmpdir(),'inop-controls-'));await fs.mkdir(output,{recursive:true});
 const c=(await h.request('admin','POST','/candidates',{name:'Enterprise controls fixture',role:'Cashier'})).data;
 for(const width of [1440,768,390,320]){
  await h.page.setViewportSize({width,height:1000});await h.open('admin','/app/recruitment/candidates');await h.page.locator('.hr-candidates-table').waitFor();
  assert.ok(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const create=h.page.locator('.recruitment-action--create');await create.focus();assert.equal(await create.evaluate(e=>e===document.activeElement),true);
  const contrast=await create.evaluate(e=>{const s=getComputedStyle(e),rgb=x=>x.match(/[\d.]+/g).slice(0,3).map(Number),lum=x=>rgb(x).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);return (Math.max(lum(s.color),lum(s.backgroundColor))+.05)/(Math.min(lum(s.color),lum(s.backgroundColor))+.05);});assert.ok(contrast>=4.5);
  await h.page.getByRole('button',{name:az.hrArchive.archive+' '+c.name,exact:true}).click();const dialog=h.page.getByRole('dialog');await dialog.waitFor();const cancel=dialog.getByRole('button',{name:az.components.confirmDialog.cancel,exact:true});assert.equal(await cancel.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');assert.equal(await dialog.locator('.btn-danger-solid').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(153, 27, 27)');await h.page.keyboard.press('Escape');assert.equal(await dialog.count(),0);
  await h.page.screenshot({path:path.join(output,`controls-${width}.png`),fullPage:true});
 }
 assert.deepEqual(h.pageErrors,[]);
}));
