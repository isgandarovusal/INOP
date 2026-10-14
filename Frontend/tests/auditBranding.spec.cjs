const {test,expect}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const fs=require('node:fs/promises');
const harness=`import React from'react';import{createRoot}from'react-dom/client';import{createBrowserRouter,RouterProvider}from'react-router-dom';import{AuthProvider}from'/src/Context/AuthContext.ts';import'/src/i18n/index.ts';import'/src/App.css';import ROUTES from'/src/Routes/Routes.tsx';import api from'/src/api/axios.ts';api.defaults.baseURL='/api';const router=createBrowserRouter(ROUTES);window.navigateTest=to=>router.navigate(to);createRoot(document.getElementById('root')).render(React.createElement(AuthProvider,null,React.createElement(React.Suspense,null,React.createElement(RouterProvider,{router}))));`;
test('Constrained branding preserves login, languages, wordmark and favicon',async()=>withBrowserFixture(harness,async h=>{
 h.page.setDefaultTimeout(30000);
 const before=Boolean(process.env.INOP_BRANDING_BEFORE),label=before?'before':'after',dir='/workspace/work/audit-next/screens';await fs.mkdir(dir,{recursive:true});
 await h.open('admin','/app/audit');if(!before){await expect(h.page.locator('.admin-sidebar .inop-logo path')).toHaveCount(4);await h.page.setViewportSize({width:390,height:1000});await expect(h.page.locator('.admin-topbar .inop-logo path')).toHaveCount(4);await h.page.setViewportSize({width:1440,height:1000});}await h.page.locator('.admin-sidebar__logout').click();await h.page.locator('#email').waitFor();
 for(const width of [1440,768,390]){
  await h.page.setViewportSize({width,height:1000});await expect(h.page.locator('#email')).toBeVisible();expect(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  if(width>680)await h.page.waitForFunction(()=>{const image=document.querySelector('.auth-brand-art img');return image&&image.complete&&image.naturalWidth>1;});await h.page.evaluate(()=>document.fonts.ready);
  await h.page.screenshot({path:`${dir}/login-${label}-${width}.png`,fullPage:true});
 }
 if(!before){
  await h.page.setViewportSize({width:1440,height:1000});
  const titles={'Azərbaycan':'Bütün əməliyyatlar üçün vahid platforma.','English':'One platform for all operations.','Русский':'Единая платформа для всех операций.'};
  for(const[language,title]of Object.entries(titles)){await h.page.locator(`.language-switcher button[title="${language}"]`).click();await expect(h.page.locator('.auth-brand-copy h2')).toHaveText(title);await expect(h.page.locator('.auth-brand-copy p')).toHaveCount(0);}
  await h.page.locator('.language-switcher button[title="Azərbaycan"]').click();await h.page.locator('button[type=submit]').click();await expect(h.page.locator('#email')).toHaveAttribute('aria-invalid','true');
  await h.page.locator('#password').fill('Synthetic only');await h.page.locator('.auth-password-field__toggle').click();await expect(h.page.locator('#password')).toHaveAttribute('type','text');
  const icon=await h.page.request.get(h.origin+'/favicon.svg');expect(icon.status()).toBe(200);expect(await icon.text()).toContain('fill-rule="evenodd"');
  await h.page.evaluate(()=>{const gallery=document.createElement('div');gallery.id='favicon-gallery';gallery.style.cssText='padding:24px;background:#EDF3FB;display:flex;gap:24px;align-items:center';for(const size of[16,32,64]){const image=new Image(size,size);image.src='/favicon.svg';gallery.append(image);}document.body.append(gallery)});
  await h.page.waitForFunction(()=>[...document.querySelectorAll('#favicon-gallery img')].every(img=>img.complete&&img.naturalWidth));await h.page.locator('#favicon-gallery').screenshot({path:dir+'/favicon-sizes.png'});
  await h.models.User.updateOne({_id:h.actors.admin._id},{$set:{password:await require('../../Backend/node_modules/bcryptjs').hash('SyntheticQaOnly!2026',4)}});await h.page.locator('#email').fill('admin@example.invalid');await h.page.locator('#password').fill('SyntheticQaOnly!2026');await h.page.locator('button[type=submit]').click();await expect(h.page).toHaveURL(/\/app\/dashboard/);


 }
 expect(h.pageErrors).toEqual([]);
},{loadSource:id=>{if(!process.env.INOP_BRANDING_BEFORE||!/(INOPLogo\.tsx|Login\.tsx|locales\/(az|en|ru)\.json)$/.test(id))return;const p=id.split('/Frontend/')[1];return require('node:child_process').execFileSync('git',['show',`601c47c677c0c85cd33b61d044fe3ac9a065257c:Frontend/${p}`],{cwd:'/workspace/INOP',encoding:'utf8'});}}));
