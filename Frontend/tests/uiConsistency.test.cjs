const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const harness=fs.readFileSync(path.join(__dirname,'hrNavigationPerformance.test.cjs'),'utf8').match(/const harness=`([\s\S]*?)`;/)[1];
const sizes=[1440,768,390,320];
const routes=['dashboard','users','users/new','departments','roles','activity-log','profile','audit','audit/restaurants','audit/restaurants/new','audit/audits','audit/checklists','audit/checklists/new','audit/hr','audit/hr/new','audit/hr/analytics','audit/service','audit/service/new','audit/service/analytics','audit/standard','audit/standard/new','audit/standard/analytics','audit/safety','audit/safety/new','audit/safety/analytics','audit/analytics','audit/dashboard','audit/auditors','audit/notifications','recruitment/jobs','recruitment/jobs/new','recruitment/candidates','recruitment/candidates/new','recruitment/applications','recruitment/analytics','recruitment/cv-intake'];
async function language(p,lang){await p.evaluate(async lang=>{const m=await import('/src/i18n/index.ts');m.changeLanguage(lang)},lang)}
async function styles(p,selector){return p.locator(selector).first().evaluate(e=>{const s=getComputedStyle(e);return Object.fromEntries(['backgroundColor','color','borderRadius','minHeight','fontSize','fontWeight'].map(k=>[k,s[k]]))})}
test('Shared controls, N proportions, localized dashboard stability, administration dialogs and responsive platform',async()=>withBrowserFixture(harness,async h=>{
 const p=h.page,out=process.env.INOP_QA_SCREENSHOTS||fs.mkdtempSync(path.join(os.tmpdir(),'inop-ui-consistency-'));fs.mkdirSync(out,{recursive:true});
 await h.open('admin','/app/dashboard');await p.locator('.chart-empty').first().waitFor();await p.waitForLoadState('networkidle');
 const initialReads=h.wire.filter(r=>r.path.endsWith('/dashboard-summary')).length;assert.equal(initialReads,4);
 const letters=await p.locator('aside .inop-logo path').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>{const b=n.getBBox();return[n.dataset.letter,{x:b.x,y:b.y,width:b.width,height:b.height}]})));
 assert.ok(letters.N.width<=letters.O.width*1.1,'N must not dominate the round letter');assert.equal(letters.N.y,letters.P.y);assert.equal(letters.N.height,letters.P.height);
 const sidebarPaths=await p.locator('aside .inop-logo path').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')));
 await p.locator('aside .inop-logo').screenshot({path:out+'/sidebar-wordmark.png'});
 for(const lang of ['az','en','ru']){await language(p,lang);await p.waitForTimeout(150);assert.equal(await p.getByText('dashboard.viewAll',{exact:true}).count(),0);assert.equal(await p.locator('.main-dashboard').innerText().then(s=>s.includes('dashboard.')),false);}
 await p.waitForTimeout(1200);assert.equal(h.wire.filter(r=>r.path.endsWith('/dashboard-summary')).length,initialReads,'Changing locale must not restart data loading');
 assert.equal(await p.locator('.main-dashboard .empty-state').filter({hasText:/^(Yüklənir|Loading|Загрузка)/}).count(),0);
 // A stalled audit request reaches an explicit error, with one request and an explicit retry.
 await p.clock.install();await p.route('**/api/audits/dashboard-summary',()=>{});await h.open('admin','/app/dashboard');await p.locator('.main-dashboard').waitFor();await p.clock.runFor(100);await p.clock.fastForward(16000);await p.locator('.dashboard-error').waitFor();await p.unroute('**/api/audits/dashboard-summary');await p.clock.resume();
 const controlSamples={},inputSamples={};
 // Fail on primitive regressions before generating the full screenshot matrix.
 for(const route of ['users/new','audit/hr/new','recruitment/jobs/new','recruitment/jobs']){
  await h.open('admin','/app/'+route);await p.waitForLoadState('networkidle');
  for(const width of sizes){await p.setViewportSize({width,height:900});
   const button=await styles(p,'.admin-main :is(.btn-primary,.btn-add)');
   if(route==='users/new')controlSamples[width]=button;else assert.deepEqual(button,controlSamples[width],route+' primary '+width);
   if(route!=='recruitment/jobs'){
    const input=await styles(p,'.admin-main input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=password])');
    if(route==='users/new')inputSamples[width]=input;else assert.deepEqual(input,inputSamples[width],route+' input '+width);
   }
  }
 }
 for(const route of routes){await h.open('admin','/app/'+route);await p.locator('.admin-main').waitFor();await p.waitForLoadState('networkidle');
  for(const lang of ['az','en','ru']){await language(p,lang);
   for(const width of sizes){await p.setViewportSize({width,height:900});await p.waitForTimeout(350);await p.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0)});
    const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,`${route} ${lang} ${width} overflow`);
    await p.screenshot({path:path.join(out,`${route.replaceAll('/','-')}-${lang}-${width}.png`),fullPage:true});
    const faint = await p.locator('.admin-main button:not(:disabled):not([aria-disabled=true])').evaluateAll(nodes => nodes.filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').flatMap(e => {
      const s = getComputedStyle(e);
      return Number(s.opacity) < 0.7 ? [{text:e.textContent.trim(),className:e.className,opacity:s.opacity}] : [];
    }));
    assert.deepEqual(faint, [], `${route} ${lang} ${width}: active buttons must not look disabled`);

   }
  }
  console.log('Visual QA:',route);
 }
 await p.setViewportSize({width:1440,height:900});await h.open('admin','/app/departments');await language(p,'az');await p.getByRole('button',{name:'Yeni şöbə',exact:true}).click();
 for(const lang of ['az','en','ru']){await language(p,lang);for(const width of sizes){await p.setViewportSize({width,height:900});await p.waitForTimeout(350);await p.screenshot({path:out+'/department-modal-'+lang+'-'+width+'.png',fullPage:false});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}}
 await language(p,'az');
 const cancel=await styles(p,'.modal-card .btn-cancel');assert.notEqual(cancel.backgroundColor,'rgb(153, 27, 27)');assert.equal(await p.locator('#department-name').evaluate(e=>getComputedStyle(e).minHeight),'44px');
 await p.getByRole('button',{name:'Ləğv et',exact:true}).click();
 await p.setViewportSize({width:1440,height:900});await h.open('admin','/app/roles');await language(p,'az');await p.getByRole('button',{name:'Yeni rol',exact:true}).click();
 await p.locator('.role-modal summary').filter({hasText:/^HR Auditi$/}).click();
 for(const lang of ['az','en','ru']){await language(p,lang);const copy=require('../src/i18n/locales/'+lang+'.json').roles.form;await p.getByRole('dialog').getByText(copy.keyHint,{exact:true}).waitFor();assert.equal(await p.locator('.role-modal input').first().getAttribute('placeholder'),copy.namePlaceholder);for(const width of sizes){await p.setViewportSize({width,height:900});await p.waitForTimeout(350);await p.screenshot({path:out+'/role-modal-'+lang+'-'+width+'.png',fullPage:false});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}}
 await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});await language(p,'az');
 // Deletion confirmation opens against an owned fixture record; never confirms deletion.
 const dep=await h.request('admin','POST','/departments',{name:'Synthetic dialog fixture'});assert.equal(dep.status,201);
 await h.open('admin','/app/departments');await p.locator('button.icon-btn--danger').first().click();await p.getByRole('dialog').waitFor();
 assert.equal(await p.locator('.btn-cancel').evaluate(e=>e===document.activeElement),true);assert.notDeepEqual(await styles(p,'.btn-danger-solid'),await styles(p,'.btn-cancel'));await p.screenshot({path:out+'/confirmation-neutral-vs-danger.png',fullPage:false});
 await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});await p.evaluate(()=>{window.setTestUser(null);return window.navigateTest('/login')});await p.locator('.auth-shell').waitFor();
 assert.deepEqual(await p.locator('.auth-shell .inop-logo path').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d'))),sidebarPaths,'Login and sidebar use the identical wordmark');
 for(const lang of ['az','en','ru']){await language(p,lang);for(const width of sizes){await p.setViewportSize({width,height:900});await p.waitForTimeout(350);await p.screenshot({path:out+'/login-'+lang+'-'+width+'.png',fullPage:false});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}}
 await p.setViewportSize({width:1440,height:900});await p.locator('.auth-shell .inop-logo').screenshot({path:out+'/login-wordmark.png'});
 assert.deepEqual(h.pageErrors,[]);console.log('UI QA screenshots:',out,JSON.stringify({letters,controlSamples,inputSamples}));
}));
