const {test,expect}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const fs=require('node:fs/promises');
const baseline=Boolean(process.env.INOP_POLISH_BASELINE),label=baseline?'before':'after';
// Replay the baseline styles only inside the comparison harness; Vite's CSS
// loader bypasses the source-overlay hook used for TS and locale modules.
const baselineStyles=baseline?['layout','hr-workspace','auth'].map(name=>require('node:child_process').execFileSync('git',['show',`7e381a41e6d7230a944e44cc0b4d24f3917a9342:Frontend/src/Styles/${name}.css`],{cwd:'/workspace/INOP',encoding:'utf8'})).join('\n'):'';
const harness=`import React from'react';import{createRoot}from'react-dom/client';import{createBrowserRouter,RouterProvider}from'react-router-dom';import{AuthProvider}from'/src/Context/AuthContext.ts';import'/src/i18n/index.ts';import'/src/App.css';import ROUTES from'/src/Routes/Routes.tsx';import api from'/src/api/axios.ts';api.defaults.baseURL='/api';const router=createBrowserRouter(ROUTES);window.navigateTest=to=>router.navigate(to);createRoot(document.getElementById('root')).render(React.createElement(AuthProvider,null,React.createElement(React.Suspense,null,React.createElement(RouterProvider,{router}))));`;
test('Brand polish preserves login geometry and language controls while repairing N',async()=>withBrowserFixture(harness,async h=>{
 const dir='/workspace/work/branding-polish/comparison';await fs.mkdir(dir,{recursive:true});const results={};
 const replay=async()=>{if(baseline)await h.page.evaluate(css=>{const style=document.getElementById('inop-baseline-comparison-style')||document.createElement('style');style.id='inop-baseline-comparison-style';style.textContent=css;document.head.append(style);},baselineStyles);};
 await h.page.setViewportSize({width:1440,height:1000});await h.open('admin','/app/audit');await h.page.locator('.audit-home').waitFor();
 await replay();
 const logo=h.page.locator('.admin-sidebar__brand .inop-logo');
 expect(await logo.evaluate(node=>node.getBoundingClientRect().width)).toBe(baseline?144:131);
 expect(await logo.locator('[data-letter=N]').evaluate(node=>node.isPointInFill(new DOMPoint(40,8)))).toBe(!baseline);
 const centers=await logo.evaluate(node=>{const a=node.getBoundingClientRect(),b=node.parentElement.getBoundingClientRect();return Math.abs(a.x+a.width/2-b.x-b.width/2);});expect(centers).toBeLessThan(1);
 await h.page.locator('.admin-sidebar__brand').screenshot({path:`${dir}/sidebar-${label}.png`});
 await h.open('admin','/app/recruitment/jobs/new');await h.page.locator('#job-position').waitFor();
 await replay();
 expect(await h.page.locator('.admin-sidebar__brand .inop-logo').evaluate(node=>node.getBoundingClientRect().width)).toBe(baseline?136:124);
 await h.page.setViewportSize({width:390,height:1000});
 expect(await h.page.locator('.admin-topbar__brand .inop-logo').evaluate(node=>node.getBoundingClientRect().width)).toBe(112);
 await h.page.locator('.admin-topbar__toggle').click();await expect.poll(async()=>Math.round((await h.page.locator('aside').boundingBox()).x)).toBe(0);
 await h.page.screenshot({path:`${dir}/drawer-${label}-390.png`,fullPage:true});
 await h.page.setViewportSize({width:1440,height:1000});await h.page.locator('.admin-sidebar__logout').click();await h.page.locator('#email').waitFor();
 await replay();
 for(const width of[1440,768,390]){
  await h.page.setViewportSize({width,height:1000});await h.page.evaluate(()=>document.fonts.ready);
  if(width>680)await h.page.waitForFunction(()=>{const img=document.querySelector('.auth-brand-art img');return img?.complete&&img.naturalWidth>0;});
  results[width]=await h.page.evaluate(()=>{const rect=selector=>{const{width,height,x,y}=document.querySelector(selector).getBoundingClientRect();return{width,height,x,y};};return{logo:rect('.auth-brand-panel .inop-logo'),entry:rect('.auth-entry-panel'),email:rect('#email'),password:rect('#password'),submit:rect('.auth-submit'),language:rect('.auth-entry-panel .language-switcher'),font:getComputedStyle(document.querySelector('.auth-brand-copy h2')).fontSize};});
  expect(results[width].logo.width).toBe(width===390?180:220);
  expect(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  if(width===1440)expect(parseFloat(results[width].font)).toBeCloseTo(baseline?32:29.12,2);
  if(width===768)expect(parseFloat(results[width].font)).toBeCloseTo(baseline?24:21.84,2);
  await expect(h.page.locator('.auth-brand-copy h2')).toHaveText(baseline?'Bütün əməliyyatlar üçün vahid platforma.':'Bütün əməliyyatlar üçün vahid platforma');
  await h.page.screenshot({path:`${dir}/login-${label}-${width}.png`,fullPage:true});
 }
 await fs.writeFile(`${dir}/${label}-geometry.json`,JSON.stringify(results,null,2));
 if(!baseline&&process.env.INOP_COMPARE_BASELINE){const before=JSON.parse(await fs.readFile(`${dir}/before-geometry.json`,'utf8'));for(const width of[1440,768,390])for(const key of['logo','entry','email','password','submit','language'])for(const metric of['width','height','x','y'])expect(results[width][key][metric],`${width} ${key}.${metric}`).toBeCloseTo(before[width][key][metric],1);}
 expect(h.pageErrors).toEqual([]);
},{loadSource:id=>{id=id.split('?')[0];if(!baseline||!/(wordmarkPaths\.ts|Styles\/(auth|layout|hr-workspace)\.css|locales\/(az|en|ru)\.json)$/.test(id))return;const relative=id.split('/Frontend/')[1];return require('node:child_process').execFileSync('git',['show',`7e381a41e6d7230a944e44cc0b4d24f3917a9342:Frontend/${relative}`],{cwd:'/workspace/INOP',encoding:'utf8'});}}));
