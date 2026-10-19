const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs/promises'),path=require('node:path');
const {withAuditFixture}=require('./helpers/auditFixture.cjs'),{docx,pdf}=require('./helpers/cvDocuments.cjs');
const Candidate=require('../models/candidate.model'),Jobs=require('../models/hrCvProcessingJob.model'),{createProcessing}=require('../services/hrCvProcessing.service'),{uploadsDir}=require('../middleware/privateUpload.middleware');
test('Durable CV parse queue has current scope, source identity, unique bounded reservations and recovery without silent Candidate writes',async t=>withAuditFixture(async h=>{
 const owned=[];await fs.mkdir(uploadsDir,{recursive:true});const bytes=docx('Name: Synthetic Applicant\nPhone: +994 (50) 123-45-67\nSkills\nFood safety\nExperience\n0 years');
 async function cv(actor='own',value=bytes,ext='.docx'){
  const name='test-'+crypto.randomUUID()+ext,file=path.join(uploadsDir,name);await fs.writeFile(file,value,{flag:'wx',mode:0o600});owned.push(file);
  return Candidate.create({name:'Manual name must stay',role:'Cashier',experience:null,createdBy:h.actors[actor]._id,assignedTo:h.actors[actor==='own'?'assigned':actor]._id,departmentId:actor==='own'?'dep_A':'dep_B',cvUrl:'/uploads/'+name,cvOriginal:{sha256:crypto.createHash('sha256').update(value).digest('hex'),size:value.length},cvReview:{version:'rules-2',provider:'rule-based',processingStatus:'extracted'}});
 }
 const req=actor=>({user:{id:String(h.actors[actor]._id)}}),input=c=>({kind:'parse',expectedRevision:c.__v||0,expectedHash:c.cvOriginal.sha256});
 for(const scope of['own','department','assigned','none'])await h.models.Role.updateOne({key:'test_'+scope},{$set:{permissions:[{resource:'candidate',action:'read',scope},{resource:'candidate',action:'update',scope}]}});
 const queue=createProcessing({enabled:true});
 try{
  await t.test('disabled by default and missing unique indexes fail closed without creating a queue row',async()=>{
   const c=await cv();await assert.rejects(createProcessing({enabled:false}).enqueue(req('admin'),c._id,input(c)),{code:'PROCESSING_DISABLED'});
   await assert.rejects(queue.enqueue(req('admin'),c._id,input(c)),{code:'PROCESSING_QUEUE_NOT_READY'});assert.equal(await Jobs.countDocuments(),0);
   assert.equal(Jobs.schema.options.autoIndex,false);assert.equal(Jobs.schema.options.autoCreate,false);await Jobs.createIndexes();
  });
  for(const actor of['admin','hr','own','department','assigned'])await t.test(actor+' authorized enqueue is idempotent, persistent and does not parse or change Candidate synchronously',async()=>{
   const c=await cv(),before=await Candidate.findById(c._id).lean(),a=await queue.enqueue(req(actor),c._id,input(c)),b=await queue.enqueue(req(actor),c._id,input(c));assert.equal(a.state,'queued');assert.equal(b.replayed,true);assert.equal(a.id,b.id);assert.equal(await Jobs.countDocuments({_id:a.id}),1);assert.deepEqual(await Candidate.findById(c._id).lean(),before);
   const saved=await Jobs.findById(a.id).lean();assert.equal(saved.actorId.toString(),h.actors[actor]._id.toString());assert.ok(!JSON.stringify(saved).includes('/uploads/'));assert.equal(saved.result,undefined);assert.equal(JSON.stringify(a).includes('queueSlot'),false);
   await Jobs.updateOne({_id:a.id},{$set:{state:'cancelled'},$unset:{queueSlot:1,actorSlot:1}});
  });
  await t.test('foreign/none/missing parents and independent read/update scope combinations cannot enqueue or get private results',async()=>{
   const c=await cv('foreign');for(const actor of['own','department','assigned','none'])await assert.rejects(queue.enqueue(req(actor),c._id,input(c)),{code:'PROCESSING_PARENT_UNAVAILABLE'});
   const key='test_mixed_processing';await h.models.Role.create({key,name:key,permissions:[{resource:'candidate',action:'read',scope:'all'},{resource:'candidate',action:'update',scope:'own'}]});await h.models.User.updateOne({_id:h.actors.own._id},{role:key});try{await assert.rejects(queue.enqueue(req('own'),c._id,input(c)),{code:'PROCESSING_PARENT_UNAVAILABLE'});}finally{await h.models.User.updateOne({_id:h.actors.own._id},{role:'test_own'});}
   const job=await queue.enqueue(req('admin'),c._id,input(c));await assert.rejects(queue.get(req('own'),job.id),{code:'PROCESSING_PARENT_UNAVAILABLE'});await Jobs.updateOne({_id:job.id},{$set:{state:'cancelled'},$unset:{queueSlot:1,actorSlot:1}});
  });
  await t.test('client privilege fields, unsupported kinds and stale source identities are rejected',async()=>{
   const c=await cv();for(const data of[{...input(c),actorId:h.actors.admin._id.toString()},{...input(c),kind:'ocr'},{...input(c),kind:'ai'},{...input(c),expectedRevision:-1},{...input(c),expectedHash:'bad'}])await assert.rejects(queue.enqueue(req('own'),c._id,data),{code:'PROCESSING_INVALID_INPUT'});
   await assert.rejects(queue.enqueue(req('own'),c._id,{...input(c),expectedHash:'0'.repeat(64)}),{code:'PROCESSING_SOURCE_CHANGED'});
  });
  await t.test('concurrent equal contexts create one record; four actor slots enforce durable quota and terminal jobs release slots',async()=>{
   const c=await cv(),all=await Promise.all(Array.from({length:8},()=>queue.enqueue(req('own'),c._id,input(c))));assert.equal(new Set(all.map(j=>j.id)).size,1);
   const rows=[all[0]];for(let i=0;i<3;i++){const next=await cv();rows.push(await queue.enqueue(req('own'),next._id,input(next)));}
   const blocked=await cv();await assert.rejects(queue.enqueue(req('own'),blocked._id,input(blocked)),{code:'PROCESSING_QUEUE_FULL'});assert.equal(await Jobs.countDocuments({actorId:h.actors.own._id,actorSlot:{$exists:true}}),4);
   await Jobs.updateOne({_id:rows[0].id},{$set:{state:'cancelled'},$unset:{actorSlot:1,queueSlot:1}});assert.equal((await queue.enqueue(req('own'),blocked._id,input(blocked))).state,'queued');await Jobs.updateMany({state:'queued'},{$set:{state:'cancelled'},$unset:{actorSlot:1,queueSlot:1}});
  });
  await t.test('global slot uniqueness bounds the queue across actors instead of trusting count-then-insert',async()=>{
   const c=await cv(),fixed=createProcessing({enabled:true,slot:()=>0}),first=await fixed.enqueue(req('admin'),c._id,input(c)),other=await cv();await assert.rejects(fixed.enqueue(req('hr'),other._id,input(other)),{code:'PROCESSING_QUEUE_FULL'});assert.equal(await Jobs.countDocuments({queueSlot:0}),1);await Jobs.updateOne({_id:first.id},{$set:{state:'cancelled'},$unset:{actorSlot:1,queueSlot:1}});
  });
  await t.test('real DOCX parser persists only structured private review, phone/zero/unknown and requires HR approval',async()=>{
   const c=await cv(),before=await Candidate.findById(c._id).lean(),job=await queue.enqueue(req('own'),c._id,input(c));assert.equal((await queue.runOnce()).processed,1);
   const result=await queue.get(req('own'),job.id);assert.equal(result.state,'succeeded');assert.equal(result.code,'REVIEW_REQUIRED');assert.equal(result.result.requiresApproval,true);assert.equal(result.result.parsed.phone,'+994501234567');assert.equal(result.result.parsed.experience,0);assert.equal(result.result.parsed.rawText,undefined);assert.equal(result.result.parsed.sections,undefined);assert.equal(result.result.review.provider,'rule-based');assert.equal((await Jobs.findById(job.id).lean()).result,undefined);assert.deepEqual(await Candidate.findById(c._id).lean(),before);assert.equal(await Jobs.countDocuments({queueSlot:{$exists:true}}),0);
  });
  await t.test('same JWT-equivalent actor loses role, department or assignment before/during processing; no result can be read',async()=>{
   for(const kind of['role','department','assignment']){const c=await cv(),actor=kind==='department'?'department':'assigned',job=await queue.enqueue(req(actor),c._id,input(c));let release,entered;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
    const parser=require('../services/cvParser.service');const worker=createProcessing({enabled:true,parse:async(...args)=>{const output=await parser.parseCvResultFromBuffer(...args);entered();await gate;return output;}});
    const pending=worker.runOnce();await ready;
    if(kind==='role')await h.models.User.updateOne({_id:h.actors.assigned._id},{role:'test_none'});else if(kind==='department')await h.models.User.updateOne({_id:h.actors.department._id},{departmentId:'dep_B'});else await Candidate.updateOne({_id:c._id},{assignedTo:h.actors.foreign._id});
    release();await pending;const row=await Jobs.findById(job.id).select('+result').lean();assert.equal(row.state,'cancelled');assert.equal(row.code,'AUTH_REVOKED');assert.equal(row.result,undefined);await assert.rejects(queue.get(req(actor),job.id),{code:'PROCESSING_PARENT_UNAVAILABLE'});
    if(kind==='role')await h.models.User.updateOne({_id:h.actors.assigned._id},{role:'test_assigned'});else if(kind==='department')await h.models.User.updateOne({_id:h.actors.department._id},{departmentId:'dep_A'});
   }
  });
  await t.test('changed source/revision before worker cancels stale jobs and old success facts stay hidden after edit',async()=>{
   const c=await cv(),job=await queue.enqueue(req('own'),c._id,input(c));await Candidate.updateOne({_id:c._id},{$inc:{__v:1}});await queue.runOnce();assert.equal((await queue.get(req('own'),job.id)).state,'cancelled');
   const next=await cv(),success=await queue.enqueue(req('own'),next._id,input(next));await queue.runOnce();await Candidate.updateOne({_id:next._id},{$inc:{__v:1}});const data=await queue.get(req('own'),success.id);assert.equal(data.state,'succeeded');assert.equal(data.currentSource,false);assert.equal(data.result,undefined);
  });
  await t.test('scanned PDF is explicit blocked OCR; missing/hash-changed file cannot manufacture success',async()=>{
   const scan=await cv('own',await pdf(''),'.pdf'),job=await queue.enqueue(req('own'),scan._id,input(scan));await queue.runOnce();assert.equal((await queue.get(req('own'),job.id)).code,'OCR_REQUIRED');assert.equal((await queue.get(req('own'),job.id)).state,'blocked');
   const missing=await cv(),missingJob=await queue.enqueue(req('own'),missing._id,input(missing));await fs.unlink(owned.pop());await queue.runOnce();assert.equal((await queue.get(req('own'),missingJob.id)).code,'SOURCE_MISSING');
   const changed=await cv(),changedJob=await queue.enqueue(req('own'),changed._id,input(changed));await fs.writeFile(owned.at(-1),Buffer.from('different bytes'));await queue.runOnce();assert.equal((await queue.get(req('own'),changedJob.id)).code,'SOURCE_CHANGED');
  });
  await t.test('retry/deadline persists across worker recreation, raw errors never enter records and capacity recovers',async()=>{
   const c=await cv(),job=await queue.enqueue(req('own'),c._id,input(c));let clock=new Date(),attempts=0;
   const options={enabled:true,now:()=>clock,parse:async()=>{attempts++;throw Error('SYNTHETIC_PRIVATE_PROVIDER_PAYLOAD');}};
   for(let i=1;i<=3;i++){await createProcessing(options).runOnce();const row=await Jobs.findById(job.id).lean();assert.equal(row.attempts,i);assert.equal(row.state,i===3?'failed':'retry');assert.equal(JSON.stringify(row).includes('SYNTHETIC_PRIVATE'),false);clock=new Date(clock.getTime()+301000);}
   assert.equal(attempts,3);assert.equal((await Jobs.findById(job.id).lean()).queueSlot,undefined);
   const timeoutCV=await cv(),timeout=await queue.enqueue(req('own'),timeoutCV._id,input(timeoutCV));let release,entered;const ready=new Promise(resolve=>entered=resolve),ignored=createProcessing({enabled:true,timeoutMs:1000,parse:()=>new Promise(resolve=>{release=()=>resolve({parsed:null});entered();})});const pending=ignored.runOnce();await Promise.race([ready,pending.then(()=>{throw Error('Parser did not enter the deliberate timeout gate.');})]);await pending;assert.equal((await Jobs.findById(timeout.id).lean()).code,'PROCESSING_TIMEOUT');release();await new Promise(r=>setImmediate(r));
  });
  await t.test('oversized structured results are blocked, current read revocation withholds persisted private facts',async()=>{
   await Jobs.updateMany({state:{$in:['queued','retry']}},{$set:{state:'cancelled'},$unset:{actorSlot:1,queueSlot:1}});
   const c=await cv(),job=await queue.enqueue(req('own'),c._id,input(c));await createProcessing({enabled:true,parse:async()=>({parsed:{skills:['Food safety'],extraction:{version:'rules-2',provider:'rule-based',fields:{skills:{evidence:['x'.repeat(140000)]}}}}})}).runOnce();assert.equal((await queue.get(req('own'),job.id)).code,'RESULT_LIMIT');assert.equal((await Jobs.findById(job.id).select('+result').lean()).result,undefined);
   const next=await cv(),success=await queue.enqueue(req('own'),next._id,input(next));await queue.runOnce();const role=await h.models.Role.findOne({key:'test_own'}).lean();await h.models.Role.updateOne({key:'test_own'},{permissions:[]});try{await assert.rejects(queue.get(req('own'),success.id),{code:'PROCESSING_PARENT_UNAVAILABLE'});}finally{await h.models.Role.updateOne({key:'test_own'},{permissions:role.permissions});}
  });
  await t.test('expired lease can be recovered; exhausted crashed job releases slot and stale owner cannot overwrite new lease',async()=>{
   await Jobs.updateMany({state:{$in:['queued','retry']}},{$set:{state:'cancelled'},$unset:{actorSlot:1,queueSlot:1}});
   const c=await cv(),job=await queue.enqueue(req('own'),c._id,input(c));await Jobs.updateOne({_id:job.id},{$set:{state:'running',attempts:1,leaseToken:'expired',leaseUntil:new Date(0)}});await queue.runOnce();assert.equal((await queue.get(req('own'),job.id)).state,'succeeded');assert.equal((await queue.get(req('own'),job.id)).attempts,2);
   const last=await cv(),lastJob=await queue.enqueue(req('own'),last._id,input(last));await Jobs.updateOne({_id:lastJob.id},{$set:{state:'running',attempts:3,leaseToken:'expired',leaseUntil:new Date(0)}});await queue.runOnce();assert.equal((await queue.get(req('own'),lastJob.id)).code,'ATTEMPTS_EXHAUSTED');assert.equal((await Jobs.findById(lastJob.id).lean()).queueSlot,undefined);
   const next=await cv(),active=await queue.enqueue(req('own'),next._id,input(next));let entered,release;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r),parser=require('../services/cvParser.service');
   const worker=createProcessing({enabled:true,parse:async(...args)=>{const result=await parser.parseCvResultFromBuffer(...args);entered();await gate;return result;}}),pending=worker.runOnce();await ready;
   assert.deepEqual(await worker.runOnce(),{processed:0,busy:true});await Jobs.updateOne({_id:active.id},{$set:{leaseToken:'new-owner',state:'running'}});release();await pending;const current=await Jobs.findById(active.id).select('+leaseToken +result').lean();assert.equal(current.leaseToken,'new-owner');assert.equal(current.result,undefined);assert.equal(current.state,'running');
  });
 }finally{for(const file of owned)await fs.unlink(file);}
}));
