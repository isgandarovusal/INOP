// Presentation-only browser coverage. Synthetic responses; no backend or DB.
// INOP_PLAYWRIGHT_MODULE may point to an external Playwright installation.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const harness = `import React from 'react';import{createRoot}from'react-dom/client';import{createBrowserRouter,RouterProvider}from'react-router-dom';import{AuthContext}from'/src/Context/AuthContext.ts';import'/src/i18n/index.ts';import i18n from '/src/i18n/index.ts';import'/src/App.css';import ROUTES from'/src/Routes/Routes.tsx';import api from'/src/api/axios.ts';api.defaults.baseURL='/api';localStorage.setItem('inop_auth_token','synthetic-ui-only');const router=createBrowserRouter(ROUTES);window.navigateTest=to=>router.navigate(to);window.localeTest=lang=>i18n.changeLanguage(lang);const user={id:'synthetic',name:'Visual QA',email:'qa@example.invalid',role:'admin',isActive:true,permissions:[{resource:'*',action:'*',scope:'all'}]};createRoot(document.getElementById('root')).render(React.createElement(AuthContext.Provider,{value:{user,isLoading:false,logout:async()=>{},login:async()=>{}}},React.createElement(React.Suspense,null,React.createElement(RouterProvider,{router}))));`;
const restaurant = { id:'restaurant-qa', name:'Synthetic restaurant', organizationId:'gfc', brandId:'kfc', location:'Synthetic location' };
const audit = {id:'synthetic-audit',_id:'0123456789abcdef01234567',restaurantId:restaurant.id,auditType:'standard',date:'2026-10-15',status:'draft',auditorId:'synthetic',scores:null,photos:[],attachments:[]};
function response(url) {
  const p=url.pathname;
  if(p==='/api/audit-standard/list')return{items:[{...audit,auditType:'standard',assessmentStatus:'unscored',overallPercentage:null}],total:1,page:1,limit:25};
  if(['/api/audit-standard/options','/api/audit-standard/analytics-options','/api/audit-standard/restaurants'].includes(p))return{data:[restaurant]};
  if(p==='/api/audit-standard/sources')return{data:[]};
  if(p==='/api/audit-standard/analytics')return{data:{counts:{total:0,applicable:0,na:0,unanswered:0,compliant:0,critical:0,major:0,minor:0,percentage:null},total:0,completed:0,coverage:{restaurants:0,brands:0},brands:[],restaurants:[],sections:[],criteria:[],trend:[],actions:[],findings:[],statuses:{}}};
  if(p==='/api/audit-service/list')return{items:[{...audit,auditType:'service',assessmentStatus:'unscored',overallPercentage:null}],total:1,page:1,limit:25};
  if(['/api/audit-service/options','/api/audit-service/analytics-options','/api/audit-service/restaurants'].includes(p))return{data:[restaurant]};
  if(p==='/api/audit-service/sources')return{data:[]};
  if(p==='/api/audit-service/analytics')return{data:{total:0,submitted:0,scored:0,unscored:0,average:null,nonconformities:0,brands:[],restaurants:[],sections:[],criteria:[],trend:[],actions:[],findings:[],statuses:{}}};
  if(p==='/api/audit-hr/list')return{items:[{...audit,auditType:'hr',assessmentStatus:'unscored',overallPercentage:null}],total:51,page:Number(url.searchParams.get('page')||1),limit:25};
 if(['/api/audit-hr/options','/api/audit-hr/analytics-options','/api/audit-hr/restaurants'].includes(p))return{data:[restaurant]};
 if(p==='/api/audit-hr/sources')return{data:[]};
 if(p==='/api/audit-hr/analytics')return{data:{total:0,submitted:0,scored:0,unscored:0,average:null,nonconformities:0,brands:[],restaurants:[],sections:[],criteria:[],trend:[],actions:[],findings:[],generatedAt:'2026-10-15T00:00:00Z'}};
 if(p==='/api/audit-catalog')return{data:{organizations:[{id:'gfc',name:'GFC'}],brands:[{id:'kfc',name:'KFC',organizationId:'gfc'}]}};
  if(['/api/hr/brands','/api/hr/branches'].includes(p))return[];
  if(p==='/api/restaurants')return[restaurant];
  if(p==='/api/users')return{users:[]};
  if(p.startsWith('/api/audit-source-documents'))return[];
  if(p.startsWith('/api/restaurants/'))return restaurant;
  if(p==='/api/audits')return url.searchParams.has('format')?{items:[audit],total:51,page:Number(url.searchParams.get('page')||1),limit:25}:[audit];
  if(p.startsWith('/api/audits/'))return audit;
  if(p==='/api/audit-analytics/overview')return{data:{total:0,completed:0,scored:0,unscored:0,averageScore:null,scoreUnit:'ten'}};
  if(p==='/api/audit-dashboard')return{data:{totalAudits:0,completedAudits:0,averageScore:0,scoredExecutions:0,riskStats:[],typeStats:[],trend:[]}};
  if(p==='/api/audit-templates')return[];
  if(p==='/api/audit-notification')return{data:[]};
  if(p.startsWith('/api/audit-report/'))return{data:{type:'standard',status:'draft',score:0,summary:{totalChecks:0,passed:0,failed:0}}};
  if(p==='/api/audit-execution/synthetic')return{data:{_id:'synthetic',auditId:audit._id,status:'draft',answers:[],updatedAt:'2026-10-15'}};
  return{data:[]};
}

