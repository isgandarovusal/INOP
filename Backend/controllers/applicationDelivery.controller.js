const crypto = require('node:crypto'),mongoose = require('mongoose');
const Application = require('../models/application.model'),Candidate = require('../models/candidate.model'),Job = require('../models/job.model');
const { resourceFilter } = require('../services/hrResourceScope.service');
const { verifyToken,getRolePermissions } = require('../middleware/auth.middleware');
const email = require('../services/email.service');
const fail = (code,status,message) => Object.assign(new Error(message),{code,status});
const query = req => ({$and:[{_id:req.params.id},resourceFilter(req,'application'),resourceFilter(req,'application','update')]});
const authority = req => JSON.stringify([req.user.id,req.user.role,req.user.departmentId,req.authRole.permissions]);
const projection = value => Object.fromEntries(['state','attempts','priorAttempts','retryCount','code','at','sentAt','nextAttemptAt'].filter(k=>value[k]!==undefined).map(k=>[k,value[k]]));
exports.retry = async(req,res,next) => {
 res.set('Cache-Control','private, no-store');
 try {
  const body=req.body;
  if(!mongoose.isObjectIdOrHexString(req.params.id)||!/^[a-f0-9-]{36}$/.test(req.params.eventId)||!body||Object.keys(body).some(k=>!['expectedRevision','commandId','reason'].includes(k))||!Number.isInteger(body.expectedRevision)||body.expectedRevision<0||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(body.commandId||'')||typeof body.reason!=='string'||!body.reason.trim()||body.reason.length>500)throw fail('INVALID_DELIVERY_COMMAND',400,'A revision, command identity and reason are required.');
  const initial=authority(req),commandHash=crypto.createHash('sha256').update(JSON.stringify([req.params.eventId,body.expectedRevision,body.reason.trim()])).digest('hex');
  const row=await Application.findOne(query(req)).select('events __v status substatus interview jobId candidateId').maxTimeMS(1000).lean();
  if(!row)throw fail('DELIVERY_PARENT_UNAVAILABLE',404,'Application not found or unavailable.');
  const parents=async()=>{
   const [candidate,job]=await Promise.all([Candidate.exists({$and:[{_id:row.candidateId},resourceFilter(req,'candidate')]}).maxTimeMS(1000),Job.exists({$and:[{_id:row.jobId},resourceFilter(req,'recruitment')]}).maxTimeMS(1000)]);
   if(!candidate||!job)throw fail('DELIVERY_PARENT_UNAVAILABLE',404,'Application not found or unavailable.');
  };
  const refresh=async()=>{
   await verifyToken(req,res,()=>{});if(res.headersSent||res.destroyed)return false;
   req.authRole={permissions:await getRolePermissions(req.user.role)};
   if(authority(req)!==initial)throw fail('DELIVERY_AUTHORIZATION_CHANGED',403,'Authorization changed. Reload the current profile.');
   return true;
  };
  await parents();if(!await refresh())return;
  const replay=row.events?.find(e=>e.commandId===body.commandId);
  if(replay){if(replay.type!=='notification_retry'||replay.commandHash!==commandHash||String(replay.actor)!==req.user.id)throw fail('COMMAND_CONFLICT',409,'Command identity already used.');
   const event=row.events.find(e=>e.id===req.params.eventId);return res.json({revision:row.__v||0,eventId:req.params.eventId,delivery:projection(event?.delivery||{}),replayed:true});}
  if(body.expectedRevision!==(row.__v||0))throw fail('REVISION_CONFLICT',409,'Application changed. Reload before retrying.');
  const event=row.events?.find(e=>e.id===req.params.eventId),delivery=event?.delivery;
  if(!event||!delivery)throw fail('DELIVERY_EVENT_UNAVAILABLE',404,'Notification event not found.');
  const latest=[...(row.events||[])].reverse().find(e=>e.delivery&&e.after?.status===row.status);
  if(!['status','workflow'].includes(event.type)||!['Interview','Offered'].includes(row.status)||event.after?.status!==row.status||latest?.id!==event.id||['cancelled','declined'].includes(row.substatus)||(row.status==='Interview'&&row.interview?.result==='cancelled'))throw fail('STALE_DELIVERY',409,'Notification no longer matches the current workflow.');
  if (![delivery.attempts,delivery.retryCount ?? 0,delivery.priorAttempts ?? 0].every(n=>Number.isInteger(n)&&n>=0) || delivery.attempts>3 || (delivery.retryCount ?? 0)>3 || (delivery.priorAttempts ?? 0)>9) throw fail('DELIVERY_NOT_RETRYABLE',409,'Notification counters are unavailable.');
  if(!['failed','blocked'].includes(delivery.state)||Number(delivery.retryCount||0)>=3)throw fail('DELIVERY_NOT_RETRYABLE',409,'Notification cannot be retried.');
  if(!email.getSmtpConfig())throw fail('SMTP_NOT_CONFIGURED',503,'Email is unavailable. Workflow remains unchanged.');
  const nextDelivery={state:'pending',attempts:0,priorAttempts:Number(delivery.priorAttempts||0)+Number(delivery.attempts||0),retryCount:Number(delivery.retryCount||0)+1,retryActor:req.user.id,code:'RETRY_QUEUED',at:new Date()};
  const revision=(row.__v||0)+1,retryEvent={id:crypto.randomUUID(),type:'notification_retry',actor:req.user.id,at:new Date(),revision,before:{deliveryState:delivery.state,eventId:event.id},after:{deliveryState:'pending',eventId:event.id},reason:body.reason.trim(),commandId:body.commandId,commandHash};
  const events=row.events.map(e=>e.id===event.id?{...e,delivery:nextDelivery}:e).concat(retryEvent);
  if(events.length>1000||mongoose.mongo.BSON.calculateObjectSize({...row,events})>8*1024*1024)throw fail('HISTORY_LIMIT',409,'History needs archiving.');
  await parents();if(!await refresh())return;
  // Match the whole bounded event snapshot as well as revision: a worker can
  // change delivery without incrementing __v. Never overwrite its claim/result.
  const updated=await Application.updateOne({$and:[query(req),{__v:row.__v??{$exists:false},events:row.events,jobId:row.jobId,candidateId:row.candidateId,status:row.status}]},{$set:{events},$inc:{__v:1}});
  if(!updated.modifiedCount)throw fail('REVISION_CONFLICT',409,'Delivery changed. Reload before retrying.');
  return res.json({revision,eventId:event.id,delivery:projection(nextDelivery),replayed:false});
 }catch(error){if(error.code&&error.status)return res.status(error.status).json({code:error.code,message:error.message});next(error);}
};
