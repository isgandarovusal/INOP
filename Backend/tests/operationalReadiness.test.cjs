const{test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const{createTelemetry}=require('../middleware/operationalTelemetry.middleware'),{createHandler}=require('../services/readiness.service');
const response=()=>({code:0,status(n){this.code=n;return this;},json(value){this.body=value;return this;}});
test('Structured telemetry captures status/denial/analytics timings and server-generated correlation without PII or secrets',()=>{
 const events=[],t=createTelemetry({enabled:true,emit:e=>events.push(e)});for(const status of [200,403,503]){const res=new EventEmitter();res.setHeader=(k,v)=>{assert.equal(k,'X-Request-ID');assert.match(v,/^[0-9a-f-]{36}$/);};res.statusCode=status;let next=false;t.middleware({path:'/api/audit-analytics/center',method:'GET',headers:{'x-request-id':'PRIVATE_TOKEN'},body:{secret:'PRIVATE_PASSWORD'},query:{email:'PRIVATE_EMAIL'}},res,()=>next=true);assert.ok(next);res.emit('finish');}
 assert.deepEqual([t.snapshot().requests,t.snapshot().denied,t.snapshot().serverError,t.snapshot().analyticsRequests],[3,1,1,3]);assert.ok(!JSON.stringify(events).includes('PRIVATE'));assert.ok(events.every(e=>e.durationMs>=0&&e.group==='audit-analytics'));
});
test('Readiness requires DB, transaction topology and configured storage, never equates configuration with production smoke',async()=>{
 for(const[cfg,status]of [[{readyState:0},503],[{readyState:1,db:{admin:()=>({command:async()=>({})})}},503],[{readyState:1,db:{admin:()=>({command:async()=>({setName:'synthetic',isWritablePrimary:true})})}},200]]){const res=response();await createHandler({connection:cfg,storage:{fromEnvironment:()=>({})}})({},res);assert.equal(res.code,status);assert.equal(res.body.productionSmokeVerified,false);assert.ok(!JSON.stringify(res.body).includes('synthetic'));}
 const res=response();await createHandler({connection:{readyState:1,db:{admin:()=>({command:async()=>{throw Error('PRIVATE_CREDENTIAL');}})}},storage:{fromEnvironment:()=>{throw Error('PRIVATE_CREDENTIAL');}}})({},res);assert.equal(res.code,503);assert.ok(!JSON.stringify(res.body).includes('PRIVATE'));
 const timeout=response();await createHandler({connection:{readyState:1,db:{admin:()=>({command:()=>new Promise(()=>{})})}},storage:{fromEnvironment:()=>({})},timeoutMs:5})({},timeout);assert.equal(timeout.code,503);
});
test('Audit error logging never serializes exception payload, credentials, stack, nested validation values or filenames',()=>{
 const before=console.error,events=[];console.error=(...args)=>events.push(args);try{require('../services/safeErrorLog.service').logFailure(Object.assign(Error('PRIVATE_SECRET'),{status:503,cause:{password:'PRIVATE_PASSWORD'}}));}finally{console.error=before;}assert.ok(!JSON.stringify(events).includes('PRIVATE'));assert.equal(events[0][1].status,503);
});

test('Fatal exception and rejection exit nonzero with redacted diagnostics',()=>{
 const{spawnSync}=require('node:child_process');for(const action of ["throw Error('PRIVATE_FATAL_SECRET')","Promise.reject(Error('PRIVATE_FATAL_SECRET'))"]){const r=spawnSync(process.execPath,['-e',"require('./services/fatalError.service').install();"+action],{cwd:require('node:path').resolve(__dirname,'..'),encoding:'utf8',timeout:5000});assert.equal(r.status,1);assert.ok(!r.stderr.includes('PRIVATE_FATAL_SECRET'));assert.match(r.stderr,/fatal_backend_error/);}
});
test('Actual Audit controller failures redact exception secrets in response and logs without side effects',async()=>require('./helpers/auditFixture.cjs').withAuditFixture(async h=>{
 const audit=await h.audit('admin'),service=require('../services/auditorProfile.service'),original=service.assignAudit,before=console.error,events=[];service.assignAudit=async()=>{throw Error('PRIVATE_AUDIT_PROVIDER_CREDENTIAL');};console.error=(...args)=>events.push(args);
 try{const r=await h.request('admin','POST','/audit-assignments',{auditId:String(audit._id),auditor:String(h.actors.auditor._id)});assert.equal(r.status,500);assert.ok(!JSON.stringify(r.data).includes('PRIVATE'));assert.ok(!JSON.stringify(events).includes('PRIVATE'));assert.equal(await h.models.Assignment.countDocuments(),0);}finally{service.assignAudit=original;console.error=before;}
}));

test('Slow-analytics telemetry classifies all four dedicated source routes without retaining URL or query',()=>{const rows=[],t=createTelemetry({enabled:true,emit:r=>rows.push(r)});for(const kind of ['hr','service','standard','hse']){const res=new EventEmitter();res.statusCode=200;res.setHeader=()=>{};t.middleware({path:`/api/audit-${kind}/analytics`,method:'GET'},res,()=>{});res.emit('finish');}assert.equal(t.snapshot().analyticsRequests,4);assert.ok(rows.every(r=>r.group==='audit-analytics'&&r.path===undefined&&r.query===undefined));});
