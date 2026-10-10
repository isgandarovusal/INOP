const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const Candidate=require('../models/candidate.model'),Job=require('../models/job.model'),Application=require('../models/application.model');
const email=require('../services/email.service'),{createNotificationWorker}=require('../services/applicationNotificationWorker.service');
test('Notification manual retry preserves independent current scopes, workflow and bounded audit/CAS identity',async t=>withAuditFixture(async h=>{
 const config=email.getSmtpConfig;email.getSmtpConfig=()=>({host:'smtp.example.invalid'});
 for(const scope of ['own','department','assigned','none'])await h.models.Role.updateOne({key:'test_'+scope},{$set:{permissions:['application','candidate','recruitment'].map(resource=>({resource,action:'*',scope}))}});
 async function row(extra={}){const provenance={createdBy:h.actors.own._id,assignedTo:h.actors.assigned._id,departmentId:'dep_A'},candidate=await Candidate.create({name:'Synthetic Applicant',role:'Cashier',email:'synthetic@example.invalid',...provenance}),job=await Job.create({title:'Synthetic vacancy',department:'Operations',description:'Synthetic cashier duties',...provenance});
  return Application.create({jobId:job._id,candidateId:candidate._id,...provenance,status:'Interview',events:[{id:crypto.randomUUID(),actor:h.actors.own._id.toString(),type:'status',at:new Date(),revision:0,before:{status:'Shortlisted'},after:{status:'Interview'},delivery:{state:'failed',attempts:3,code:'DELIVERY_FAILED'}}],...extra});}
 const route=(r,eventId=r.events[0].id)=>`/applications/${r._id}/notifications/${eventId}/retry`;
 const body=(revision=0)=>({expectedRevision:revision,reason:'HR verified manual retry',commandId:crypto.randomUUID()});
 try{
  for(const actor of ['admin','hr','own','department','assigned'])await t.test(actor+' legal retry persists one audit event without a status/score decision or SMTP send',async()=>{
   const app=await row(),before=await Application.findById(app._id).lean(),command=body();const r=await h.request(actor,'POST',route(app),command);assert.equal(r.status,200);assert.equal(r.data.delivery.state,'pending');assert.equal(r.data.delivery.attempts,0);assert.equal(r.data.delivery.priorAttempts,3);assert.equal(r.data.delivery.retryCount,1);
   const current=await Application.findById(app._id).lean();assert.equal(current.__v,1);assert.equal(current.status,before.status);assert.deepEqual(current.interview,before.interview);assert.deepEqual(current.matching,before.matching);assert.equal(current.stageEnteredAt.getTime(),before.stageEnteredAt.getTime());assert.equal(current.events.length,2);assert.equal(current.events[0].actor,before.events[0].actor);assert.equal(current.events[0].delivery.retryActor,String(h.actors[actor]._id));assert.equal(current.events[1].type,'notification_retry');assert.equal(current.events[1].actor,String(h.actors[actor]._id));assert.equal(current.events[1].reason,command.reason);
   const replay=await h.request(actor,'POST',route(app),command);assert.equal(replay.status,200);assert.equal(replay.data.replayed,true);assert.equal((await Application.findById(app._id).lean()).events.length,2);
   const history=await h.request(actor,'GET',`/applications/${app._id}/history`);assert.equal(history.status,200);assert.equal(JSON.stringify(history.data).includes('retryActor'),false);assert.equal(JSON.stringify(history.data).includes('commandHash'),false);assert.equal(history.data.items.find(e=>e.delivery).delivery.retryCount,1);
   await Application.updateOne({_id:app._id},{$set:{'events.0.delivery.state':'sent'}}); // owned fixture: isolate later worker tests
  });
  for(const actor of ['none','anonymous','foreign'])await t.test(actor+' cannot retry another resource or read protected parents',async()=>{
   const app=await row(),before=await Application.findById(app._id).lean();const r=await h.request(actor,'POST',route(app),body());assert.equal(r.status,actor==='anonymous'?401:actor==='none'?403:404);assert.deepEqual(await Application.findById(app._id).lean(),before);
  });
  await t.test('independent read/all does not overwrite update/own or denied Candidate/Job parents',async()=>{
   const key='test_mixed_retry',actor=h.actors.foreign._id;
   for(const permissions of [
    [{resource:'application',action:'read',scope:'all'},{resource:'application',action:'update',scope:'own'},{resource:'candidate',action:'read',scope:'all'},{resource:'recruitment',action:'read',scope:'all'}],
    [{resource:'application',action:'read',scope:'own'},{resource:'application',action:'update',scope:'all'},{resource:'candidate',action:'read',scope:'all'},{resource:'recruitment',action:'read',scope:'all'}],
    [{resource:'application',action:'*',scope:'all'},{resource:'candidate',action:'read',scope:'own'},{resource:'recruitment',action:'read',scope:'all'}],
    [{resource:'application',action:'*',scope:'all'},{resource:'candidate',action:'read',scope:'all'},{resource:'recruitment',action:'read',scope:'own'}],
   ]){await h.models.Role.updateOne({key},{$set:{name:key,isActive:true,permissions}},{upsert:true});await h.models.User.updateOne({_id:actor},{role:key});const app=await row();assert.equal((await h.request('foreign','POST',route(app),body())).status,404);assert.equal((await Application.findById(app._id).lean()).events.length,1);}
   await h.models.User.updateOne({_id:actor},{role:'test_own'});
  });
  await t.test('revision/command conflicts and concurrent retry are 409, one writer and one audit event',async()=>{
   const app=await row();assert.equal((await h.request('admin','POST',route(app),body(7))).status,409);
   const command=body(),results=await Promise.all([h.request('admin','POST',route(app),command),h.request('admin','POST',route(app),body())]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal((await Application.findById(app._id).lean()).events.length,2);
   const winner=results[0].status===200?command:null;if(winner){const changed=await h.request('admin','POST',route(app),{...winner,reason:'different'});assert.equal(changed.status,409);}
   await Application.updateOne({_id:app._id},{$set:{'events.0.delivery.state':'sent'}});
  });
  await t.test('unknown body privilege fields, missing reason, bad IDs and negative revision return 400',async()=>{
   const app=await row();for(const command of [{...body(),role:'admin'},{...body(),retryActor:h.actors.admin._id.toString()},{...body(),reason:''},{...body(),expectedRevision:-1},{...body(),commandId:'invalid'}])assert.equal((await h.request('admin','POST',route(app),command)).status,400);
   assert.equal((await h.request('admin','POST',route(app,crypto.randomUUID()),body())).status,404);
  });
  await t.test('SMTP unavailable is 503 and leaves the primary Application/reason/history unchanged',async()=>{
   const app=await row(),before=await Application.findById(app._id).lean();email.getSmtpConfig=()=>null;try{const r=await h.request('admin','POST',route(app),body());assert.equal(r.status,503);assert.equal(r.data.code,'SMTP_NOT_CONFIGURED');assert.deepEqual(await Application.findById(app._id).lean(),before);}finally{email.getSmtpConfig=()=>({host:'smtp.example.invalid'});}
  });
  await t.test('sent/running/pending/skipped, exhausted manual retries and stale/cancelled workflows cannot be resent',async()=>{
   for(const state of ['sent','running','pending','skipped']){const app=await row();await Application.updateOne({_id:app._id},{'events.0.delivery.state':state});assert.equal((await h.request('admin','POST',route(app),body())).status,409);}
   for(const change of [{'events.0.delivery.retryCount':3},{status:'Hired'},{substatus:'cancelled'},{interview:{result:'cancelled'}},{'events.0.delivery.attempts':'bad'}]){const app=await row();await Application.updateOne({_id:app._id},{$set:change});assert.equal((await h.request('admin','POST',route(app),body())).status,409);}
  });
  await t.test('revoked current grant during parent lookup denies enqueue without a write',async()=>{
   const app=await row(),before=await Application.findById(app._id).lean(),exists=Candidate.exists,permissions=(await h.models.Role.findOne({key:'test_assigned'}).lean()).permissions;let n=0;
   Candidate.exists=function(...args){const query=exists.apply(this,args),exec=query.exec;query.exec=async function(...values){const result=await exec.apply(this,values);if(++n===2)await h.models.Role.updateOne({key:'test_assigned'},{permissions:[]});return result;};return query;};
   try{const r=await h.request('assigned','POST',route(app),body());assert.equal(r.status,403);assert.deepEqual(await Application.findById(app._id).lean(),before);}finally{Candidate.exists=exists;await h.models.Role.updateOne({key:'test_assigned'},{permissions});}
  });
  await t.test('worker claim without revision change cannot be overwritten by retry CAS',async()=>{
   const app=await row(),update=Application.updateOne;let intercepted=false;
   Application.updateOne=function(filter,values,...rest){if(values.$set?.events&&!intercepted){intercepted=true;const query=update.call(this,filter,values,...rest),exec=query.exec;query.exec=async function(...args){await update.call(Application,{_id:app._id},{$set:{'events.0.delivery.state':'running','events.0.delivery.token':'owned-fixture-lease'}});return exec.apply(this,args);};return query;}return update.call(this,filter,values,...rest);};
   try{const r=await h.request('admin','POST',route(app),body());assert.equal(r.status,409);const current=await Application.findById(app._id).lean();assert.equal(current.__v,0);assert.equal(current.events.length,1);assert.equal(current.events[0].delivery.state,'running');assert.equal(current.events[0].delivery.token,'owned-fixture-lease');}finally{Application.updateOne=update;}
  });
  await t.test('retry worker uses current authorized retry actor, preserves cumulative counters and keeps original actor/history',async()=>{
   // Block other owned pending/failed fixtures so only this notification can be claimed.
   await Application.updateMany({},{$set:{'events.$[].delivery.state':'sent'}});
   const app=await row();assert.equal((await h.request('admin','POST',route(app),body())).status,200);
   await h.models.User.updateOne({_id:h.actors.own._id},{role:'test_none'});let sends=0;
   const worker=createNotificationWorker({available:()=>true,send:async input=>{sends++;assert.equal(input.actor.id,String(h.actors.admin._id));assert.match(input.messageId,new RegExp(app.events[0].id));return{sent:true};}});
   await worker.runOnce(1);assert.equal(sends,1);const current=await Application.findById(app._id).lean();assert.equal(current.events[0].delivery.state,'sent');assert.equal(current.events[0].delivery.retryCount,1);assert.equal(current.events[0].delivery.priorAttempts,3);assert.equal(current.events[0].delivery.attempts,1);assert.equal(current.events[0].actor,String(h.actors.own._id));assert.equal(current.events[1].actor,String(h.actors.admin._id));await h.models.User.updateOne({_id:h.actors.own._id},{role:'test_own'});
  });
  await t.test('retry actor revocation before send cannot fall back to the original authorized actor',async()=>{
   await Application.updateMany({},{$set:{'events.$[].delivery.state':'sent'}});const app=await row();assert.equal((await h.request('admin','POST',route(app),body())).status,200);
   await h.models.User.updateOne({_id:h.actors.admin._id},{role:'test_none'});let sends=0;
   try{await createNotificationWorker({available:()=>true,send:async()=>{sends++;return{sent:true};}}).runOnce(1);const current=await Application.findById(app._id).lean();assert.equal(sends,0);assert.equal(current.events[0].delivery.state,'skipped');assert.equal(current.events[0].delivery.code,'AUTH_REVOKED');assert.equal(current.events[0].delivery.retryCount,1);}finally{await h.models.User.updateOne({_id:h.actors.admin._id},{role:'admin'});}
  });

 }finally{email.getSmtpConfig=config;}
}));
