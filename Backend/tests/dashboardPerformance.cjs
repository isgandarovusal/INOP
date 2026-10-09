// Opt-in local benchmark; never uses .env or an existing database.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const{withAuditFixture}=require('./helpers/auditFixture.cjs');
const args=Object.fromEntries(process.argv.slice(2).map(arg=>arg.split('=')));
const build=path.resolve(args['--build']||'/tmp/inop-package06-production-build');
const output=args['--output']||'/tmp/inop-dashboard-performance.json';
assert.ok(build.startsWith('/tmp/inop-') && fs.existsSync(path.join(build,'index.html')));
const report={build,recordCountsPerCollection:[0,5000,50000],runs:[],api:[],scopeMatrix:[],notes:'Local synthetic data; timings include real server authorization, query and serialization. Browser API forwarding adds test-harness overhead.'};
withAuditFixture(async h=>{
 const Job=require('../models/job.model'),Candidate=require('../models/candidate.model'),Application=require('../models/application.model'),Snapshot=require('../models/auditDepartmentSnapshot.model'),Restaurant=require('../models/restaurant.model');
 for(const scope of ['own','department','assigned','none'])await h.models.Role.updateOne({key:`test_${scope}`},{$push:{permissions:{$each:['recruitment','candidate','application'].map(resource=>({resource,action:'read',scope}))}}});
 for(const model of [Job,Candidate,Application,Snapshot])await model.createIndexes();
 for(const owner of ['own','peer','assigned','foreign','hr'])await Restaurant.create({id:`restaurant-${owner}`,name:`Restaurant ${owner}`});
 let size=0;
 const add=async target=>{
  for(let start=size;start<target;start+=1000){const jobs=[],candidates=[],applications=[],audits=[],snapshots=[],assignments=[];
   for(let i=start;i<Math.min(target,start+1000);i++){
    const owner=['own','peer','assigned','foreign','hr'][i%5],user=h.actors[owner],createdAt=new Date(Date.UTC(2026,9,1)+i*1000);
    const scope={createdBy:user._id,departmentId:user.departmentId,assignedTo:i%5===3?h.actors.assigned._id:null,createdAt,updatedAt:createdAt};
    const jobId=new h.mongoose.Types.ObjectId(),candidateId=new h.mongoose.Types.ObjectId(),auditId=new h.mongoose.Types.ObjectId();
    jobs.push({_id:jobId,title:`Job ${i}`,department:'Synthetic',description:'description '.repeat(24),status:'Open',requiredSkills:['skill'],...scope});
    candidates.push({_id:candidateId,name:`Candidate ${i}`,role:'Synthetic',status:i%2?'shortlisted':'applied',skills:['One','Two','Three','Unused'],email:`candidate${i}@example.invalid`,education:'education '.repeat(20),...scope});
    applications.push({_id:new h.mongoose.Types.ObjectId(),jobId,candidateId,status:'Applied',score:50,notes:'notes '.repeat(24),...scope});
    const type=['service','standard','occupational-safety'][i%3];
    audits.push({_id:auditId,id:`perf-${i}`,auditType:type,type,restaurantId:`restaurant-${owner}`,auditorId:String(user._id),date:'2026-10-09',status:'completed',scores:{food:8,service:8,staff:8,cleanliness:8},overallPercentage:75,compliancePercentage:75,scorePercentage:75,totalScore:15,maxScore:20,checks:Array.from({length:8},(_,q)=>({checkId:`q${q}`,answer:'yes',score:1,note:'Checklist payload '.repeat(8)})),results:[],categories:[],photos:[],attachments:[],findings:[],recommendations:[],comments:'',createdAt,updatedAt:createdAt});
    snapshots.push({auditId,auditorId:String(user._id),departmentId:user.departmentId,capturedAt:createdAt});
    if(i%5===3)assignments.push({auditId,auditor:h.actors.assigned._id,status:'accepted'});
   }
   await Promise.all([Job.collection.insertMany(jobs),Candidate.collection.insertMany(candidates),Application.collection.insertMany(applications),h.models.Audit.collection.insertMany(audits),Snapshot.collection.insertMany(snapshots),assignments.length?h.models.Assignment.collection.insertMany(assignments):Promise.resolve()]);
  }size=target;
 };
 const{chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 let browser,server,sample;
 try{
  server=http.createServer(async(req,res)=>{
   const url=new URL(req.url,'http://local');
   if(url.pathname.startsWith('/api/')){
    const measured=sample;measured?.requests.push(url.pathname);
    const response=await fetch(h.apiBase+url.pathname.slice(4)+url.search,{headers:{Authorization:req.headers.authorization||''}});
    res.statusCode=response.status;res.setHeader('Content-Type',response.headers.get('content-type')||'application/json');
    for await(const chunk of response.body){if(measured)measured.bytes+=chunk.length;if(!res.write(chunk))await new Promise(resolve=>res.once('drain',resolve));}
    res.end();return;
   }
   let file=path.resolve(build,'.'+url.pathname);if(!file.startsWith(build+'/')||!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(build,'index.html');res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  for(const count of report.recordCountsPerCollection){await add(count);console.log('Benchmark fixtures',count,'per collection');
   for(const actor of ['admin','hr','department','assigned','own'])for(const endpoint of ['/jobs','/candidates','/applications','/audits',...(args['--summary']?['/jobs/dashboard-summary','/candidates/dashboard-summary','/applications/dashboard-summary','/audits/dashboard-summary']:[])]){
    const start=performance.now(),response=await h.request(actor,'GET',endpoint,undefined,{timeoutMs:60000});
    const summary=endpoint.includes('dashboard-summary');let total;
    if(response.status===200)total=summary?(response.data.total??response.data.totalAudits):response.data.length;
    const resource=endpoint.split('/')[1];const expected=actor==='admin'||(actor==='hr'&&resource!=='audits')?count:actor==='hr'?undefined:actor==='department'?count*3/5:actor==='assigned'&&resource==='audits'?count*2/5:count/5;
    assert.equal(response.status,actor==='hr'&&resource==='audits'?403:200);
    if(response.status===200)assert.equal(total,expected,`${actor} ${endpoint} count`);
    report.scopeMatrix.push({count,actor,endpoint,status:response.status,total});
    if(actor==='admin')report.api.push({count,endpoint,status:response.status,bytes:response.buffer.length,wallMs:performance.now()-start,serverTiming:response.headers['server-timing']});
   }
   for(let run=0;run<3;run++){
    const page=await browser.newPage();sample={bytes:0,requests:[]};const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(token=>{localStorage.setItem('inop_auth_token',token);window.longTasks=[];new PerformanceObserver(list=>window.longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});},h.tokens.admin);
    await page.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
    const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');const start=performance.now();
    await page.goto(origin+'/app/dashboard',{timeout:120000});
    await page.waitForFunction(()=>{const cards=[...document.querySelectorAll('.kpi-card__value')];return cards.length>=8&&cards.slice(0,4).every(e=>e.textContent.trim()!=='—');},null,{timeout:120000});
    const paint=await page.evaluate(async()=>{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const ends=performance.getEntriesByType('resource').filter(e=>e.name.includes('/api/')).map(e=>e.responseEnd);return{dataReadyToPaintMs:performance.now()-Math.max(...ends,0),longTasks:window.longTasks};});
    const metrics=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
    assert.deepEqual(errors,[]);report.runs.push({count,run,...sample,readyMs:performance.now()-start,scriptMs:metrics.ScriptDuration*1000,layoutMs:metrics.LayoutDuration*1000,...paint});console.log('Browser',count,run,'bytes',sample.bytes,'readyMs',Math.round(report.runs.at(-1).readyMs));await page.close();sample=null;
   }
  }
 }finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
}).then(()=>{report.completed=true;fs.writeFileSync(output,JSON.stringify(report,null,2));console.log('Saved',output);}).catch(error=>{report.failure=error.stack;fs.writeFileSync(output,JSON.stringify(report,null,2));console.error(error);process.exitCode=1;});
