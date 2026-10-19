const {test}=require('node:test'),assert=require('node:assert/strict');
const {configuration,publicRuntime}=require('../services/runtimeConfiguration.service');
test('Runtime validation rejects unsupported Node, bad port, missing DB/auth without exposing values',()=>{
 const env={NODE_ENV:'production',MONGO_URI:'mongodb://127.0.0.1/isolated',JWT_SECRET:'synthetic-only',PORT:'3001'};
 assert.equal(configuration(env,'24.19.0').port,3001);assert.equal(configuration({...env,CS:env.MONGO_URI,MONGO_URI:undefined},'24.0.0').mongoUri,env.MONGO_URI);
 for(const [patch,node]of [[{},'22.0.0'],[{PORT:'0'},'24'],[{PORT:'70000'},'24'],[{PORT:'3001\n'},'24'],[{PORT:''},'24'],[{MONGO_URI:'PRIVATE_SECRET'},'24'],[{JWT_SECRET:''},'24']])assert.throws(()=>configuration({...env,...patch},node),e=>e.code==='RUNTIME_CONFIGURATION_INVALID'&&e.issues.length>0&&!e.message.includes('PRIVATE_SECRET'));
 assert.equal(configuration({MONGO_URI:env.MONGO_URI},'24').port,3001);
});
test('Runtime metadata exposes only validated deployment SHA and Node major, never arbitrary environment content',()=>{
 const sha='a'.repeat(40);assert.deepEqual(publicRuntime({RENDER_GIT_COMMIT:sha,JWT_SECRET:'PRIVATE_SECRET'},'24.19.0'),{contractVersion:1,nodeMajor:24,gitSha:sha,gitShaSource:'RENDER_GIT_COMMIT'});
 for(const value of ['main','abc123','PRIVATE_SECRET','a'.repeat(40)+'\n'])assert.equal(publicRuntime({RENDER_GIT_COMMIT:value},'24').gitSha,null);
 assert.equal(publicRuntime({INOP_BUILD_SHA:sha},'24').gitSha,sha);assert.equal(publicRuntime({},'24').gitSha,null);
});
test('Actual operational routes precede catch-all, distinguish liveness and readiness, redact DB failure',async()=>{
 const app=require('express')(),sha='b'.repeat(40),connection={readyState:1,db:{admin:()=>({command:async()=>{throw Error('PRIVATE_DATABASE_PASSWORD');}})}};
 require('../services/operationalRoutes.service').register(app,{env:{INOP_BUILD_SHA:sha,JWT_SECRET:'PRIVATE_SECRET'},readiness:{connection,storage:{fromEnvironment:()=>{throw Error('PRIVATE_PROVIDER_PASSWORD');}}}});
 app.use((_req,res)=>res.status(404).json({success:false}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{const base='http://127.0.0.1:'+server.address().port;assert.equal((await fetch(base+'/health')).status,200);for(const route of ['/ready','/ready/']){const r=await fetch(base+route);assert.equal(r.status,503);const b=await r.json();assert.equal(b.productionSmokeVerified,false);assert.ok(!JSON.stringify(b).includes('PRIVATE'));}const r=await fetch(base+'/version');assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal((await r.json()).runtime.gitSha,sha);assert.equal((await fetch(base+'/api/ready')).status,404);}finally{await new Promise(r=>server.close(r));}
});
test('Configured storage with failed, timed out or negative availability is not ready and never leaks provider details',async()=>{
 const create=require('../services/readiness.service').createHandler,connection={readyState:1,db:{admin:()=>({command:async()=>({setName:'synthetic',isWritablePrimary:true})})}};
 for(const probe of [async()=>false,async()=>{throw Error('PRIVATE_STORAGE_CREDENTIAL');},()=>new Promise(()=>{}),async()=>true]){
  const res={status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
  await create({connection,storage:{fromEnvironment:()=>({checkAvailability:probe})},timeoutMs:5})({},res);assert.equal(res.body.checks.storageConfigured,true);assert.equal(res.body.checks.storageAvailable,res.code===200);assert.equal(res.body.productionSmokeVerified,false);assert.ok(!JSON.stringify(res.body).includes('PRIVATE'));
 }
});
