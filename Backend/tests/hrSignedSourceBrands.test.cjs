const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {withAuditFixture}=require('./helpers/auditFixture.cjs'),{docx}=require('./helpers/cvDocuments.cjs');
const {createSignedSource,signature}=require('../services/hrSignedSource.service');
const {createActorContext}=require('../services/hrBackgroundActor.service'),{createIntake}=require('../services/hrCvIntake.service');
const Job=require('../models/job.model'),Candidate=require('../models/candidate.model'),Application=require('../models/application.model');
const Source=require('../models/hrCvIntake.model'),Receipt=require('../models/hrExternalReceipt.model'),Rate=require('../models/hrExternalRate.model');

test('Two first-party sources resolve only their canonical brands and keep every other case in explicit HR review',async t=>withAuditFixture(async h=>{
 await h.models.Role.updateOne({key:'test_own'},{permissions:['candidate','application','recruitment'].map(resource=>({resource,action:'*',scope:'own'}))});
 await Promise.all([Source.createIndexes(),Receipt.createIndexes(),Rate.createIndexes(),Application.createIndexes()]);
 const owner={createdBy:h.actors.own._id,assignedTo:h.actors.own._id,departmentId:'dep_A'};
 const makeJob=(title,brandId)=>Job.create({...owner,title,brandId,description:'Synthetic duties',department:'HR',status:'Open'});
 const kfc=await makeJob('KFC fixture','kfc'),pizza=await makeJob('Pizza Hut fixture','pizza-hut');
 const unbranded=await makeJob('Unbranded fixture',null),shared=await makeJob('Shared vacancy without a single brand',null),foreign=await makeJob('Foreign KFC fixture','kfc');
 await Job.updateOne({_id:foreign._id},{createdBy:h.actors.foreign._id});
 const sources=['kfc','pizzahut'].map(key=>({key,id:crypto.randomUUID(),secret:'synthetic-only-'+crypto.randomBytes(24).toString('hex'),noticeVersion:'synthetic-notice',mappings:[
  {reference:'KFC_ONLY',jobId:String(kfc._id)},{reference:'PIZZA_ONLY',jobId:String(pizza._id)},
  {reference:'UNBRANDED',jobId:String(unbranded._id)},{reference:'SHARED',jobId:String(shared._id)},
  {reference:'AMBIGUOUS',jobId:String(kfc._id)},{reference:'AMBIGUOUS',jobId:String(pizza._id)},
  {reference:'MISSING',jobId:String(new h.mongoose.Types.ObjectId())},{reference:'FOREIGN',jobId:String(foreign._id)},
 ]}));
 const objects=new Map(),bytes=docx('Name: Synthetic branded applicant\nSkills\nFood safety');let puts=0,scans=0,scanUnavailable=false,ip=0;
 const scanner={scan:async(_b,c)=>{scans++;assert.equal(crypto.createHash('sha256').update(_b).digest('hex'),c.sha256);if(scanUnavailable)throw Error('Synthetic unavailable');return{verdict:'clean',sha256:c.sha256,engine:'synthetic-only',version:'1'};}};
 const intake=createIntake({enabled:true,evidenceMode:'test',scanner,scanBeforePersistence:true,store:{
  get:async b=>{if(!objects.has(b.key))throw Object.assign(Error('Synthetic absent'),{code:'STORAGE_NOT_FOUND'});return Buffer.from(objects.get(b.key));},
  put:async(b,v)=>{puts++;objects.set(b.key,Buffer.from(v));},
 }}),context=createActorContext({enabled:true,actorId:String(h.actors.own._id),approvalRecorded:true});
 const receiver=createSignedSource({enabled:true,evidenceMode:'test',sources,context,intake,scanner,privacyApproved:true,sourceOwnershipApproved:true});
 const envelope=(source,reference,commandId=crypto.randomUUID())=>{
  const rawBody=Buffer.from(JSON.stringify({file:{name:'synthetic.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',contentBase64:bytes.toString('base64')},consent:{accepted:true,noticeVersion:source.noticeVersion},vacancyReference:reference})),timestamp=String(Date.now());
  return{sourceId:source.id,commandId,timestamp,rawBody,signature:signature(source.secret,source.id,timestamp,commandId,rawBody)};
 };
 const receive=e=>receiver.receive(e,'203.0.113.'+(++ip));
 const receipt=async e=>Receipt.findOne({identityHash:crypto.createHash('sha256').update(JSON.stringify(['external-source-1',e.sourceId,e.commandId])).digest('hex')}).select('+origin +sourceId');
 const saved=[];
 for(const [key,reference,job,reason]of [
  ['kfc','KFC_ONLY',kfc,'exact_approved_mapping'],['pizzahut','PIZZA_ONLY',pizza,'exact_approved_mapping'],
  ['kfc','PIZZA_ONLY',null,'unavailable'],['pizzahut','KFC_ONLY',null,'unavailable'],
  ['kfc','UNKNOWN',null,'unmatched'],['pizzahut','MISSING',null,'unavailable'],
  ['kfc','UNBRANDED',null,'unavailable'],['pizzahut','SHARED',null,'unavailable'],
  ['kfc','AMBIGUOUS',null,'ambiguous'],['pizzahut','AMBIGUOUS',null,'ambiguous'],['kfc','FOREIGN',null,'unavailable'],
 ])await t.test(key+' '+reference,async()=>{
  const e=envelope(sources.find(s=>s.key===key),reference),scansBefore=scans;let jobsRead=0;h.mongoose.set('debug',(c,m)=>{if(c==='jobs'&&m==='findOne')jobsRead++;});
  try {assert.equal((await receive(e)).accepted,true);}finally{h.mongoose.set('debug',false);}
  assert.equal(jobsRead,['UNKNOWN','AMBIGUOUS'].includes(reference)?0:1,'Mapping keeps its existing single scoped Job read');
  const r=await receipt(e);await intake.runOnce(1);assert.equal(scans-scansBefore,3,'Relay, pre-storage admission and durable worker each require a hash-bound scan');assert.equal(r.origin.key,key);assert.equal(r.origin.matchReason,reason);assert.equal(r.origin.jobId,job?String(job._id):undefined);
  const row=await intake.get(context.request(),r.sourceId);assert.equal(row.state,'ready');assert.equal(row.origin.requiresJobReview,true);assert.equal(row.origin.suggestedJobId,job?String(job._id):undefined);
  assert.equal(await Candidate.countDocuments(),0);assert.equal(await Application.countDocuments(),0);saved.push({e,r,row});
 });
 await t.test('Same command replay does not duplicate storage, Source, Candidate or Application',async()=>{
  const before=await Source.countDocuments(),writes=puts;
  assert.equal((await receive(saved[0].e)).replayed,true);assert.equal(await Source.countDocuments(),before);assert.equal(puts,writes);
  assert.equal(await Candidate.countDocuments(),0);assert.equal(await Application.countDocuments(),0);
 });
 await t.test('Source identity/signature cannot be switched between brands',async()=>{
  const e=envelope(sources[0],'KFC_ONLY'),writes=puts;
  await assert.rejects(receive({...e,signature:'0'.repeat(64)}),{code:'EXTERNAL_SIGNATURE_INVALID'});
  await assert.rejects(receive({...e,sourceId:sources[1].id}),{code:'EXTERNAL_SIGNATURE_INVALID'});assert.equal(puts,writes);
 });
 await t.test('Unavailable scanner creates no original, Candidate or Application',async()=>{
  scanUnavailable=true;const writes=puts,before=await Source.countDocuments();
  try{await assert.rejects(receive(envelope(sources[0],'KFC_ONLY')),{code:'EXTERNAL_PROVIDER_UNAVAILABLE'});}finally{scanUnavailable=false;}
  assert.equal(puts,writes);assert.equal(await Source.countDocuments(),before);assert.equal(await Candidate.countDocuments(),0);assert.equal(await Application.countDocuments(),0);
 });
 await t.test('Changed brand invalidates a previously recorded suggestion without rewriting provenance',async()=>{
  await Job.updateOne({_id:kfc._id},{brandId:'pizza-hut'});
  try{const row=await intake.get(context.request(),saved[0].r.sourceId);assert.equal(row.origin.suggestedJobId,undefined);assert.equal(row.origin.matchReason,'unavailable');const r=await receipt(saved[0].e);assert.equal(r.origin.jobId,String(kfc._id));}
  finally{await Job.updateOne({_id:kfc._id},{brandId:'kfc'});}
 });
 await t.test('Both signed brands complete explicit approval, deterministic matching, human stages and scoped analytics',async()=>{
  const approved=[],measurements=[];
  const measured=async(label,work)=>{const operations={};h.mongoose.set('debug',(collection,method)=>{const key=collection+'.'+method;operations[key]=(operations[key]||0)+1;});const start=performance.now();try{return await work();}finally{h.mongoose.set('debug',false);measurements.push({label,elapsedMs:Math.round((performance.now()-start)*100)/100,operations});}};
  for(const [index,job,key]of [[0,kfc,'kfc'],[1,pizza,'pizzahut']]){
   await Job.updateOne({_id:job._id},{$set:{requiredSkills:['Food safety']}});
   const row=await intake.get(context.request(),saved[index].r.sourceId),input={confirmed:true,expectedHash:row.original.sha256,expectedUpdatedAt:row.updatedAt.toISOString(),profile:{name:'Synthetic approved '+key+' applicant',role:'Cashier',skills:['Food safety'],certificates:['Synthetic food safety certificate']},jobId:String(job._id)};
   await assert.rejects(intake.approve(context.request(),row.id,{...input,confirmed:false}),{status:400});
   assert.equal(await Candidate.countDocuments(),approved.length);assert.equal(await Application.countDocuments(),approved.length);
   const result=await intake.approve(context.request(),row.id,input);assert.deepEqual(await intake.approve(context.request(),row.id,input),result);
   const candidate=await Candidate.findById(result.candidateId),app=await Application.findById(result.applicationId);
   assert.equal(String(app.jobId),String(job._id));assert.equal(app.source.key,key);assert.equal(app.source.verification,'approved_source');assert.equal(app.status,'Applied');assert.equal(candidate.status,'new');assert.equal(candidate.cvReview.reviewStatus,'confirmed');
   assert.equal(app.matching.version,'ats-v2');assert.equal(app.scoreStatus,'calculated');assert.equal(app.score,100);
   const again=require('../services/applicationMatch.service').calculateApplicationMatch(await Job.findById(job._id).lean(),candidate.toObject(),{application:app.toObject()});assert.equal(again.score,app.score);assert.equal(again.jobHash,app.matching.jobHash);assert.equal(again.candidateHash,app.matching.candidateHash);
   const search=await measured(key+' reviewed search',()=>h.request('own','GET','/hr/v2/candidates?'+new URLSearchParams({skills:JSON.stringify(['Food safety']),certificates:JSON.stringify(['Synthetic food safety certificate']),q:key,pageSize:'1'})));
   assert.equal(search.status,200);assert.equal(search.data.total,1);assert.equal(search.data.items.length,1);assert.equal(String(search.data.items[0]._id),result.candidateId);
   let revision=app.__v;
   for(const status of ['Screening','Shortlisted','Interview','Offered','Hired']){
    const update=await h.request('own','PATCH','/applications/'+app._id+'/status',{status,expectedRevision:revision,reason:'Synthetic explicit HR decision'});assert.equal(update.status,200);revision=update.data.__v;
    if(status==='Interview'){
     let workflow=await h.request('own','PATCH','/applications/'+app._id+'/workflow',{expectedRevision:revision,substatus:'scheduled',interview:{localStart:'2026-11-10T10:30',timezone:'Asia/Baku',durationMinutes:30,interviewerId:String(h.actors.own._id),result:'pending'},reason:'Synthetic explicit HR scheduling'});assert.equal(workflow.status,200);revision=workflow.data.__v;assert.equal(workflow.data.interview.startsAt,'2026-11-10T06:30:00.000Z');
     workflow=await h.request('own','PATCH','/applications/'+app._id+'/workflow',{expectedRevision:revision,substatus:'completed',interview:{result:'passed'},reason:'Synthetic explicit HR interview result'});assert.equal(workflow.status,200);revision=workflow.data.__v;assert.equal(workflow.data.interview.result,'passed');assert.equal(workflow.data.interview.startsAt,'2026-11-10T06:30:00.000Z');
    }
   }
   const history=await h.request('own','GET','/applications/'+app._id+'/history');assert.equal(history.status,200);assert.equal(history.data.total,8);assert.ok(history.data.items.every(e=>e.actor===String(h.actors.own._id)));
   assert.equal((await Candidate.findById(candidate._id)).status,'new','Candidate status remains independent of Application hiring stage');
   assert.equal((await h.request('foreign','GET','/applications/'+app._id)).status,404);assert.equal((await h.request('foreign','GET','/candidates/'+candidate._id)).status,404);
   assert.equal((await receive(saved[index].e)).replayed,true);assert.deepEqual(await intake.approve(context.request(),row.id,input),result);assert.equal((await Application.findById(app._id)).status,'Hired','Approval replay cannot overwrite later HR decisions');approved.push(result);
  }
  assert.notEqual(approved[0].candidateId,approved[1].candidateId);assert.notEqual(approved[0].applicationId,approved[1].applicationId);
  assert.equal(await Candidate.countDocuments(),2);assert.equal(await Application.countDocuments(),2);
  for(const [actor,brand,count]of [['own','kfc',1],['own','pizza-hut',1],['own','',2],['foreign','',0]]){
   const response=await measured(actor+' analytics '+(brand||'all'),()=>h.request(actor,'GET','/hr/analytics/overview'+(brand?'?brandId='+brand:'')));assert.equal(response.status,200);assert.equal(response.data.totals.applications,count);assert.equal(response.data.funnel.find(v=>v.status==='Hired').count,count);
   assert.ok(!JSON.stringify(response.data).includes('Synthetic approved'));
  }
  console.log(JSON.stringify({syntheticOnly:true,measurements}));
 });
}));
