const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const harness="import React from 'react';import{createRoot}from'react-dom/client';import App from'/src/App.tsx';import api from'/src/api/axios.ts';import'/src/i18n/index.ts';api.defaults.baseURL='/api';window.navigateTest=()=>{};createRoot(document.getElementById('root')).render(React.createElement(App));";
test('administration: actual forms, membership, granular rights, password validation and responsive pages',async()=>withBrowserFixture(harness,async h=>{
 const p=h.page;const out=process.env.INOP_QA_SCREENSHOTS || fs.mkdtempSync(path.join(os.tmpdir(),'inop-admin-ui-'));fs.mkdirSync(out,{recursive:true});
 await h.open('admin','/app/departments');await p.getByRole('button',{name:'Yeni şöbə',exact:true}).click();await p.locator('#department-name').fill('Browser QA Department');await p.getByRole('button',{name:'Yarat',exact:true}).click();await p.getByRole('dialog').waitFor({state:'hidden'});
 const Department=require('../../Backend/models/department.model');const dept=await Department.findOne({name:'Browser QA Department'});assert.ok(dept);
 await p.getByRole('link',{name:'Şöbənin istifadəçilərinə bax'}).first().click();await p.getByRole('heading',{name:'İstifadəçilər',exact:true}).waitFor();
 await h.open('admin','/app/users/new');await p.getByLabel('Ad və soyad',{exact:true}).fill('Browser QA User');
 await p.locator('input[type=email]').fill('browser-admin-qa@example.invalid');await p.locator('input[type=password]').fill('Synthetic-user-456');
 await p.locator('select').filter({has:p.locator('option[value="employee"]')}).selectOption('employee');await p.getByLabel('Şöbə',{exact:true}).selectOption(String(dept._id));
 await p.locator('button[type=submit]').click();await p.waitForURL('**/app/users');await p.getByRole('cell').filter({hasText:'Browser QA User'}).first().waitFor();
 const saved=await h.models.User.findOne({email:'browser-admin-qa@example.invalid'});assert.equal(saved.departmentId,String(dept._id));assert.equal(saved.role,'employee');
 await h.open('admin','/app/roles');await p.getByRole('button',{name:'Yeni rol',exact:true}).click();await p.locator('.role-modal input').first().fill('Browser Limited HR');
 await p.locator('details').filter({has:p.locator('summary').filter({hasText:/^HR Auditi$/})}).locator('summary').click();
 const checkbox=p.locator('.permission-group').first().locator('input[type=checkbox]').first();await checkbox.check();await p.locator('.permission-group').first().locator('select').first().selectOption('own');
 for(const[width,height]of [[1440,900],[768,1024],[390,844]]){await p.setViewportSize({width,height});await p.waitForTimeout(400);await p.screenshot({path:out+'/role-permissions-modal-'+width+'.png',fullPage:true});}
 await p.locator('.role-modal button[type=submit]').click();await p.getByRole('dialog').waitFor({state:'hidden'});
 const role=await h.models.Role.findOne({key:'browser_limited_hr'});assert.ok(role);assert.deepEqual(role.permissions.map(x=>({resource:x.resource,action:x.action,scope:x.scope})),[{resource:'audit.hr',action:'read',scope:'own'}]);
 for(const route of ['dashboard','users','users/new','departments','roles','activity-log','profile','audit/audits','audit/restaurants','audit','audit/hr']){
  await h.open('admin','/app/'+route);await p.locator('.admin-main').waitFor();await p.waitForLoadState('networkidle');
  if(route==='audit/restaurants')assert.ok(await p.locator('.search-field input').evaluate(e=>parseFloat(getComputedStyle(e).paddingLeft)>=36),'search icon must reserve text padding');
  for(const[width,height]of [[1440,900],[768,1024],[390,844]]){await p.setViewportSize({width,height});await p.waitForTimeout(400);await p.screenshot({path:out+'/'+route.replaceAll('/','-')+'-'+width+'.png',fullPage:true});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,route+' root overflow '+width);}
 }
 await p.clock.install();
 await p.route('**/api/jobs/dashboard-summary',()=>{});
 await h.open('admin','/app/dashboard');await p.getByText('Xoş gəlmisiniz, admin',{exact:true}).waitFor();
 await p.clock.runFor(100);await p.clock.fastForward(16000);await p.getByText(await p.evaluate(async()=> (await import('/src/i18n/index.ts')).default.t('dashboard.recruitmentLoadError')),{exact:true}).first().waitFor();
 await p.unroute('**/api/jobs/dashboard-summary');await p.clock.resume();
 await h.open('admin','/app/profile');await p.locator('#current-password').fill('Synthetic-old-456');await p.locator('#new-password').fill('short');await p.locator('#confirm-password').fill('different');const before=h.wire.length;await p.locator('form button').click();await p.getByRole('alert').waitFor();assert.equal(h.wire.length,before,'invalid password must not be sent');
 await p.setViewportSize({width:1440,height:900});await p.waitForTimeout(400);await p.locator('.admin-sidebar__profile-toggle').click();await p.getByRole('menuitem',{name:'Çıxış',exact:true}).click();await p.locator('.auth-shell').waitFor();
 for(const[width,height]of [[1440,900],[768,1024],[390,844]]){await p.setViewportSize({width,height});await p.waitForTimeout(400);await p.screenshot({path:out+'/login-'+width+'.png',fullPage:true});}
 assert.deepEqual(h.pageErrors,[]);
}));

