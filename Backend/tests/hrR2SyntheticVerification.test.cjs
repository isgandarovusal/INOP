const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const storage=require('../services/hrPrivateObjectStorage.service');
const {createVerifier,confirmAtTerminal,PAYLOAD_BYTES}=require('../scripts/verifyR2Synthetic.cjs');
const config={provider:'s3',endpoint:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',bucket:'inop-private-cv',region:'auto',accessKeyId:'synthetic-only-key',secretAccessKey:'synthetic-only-secret'};
const environment=()=>({HR_CV_STORAGE_PROVIDER:'s3',HR_CV_STORAGE_ENDPOINT:config.endpoint,HR_CV_STORAGE_BUCKET:config.bucket,HR_CV_STORAGE_REGION:'auto',HR_CV_STORAGE_ACCESS_KEY_ID:config.accessKeyId,HR_CV_STORAGE_SECRET_ACCESS_KEY:config.secretAccessKey,HR_CV_DURABLE_INTAKE_ENABLED:'false',HR_CV_SCAN_ENABLED:'false',HR_CV_INTAKE_WORKER_ENABLED:'false'});
function harness({change={},transport,confirm=async()=>true,timeoutMs=100}={}) {
 const codes=[],requests=[],objects=new Map();let confirmations=0;
 const adapter={prepare:storage.prepare,fromEnvironment:env=>{
  storage.fromEnvironment(env);
  return storage.createStore(config,{timeoutMs,transport:async request=>{
   requests.push(request);
   if(transport)return transport(request,objects);
   const key=new URL(request.url).pathname;
   if(request.method==='PUT') {
    assert.equal(request.headers['if-none-match'],'*');
    if(objects.has(key))return{status:412};
    objects.set(key,Buffer.from(request.body));return{status:200};
   }
   assert.equal(request.method,'GET');assert.ok(objects.has(key));return{status:200,body:[objects.get(key)]};
  }});
 }};
 const verifier=createVerifier({env:{...environment(),...change},adapter,emit:c=>codes.push(c),confirm:async()=>{confirmations++;return confirm();}});
 return{codes,requests,objects,verifier,confirmations:()=>confirmations};
}
test('Synthetic CLI remains default-off, rejects non-TTY confirmation, unknown flags and imports perform no work',async()=>{
 const h=harness();assert.equal(await h.verifier.run(),false);assert.deepEqual(h.codes,['VERIFICATION_DISABLED']);assert.equal(h.requests.length,0);assert.equal(h.confirmations(),0);
 assert.equal(await confirmAtTerminal({isTTY:false},{isTTY:false}),false);
 const no=harness({confirm:async()=>false});assert.equal(await no.verifier.run({execute:true}),false);assert.deepEqual(no.codes,['CONFIG_OK','OPERATOR_CONFIRMATION_REQUIRED']);assert.equal(no.requests.length,0);
 const denied=harness({confirm:async()=>{throw Error('SECRET');}});await denied.verifier.run({execute:true});assert.equal(denied.requests.length,0);assert.ok(!JSON.stringify(denied.codes).includes('SECRET'));
});
test('Config scope, unsafe input and all intake gates reject before any request',async()=>{
 for(const change of [{HR_CV_STORAGE_BUCKET:'other'},{HR_CV_STORAGE_ENDPOINT:'https://public.r2.dev'},{HR_CV_STORAGE_ENDPOINT:config.endpoint+'.attacker.example'},{HR_CV_STORAGE_REGION:'other'},{HR_CV_STORAGE_PROVIDER:'r2'},{HR_CV_STORAGE_SECRET_ACCESS_KEY:'bad\nsecret'},...['DURABLE_INTAKE','SCAN','INTAKE_WORKER','OCR','PROCESSING','AI_PROCESSING'].map(k=>({['HR_CV_'+k+'_ENABLED']:'true'}))]){
  const h=harness({change});assert.equal(await h.verifier.run({execute:true}),false);assert.equal(h.requests.length,0);assert.equal(h.confirmations(),0);assert.ok(['CONFIG_INVALID','CV_GATES_NOT_DISABLED'].includes(h.codes[0]));
 }
 for(const k of ['PROVIDER','ENDPOINT','BUCKET','REGION','ACCESS_KEY_ID','SECRET_ACCESS_KEY']){const h=harness({change:{['HR_CV_STORAGE_'+k]:''}});await h.verifier.run({execute:true});assert.deepEqual(h.codes,['CONFIG_MISSING']);assert.equal(h.requests.length,0);}
});
test('One invocation creates at most one 64-byte object, uses only its UUID, verifies SHA and conflict',async()=>{
 const h=harness();assert.equal(await h.verifier.run({execute:true}),true);
 assert.deepEqual(h.codes,['CONFIG_OK','WRITE_OK','READBACK_OK','SHA256_MATCH','WRITE_CONFLICT_CONFIRMED']);
 assert.equal(h.objects.size,1);assert.equal(PAYLOAD_BYTES,64);
 const [path,bytes]=[...h.objects][0];assert.equal(bytes.length,64);assert.match(path,/^\/inop-private-cv\/hr\/cv\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
 assert.deepEqual(h.requests.map(r=>r.method),['PUT','GET','PUT']);assert.ok(h.requests.every(r=>new URL(r.url).pathname===path));assert.equal(h.requests[0].headers['x-amz-meta-sha256'],crypto.createHash('sha256').update(bytes).digest('hex'));
 assert.equal(await h.verifier.run({execute:true}),false);assert.equal(h.requests.length,3);assert.equal(h.confirmations(),1);
 const another=harness();await another.verifier.run({execute:true});assert.notEqual([...another.objects.keys()][0],path);
});
test('Concurrent invocations cannot prompt or create twice in one runner',async()=>{
 const h=harness();const out=await Promise.all([h.verifier.run({execute:true}),h.verifier.run({execute:true})]);assert.deepEqual(out,[true,false]);assert.equal(h.confirmations(),1);assert.equal(h.objects.size,1);
});
test('Invalid credentials, access denial, missing bucket, collision and network failure stop at first PUT',async()=>{
 for(const status of [301,401,403,404,409,412,429,500,503]){
  const h=harness({transport:async()=>({status,body:[Buffer.from('SYNTHETIC_PROVIDER_SECRET')]})});assert.equal(await h.verifier.run({execute:true}),false);assert.deepEqual(h.codes,['CONFIG_OK','WRITE_FAILED']);assert.deepEqual(h.requests.map(r=>r.method),['PUT']);assert.equal(h.objects.size,0);
 }
 const h=harness({transport:async()=>{throw Error('SYNTHETIC_PROVIDER_SECRET');}});await h.verifier.run({execute:true});assert.deepEqual(h.codes,['CONFIG_OK','WRITE_FAILED']);
});
test('Uncertain PUT timeout is never retried and can leave at most one retained object',async()=>{
 const h=harness({timeoutMs:10,transport:(r,objects)=>{objects.set(new URL(r.url).pathname,Buffer.from(r.body));return new Promise(()=>{});}});
 assert.equal(await h.verifier.run({execute:true}),false);assert.deepEqual(h.codes,['CONFIG_OK','WRITE_FAILED']);assert.equal(h.objects.size,1);assert.equal(h.requests.length,1);assert.equal(h.requests[0].signal.aborted,true);
});
test('Failed GET/timeout and hash mismatch never claim success or attempt second PUT',async()=>{
 for(const type of ['denied','timeout','corrupt']){
  const h=harness({timeoutMs:10,transport:async(r,objects)=>{
   if(r.method==='PUT'){objects.set(r.url,Buffer.from(r.body));return{status:200};}
   if(type==='timeout')return new Promise(()=>{});
   return type==='denied'?{status:403,body:[Buffer.from('PRIVATE')]}:{status:200,body:[Buffer.alloc(64)]};
  }});assert.equal(await h.verifier.run({execute:true}),false);assert.ok(h.codes.includes('READBACK_FAILED'));assert.equal(h.codes.includes('SHA256_MISMATCH'),type==='corrupt');assert.deepEqual(h.requests.map(r=>r.method),['PUT','GET']);
 }
});
test('Unexpected second PUT success or provider error fails conditional protection without retry',async()=>{
 for(const status of [200,403,500]){
  let puts=0;const h=harness({transport:async(r,objects)=>{
   if(r.method==='PUT'){puts++;objects.set(r.url,Buffer.from(r.body));return{status:puts===1?200:status};}
   return{status:200,body:[objects.get(r.url)]};
  }});assert.equal(await h.verifier.run({execute:true}),false);assert.equal(h.codes.at(-1),'WRITE_CONFLICT_FAILED');assert.equal(h.requests.length,3);assert.equal(h.objects.size,1);
 }
});
test('Runner independently verifies hash even if injected adapter returns unchecked bytes',async()=>{
 const codes=[];const v=createVerifier({env:environment(),confirm:async()=>true,emit:c=>codes.push(c),adapter:{prepare:storage.prepare,fromEnvironment:()=>({put:async()=>{},get:async()=>Buffer.alloc(64)})}});
 assert.equal(await v.run({execute:true}),false);assert.deepEqual(codes,['CONFIG_OK','WRITE_OK','READBACK_OK','SHA256_MISMATCH']);
});
test('CLI is not wired into startup, routes, package scripts or scheduler; no dotenv, DB, deletion or key arguments',()=>{
 const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..');
 for(const name of ['server.js','package.json','routes/route.js','services/hrCvIntakeWorker.service.js'])assert.ok(!fs.readFileSync(path.join(root,name),'utf8').includes('verifyR2Synthetic'));
 const source=fs.readFileSync(path.join(root,'scripts/verifyR2Synthetic.cjs'),'utf8');assert.ok(!/dotenv|mongoose|\.delete\(|\.remove\(|console\.error|JSON\.stringify/.test(source));assert.match(source,/require\.main===module/);assert.match(source,/args.length===1&&args\[0\]==='--execute'/);
});
test('Real CLI without explicit flag or interactive confirmation cannot contact storage',()=>{
 const {spawnSync}=require('node:child_process'),path=require('node:path');
 for(const args of [[],['--unknown'],['--execute','--extra'],['--execute']]){
  const r=spawnSync(process.execPath,[path.join(__dirname,'../scripts/verifyR2Synthetic.cjs'),...args],{env:{PATH:process.env.PATH,...environment()},encoding:'utf8',timeout:5000});
  assert.equal(r.error,undefined);assert.equal(r.status,1);assert.equal(r.stderr,'');assert.equal(r.stdout.trim(),args.length===1&&args[0]==='--execute'?'CONFIG_OK\nOPERATOR_CONFIRMATION_REQUIRED':'VERIFICATION_DISABLED');
 }
});
