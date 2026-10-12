// Owned loopback only. Real production App/AuthProvider, no ready-session injection.
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{productionHRBuild}=require('../tests/helpers/productionBrowser.cjs');
const {withAuditFixture}=require('../../Backend/tests/helpers/auditFixture.cjs'),{hrSyntheticDataset}=require('../../Backend/tests/helpers/hrSyntheticDataset.cjs');
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [sha,output]=process.argv.slice(2);if(!/^[a-f0-9]{40}$/.test(sha||'')||!/^\/tmp\/[a-zA-Z0-9_-]+\.json$/.test(output||''))throw Error('Full source SHA and new owned report required.');
const report={frontend:sha,backend:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),hosted:false,mode:'production',samples:[]};
const harness="import React from'react';import{createRoot}from'react-dom/client';import App from'/src/App.tsx';import api from'/src/api/axios.ts';api.defaults.baseURL='/api';createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(App)));";
(async()=>{await fs.writeFile(output,'',{flag:'wx'});const build=await productionHRBuild(sha,harness);
 for(const size of [0,5000,50000])await withAuditFixture(async h=>{
  await hrSyntheticDataset(h,size);let server,browser;try{
   server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://127.0.0.1').pathname,target=path.resolve(build.dist,name.startsWith('/assets/')?decodeURIComponent(name).slice(1):'index.html');assert.ok(target.startsWith(build.dist+path.sep));const body=await fs.readFile(target);res.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':target.endsWith('.webp')?'image/webp':'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
   for(let repetition=0;repetition<3;repetition++){
    const page=await browser.newPage({viewport:{width:1280,height:900}}),entry={size,repetition,api:[],errors:[]};report.samples.push(entry);const pending=new Set();
    await page.addInitScript(token=>{localStorage.setItem('inop_auth_token',token);window.hrTasks=[];new PerformanceObserver(list=>window.hrTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});},h.tokens.admin);page.on('pageerror',e=>entry.errors.push(e.name));
    await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1')return route.abort();if(!url.pathname.startsWith('/api/'))return route.continue();assert.equal(route.request().method(),'GET');assert.equal(route.request().headers().authorization,'Bearer '+h.tokens.admin);const start=performance.now(),p=h.request('admin','GET',url.pathname.slice(4)+url.search,undefined,{timeoutMs:20000});pending.add(p);try{const r=await p;entry.api.push({path:url.pathname,ms:performance.now()-start,status:r.status,bytes:r.buffer.length,serverTiming:r.headers['server-timing']});await route.fulfill({status:r.status,contentType:'application/json',body:r.buffer});}finally{pending.delete(p);}});
    try{
     await page.goto('http://127.0.0.1:'+server.address().port+'/app/recruitment/analytics',{waitUntil:'domcontentloaded'});
     await page.waitForFunction(()=>document.querySelector('[data-hr-kpi=applications] strong'),{},{timeout:20000});
     entry.kpiPaint=await page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return{navigationMs:performance.now(),applications:document.querySelector('[data-hr-kpi=applications] strong').textContent};});
     await page.waitForFunction(()=>document.querySelector('[data-hr-score-bucket="80"]'),{},{timeout:20000});
     entry.scorePaint=await page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return performance.now();});await page.waitForLoadState('networkidle');
     entry.initialApi=entry.api.length;entry.longTasks=await page.evaluate(()=>window.hrTasks);entry.assets=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/assets/')).map(r=>({path:new URL(r.name).pathname,bytes:r.decodedBodySize,ms:r.duration})));
     assert.equal(entry.api.filter(r=>r.path==='/api/auth/me').length,1);assert.ok(entry.api.every(r=>r.status===200));assert.deepEqual(entry.errors,[]);
     await page.getByRole('tab',{name:'Əməliyyatlar',exact:true}).click();await page.locator('[data-hr-hire-time]').waitFor();entry.operationsRead=entry.api.filter(r=>r.path==='/api/hr/analytics/operations').length;entry.outcome='PASS';console.log(JSON.stringify({size,repetition,kpi:entry.kpiPaint.navigationMs,scores:entry.scorePaint,initialApi:entry.initialApi,operationsRead:entry.operationsRead}));
    }finally{await page.close();await Promise.allSettled(pending);await fs.writeFile(output,JSON.stringify(report,null,2));}
   }
  }finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));}
 });report.completed=true;await fs.writeFile(output,JSON.stringify(report,null,2));process.exit(0);
})().catch(async e=>{report.failed=e.message;await fs.writeFile(output,JSON.stringify(report,null,2));console.error(e.message);process.exit(1);});