test('last-admin rejection remains visible inside the confirmation dialog in all languages and viewport sizes', async () => withBrowserFixture(harness, async h => {
 const p=h.page;
 await h.models.Role.create({key:'ui_privilege_operator',name:'UI privilege operator',permissions:[{resource:'user',action:'*',scope:'all'},{resource:'role',action:'*',scope:'all'},{resource:'department',action:'read',scope:'all'}]});
 await h.models.User.updateOne({_id:h.actors.own._id},{role:'ui_privilege_operator'});
 await h.models.User.updateOne({_id:h.actors.peer._id},{isActive:false});
 await h.open('own','/app/users');
 const row=p.getByRole('row').filter({has:p.getByText('admin@example.invalid',{exact:true})});
 await row.waitFor();await p.waitForLoadState('networkidle');
 for(const language of ['az','en','ru']) {
  const readsBeforeLocale=h.wire.filter(r=>r.method==='GET').length;
  await p.evaluate(async l=>(await import('/src/i18n/index.ts')).changeLanguage(l),language);
  const labels=await p.evaluate(async()=>{const t=(await import('/src/i18n/index.ts')).default.t;return{deactivate:t('users.deactivate'),confirm:t('users.deactivate'),error:t('adminUI.lastActiveAdmin')}});
  await row.getByRole('button',{name:labels.deactivate,exact:true}).click();
  const dialog=p.getByRole('dialog');
  await dialog.getByRole('button',{name:labels.confirm,exact:true}).click();
  await dialog.getByRole('alert').waitFor();
  assert.equal(await dialog.getByRole('alert').textContent(),labels.error);
  assert.ok(await row.isVisible(),'Rejected status mutation must not replace the loaded user list');
  const reads=h.wire.filter(r=>r.method==='GET').length;
  assert.equal(reads,readsBeforeLocale,'Language change and refused mutation must not refetch the directory');
  for(const width of [1440,768,390,320]) {
   await p.setViewportSize({width,height:900});
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(process.env.INOP_QA_SCREENSHOTS) await p.screenshot({path:path.join(process.env.INOP_QA_SCREENSHOTS,`last-admin-dialog-${language}-${width}.png`),fullPage:false,animations:'disabled'});
  }
  assert.equal(h.wire.filter(r=>r.method==='GET').length,reads,'Dialog rendering must not refetch the directory');
  if(language==='ru') {
   const pattern='**/api/users/*/status';
   await p.route(pattern,route=>route.fulfill({status:429,json:{message:'Untrusted response text'}}));
   try {
    await dialog.getByRole('button',{name:labels.confirm,exact:true}).click();
    const limited=await p.evaluate(async()=> (await import('/src/i18n/index.ts')).default.t('adminUI.rateLimited'));
    await dialog.getByRole('alert').filter({hasText:limited}).waitFor();
    assert.equal(await p.getByText('Untrusted response text',{exact:true}).count(),0);
    if(process.env.INOP_QA_SCREENSHOTS)await p.screenshot({path:path.join(process.env.INOP_QA_SCREENSHOTS,'rate-limit-dialog-ru-320.png'),fullPage:false,animations:'disabled'});
   } finally {await p.unroute(pattern);}
  }
  await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  assert.ok(await row.getByRole('button',{name:labels.deactivate,exact:true}).evaluate(e=>e===document.activeElement),'Escape restores focus to the trigger');
 }
 const activate=await p.evaluate(async()=> (await import('/src/i18n/index.ts')).default.t('users.activate'));
 const peer=p.getByRole('row').filter({has:p.getByText('peer@example.invalid',{exact:true})});
 await peer.getByRole('button',{name:activate,exact:true}).click();
 assert.ok(await p.getByRole('dialog').getByRole('button',{name:activate,exact:true}).evaluate(e=>e.classList.contains('btn-primary')));
 if(process.env.INOP_QA_SCREENSHOTS)await p.screenshot({path:path.join(process.env.INOP_QA_SCREENSHOTS,'activation-dialog-ru-320.png'),fullPage:false,animations:'disabled'});
 await p.keyboard.press('Escape');
 await h.audit('admin');
 for(const [route,part] of [['/app/audit/audits','generic'],['/app/audit/restaurants','restaurants']]) {
  await h.open('admin',route);
  for(const language of ['az','en','ru']) {
   await p.evaluate(async l=>(await import('/src/i18n/index.ts')).changeLanguage(l),language);
   const labels=await p.evaluate(async key=>{const t=(await import('/src/i18n/index.ts')).default.t;return{archive:t('hrArchive.archive'),title:t(`audit.${key}.list.deleteTitle`)}},part);
   await p.getByRole('button',{name:labels.archive,exact:true}).first().click();
   const dialog=p.getByRole('dialog');await dialog.getByRole('heading',{name:labels.title,exact:true}).waitFor();
   assert.ok(await dialog.getByRole('button',{name:labels.archive,exact:true}).isVisible());
   assert.ok(!/permanently removed|archiveMessage/.test(await dialog.textContent()));
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(process.env.INOP_QA_SCREENSHOTS)await p.screenshot({path:path.join(process.env.INOP_QA_SCREENSHOTS,`archive-${part}-${language}-320.png`),fullPage:false,animations:'disabled'});
   await p.keyboard.press('Escape');
  }
 }
 console.log(JSON.stringify({scenario:'localized recoverable admin error',languages:3,viewports:[1440,768,390,320],directoryRefetchOnLanguageOrError:0,loadedListPreserved:true}));
 assert.equal(await h.models.User.countDocuments({role:'admin',isActive:true}),1);
 assert.deepEqual(h.pageErrors,[]);
}));
