const test=require('node:test');
const assert=require('node:assert/strict');
const {status}=require('../services/hrRecruitmentCloud.service');
const token='synthetic-unit-test-token-with-more-than-32-chars';
const ok={ok:true,service:'inop-recruitment',schemaVersion:3,cvIntake:'disabled',aiInference:'disabled',scanner:'not-verified',humanReview:'mandatory'};
function reply(body=ok,code=200,type='application/json'){return {status:code,headers:{get:()=>type},text:async()=>JSON.stringify(body)};}
test('Recruitment Cloud remains off and cannot call Cloudflare without explicit opt-in and secret',async()=>{
 let calls=0;
 const request=async()=>{calls++;return reply();};
 for(const environment of [{},{RECRUITMENT_CLOUD_ENABLED:'true'},{RECRUITMENT_CLOUD_ENABLED:'false',RECRUITMENT_CLOUD_TOKEN:token}]){
  await assert.rejects(status({environment,request}),{status:503});
 }
 assert.equal(calls,0);
});
test('Only the trusted fixed address gets a bounded GET; no CV, applicant or token is echoed',async()=>{
 let calls=0;
 const data=await status({environment:{RECRUITMENT_CLOUD_ENABLED:'true',RECRUITMENT_CLOUD_TOKEN:token},request:async(url,opts)=>{
  calls++;assert.equal(url,'https://inop-recruitment-api.isgandarovusal.workers.dev/v1/status');
  assert.equal(opts.method,'GET');assert.equal(opts.redirect,'manual');assert.equal(opts.cache,'no-store');
  assert.equal(opts.headers.authorization,'Bearer '+token);assert.ok(opts.signal);return reply({...ok,pii:'NOT_PUBLIC',modelResult:'NEVER_RETURN'});
 }});
 assert.equal(calls,1);assert.equal(data.service,'inop-recruitment');assert.equal(data.cvIntake,'disabled');
 assert.equal(data.aiInference,'disabled');assert.equal('pii' in data,false);assert.equal('modelResult' in data,false);assert.equal(JSON.stringify(data).includes(token),false);
});
test('Bad upstream replies fail closed without revealing error body',async()=>{
 const env={RECRUITMENT_CLOUD_ENABLED:'true',RECRUITMENT_CLOUD_TOKEN:token};
 for(const value of [reply({},401),reply(ok,200,'text/html'),reply({...ok,aiInference:'enabled'}),reply({ok:false}),reply(ok,302),reply(ok,200,'application/json'),null]){
  if(value?.status===200&&value?.headers.get()==='application/json'&&value?.text)continue;
  await assert.rejects(status({environment:env,request:async()=>value}),{status:503});
 }
 await assert.rejects(status({environment:env,request:async()=>{throw new Error('SECRET_UPSTREAM_LOG')}}),e=>e.status===503&&!e.message.includes('SECRET_'));
});
