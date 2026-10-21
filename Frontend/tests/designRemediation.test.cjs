const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const app="import React from 'react';import{createRoot}from'react-dom/client';import App from'/src/App.tsx';import api from'/src/api/axios.ts';import'/src/i18n/index.ts';api.defaults.baseURL='/api';window.navigateTest=()=>{};createRoot(document.getElementById('root')).render(React.createElement(App));";
const lang=(p,l)=>p.evaluate(async l=>(await import('/src/i18n/index.ts')).changeLanguage(l),l);
const reads=(h)=>h.wire.filter(x=>x.method==='GET'&&['/api/users','/api/roles','/api/departments','/api/restaurants'].includes(x.path)).length;
const out=process.env.INOP_QA_SCREENSHOTS||fs.mkdtempSync(path.join(os.tmpdir(),'inop-remediation-'));
fs.mkdirSync(out,{recursive:true});
test('admin reads stay stable across locales; form drafts, restaurant keyboard navigation and discoverable self password change',async()=>withBrowserFixture(app,async h=>{
 const p=h.page;
 for(const route of ['users','departments','roles','audit/restaurants']){
  await h.open('admin','/app/'+route);await p.waitForLoadState('networkidle');const before=reads(h);
  for(const l of ['en','ru','az']){await lang(p,l);await p.waitForTimeout(100);}
  assert.equal(reads(h),before,route+' locale changes must not fetch');
 }
 const department=await h.request('admin','POST','/departments',{name:'Synthetic remediation department',description:'Owned QA only'});assert.equal(department.status,201);
 await h.open('admin','/app/departments');await p.getByRole('row').filter({hasText:'Synthetic remediation department'}).locator('.icon-btn--edit').click();await p.locator('#department-name').fill('Synthetic edited department');await p.getByRole('dialog').locator('button[type=submit]').click();await p.getByRole('dialog').waitFor({state:'hidden'});
 await p.getByRole('row').filter({hasText:'Synthetic edited department'}).locator('.icon-btn--danger').click();await p.getByRole('dialog').locator('.btn-danger-solid').click();await p.getByRole('dialog').waitFor({state:'hidden'});await p.getByRole('row').filter({hasText:'Synthetic edited department'}).waitFor({state:'hidden'});
 let roleFaults=0;await p.route('**/api/roles',route=>{roleFaults++;return route.fulfill({status:503,contentType:'application/json',body:'{}'})});await h.open('admin','/app/roles');await p.getByRole('alert').first().waitFor();assert.equal(roleFaults,1,'role read must settle once on error');await p.unroute('**/api/roles');await p.getByRole('button',{name:'Yenidən cəhd et',exact:true}).click();await p.getByRole('button',{name:'Yeni rol',exact:true}).waitFor();await p.getByRole('button',{name:'Yeni rol',exact:true}).click();assert.equal(await p.locator('.role-modal__field-hint').evaluate(e=>getComputedStyle(e).color),'rgb(83, 102, 129)');await p.keyboard.press('Escape');
 await h.open('admin','/app/users/new');await p.getByLabel('Ad və soyad',{exact:true}).fill('Unsaved local draft');const before=reads(h);
 for(const l of ['en','ru','az']){await lang(p,l);await p.waitForTimeout(100);assert.equal(await p.locator('input').first().inputValue(),'Unsaved local draft');}
 assert.equal(reads(h),before,'locale must not reload form catalogs');
 await h.open('admin','/app/audit/restaurants');await p.locator('tbody a').first().waitFor();
 const palette=await p.locator('.cell-muted').first().evaluate(e=>({foreground:getComputedStyle(e).color,background:getComputedStyle(e.closest('.admin-table-container')).backgroundColor}));
 assert.equal(palette.foreground,'rgb(83, 102, 129)','muted table text must use the accessible slate token');
 const linear=x=>{x/=255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4},lum=(r,g,b)=>linear(r)*.2126+linear(g)*.7152+linear(b)*.0722;
 const ratio=1.05/(lum(83,102,129)+.05);assert.ok(ratio>=4.5);console.log('Rendered table palette and white-surface contrast:',JSON.stringify({...palette,contrast:ratio.toFixed(2)}));
 const target=p.locator('tbody a').first();await target.focus();await p.keyboard.press('Enter');await p.waitForURL(/\/app\/audit\/restaurants\/[^/]+$/);
 await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{role:'employee'}});
 // Every signed-in role reaches password change only through the footer menu; no password is present in screenshots.
 for(const actor of ['admin','peer']){
  await h.open(actor,'/app/dashboard');await p.setViewportSize({width:390,height:900});await p.locator('.admin-topbar__toggle').click();await p.locator('.admin-sidebar__profile-toggle').click();await p.getByRole('menu').waitFor();assert.equal(await p.locator('aside > a[href="/app/profile"]').count(),0);await p.waitForTimeout(350);assert.ok((await p.locator('aside').boundingBox()).x>=0);await p.screenshot({path:path.join(out,`profile-menu-${actor}-390.png`)});await p.setViewportSize({width:1440,height:900});await p.keyboard.press('Escape');await p.locator('.admin-sidebar__profile-toggle').click();const account=p.getByRole('menuitem').first();await p.mouse.move(1000,850);assert.equal(await account.evaluate(e=>getComputedStyle(e).color),'rgb(32, 54, 91)');await account.click();await p.locator('#current-password').waitFor();
  for(const l of ['az','en','ru']){await lang(p,l);for(const width of [1440,768,390,320]){await p.setViewportSize({width,height:900});await p.screenshot({path:path.join(out,`profile-${actor}-${l}-${width}.png`),fullPage:true});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(width<=900){await p.emulateMedia({reducedMotion:'reduce'});await p.locator('.admin-topbar__toggle').click();assert.equal(await p.locator('aside').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');assert.equal(await p.locator('.admin-overlay').evaluate(e=>getComputedStyle(e).animationName),'none');}
   const trigger=p.locator('.admin-sidebar__profile-toggle');await trigger.focus();await p.keyboard.press('Enter');await p.getByRole('menu').waitFor();assert.equal(await p.getByRole('menuitem').count(),2);assert.equal(await p.locator('aside a[href="/app/profile"]').count(),1);assert.equal(await p.getByRole('menuitem').first().evaluate(e=>e===document.activeElement),true);await p.keyboard.press('ArrowDown');assert.equal(await p.getByRole('menuitem').last().evaluate(e=>e===document.activeElement),true);await p.keyboard.press('Escape');assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);await trigger.click();
   const footer=await p.locator('.admin-sidebar__user').boundingBox();assert.ok(footer.y+footer.height<=900);await p.locator('.admin-sidebar__scroll').evaluate(e=>e.scrollTop=e.scrollHeight);assert.deepEqual(await p.locator('.admin-sidebar__user').boundingBox(),footer);await p.screenshot({path:path.join(out,`profile-dropdown-${actor}-${l}-${width}.png`)});await p.keyboard.press('Escape');if(width<=900){await p.locator('.admin-topbar__toggle').click();await p.emulateMedia({reducedMotion:'no-preference'});}
  }}
 }
 // Owned local account only. Random credentials never appear in logs or screenshots.
 const bcrypt=require('../../Backend/node_modules/bcryptjs');const old=crypto.randomBytes(16).toString('hex')+'Aa1',next=crypto.randomBytes(16).toString('hex')+'Bb2';
 await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{password:await bcrypt.hash(old,4)}});
 const second=await h.request('anonymous','POST','/auth/login',{email:h.actors.peer.email,password:old});assert.equal(second.status,200);
 await h.open('peer','/app/profile');await lang(p,'az');
 const blank=h.wire.length;await p.locator('form button').click();assert.equal(h.wire.length,blank,'required fields do not submit');
 await p.locator('#current-password').fill(old);await p.locator('#new-password').fill('short');await p.locator('#confirm-password').fill('short');await p.locator('form button').click();await p.getByRole('alert').first().waitFor();assert.equal(h.wire.length,blank,'short password does not submit');
 await p.locator('#current-password').fill(old);await p.locator('#new-password').fill(next);await p.locator('#confirm-password').fill('mismatch');const sent=h.wire.filter(x=>x.path==='/api/auth/change-password').length;
 await p.locator('form button').click();await p.getByRole('alert').first().waitFor();assert.equal(h.wire.filter(x=>x.path==='/api/auth/change-password').length,sent);
 await p.locator('#current-password').fill('incorrect');await p.locator('#confirm-password').fill(next);await p.locator('form button').click();await p.getByText(await p.evaluate(async()=>(await import('/src/i18n/index.ts')).default.t('adminUI.currentPasswordInvalid')),{exact:true}).waitFor();
 await p.locator('#current-password').fill(old);await p.locator('form button').click();await p.locator('.auth-shell').waitFor();
 const expired=await fetch(h.apiBase+'/auth/me',{headers:{Authorization:'Bearer '+second.data.token}});assert.equal(expired.status,401,'other sessions must be invalidated');
 assert.deepEqual(h.pageErrors,[]);console.log('Locale reads and password/session checks passed. Screenshots:',out);
}));
const controls=`import React from'react';import{createRoot}from'react-dom/client';import PrivateFilePreview from'/src/Components/PrivateFilePreview.tsx';import PageState from'/src/Components/PageState.tsx';import{usePrivateFile}from'/src/Hooks/usePrivateFile.ts';import'/src/i18n/index.ts';import'/src/App.css';window.navigateTest=()=>{};const el=React.createElement;const revoke=URL.revokeObjectURL.bind(URL);window.revoked=[];URL.revokeObjectURL=u=>{window.revoked.push(u);revoke(u)};function Demo(){const f=usePrivateFile('fixture');return el('main',{style:{display:'flex',flexWrap:'wrap',alignItems:'flex-start',gap:12,padding:20}},el('button',{className:'btn-primary',id:'open',onClick:()=>f.open(async()=>({blob:new Blob(['synthetic'],{type:'text/plain'}),text:'Synthetic preview'}))},'Open preview'),el(PageState,{type:'loading'}),f.url&&el(PrivateFilePreview,{url:f.url,type:f.type,text:f.text,name:'Synthetic document',onClose:f.close}),el('button',{className:'btn-secondary'},'Secondary'),el('button',{className:'btn-cancel'},'Cancel'),el('button',{className:'btn-danger-solid'},'Delete'),el('button',{className:'btn-secondary',disabled:true},'Disabled'),el('button',{className:'icon-btn','aria-label':'Edit'},'✎'))}createRoot(document.getElementById('root')).render(el(Demo));`;

