const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs/promises'),path=require('node:path');
const {withAuditFixture}=require('./helpers/auditFixture.cjs'),{docx}=require('./helpers/cvDocuments.cjs');
const Candidate=require('../models/candidate.model'),Jobs=require('../models/hrCvProcessingJob.model');
const {createProcessing}=require('../services/hrCvProcessing.service'),{createAiProcessing}=require('../services/hrCvAiProcessing.service');
const {createProvider}=require('../services/hrAiProvider.service'),{uploadsDir}=require('../middleware/privateUpload.middleware');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
test('Durable professional AI task profile preserves parse contracts, source authority and human-only decisions',async t=>withAuditFixture(async h=>{
 const owned=[],bytes=docx('Name: Private Synthetic Person\nPhone: +994501234567\nSkills\nFood safety\nExperience\n0 years');let calls=0,bodies=[];
 const env={HR_AI_PROVIDER:'openai',HR_AI_MODEL:'synthetic-model',OPENAI_API_KEY:'synthetic-test-only-not-a-real-key',HR_AI_CV_REVIEW_APPROVED:'true',HR_AI_DAILY_BUDGET_USD:'1',HR_AI_INPUT_USD_PER_MILLION:'1',HR_AI_OUTPUT_USD_PER_MILLION:'1'};
 const proposal={status:'suggested',proposals:[{field:'skills',value:'Food safety',evidenceIds:['e1'],reason:'Literal professional evidence.',confidence:null}],uncertainty:[]};
 const budget={async reserve(){return{async finish(){}};}},response=value=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)},finish_reason:'stop'}],usage:{prompt_tokens:20,completion_tokens:20}}),{headers:{'Content-Type':'application/json'}});
 const provider=createProvider({env,budget,testTransport:async(_url,options)=>{calls++;bodies.push(JSON.parse(options.body));return response(proposal);}});
 const req=actor=>({user:{id:String(h.actors[actor]._id)}}),input=c=>({kind:'ai-review',expectedRevision:c.__v??0,expectedHash:c.cvOriginal.sha256});
 async function cv(owner='own',extra={}){const filename='test-'+crypto.randomUUID()+'.docx',file=path.join(uploadsDir,filename);await fs.writeFile(file,bytes,{flag:'wx',mode:0o600});owned.push(file);
  return Candidate.create({name:'Private Synthetic Person',email:'private@example.invalid',phone:'+994501234567',role:'Cashier',status:'new',createdBy:h.actors[owner]._id,assignedTo:h.actors[owner==='own'?'assigned':owner]._id,departmentId:owner==='own'?'dep_A':'dep_B',cvUrl:'/uploads/'+filename,cvOriginal:{sha256:hash(bytes),size:bytes.length,mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'},cvReview:{version:'rules-2',provider:'rule-based',processingStatus:'extracted',fields:{skills:{source:'cv-text',evidence:['Food safety'],confidence:0.9}}},...extra});}
 for(const scope of ['own','department','assigned','none'])await h.models.Role.updateOne({key:'test_'+scope},{permissions:[{resource:'candidate',action:'read',scope},{resource:'candidate',action:'update',scope}]});
 const ai=createAiProcessing({enabled:true,provider}),parse=createProcessing({enabled:true});
 async function enqueue(c,actor='own',queue=ai){return queue.enqueue(req(actor),c._id,input(c));}
 try{
  await t.test('default disabled, server-only profile/version and exact DDL gate; no provider during enqueue',async()=>{
   const c=await cv();await assert.rejects(enqueue(c,'own',createAiProcessing()),{code:'PROCESSING_DISABLED'});await assert.rejects(enqueue(c),{code:'PROCESSING_QUEUE_NOT_READY'});assert.equal(calls,0);assert.equal(await Jobs.countDocuments(),0);await Jobs.createIndexes();
   assert.throws(()=>createProcessing({kind:'ai-review'}),{code:'PROCESSING_INVALID_CONFIG'});assert.throws(()=>createProcessing({kind:'ingestion',task:()=>{},taskVersion:'1'}),{code:'PROCESSING_INVALID_CONFIG'});
   await assert.rejects(parse.enqueue(req('own'),c._id,input(c)),{code:'PROCESSING_INVALID_INPUT'});
  });
  for(const actor of ['admin','hr','own','department','assigned'])await t.test(actor+' gets current scoped immutable professional AI proposal, never Candidate/Application mutation',async()=>{
   const c=await cv(),before=await Candidate.findById(c._id).lean(),job=await enqueue(c,actor),callCount=calls;assert.equal(job.kind,'ai-review');assert.equal(job.taskVersion,'ai-professional-1');assert.equal(job.state,'queued');assert.equal(calls,callCount);assert.equal((await enqueue(c,actor)).id,job.id);
   await ai.runOnce();const result=await ai.get(req(actor),job.id);assert.equal(result.state,'succeeded');assert.equal(result.result.requiresApproval,true);assert.equal(result.result.parserVersion,'ai-professional-1');assert.equal(result.result.reviewScope,'professional_evidence_only');assert.equal(result.result.proposal.provenance.mode,'mock_test_only');assert.equal(result.result.proposal.proposals[0].confidence,null);assert.deepEqual(await Candidate.findById(c._id).lean(),before);
   assert.equal((await Jobs.findById(job.id).lean()).result,undefined);for(const text of ['Private Synthetic','private@example','+994501234567','/uploads/','synthetic-test-only','hire','rawText','privateCvBlob'])assert.ok(!JSON.stringify(result).includes(text));
   const sent=bodies.at(-1);assert.deepEqual(JSON.parse(sent.messages[1].content),{version:'cv-professional-evidence-v1',facts:[{id:'e1',field:'skills',quote:'Food safety'}]});assert.deepEqual(sent.tools,[]);
  });
  await t.test('mixed scopes/foreign/no grants cannot reserve, inspect or receive provider facts',async()=>{
   const c=await cv('foreign'),before=calls;for(const actor of ['own','department','assigned','none','department_missing'])await assert.rejects(enqueue(c,actor),{code:'PROCESSING_PARENT_UNAVAILABLE'});
   await h.models.Role.updateOne({key:'test_own'},{permissions:[{resource:'candidate',action:'read',scope:'all'},{resource:'candidate',action:'update',scope:'own'}]});try{await assert.rejects(enqueue(c),{code:'PROCESSING_PARENT_UNAVAILABLE'});}finally{await h.models.Role.updateOne({key:'test_own'},{permissions:[{resource:'candidate',action:'read',scope:'own'},{resource:'candidate',action:'update',scope:'own'}]});}assert.equal(calls,before);
   const job=await enqueue(c,'admin');await ai.runOnce();await assert.rejects(ai.get(req('own'),job.id),{code:'PROCESSING_PARENT_UNAVAILABLE'});
  });
  await t.test('parse worker/list/get/retry cannot claim or expose AI job; profiles share bounded reservations',async()=>{
   const c=await cv(),job=await enqueue(c);const parsed=await parse.enqueue(req('own'),c._id,{...input(c),kind:'parse'});assert.equal(await Jobs.countDocuments({candidateId:c._id}),2);assert.equal((await parse.list(req('own'),c._id)).items[0].id,parsed.id);assert.equal((await ai.list(req('own'),c._id)).items[0].id,job.id);
   await assert.rejects(parse.get(req('own'),job.id),{code:'PROCESSING_PARENT_UNAVAILABLE'});await assert.rejects(ai.get(req('own'),parsed.id),{code:'PROCESSING_PARENT_UNAVAILABLE'});await parse.runOnce();assert.equal((await ai.get(req('own'),job.id)).state,'queued');assert.equal((await parse.get(req('own'),parsed.id)).state,'succeeded');await ai.runOnce();
   const reservations=[];for(let i=0;i<4;i++){const next=await cv();reservations.push(await(i%2?parse.enqueue(req('own'),next._id,{...input(next),kind:'parse'}):enqueue(next)));}await assert.rejects(enqueue(await cv()),{code:'PROCESSING_QUEUE_FULL'});assert.equal(await Jobs.countDocuments({actorId:h.actors.own._id,actorSlot:{$exists:true}}),4);await Jobs.updateMany({_id:{$in:reservations.map(j=>j.id)}},{$set:{state:'cancelled'},$unset:{queueSlot:1,actorSlot:1}});
  });
  await t.test('old task version cannot be claimed, read or adopted by a new worker profile',async()=>{
   const c=await cv(),job=await enqueue(c);await Jobs.updateOne({_id:job.id},{$set:{taskVersion:'obsolete-version'}});assert.equal((await ai.runOnce()).processed,0);await assert.rejects(ai.get(req('own'),job.id),{code:'PROCESSING_PARENT_UNAVAILABLE'});assert.equal((await ai.list(req('own'),c._id)).items.length,0);await Jobs.updateOne({_id:job.id},{$set:{state:'cancelled'},$unset:{queueSlot:1,actorSlot:1}});
  });
  await t.test('absent external approval/provider and missing evidence explicitly block; no static AI result',async()=>{
   for(const disabledEnv of [{}, {...env,HR_AI_CV_REVIEW_APPROVED:undefined}]){let sent=0;const queue=createAiProcessing({enabled:true,provider:createProvider({env:disabledEnv,budget,testTransport:()=>{sent++;return response(proposal);}})}),c=await cv(),job=await enqueue(c,'own',queue);await queue.runOnce();const result=await queue.get(req('own'),job.id);assert.equal(result.state,'blocked');assert.equal(result.code,'AI_NOT_CONFIGURED');assert.equal(result.result,undefined);assert.equal(sent,0);}
   const c=await cv('own',{cvReview:{version:'rules-2',provider:'rule-based',processingStatus:'unsupported_ocr'}}),job=await enqueue(c);await ai.runOnce();assert.equal((await ai.get(req('own'),job.id)).code,'AI_REVIEW_CONTEXT_REQUIRED');
  });
  await t.test('forged/bias/unsupported/provenance results block, are not persisted or retried as facts',async()=>{
   const good=await provider.suggestCv({version:'cv-professional-evidence-v1',facts:[{id:'e1',field:'skills',quote:'Food safety'}]},{actorId:String(h.actors.own._id)});
   for(const changed of [{...good,hire:true},{...good,requiresApproval:false},{...good,proposals:[{...good.proposals[0],value:'Female'}]},{...good,provenance:{...good.provenance,contextHash:'a'.repeat(64)}},{...good,provenance:{...good.provenance,token:'SECRET'}},{...good,provenance:{...good.provenance,mode:'mock'}}]){
    const queue=createAiProcessing({enabled:true,provider:{suggestCv:async()=>changed}}),job=await enqueue(await cv(),'own',queue);await queue.runOnce();const result=await queue.get(req('own'),job.id);assert.equal(result.state,'blocked');assert.equal(result.code,'RESULT_INVALID');assert.equal(result.result,undefined);assert.equal(result.attempts,1);
   }
  });
  await t.test('role/assignment changes during original IO prevent even the provider call',async()=>{
   for(const actor of ['own','assigned']){const c=await cv();let entered,release;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);const queue=createAiProcessing({enabled:true,provider,read:async()=>{entered();await gate;return bytes;}}),job=await enqueue(c,actor,queue),before=calls,pending=queue.runOnce();await ready;
    if(actor==='own')await h.models.User.updateOne({_id:h.actors.own._id},{role:'test_none'});else await Candidate.updateOne({_id:c._id},{assignedTo:h.actors.foreign._id});release();await pending;assert.equal(calls,before);const saved=await Jobs.findById(job.id).select('+result').lean();assert.equal(saved.state,'cancelled');assert.equal(saved.code,'AUTH_REVOKED');assert.equal(saved.result,undefined);if(actor==='own')await h.models.User.updateOne({_id:h.actors.own._id},{role:'test_own'});
   }
  });
  await t.test('source update during provider wait never publishes result; old success is hidden after later edit',async()=>{
   const c=await cv();let entered,release;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);const queue=createAiProcessing({enabled:true,provider:{suggestCv:async(...args)=>{const r=await provider.suggestCv(...args);entered();await gate;return r;}}}),job=await enqueue(c,'own',queue),pending=queue.runOnce();await ready;await Candidate.updateOne({_id:c._id},{name:'Concurrent edit'});release();await pending;const saved=await Jobs.findById(job.id).select('+result').lean();assert.equal(saved.code,'SOURCE_CHANGED');assert.equal(saved.result,undefined);
   const next=await cv(),success=await enqueue(next);await ai.runOnce();await Candidate.updateOne({_id:next._id},{$inc:{__v:1}});const stale=await ai.get(req('own'),success.id);assert.equal(stale.currentSource,false);assert.equal(stale.result,undefined);
  });
  await t.test('outage retry, deadline and bounded lifetime survive recreation without raw private error persistence',async()=>{
   const c=await cv();let clock=new Date(),count=0;const options={enabled:true,now:()=>clock,provider:{suggestCv:async()=>{count++;throw Error('PRIVATE_PROVIDER_BODY_TOKEN');}}},queue=createAiProcessing(options),job=await enqueue(c,'own',queue);
   for(let i=1;i<=3;i++){await createAiProcessing(options).runOnce();const row=await Jobs.findById(job.id).lean();assert.equal(row.attempts,i);assert.equal(row.state,i===3?'failed':'retry');assert.ok(!JSON.stringify(row).includes('PRIVATE_PROVIDER'));clock=new Date(clock.getTime()+301000);}assert.equal(count,3);assert.equal((await Jobs.findById(job.id).lean()).queueSlot,undefined);
   let release;const ignored=createAiProcessing({enabled:true,timeoutMs:1000,provider:{suggestCv:()=>new Promise(resolve=>release=()=>resolve({}))}}),timeoutJob=await enqueue(await cv(),'own',ignored);await ignored.runOnce();assert.equal((await ignored.get(req('own'),timeoutJob.id)).code,'PROCESSING_TIMEOUT');release();await new Promise(r=>setImmediate(r));
  });
 }finally{for(const file of owned)await fs.unlink(file);}
}));
