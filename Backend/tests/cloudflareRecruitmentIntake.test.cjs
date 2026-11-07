const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const workerUrl=pathToFileURL(path.resolve(__dirname,'../../Cloudflare/recruitment-worker/src/index.mjs')).href;
const token='synthetic-credential-only-for-local-qa-0123456789';
const candidateRef='507f1f77bcf86cd799439011';
const consentRef='00000000-0000-4000-8000-000000000001';
const pdf=Buffer.from('%PDF-1.7\nsynthetic, not a real candidate\n%%EOF','utf8');
const headers={Authorization:'Bearer '+token,'content-type':'application/pdf','content-length':String(pdf.byteLength),'x-inop-tenant':'gfc','x-inop-candidate-ref':candidateRef,'x-inop-consent-ref':consentRef};
const req=(extra={},body=pdf)=>new Request('https://fake.invalid/v1/intakes',{method:'POST',headers:{...headers,...extra},body});
function env(enabled=true){
 let writes=0,rows=0,quota=0,uploads=[];
 const storage={put:async(key,data,opts)=>{writes++;assert.match(key,/^hr\/cv\/quarantine\/[a-f0-9-]{36}$/);const hash=crypto.createHash('sha256').update(data).digest('hex');assert.equal(opts.customMetadata.sha256,hash);assert.equal(opts.httpMetadata.cacheControl,'private, no-store');uploads.push({key,size:data.length,hash});}};
 const db={prepare(sql){return{bind(...args){return{
  async first(){assert.match(sql,/INSERT INTO intake_daily_quota/);quota++;return {attempts:1};},
  async run(){if(sql.startsWith('INSERT INTO cv_sources')){rows++;assert.equal(args[1],'gfc');assert.equal(args[2],candidateRef);assert.equal(args[6],pdf.length);}else assert.match(sql,/UPDATE cv_sources SET storage_status='stored'/);return{success:true};}
 };}};}};
 return {value:{RECRUITMENT_SERVICE_TOKEN:token,RECRUITMENT_DB:db,PRIVATE_CV_BUCKET:storage,...enabled?{RECRUITMENT_QUARANTINE_INTAKE_ENABLED:'true'}:{}},state:()=>({writes,rows,quota,uploads})};
}
test('Unscanned CV upload is default-off and never reaches R2',async()=>{
 const worker=(await import(workerUrl)).default,e=env(false);
 const res=await worker.fetch(req(),e.value);assert.equal(res.status,423);assert.deepEqual(e.state(),{writes:0,rows:0,quota:0,uploads:[]});
});
test('Invalid tenant, oversized content and non-document bytes are rejected before reserving quota',async()=>{
 const worker=(await import(workerUrl)).default,e=env();
 for(const request of [
  req({'x-inop-tenant':'other'}),
  req({'content-length':'1048577'}),
  req({'x-inop-consent-ref':'not-consent'}),
  req({'content-type':'application/javascript'}),
  req({},Buffer.from('HELLO')),
  req({'authorization':'Bearer bogus'})
 ]){const response=await worker.fetch(request,e.value);assert.ok([400,401].includes(response.status));}
 assert.equal(e.state().writes,0);assert.equal(e.state().rows,0);assert.equal(e.state().quota,0);
});
test('Allowed synthetic payload is quarantined, never declared clean, and never invokes Workers AI',async()=>{
 const worker=(await import(workerUrl)).default,e=env();
 const ai={run(){throw Error('AI must not run on unscanned bytes');}};e.value.AI=ai;
 const response=await worker.fetch(req(),e.value);assert.equal(response.status,202);const receipt=await response.json();
 assert.equal(receipt.sourceStatus,'quarantined');assert.equal(receipt.scanStatus,'pending');assert.equal(receipt.processingAllowed,false);
 assert.equal(e.state().quota,1);assert.equal(e.state().rows,1);assert.equal(e.state().writes,1);
 assert.equal(e.state().uploads[0].hash,crypto.createHash('sha256').update(pdf).digest('hex'));
});
test('Quota rejection never calls R2; storage failure stays fail-closed',async()=>{
 const worker=(await import(workerUrl)).default,e=env();
 e.value.RECRUITMENT_DB.prepare=()=>({bind:()=>({first:async()=>undefined})});
 assert.equal((await worker.fetch(req(),e.value)).status,429);assert.equal(e.state().writes,0);
 const bad=env();bad.value.PRIVATE_CV_BUCKET.put=async()=>{throw Error('private provider detail');};
 const response=await worker.fetch(req(),bad.value);assert.equal(response.status,503);
 assert.equal((await response.text()).includes('private provider detail'),false);
});
