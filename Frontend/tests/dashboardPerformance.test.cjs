const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const harness=fs.readFileSync(path.join(__dirname,'hrNavigationPerformance.test.cjs'),'utf8').match(/const harness=`([\s\S]*?)`;/)[1];
test('Dashboard avoids chart transfer for empty data, deduplicates StrictMode reads and loads populated chart responsively',async()=>withBrowserFixture(harness,async h=>{
 const p=h.page,chartRequests=[];p.on('request',r=>{if(r.url().includes('/CandidateStatusDonut.tsx'))chartRequests.push(r.url())});
 await h.open('admin','/app/dashboard');await p.locator('.chart-empty').first().waitFor();await p.waitForLoadState('networkidle');assert.equal(chartRequests.length,0);
 for(const url of ['jobs','candidates','applications','audits'])assert.equal(h.wire.filter(r=>r.path===`/api/${url}/dashboard-summary`).length,1,url+' must have one initial read');
 const candidate=await h.request('admin','POST','/candidates',{name:'Synthetic Dashboard Candidate',role:'QA',skills:['QA'],reviewedFields:['skills']});assert.equal(candidate.status,201);
 let release;const gate=new Promise(resolve=>{release=resolve});await p.route('**/CandidateStatusDonut.tsx*',async route=>{await gate;await route.continue()});
 await h.open('admin','/app/dashboard');await p.locator('.donut-wrap .empty-state').waitFor();try{assert.equal(await p.locator('.donut-center').isVisible(),false,'Loading text must not overlap the chart total');}finally{release()}await p.locator('.recharts-wrapper').waitFor();assert.equal(chartRequests.length,1);
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'inop-dashboard-perf-'));
 for(const width of [1440,768,390]){await p.setViewportSize({width,height:900});await p.waitForTimeout(1100);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:path.join(out,`dashboard-${width}.png`),fullPage:true});}
 assert.deepEqual(h.pageErrors,[]);console.log('Dashboard performance screenshots:',out);
}));
