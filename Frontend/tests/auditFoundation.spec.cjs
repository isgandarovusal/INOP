const {test,expect}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const fs=require('node:fs/promises');
const harness=`import React from 'react';import{createRoot}from'react-dom/client';import{createBrowserRouter,RouterProvider}from'react-router-dom';import{AuthProvider}from'/src/Context/AuthContext.ts';import'/src/i18n/index.ts';import'/src/App.css';import ROUTES from'/src/Routes/Routes.tsx';import api from'/src/api/axios.ts';api.defaults.baseURL='/api';const router=createBrowserRouter(ROUTES);window.navigateTest=to=>router.navigate(to);createRoot(document.getElementById('root')).render(React.createElement(AuthProvider,null,React.createElement(React.Suspense,{fallback:React.createElement('p',null,'Loading')},React.createElement(RouterProvider,{router}))));`;
test('Audit foundation: real JWT/data, responsive screenshots, locales and direction isolation',async()=>{
 await withBrowserFixture(harness,async h=>{
  const output=process.env.INOP_AUDIT_SCREEN_DIR||'/workspace/work/audit-packages/screens';await fs.mkdir(output,{recursive:true});
  await h.audit('admin','standard',{compliancePercentage:90,id:'synthetic-standard'});
  await h.audit('auditor','service',{overallPercentage:80,id:'synthetic-service'});
  const routes=[['center','/app/audit','.audit-home'],['hr','/app/audit/hr','[data-audit-direction=hr] .hr-section'],['service','/app/audit/service','[data-audit-direction=service] .hr-section'],['standard','/app/audit/standard','[data-audit-direction=standard] .hr-section'],['safety','/app/audit/safety','[data-audit-direction="occupational-safety"] .hr-section'],['hr-analytics','/app/audit/hr/analytics','.audit-foundation-kpis'],['service-analytics','/app/audit/service/analytics','.audit-foundation-kpis'],['standard-analytics','/app/audit/standard/analytics','.audit-foundation-kpis'],['safety-analytics','/app/audit/safety/analytics','.audit-foundation-kpis'],['analytics','/app/audit/analytics','.audit-foundation-kpis'],['restaurants','/app/audit/restaurants','.audit-restaurants-page'],['profiles','/app/audit/auditors','.audit-direction-page']];
  const findings=[];
  for(const width of [1440,768,390])for(const[name,url,ready]of routes){
   await h.page.setViewportSize({width,height:1000});await h.open('admin',url);await h.page.locator(ready).first().waitFor();await h.page.waitForFunction(()=>!document.querySelector('[data-audit-state=loading]'));
   expect(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name} at ${width}`).toBe(true);
   const section=h.page.locator('.audit-workspace .hr-section').first();if(await section.count()){
    const style=await section.evaluate(node=>{const c=getComputedStyle(node);return{background:c.backgroundColor,border:c.borderTopColor,radius:c.borderTopLeftRadius}});
    expect(style).toEqual({background:'rgb(243, 247, 253)',border:'rgb(215, 226, 241)',radius:'12px'});
   }
   await h.page.screenshot({path:`${output}/${name}-${width}.png`,fullPage:true});findings.push({name,width,overflow:false});
  }
  await h.open('admin','/app/audit/hr');await h.page.locator('.audit-foundation-empty').waitFor();expect(await h.page.locator('.audit-filter-grid select').first().locator('option').allTextContents()).toEqual(['Bütün brendlər','KFC','Pizza Hut','Simit Sarayı']);
  await h.page.locator('.audit-filter-grid select').first().selectOption('kfc');await h.page.waitForFunction(()=>!document.querySelector('[data-audit-state=loading]'));await h.page.locator('.audit-filter-grid select').nth(1).selectOption('restaurant-admin');await h.page.waitForFunction(()=>!document.querySelector('[data-audit-state=loading]'));
  const draft=h.page.getByRole('button',{name:'Audit qaralaması yarat',exact:true});await expect(draft).toBeDisabled();expect(await draft.evaluate(node=>getComputedStyle(node).backgroundColor)).not.toBe('rgb(67, 56, 202)');
  await h.page.setViewportSize({width:1440,height:1000});
  for(const[language,label]of[['English','HR Audit'],['Русский','HR аудит'],['Azərbaycan','HR Auditi']]){
   await h.page.locator(`.language-switcher button[title="${language}"]`).click();await expect(h.page.locator('.page-header__title')).toHaveText(label);
  }
  await h.open('auditor','/app/audit/service');await h.page.locator('[data-audit-direction=service]').waitFor();await h.page.waitForFunction(()=>!document.querySelector('[data-audit-state=loading]'));await expect(h.page.locator('aside a[href="/app/audit/hr"]')).toHaveCount(0);await expect(h.page.locator('aside a[href="/app/audit/standard"]')).toHaveCount(0);
  await h.open('auditor','/app/audit/standard');await expect(h.page).toHaveURL(/unauthorized/);
  await h.page.setViewportSize({width:390,height:1000});await h.open('admin','/app/audit/audits/synthetic-standard');await h.page.getByRole('heading',{name:'Audit sübutları',exact:true}).waitFor();await h.page.waitForFunction(()=>{const marker=document.querySelector('.audit-business-modules__sentinel');if(!marker)return true;marker.scrollIntoView();return false;});
  await h.page.getByLabel('Finding başlığı',{exact:true}).fill('Synthetic browser finding');await h.page.getByRole('button',{name:'Finding əlavə et',exact:true}).click();await h.page.getByRole('heading',{name:'Synthetic browser finding',exact:true}).waitFor();
  await h.page.getByRole('button',{name:'Finding-i bağla',exact:true}).click();await expect.poll(async()=>{const response=await h.request('admin','GET','/audit-findings/synthetic-standard');return response.data.data?.find(row=>row.title==='Synthetic browser finding')?.status;}).toBe('closed');
  await h.page.locator('body').press('Tab');expect(await h.page.evaluate(()=>document.activeElement!==document.body)).toBe(true);await h.page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await h.page.screenshot({path:`${output}/legacy-detail-390.png`,fullPage:true});
  await h.open('admin','/app/recruitment/jobs/new');await h.page.locator('#job-position').waitFor();const cancel=h.page.locator('button.btn-cancel').first();expect(await cancel.evaluate(node=>getComputedStyle(node).backgroundColor)).toBe('rgb(153, 27, 27)');await h.page.screenshot({path:`${output}/hr-preserved-390.png`,fullPage:true});
  await h.open('admin','/app/audit');await h.page.setViewportSize({width:1440,height:1000});await h.page.locator('.admin-sidebar__logout').click();await expect(h.page).toHaveURL(/login/);await h.page.locator('#email').waitFor();await h.page.setViewportSize({width:390,height:1000});await h.page.screenshot({path:`${output}/login-390.png`,fullPage:true});
  expect(h.pageErrors).toEqual([]);await fs.writeFile(`${output}/visual-results.json`,JSON.stringify({findings,pageErrors:h.pageErrors,requestCount:h.wire.length},null,2));
 });
});
