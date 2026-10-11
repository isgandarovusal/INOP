const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs/promises'),path=require('node:path');
const {withAuditFixture}=require('./helpers/auditFixture.cjs'),{docx}=require('./helpers/cvDocuments.cjs'),Candidate=require('../models/candidate.model'),Jobs=require('../models/hrCvProcessingJob.model'),processing=require('../services/hrCvProcessing.service'),{uploadsDir}=require('../middleware/privateUpload.middleware');
test('Manual CV processing retry preserves lifetime bounds, current dual authority, source, CAS and private audit',async t=>withAuditFixture(async h=>{
 const factory=processing.createProcessing,owned=[],bytes=docx('Name: Synthetic parsed applicant\nPhone: +994501234567\nSkills\nFood safety\nExperience\n0 years');await fs.mkdir(uploadsDir,{recursive:true});await Jobs.createIndexes();
 for(const scope of['own','department','assigned','none'])await h.models.Role.updateOne({key:'test_'+scope},{permissions:[{resource:'candidate',action:'read',scope},{resource:'candidate',action:'update',scope}]});
 const queue=factory({enabled:true}),req=actor=>({user:{id:String(h.actors[actor]._id)}});
 async function blocked(){
  const file=path.join(uploadsDir,'test-'+crypto.randomUUID()+'.docx');await fs.writeFile(file,bytes,{flag:'wx',mode:0o600});owned.push(file);
  const c=await Candidate.create({name:'Manual profile retained',role:'Cashier',experience:null,createdBy:h.actors.own._id,assignedTo:h.actors.assigned._id,departmentId:'dep_A',cvUrl:'/uploads/'+path.basename(file),cvOriginal:{sha256:crypto.createHash('sha256').update(bytes).digest('hex'),size:bytes.length},cvReview:{version:'rules-2',provider:'rule-based'}});
  const j=await queue.enqueue(req('own'),c._id,{kind:'parse',expectedHash:c.cvOriginal.sha256,expectedRevision:0});await fs.unlink(file);try{await queue.runOnce(4);}finally{await fs.writeFile(file,bytes,{flag:'wx',mode:0o600});}
  const job=await queue.get(req('own'),j.id);assert.equal(job.code,'SOURCE_MISSING');assert.equal(job.attempts,1);return{c,job};
 }
 const input=job=>({expectedHash:job.source.sha256,expectedRevision:job.source.revision,expectedUpdatedAt:new Date(job.updatedAt).toISOString(),commandId:crypto.randomUUID()}),route=(c,job)=>`/candidates/${c._id}/processing/${job.id}/retry`;
 try{
  for(const actor of['admin','hr','own','department','assigned'])await t.test(actor+' actual JWT retry/replay has one audit event, restored original and real HR-only review',async()=>{
   const {c,job}=await blocked(),data=input(job);processing.createProcessing=()=>factory({enabled:true});const before=await Candidate.findById(c._id).lean(),r=await h.request(actor,'POST',route(c,job),data);assert.equal(r.status,202);assert.equal(r.data.attempts,1);assert.equal(r.data.manualRetries,1);assert.equal(r.data.state,'queued');assert.equal(r.data.result,undefined);
   const repeat=await h.request(actor,'POST',route(c,job),data);assert.equal(repeat.status,202);assert.equal(repeat.data.replayed,true);const saved=await Jobs.findById(job.id).select('+retryActorId +retryCommandHash').lean();assert.equal(String(saved.retryActorId),String(h.actors[actor]._id));assert.equal(String(saved.actorId),String(h.actors.own._id));assert.equal(saved.events.filter(e=>e.code==='MANUAL_RETRY').length,1);assert.equal(saved.events.at(-1).actorId.toString(),String(h.actors[actor]._id));assert.ok(!JSON.stringify(r.data).includes('actorId'));assert.ok(!JSON.stringify(r.data).includes(data.commandId));assert.ok(!JSON.stringify(r.data).includes('retryCommandHash'));
   await queue.runOnce();const result=await queue.get(req(actor),job.id);assert.equal(result.state,'succeeded');assert.equal(result.attempts,2);assert.equal(result.result.parsed.experience,0);assert.equal(result.result.requiresApproval,true);assert.deepEqual(await Candidate.findById(c._id).lean(),before);
  });
  await t.test('disabled service, anonymous, absent grants, foreign parent/child cannot retry',async()=>{
   const {c,job}=await blocked(),data=input(job);processing.createProcessing=factory;assert.equal((await h.request('admin','POST',route(c,job),data)).status,503);processing.createProcessing=()=>factory({enabled:true});
   for(const [actor,status]of[['anonymous',401],['none',403],['foreign',404]])assert.equal((await h.request(actor,'POST',route(c,job),data)).status,status);
   const another=await blocked();assert.equal((await h.request('admin','POST',route(another.c,job),data)).status,404);assert.equal((await Jobs.findById(job.id)).manualRetries,0);
  });
  await t.test('read-only HR retains metadata access but update grant is mandatory for retry',async()=>{
   const {c,job}=await blocked(),old=await h.models.Role.findOne({key:'test_none'}).lean();await h.models.Role.updateOne({key:'test_none'},{permissions:[{resource:'candidate',action:'read',scope:'all'}]});try{assert.equal((await h.request('none','GET',`/candidates/${c._id}/processing`)).status,200);assert.equal((await h.request('none','POST',route(c,job),input(job))).status,403);assert.equal((await Jobs.findById(job.id)).manualRetries,0);}finally{await h.models.Role.updateOne({key:'test_none'},{permissions:old.permissions});}
  });
  await t.test('forged actor/privilege fields, missing timestamp and invalid commands are 400',async()=>{
   const {c,job}=await blocked(),valid=input(job);for(const bad of[{...valid,actorId:String(h.actors.admin._id)},{...valid,permissions:['all']},{...valid,commandId:'not-a-command'},{...valid,commandId:[valid.commandId]},{...valid,expectedHash:[valid.expectedHash]},{...valid,expectedUpdatedAt:'2026-02-31T00:00:00.000Z'},{...valid,expectedUpdatedAt:'bad'},{...valid,expectedUpdatedAt:undefined}])assert.equal((await h.request('admin','POST',route(c,job),bad)).status,400);assert.equal((await Jobs.findById(job.id)).manualRetries,0);
  });
  await t.test('read/all versus update/own and converse remain independent',async()=>{
   const {c,job}=await blocked(),key='test_mixed_retry';for(const permissions of[[{resource:'candidate',action:'read',scope:'all'},{resource:'candidate',action:'update',scope:'own'}],[{resource:'candidate',action:'read',scope:'own'},{resource:'candidate',action:'update',scope:'all'}]]){await h.models.Role.updateOne({key},{name:key,isActive:true,permissions},{upsert:true});await h.models.User.updateOne({_id:h.actors.foreign._id},{role:key});assert.equal((await h.request('foreign','POST',route(c,job),input(job))).status,404);}await h.models.User.updateOne({_id:h.actors.foreign._id},{role:'test_own'});
  });
  await t.test('stale job timestamp or parent source/revision is 409 without capacity or facts mutation',async()=>{
   const {c,job}=await blocked(),data=input(job);assert.equal((await h.request('admin','POST',route(c,job),{...data,expectedUpdatedAt:new Date(0).toISOString()})).status,409);await Candidate.updateOne({_id:c._id},{$inc:{__v:1}});assert.equal((await h.request('admin','POST',route(c,job),data)).status,409);const saved=await Jobs.findById(job.id);assert.equal(saved.state,'blocked');assert.equal(saved.queueSlot,undefined);assert.equal(saved.manualRetries,0);
  });
  await t.test('concurrent same command replays once; distinct commands cannot overwrite an accepted retry',async()=>{
   const {c,job}=await blocked(),data=input(job),responses=await Promise.all([h.request('admin','POST',route(c,job),data),h.request('admin','POST',route(c,job),data)]);assert.deepEqual(responses.map(r=>r.status),[202,202]);assert.equal((await Jobs.findById(job.id)).manualRetries,1);assert.equal((await h.request('admin','POST',route(c,job),{...data,commandId:crypto.randomUUID()})).status,409);await queue.runOnce();
   const next=await blocked(),a=input(next.job),race=await Promise.all([h.request('admin','POST',route(next.c,next.job),a),h.request('admin','POST',route(next.c,next.job),{...a,commandId:crypto.randomUUID()})]);assert.deepEqual(race.map(r=>r.status).sort(),[202,409]);assert.equal((await Jobs.findById(next.job.id)).manualRetries,1);await queue.runOnce();
  });
  await t.test('original creator quota is atomically re-reserved; full capacity is 429 and later recovers',async()=>{
   const {c,job}=await blocked(),data=input(job),pending=[];
   for(let i=0;i<4;i++){const extra=await Candidate.create({name:'Owned capacity fixture',role:'Cashier',createdBy:h.actors.own._id,cvUrl:c.cvUrl,cvOriginal:c.cvOriginal,cvReview:c.cvReview});pending.push(await queue.enqueue(req('own'),extra._id,{kind:'parse',expectedHash:extra.cvOriginal.sha256,expectedRevision:0}));}
   const before=await Jobs.findById(job.id).lean();assert.equal((await h.request('admin','POST',route(c,job),data)).status,429);assert.deepEqual(await Jobs.findById(job.id).lean(),before);await Jobs.updateOne({_id:pending[0].id},{$set:{state:'cancelled'},$unset:{actorSlot:1,queueSlot:1}});assert.equal((await h.request('admin','POST',route(c,job),data)).status,202);await queue.runOnce(4);
  });
  await t.test('retry consumes remaining lifetime attempts; third blocked attempt and unsupported states never reset',async()=>{
   const {c,job}=await blocked();let current=job;for(let i=1;i<=2;i++){assert.equal((await h.request('admin','POST',route(c,current),input(current))).status,202);await factory({enabled:true,read:async()=>null}).runOnce(4);current=await queue.get(req('admin'),job.id);assert.equal(current.attempts,i+1);assert.equal(current.manualRetries,i);}
   assert.equal((await h.request('admin','POST',route(c,current),input(current))).status,409);assert.equal((await Jobs.findById(job.id)).actorSlot,undefined);
   for(const [state,code]of[['blocked','OCR_REQUIRED'],['blocked','RESULT_LIMIT'],['cancelled','AUTH_REVOKED'],['failed','ATTEMPTS_EXHAUSTED'],['succeeded','REVIEW_REQUIRED'],['running','PROCESSING']]){await Jobs.updateOne({_id:job.id},{$set:{state,code,attempts:1,manualRetries:0}});const latest=await queue.get(req('admin'),job.id);assert.equal((await h.request('admin','POST',route(c,latest),input(latest))).status,409);}
   await Jobs.updateOne({_id:job.id},{$set:{state:'cancelled'}});
  });
  await t.test('admin cannot replace a revoked original creator with admin privilege',async()=>{
   const {c,job}=await blocked();await h.models.User.updateOne({_id:h.actors.own._id},{role:'test_none'});try{assert.equal((await h.request('admin','POST',route(c,job),input(job))).status,403);assert.equal((await Jobs.findById(job.id)).state,'blocked');}finally{await h.models.User.updateOne({_id:h.actors.own._id},{role:'test_own'});}
  });
  await t.test('revoked retry actor before/during work cancels private result without original-author fallback',async()=>{
   for(const timing of['before','during']){const {c,job}=await blocked();assert.equal((await h.request('hr','POST',route(c,job),input(job))).status,202);let entered,release;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r),parser=require('../services/cvParser.service');
    const worker=factory({enabled:true,parse:async(...args)=>{const output=await parser.parseCvResultFromBuffer(...args);entered();await gate;return output;}});let pending;if(timing==='during'){pending=worker.runOnce();await ready;}await h.models.User.updateOne({_id:h.actors.hr._id},{role:'test_none'});try{if(timing==='during'){release();await pending;}else await queue.runOnce();const saved=await Jobs.findById(job.id).select('+result').lean();assert.equal(saved.state,'cancelled');assert.equal(saved.code,'AUTH_REVOKED');assert.equal(saved.result,undefined);}finally{release?.();await h.models.User.updateOne({_id:h.actors.hr._id},{role:'hr_manager'});}
   }
  });
 }finally{processing.createProcessing=factory;for(const file of owned)await fs.unlink(file);}
}));
