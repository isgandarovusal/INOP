const {test,expect}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const fs=require('node:fs/promises');
const harness=`import React from 'react';import{createRoot}from'react-dom/client';import{createBrowserRouter,RouterProvider}from'react-router-dom';import{AuthProvider}from'/src/Context/AuthContext.ts';import'/src/i18n/index.ts';import'/src/App.css';import ROUTES from'/src/Routes/Routes.tsx';import api from'/src/api/axios.ts';api.defaults.baseURL='/api';const router=createBrowserRouter(ROUTES);window.navigateTest=to=>router.navigate(to);createRoot(document.getElementById('root')).render(React.createElement(AuthProvider,null,React.createElement(React.Suspense,{fallback:React.createElement('p',null,'Loading')},React.createElement(RouterProvider,{router}))));`;
test('Legacy list preserves real zero and unscored records without calculating a new result',async()=>withBrowserFixture(harness,async h=>{
 await h.audit('admin','service',{assessmentStatus:'scored',overallPercentage:0});
 await h.audit('auditor','service',{assessmentStatus:'legacy-unscored',overallPercentage:null});
 const dir='/workspace/work/audit-technical/screens';await fs.mkdir(dir,{recursive:true});
 for(const width of [1440,390]){
  await h.page.setViewportSize({width,height:1000});await h.open('admin','/app/audit/audits');
  const rows=h.page.locator('tbody tr');await expect(rows).toHaveCount(2);
  await expect(rows.filter({hasText:'Synthetic admin'})).toContainText('0.0 / 10');
  await expect(rows.filter({hasText:'Synthetic auditor'})).toContainText('— / 10');
  const filter=h.page.locator('input[type=number]');await filter.fill('0');await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('0.0 / 10');await filter.fill('');await expect(rows).toHaveCount(2);
  await h.page.screenshot({path:`${dir}/legacy-nullable-${width}.png`,fullPage:true});
 }
 expect(h.pageErrors).toEqual([]);
}));
