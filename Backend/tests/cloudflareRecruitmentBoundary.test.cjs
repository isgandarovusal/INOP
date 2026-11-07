const test=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const workerUrl=pathToFileURL(path.resolve(__dirname,'../../Cloudflare/recruitment-worker/src/index.mjs')).href;
const token='synthetic-test-secret-never-deploy-0000000000000001';
const request=(route,method='GET',key=token)=>new Request('https://not-real.example'+route,{method,headers:key?{authorization:'Bearer '+key}:{}});
const fakeDb={
 prepare(sql){return{
  first:async()=>{assert.match(sql,/SELECT MAX\(version\) AS version FROM schema_migrations/);return {version:2};},
  bind(tenant){assert.match(sql,/FROM cv_sources WHERE tenant_id/);assert.equal(tenant,'gfc');return {all:async()=>({results:[]})};}
 }; }
};
test('Cloudflare independent recruitment Worker is fail-closed and only exposes bounded metadata',async()=>{
 const worker=(await import(workerUrl)).default;
 let response=await worker.fetch(new Request('https://not-real.example/health'),{});
 assert.equal(response.status,200);
 const health=await response.json();assert.equal(health.cvIntake,'disabled');assert.equal(health.aiInference,'disabled');
 assert.equal((await worker.fetch(request('/v1/status'),{})).status,503,'missing service secret must never expose D1');
 assert.equal((await worker.fetch(request('/v1/status','GET','wrong'),{RECRUITMENT_SERVICE_TOKEN:token,RECRUITMENT_DB:fakeDb})).status,401);
 assert.equal((await worker.fetch(request('/v1/status'),{RECRUITMENT_SERVICE_TOKEN:token})).status,503);
 const env={RECRUITMENT_SERVICE_TOKEN:token,RECRUITMENT_DB:fakeDb};
 response=await worker.fetch(request('/v1/status'),env);assert.equal(response.status,200);
 const status=await response.json();assert.equal(status.schemaVersion,2);assert.equal(status.humanReview,'mandatory');
 assert.equal((await worker.fetch(request('/v1/sources?tenant=../invalid'),env)).status,400);
 response=await worker.fetch(request('/v1/sources?tenant=gfc'),env);assert.equal(response.status,200);
 assert.deepEqual((await response.json()).items,[]);
 assert.equal((await worker.fetch(request('/v1/sources','POST'),env)).status,423);
 assert.equal((await worker.fetch(request('/v1/intakes','POST'),env)).status,423);
 assert.equal((await worker.fetch(request('/v1/ai-review','POST'),env)).status,423);
 assert.equal((await worker.fetch(request('/v1/unknown'),env)).status,404);
 assert.equal((await worker.fetch(new Request('https://not-real.example/not-real'),env)).status,404);
});