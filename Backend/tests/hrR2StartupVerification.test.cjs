const test=require('node:test'),assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const storage=require('../services/hrPrivateObjectStorage.service');
const {createVerification}=require('../services/hrR2StartupVerification.service');
const config={provider:'s3',endpoint:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',bucket:'inop-private-cv',region:'auto',accessKeyId:'synthetic-only-key',secretAccessKey:'synthetic-only-secret'};
const environment=()=>({HR_R2_VERIFY_ON_START:'read-only',HR_CV_STORAGE_PROVIDER:config.provider,HR_CV_STORAGE_ENDPOINT:config.endpoint,HR_CV_STORAGE_BUCKET:config.bucket,HR_CV_STORAGE_REGION:config.region,HR_CV_STORAGE_ACCESS_KEY_ID:config.accessKeyId,HR_CV_STORAGE_SECRET_ACCESS_KEY:config.secretAccessKey});
function verification(env,transport,timeoutMs=100) {
 const logs=[],calls=[];
 const adapter={fromEnvironment:value=>{
  // Validate the actual env contract, then inject only the test transport.
  storage.fromEnvironment(value);
  return storage.createStore(config,{timeoutMs,transport:request=>{calls.push(request);return transport(request);}});
 }};
 return{logs,calls,run:createVerification({env,adapter,emit:code=>logs.push(code)}).run};
}
test('Read-only startup verification is default-off and requires exact opt-in',async()=>{
 for(const value of [undefined,'false','true','synthetic','READ-ONLY','']) {
  const s=verification({...environment(),HR_R2_VERIFY_ON_START:value},()=>{throw Error('Must not contact provider');});
  await s.run();assert.deepEqual(s.logs,[]);assert.equal(s.calls.length,0);
 }
});
test('Configuration failures and enabled CV gates cause zero object/network operations',async()=>{
 const changes=[...['PROVIDER','ENDPOINT','BUCKET','REGION','ACCESS_KEY_ID','SECRET_ACCESS_KEY'].map(key=>({['HR_CV_STORAGE_'+key]:undefined})),{HR_CV_STORAGE_PROVIDER:'disabled'},{HR_CV_STORAGE_PROVIDER:'r2'},{HR_CV_STORAGE_BUCKET:'another-bucket'},{HR_CV_STORAGE_ENDPOINT:'https://public.r2.dev'},{HR_CV_STORAGE_ENDPOINT:config.endpoint+'.attacker.example'},{HR_CV_STORAGE_ENDPOINT:config.endpoint+'/?secret=private'},{HR_CV_STORAGE_REGION:'us-east-1'},{HR_CV_STORAGE_SECRET_ACCESS_KEY:'bad\nsecret'},...['DURABLE_INTAKE','SCAN','INTAKE_WORKER','OCR','PROCESSING','AI_PROCESSING'].map(key=>({['HR_CV_'+key+'_ENABLED']:'true'}))];
 for(const change of changes){const s=verification({...environment(),...change},()=>{throw Error('Must not contact provider');});await s.run();assert.equal(s.calls.length,0);assert.equal(s.logs.length,1);assert.ok(['CONFIG_INVALID','CONFIG_MISSING'].includes(s.logs[0]));}
});
test('Signed HEAD is the sole request, scoped to one bucket, no key/query/list/body/write',async()=>{
 let cleaned=0;
 const s=verification(environment(),async request=>({status:200,body:{destroy:()=>cleaned++},headers:{'sensitive-provider-header':'never-report'}}));
 await Promise.all([s.run(),s.run(),s.run()]);await s.run();
 assert.deepEqual(s.logs,['CONFIG_OK','R2_CONNECTION_OK']);assert.equal(s.calls.length,1);assert.equal(cleaned,1);
 const request=s.calls[0];assert.equal(request.method,'HEAD');assert.equal(request.url,config.endpoint+'/inop-private-cv/');assert.equal(request.body,undefined);
 assert.equal(new URL(request.url).search,'');assert.ok(!('x-amz-meta-sha256' in request.headers));assert.ok(!('x-amz-server-side-encryption' in request.headers));
 assert.match(request.headers.authorization,/\/auto\/s3\/aws4_request/);
 assert.equal(request.headers['x-amz-content-sha256'],require('node:crypto').createHash('sha256').update('').digest('hex'));
 assert.ok(!JSON.stringify(s.logs).includes('synthetic-only'));assert.ok(!JSON.stringify(s.logs).includes('sensitive-provider'));
});
test('HEAD failures, redirects and provider secrets never become success or raw logs',async()=>{
 for(const status of [301,302,400,401,403,404,429,500,503,204,undefined]) {
  let destroyed=false;
  const s=verification(environment(),async()=>({status,headers:{authorization:'SECRET'},body:{destroy:()=>{destroyed=true;},[Symbol.asyncIterator]:()=>{throw Error('Provider body must not be read');}}}));
  await s.run();assert.deepEqual(s.logs,['CONFIG_OK','R2_CONNECTION_FAILED']);assert.equal(s.calls.length,1);assert.equal(destroyed,true);
 }
 const s=verification(environment(),async()=>{throw Object.assign(Error('PRIVATE PROVIDER BODY'),{headers:{secret:'SECRET'}});});await s.run();assert.deepEqual(s.logs,['CONFIG_OK','R2_CONNECTION_FAILED']);
});
test('HEAD timeout and late response are bounded, abort transport and never retry',async()=>{
 let release,cleaned=false;
 const s=verification(environment(),()=>new Promise(resolve=>{release=()=>resolve({status:200,body:{destroy:()=>{cleaned=true;}}});}),10);
 const at=Date.now();await s.run();assert.ok(Date.now()-at<1000);assert.deepEqual(s.logs,['CONFIG_OK','R2_CONNECTION_FAILED']);assert.equal(s.calls[0].signal.aborted,true);
 release();await new Promise(resolve=>setImmediate(resolve));assert.equal(cleaned,true);await s.run();assert.equal(s.calls.length,1);
});
test('HEAD shares adapter concurrency budget and releases slots on success/failure',async()=>{
 const release=[];const store=storage.createStore(config,{timeoutMs:100,transport:()=>new Promise(resolve=>release.push(()=>resolve({status:200})))});
 const a=store.checkConnection(),b=store.checkConnection();await assert.rejects(store.checkConnection(),{code:'STORAGE_BUSY'});release.forEach(done=>done());assert.deepEqual(await Promise.all([a,b]),[true,true]);
 await assert.rejects(storage.createStore(config,{timeoutMs:10,transport:async()=>{throw Error('SECRET');}}).checkConnection(),{message:'Private storage operation is unavailable.',code:'STORAGE_UNAVAILABLE'});
 assert.equal(await storage.createStore(config,{transport:async()=>({status:200})}).checkConnection(),true);
});
test('Config-only adapter construction never implies connection; logging failure cannot crash startup',async()=>{
 let checked=0;
 const d=createVerification({env:environment(),adapter:{fromEnvironment:()=>({checkConnection:async()=>{checked++;return false;}})},emit:()=>{throw Error('log unavailable');}});await d.run();assert.equal(checked,1);
 const logs=[];await createVerification({env:environment(),adapter:{fromEnvironment:()=>{throw Error('SECRET');}},emit:c=>logs.push(c)}).run();assert.deepEqual(logs,['CONFIG_INVALID']);
});
test('Startup verification has no route, Mongo dependency, upload/worker or object mutation',()=>{
 const fs=require('node:fs'),path=require('node:path');const service=fs.readFileSync(path.join(__dirname,'../services/hrR2StartupVerification.service.js'),'utf8');
 assert.ok(!/\.put\(|\.get\(|\.delete\(|mongoose|models\/|hrCvIntakeProfiles|router\./.test(service));
 const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');assert.ok(server.indexOf("require('./services/hrR2StartupVerification.service')")>server.indexOf('app.listen(PORT'));
 assert.match(server,/void require\('\.\/services\/hrR2StartupVerification.service'\)\.createVerification\(\)\.run\(\)/);
});
test('HEAD success never iterates provider body or retries, logger receives only status codes',async()=>{
 let destroyed=false;
 const s=verification(environment(),async()=>({status:200,body:{destroy:()=>{destroyed=true;},[Symbol.asyncIterator]:()=>{throw Error('PRIVATE OBJECT CONTENT');}}}));
 await s.run();assert.equal(destroyed,true);assert.deepEqual(s.logs,['CONFIG_OK','R2_CONNECTION_OK']);assert.equal(s.calls.length,1);
});
