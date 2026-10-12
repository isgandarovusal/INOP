const test=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const ai=require('../services/hrAiProvider.service');
test('AI setup metadata is read-only, secret-free and uses current canonical HR authority',async t=>withAuditFixture(async h=>{
 const previous=ai.health;let calls=0;
 ai.health=()=>{calls++;return{provider:'openai',state:'configured_not_verified',realE2EVerified:false,credential:'SHOULD_NEVER_LEAVE_CONTROLLER',model:'PRIVATE_DIAGNOSTIC'}};
 try{
  await t.test('Anonymous and non-HR wildcard grants cannot inspect configuration',async()=>{
   assert.equal((await h.request('anonymous','GET','/hr/ai/status')).status,401);
   await h.models.Role.updateOne({key:h.actors.foreign.role},{permissions:[{resource:'*',action:'*',scope:'all'}]});
   assert.equal((await h.request('foreign','GET','/hr/ai/status')).status,403);assert.equal(calls,0);
  });
  await t.test('Admin metadata is explicitly unverified and allowlisted; no provider is called',async()=>{
   const r=await h.request('admin','GET','/hr/ai/status');assert.equal(r.status,200);assert.equal(r.headers['cache-control'],'private, no-store');
   assert.deepEqual(Object.keys(r.data).sort(),['cvReviewApproved','provider','realE2EVerified','state','version'].sort());
   assert.equal(r.data.realE2EVerified,false);assert.equal(r.buffer.toString().includes('SHOULD_NEVER'),false);
  });
  for(const scope of['all','own','department','assigned'])await t.test('Canonical HR '+scope+' can inspect metadata without foreign resource data',async()=>{
   await h.models.User.updateOne({_id:h.actors.hr._id},{departmentId:'dep_hr'});
   await h.models.Role.updateOne({key:h.actors.hr.role},{permissions:[{resource:'candidate',action:'update',scope}]});
   const r=await h.request('hr','GET','/hr/ai/status');assert.equal(r.status,200);assert.equal(r.data.state,'configured_not_verified');
   assert.equal(Object.keys(r.data).some(k=>/candidate|job|user|token|key|email|model/i.test(k)),false);
  });
  await t.test('Current department/grant/none revocation overrides the unchanged old JWT',async()=>{
   await h.models.User.updateOne({_id:h.actors.hr._id},{departmentId:'dep_audit'});
   assert.equal((await h.request('hr','GET','/hr/ai/status')).status,403);
   await h.models.User.updateOne({_id:h.actors.hr._id},{departmentId:'dep_hr'});
   await h.models.Role.updateOne({key:h.actors.hr.role},{permissions:[{resource:'candidate',action:'update',scope:'none'}]});
   assert.equal((await h.request('hr','GET','/hr/ai/status')).status,403);
   await h.models.Role.updateOne({key:h.actors.hr.role},{permissions:[]});
   assert.equal((await h.request('hr','GET','/hr/ai/status')).status,403);
  });
  await t.test('Configuration input cannot change settings and missing/incomplete states are honest',async()=>{
   assert.equal((await h.request('admin','GET','/hr/ai/status?role=admin')).status,400);
   for(const state of['not_configured','configuration_required']){ai.health=()=>({provider:null,state});const r=await h.request('admin','GET','/hr/ai/status');assert.equal(r.data.state,state);assert.equal(r.data.realE2EVerified,false);}
  });
 }finally{ai.health=previous;}
},{canonicalHR:true}));