test('preview uses shared focus/Escape/restore lifecycle; loading announcements and semantic button states',async()=>withBrowserFixture(controls,async h=>{
 const p=h.page;await h.open('admin','/controls');
 assert.equal(await p.getByRole('status').getAttribute('aria-busy'),'true');assert.ok((await p.getByRole('status').innerText()).trim());
 await p.locator('#open').click();const dialog=p.getByRole('dialog',{name:'Synthetic document'});await dialog.waitFor();assert.equal(await dialog.evaluate(e=>e.contains(document.activeElement)),true);
 const focusable=dialog.locator('button,a');await focusable.last().focus();await p.keyboard.press('Tab');assert.equal(await focusable.first().evaluate(e=>e===document.activeElement),true);
 await p.keyboard.press('Shift+Tab');assert.equal(await focusable.last().evaluate(e=>e===document.activeElement),true);
 await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await p.locator('#open').evaluate(e=>e===document.activeElement),true);assert.equal(await p.evaluate(()=>window.revoked.length),1);
 for(const width of [1440,768,390,320]){await p.setViewportSize({width,height:900});await p.screenshot({path:path.join(out,'buttons-after-'+width+'.png')});}
 await p.emulateMedia({reducedMotion:'reduce'});await p.locator('.icon-btn').hover();assert.equal(await p.locator('.icon-btn').evaluate(e=>getComputedStyle(e).transform),'none');
 assert.notEqual(await p.locator('.btn-cancel').evaluate(e=>getComputedStyle(e).backgroundColor),await p.locator('.btn-danger-solid').evaluate(e=>getComputedStyle(e).backgroundColor));assert.deepEqual(h.pageErrors,[]);
}));
const resource=`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{AuthContext}from'/src/Context/AuthContext.ts';import{useListResource}from'/src/Hooks/useListResource.ts';import{useTranslation}from'react-i18next';import'/src/i18n/index.ts';const el=React.createElement,empty=[];window.pending=[];window.commits=0;window.navigateTest=()=>{};const load=()=>new Promise(resolve=>window.pending.push(resolve));function Data(){useTranslation();const r=useListResource(load,empty);window.mutate=r.setData;return el('div',null,el('output',null,r.loading?'loading':r.data.join(',')),el('button',{onClick:r.reload},'Retry'))}function Demo(){const[user,setUser]=useState({id:'one',role:'employee',permissions:[]});window.authority=setUser;return el(AuthContext.Provider,{value:{user,isLoading:false,login:async()=>{},logout:async()=>{}}},el(React.Profiler,{id:'resource',onRender:()=>window.commits++},el(Data)))}createRoot(document.getElementById('root')).render(el(Demo));`;
test('keyed list reads reject stale responses and authority data; bounded commits and no locale requests',async()=>withBrowserFixture(resource,async h=>{
 const p=h.page;await h.open('admin','/resource');await p.waitForFunction(()=>window.pending.length===1);await p.getByRole('button',{name:'Retry'}).click();await p.waitForFunction(()=>window.pending.length===2);
 await p.evaluate(()=>window.pending[1](['new']));await p.getByText('new',{exact:true}).waitFor();const commits=await p.evaluate(()=>window.commits);
 await p.evaluate(()=>window.pending[0](['stale']));await p.waitForTimeout(100);assert.equal(await p.locator('output').innerText(),'new');assert.equal(await p.evaluate(()=>window.commits),commits,'stale response must not commit');
 for(const l of ['en','ru','az'])await lang(p,l);assert.equal(await p.evaluate(()=>window.pending.length),2);
 await p.evaluate(()=>{window.oldMutate=window.mutate});
 await p.evaluate(()=>window.authority({id:'two',role:'employee',permissions:[]}));await p.getByText('loading',{exact:true}).waitFor();assert.equal(await p.getByText('new',{exact:true}).count(),0);await p.waitForFunction(()=>window.pending.length===3);await p.evaluate(()=>window.pending[2](['authority-two']));await p.getByText('authority-two',{exact:true}).waitFor();
 await p.evaluate(()=>window.oldMutate(['old-authority-write']));await p.waitForTimeout(50);assert.equal(await p.locator('output').innerText(),'authority-two');
 const settled=await p.evaluate(()=>window.commits);await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>window.commits),settled,'no idle render loop');console.log('Read/commit measurements:',JSON.stringify({requests:3,localeExtraRequests:0,staleResponseCommits:0,settledCommits:settled}));
}));
