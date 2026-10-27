const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createDiagnostic}=require('../services/hrStorageDiagnostic.service');
const storage=require('../services/hrPrivateObjectStorage.service');
const token='synthetic-activation-only-not-a-real-secret', start=Date.now();
function setup(changes={},adapter){
 const env={HR_R2_DIAGNOSTIC_ENABLED:'true',HR_R2_DIAGNOSTIC_EXPIRES_AT:new Date(start+600000).toISOString(),HR_R2_DIAGNOSTIC_TOKEN_SHA256:crypto.createHash('sha256').update(token).digest('hex'),HR_R2_DIAGNOSTIC_ORIGIN:'https://inop-ruby.vercel.app',HR_CV_STORAGE_PROVIDER:'s3',HR_CV_STORAGE_ENDPOINT:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',HR_CV_STORAGE_BUCKET:'inop-private-cv',HR_CV_STORAGE_REGION:'auto',HR_CV_STORAGE_ACCESS_KEY_ID:'synthetic-key',HR_CV_STORAGE_SECRET_ACCESS_KEY:'synthetic-secret',...changes};
 const req={user:{id:'one',role:'admin'},authRole:{key:'admin',isActive:true},permission:{scope:'all'},headers:{origin:env.HR_R2_DIAGNOSTIC_ORIGIN,'content-type':'application/json',authorization:'Bearer synthetic','x-inop-diagnostic-token':token},body:{action:'challenge'}};
 const d=createDiagnostic({env,now:()=>start,adapter});
 const run=async(action='config')=>{req.body={action:'challenge'};const c=await d.execute(req);req.body={action,challenge:c.body.challenge};return d.execute(req);};
 return {d,req,env,run};
}
test('Diagnostic default-off, expired, excessive lifetime and active intake gates deny',async()=>{
 for(const change of [{HR_R2_DIAGNOSTIC_ENABLED:undefined},{HR_R2_DIAGNOSTIC_EXPIRES_AT:new Date(start-1).toISOString()},{HR_R2_DIAGNOSTIC_EXPIRES_AT:new Date(start+3600000).toISOString()},...['DURABLE_INTAKE','SCAN','INTAKE_WORKER','OCR','PROCESSING','AI_PROCESSING'].map(k=>({['HR_CV_'+k+'_ENABLED']:'true'}))]){const {d,req}=setup(change);assert.equal((await d.execute(req)).body.code,'DIAGNOSTIC_DISABLED');}
});
test('Diagnostic rejects missing authentication, employee, stale role and scoped admin',async()=>{
 for(const change of [{user:null},{user:{id:'one',role:'recruitment_manager'}},{authRole:{key:'admin',isActive:false}},{permission:{scope:'department'}}]){const {d,req}=setup();Object.assign(req,change);assert.ok([401,403].includes((await d.execute(req)).status));}
});
test('Diagnostic rejects CSRF, bearer absence, activation mismatch, input keys and replay',async()=>{
 for(const [key,value] of [['origin','https://attacker.example'],['content-type','text/plain'],['authorization',''],['x-inop-diagnostic-token','wrong']]){const {d,req}=setup();req.headers[key]=value;assert.equal((await d.execute(req)).status,403);}
 const {d,req,run}=setup();assert.equal((await run()).body.code,'CONFIG_OK');assert.equal((await d.execute(req)).body.code,'DIAGNOSTIC_REPLAY_REJECTED');req.body={action:'challenge',key:'foreign'};assert.equal((await d.execute(req)).status,400);
});
test('Challenge is actor-bound, expires and is invalid after runtime restart; rate limit bounded',async()=>{
 const {d,req}=setup();const c=await d.execute(req);req.body={action:'config',challenge:c.body.challenge};req.user.id='two';assert.equal((await d.execute(req)).status,409);
 const again=setup();again.req.body={action:'config',challenge:c.body.challenge};assert.equal((await again.d.execute(again.req)).status,409);
 for(let i=0;i<8;i++){req.body={action:'challenge'};await d.execute(req);}assert.equal((await d.execute(req)).status,429);
});
test('Config is network-free, missing/invalid sanitized, writes separately approved',async()=>{
 assert.equal((await setup({HR_CV_STORAGE_SECRET_ACCESS_KEY:''}).run()).body.code,'CONFIG_MISSING');
 assert.equal((await setup({HR_CV_STORAGE_ENDPOINT:'https://public.r2.dev'}).run()).body.code,'CONFIG_INVALID');
 assert.equal((await setup().run('synthetic')).body.code,'DIAGNOSTIC_WRITE_NOT_APPROVED');
 let calls=0;const adapter={fromEnvironment:()=>{calls++;throw Error('SECRET');}};
 const r=await setup({},adapter).run();assert.equal(r.body.code,'CONFIG_INVALID');assert.equal(calls,1);assert.ok(!JSON.stringify(r).includes('SECRET'));
});
const approvals={HR_R2_DIAGNOSTIC_SYNTHETIC_APPROVED:'true',HR_R2_DIAGNOSTIC_RETENTION_APPROVED:'true'};
test('Synthetic uses real adapter hash/conditional contract; one object and no repeated attempt',async()=>{
 let object,puts=0,gets=0;const adapter={prepare:storage.prepare,fromEnvironment:env=>storage.createStore({provider:'s3',endpoint:env.HR_CV_STORAGE_ENDPOINT,bucket:env.HR_CV_STORAGE_BUCKET,region:'auto',accessKeyId:'synthetic-key',secretAccessKey:'synthetic-secret'},{transport:async r=>{
 if(r.method==='PUT'){puts++;assert.equal(r.headers['if-none-match'],'*');if(object)return{status:412};object=Buffer.from(r.body);return{status:200};}gets++;return{status:200,body:[object]};}})};
 const s=setup(approvals,adapter);assert.equal((await s.run('synthetic')).body.code,'R2_VERIFIED');assert.equal(puts,2);assert.equal(gets,1);assert.equal((await s.run('synthetic')).body.code,'DIAGNOSTIC_ALREADY_ATTEMPTED');
});
test('Storage faults fail closed without raw provider logs or metadata',async()=>{
 for(const code of ['STORAGE_TIMEOUT','STORAGE_WRITE_UNCERTAIN','STORAGE_UNAVAILABLE','STORAGE_IDENTITY_MISMATCH','SECRET_PROVIDER_ERROR']){
 const adapter={prepare:storage.prepare,fromEnvironment:()=>({put:async()=>{throw Object.assign(Error('SECRET'),{code});}})};
 const s=setup(approvals,adapter),r=await s.run('synthetic');assert.equal(r.status,503);assert.ok(!JSON.stringify(r).includes('SECRET'));assert.equal((await s.run('synthetic')).body.code,'DIAGNOSTIC_ALREADY_ATTEMPTED');
 }
});
test('Challenge expiry, scope, strict bucket and unsupported action reject without storage',async()=>{
 let clock=start;const s=setup();const d=createDiagnostic({env:s.env,now:()=>clock});const c=await d.execute(s.req);clock+=60001;s.req.body={action:'config',challenge:c.body.challenge};assert.equal((await d.execute(s.req)).body.code,'DIAGNOSTIC_REPLAY_REJECTED');
 assert.equal((await setup({HR_CV_STORAGE_BUCKET:'another-bucket'}).run()).body.code,'CONFIG_INVALID');
 assert.equal((await setup().run('delete')).body.code,'DIAGNOSTIC_INPUT');
});
test('Missing conflict enforcement and corrupted readback never claim verified',async()=>{
 for(const corrupt of [false,true]){
 const adapter={prepare:storage.prepare,fromEnvironment:()=>({put:async()=>{},get:async()=>Buffer.from(corrupt?'bad':'%PDF-1.4\n% INOP synthetic storage diagnostic; no personal data\n%%EOF\n')})};
 assert.equal((await setup(approvals,adapter).run('synthetic')).body.code,corrupt?'DIAGNOSTIC_READBACK_FAILED':'DIAGNOSTIC_CONDITIONAL_WRITE_FAILED');
 }
});
test('Temporary route is mounted after real token verification and uses existing permission middleware',()=>{
 const fs=require('node:fs'),path=require('node:path');const main=fs.readFileSync(path.join(__dirname,'../routes/route.js'),'utf8');assert.ok(main.indexOf("router.use('/hr/storage-diagnostic'")>main.indexOf('router.use(verifyToken)'));
 const route=fs.readFileSync(path.join(__dirname,'../routes/hrStorageDiagnostic.routes.js'),'utf8');assert.match(route,/requirePermission\('user','update'\)/);assert.ok(!/console\./.test(route));
});
test('HTTP route rejects unauthenticated calls through real verifyToken',async()=>{
 const express=require('express'),{verifyToken}=require('../middleware/auth.middleware');
 const app=express();app.use(express.json());app.use('/diagnostic',verifyToken,require('../routes/hrStorageDiagnostic.routes'));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 try{const r=await fetch('http://127.0.0.1:'+server.address().port+'/diagnostic',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'synthetic'})});assert.equal(r.status,401);assert.ok(!(await r.text()).includes('synthetic-secret'));}finally{await new Promise(resolve=>server.close(resolve));}
});