test('Audit UI: responsive routes, locales, pagination, states and HR isolation', {timeout:180000}, async()=>{
 const {chromium}=require(process.env.INOP_PLAYWRIGHT_MODULE||'playwright');
 const {createServer}=await import(path.join(root,'node_modules/vite/dist/node/index.js'));
 const output=process.env.INOP_AUDIT_SCREEN_DIR||await fs.mkdtemp(path.join(os.tmpdir(),'inop-block02-screens-'));
 await fs.mkdir(output,{recursive:true});
 const vite=await createServer({root,cacheDir:await fs.mkdtemp(path.join(os.tmpdir(),'inop-block02-vite-')),configLoader:'runner',logLevel:'error',define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify('/api')},server:{host:'127.0.0.1',port:0,hmr:false},plugins:[{name:'audit-visual-harness',enforce:'pre',resolveId(id){if(id==='/__audit_visual.js')return'\0audit-visual';},load(id){if(id==='\0audit-visual')return harness;}}]});
 let browser;
 try {
  await vite.listen();const origin=`http://127.0.0.1:${vite.httpServer.address().port}`;
  browser=await chromium.launch({...(process.env.INOP_BROWSER_EXECUTABLE?{executablePath:process.env.INOP_BROWSER_EXECUTABLE}:{}),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();page.setDefaultTimeout(10000);const errors=[];const results=[];
  page.on('pageerror',error=>errors.push(error.message));

  let failed=false;
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
   if(url.pathname.startsWith('/api/'))return route.fulfill({status:failed?500:200,contentType:'application/json',body:JSON.stringify(failed?{message:'Synthetic error'}:response(url))});
   if(route.request().isNavigationRequest())return route.fulfill({contentType:'text/html',body:await vite.transformIndexHtml(url.pathname,'<html><body><div id="root"></div><script type="module" src="/__audit_visual.js"></script></body></html>')});
   return route.continue();
  });
  const routes=['','/hr','/service','/standard','/safety','/hr/analytics','/service/analytics','/standard/analytics','/safety/analytics','/analytics','/restaurants','/restaurants/new','/checklists','/checklists/new','/audits','/audits/new','/audits/synthetic-audit','/standard/new','/safety/new','/service/new','/auditors','/dashboard','/notifications','/report/synthetic','/execution/synthetic'];
  for(const width of(process.env.INOP_AUDIT_QUICK?[320]:[1440,768,390,320]))for(const suffix of(process.env.INOP_AUDIT_QUICK?['/checklists/new','/audits/synthetic-audit']:routes)){
   await page.setViewportSize({width,height:1000});
   console.log(`Checking ${suffix||'center'} at ${width}`);
   await page.goto(origin+'/app/audit'+suffix);
   await page.locator('.audit-workspace').waitFor();
   await page.waitForFunction(()=>!document.querySelector('[data-audit-state="loading"],.route-loading'),null,{timeout:10000});
   await page.waitForTimeout(150);
   assert.equal(await page.locator('.audit-workspace').count(),1,`${suffix} render failed`);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   results.push({route:suffix||'center',width,overflow});
   await page.screenshot({path:path.join(output,`${suffix.replaceAll('/','-')||'center'}-${width}.png`),fullPage:true});
   assert.equal(overflow,false,`${suffix||'center'} overflows at ${width}`);
  }
  await page.goto(origin+'/app/audit/hr');await page.locator('.audit-table-scroll tbody tr').first().waitFor();
  await page.getByRole('button',{name:'Növbəti',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('nav.audit-control-row')?.textContent.includes('2 / 3'));
  const labels={az:'HR auditi',en:'HR Audit',ru:'HR-аудит'};
  for(const[lang,label]of Object.entries(labels)){await page.evaluate(lang=>window.localeTest(lang),lang);await page.locator('.page-header').getByRole('heading',{name:label,exact:true}).waitFor();}
  failed=true;await page.goto(origin+'/app/audit/hr');await page.locator('.audit-hr-page > [data-audit-state="server-error"]').waitFor();
  failed=false;await page.locator('.audit-hr-page > [data-audit-state] button').click();await page.locator('.audit-table-scroll tbody tr').first().waitFor();
  await page.goto(origin+'/app/audit/audits/synthetic-audit');
  await page.locator('.audit-business-modules').waitFor();
  for(let count=0;count<8;count++){
   const sentinel=page.locator('.audit-business-modules__sentinel');
   if(!await sentinel.count())break;
   await sentinel.scrollIntoViewIfNeeded();await page.waitForTimeout(200);
  }
  await page.locator('.audit-history').waitFor();
  await page.locator('.audit-history .audit-inline-empty').waitFor();
  assert.ok(await page.locator('.audit-inline-empty').count()>=4);
  await page.screenshot({path:path.join(output,'detail-lazy-panels-320.png'),fullPage:true});
  for(const route of['/report/synthetic','/notifications']){
   failed=true;await page.goto(origin+'/app/audit'+route);
   await page.locator('[data-audit-state="error"]').waitFor();
   failed=false;await page.locator('[data-audit-state] button').click();
   await page.waitForFunction(()=>!document.querySelector('[data-audit-state]'),null,{timeout:10000});
  }
  // Audit scope never recolors Recruitment controls after navigation.
  await page.goto(origin+'/app/recruitment/jobs/new');await page.locator('#job-position').waitFor({timeout:30000}).catch(async error=>{await page.screenshot({path:path.join(output,'recruitment-failure.png'),fullPage:true});console.error('Recruitment isolation diagnostic:',page.url(),JSON.stringify(errors),await page.locator('body').innerText());throw error;});
  assert.equal(await page.locator('.audit-workspace').count(),0);
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify({results,pageErrors:errors},null,2));
  console.log(`Visual artifacts: ${output}; ${results.length} route/viewport checks`);
 }finally{if(browser)await browser.close();await vite.close();}
});
