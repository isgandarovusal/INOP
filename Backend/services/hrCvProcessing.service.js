const crypto = require('node:crypto'),path = require('node:path');
const Jobs = require('../models/hrCvProcessingJob.model'),Candidate = require('../models/candidate.model'),User = require('../models/user.model'),Role = require('../models/role.model');
const {resourceFilter} = require('./hrResourceScope.service');
const parser = require('./cvParser.service');
const {readCandidateOriginal} = require('../controllers/privateFiles.controller');
const fail = (code,status=503) => Object.assign(new Error('CV processing is unavailable.'),{code,status});
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const fingerprint = candidate => hash(JSON.stringify([String(candidate._id),candidate.cvUrl,candidate.privateCvBlob,candidate.cvOriginal,candidate.cvReview?.version,candidate.__v||0,candidate.updatedAt]));
const identity = req => JSON.stringify([req.user.id,req.user.role,req.user.departmentId,req.authRole.permissions]);
async function actor(id) {
 const user = await User.findOne({_id:id,isActive:true}).select('_id role departmentId').maxTimeMS(1000).lean();
 const role = user && await Role.findOne({key:String(user.role).toLowerCase(),isActive:true}).select('permissions').maxTimeMS(1000).lean();
 if(!role)throw fail('PROCESSING_AUTH_REVOKED',403);
 return {user:{id:String(user._id),role:user.role,departmentId:user.departmentId||''},authRole:role};
}
async function candidate(req,id,update=true) {
 return Candidate.findOne({$and:[{_id:id},resourceFilter(req,'candidate'),...(update?[resourceFilter(req,'candidate','update')]:[])]}).select('cvUrl cvOriginal cvReview.version __v updatedAt +privateCvBlob').maxTimeMS(1000).lean();
}
function dto(row,result) { return {id:String(row._id),candidateId:String(row.candidateId),kind:row.kind,state:row.state,attempts:row.attempts,manualRetries:row.manualRetries??0,code:row.code,source:{sha256:row.sourceHash,revision:row.sourceRevision,contextHash:row.sourceFingerprint},createdAt:row.createdAt,updatedAt:row.updatedAt,nextAttemptAt:row.nextAttemptAt||null,events:(row.events||[]).map(({state,code,at,attempt})=>({state,code,at,attempt})),...(result?{result}:{} )}; }
async function indexes() {
 let values;try{values=await Jobs.collection.indexes();}catch{throw fail('PROCESSING_QUEUE_NOT_READY');}
 const required=[['hr_processing_context_unique',{contextKey:1},null],['hr_processing_queue_slot',{queueSlot:1},{queueSlot:{$type:'number'}}],['hr_processing_actor_slot',{actorId:1,actorSlot:1},{actorSlot:{$type:'number'}}]];
 if(required.some(([name,key,partial])=>!values.some(i=>i.name===name&&i.unique===true&&JSON.stringify(i.key)===JSON.stringify(key)&&(!partial||JSON.stringify(i.partialFilterExpression)===JSON.stringify(partial)))))throw fail('PROCESSING_QUEUE_NOT_READY');
}
function createProcessing({enabled=process.env.HR_CV_PROCESSING_ENABLED==='true',now=()=>new Date(),timeoutMs=30000,parse=parser.parseCvResultFromBuffer,read=readCandidateOriginal,slot=()=>crypto.randomInt(64)}={}) {
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw fail('PROCESSING_INVALID_CONFIG',400);
 const available=()=>{if(!enabled)throw fail('PROCESSING_DISABLED');};
 async function enqueue(req,id,input) {
  available();
  if(!require('mongoose').isObjectIdOrHexString(id)||!input||Object.keys(input).some(k=>!['expectedRevision','expectedHash','kind'].includes(k))||input.kind!=='parse'||!Number.isInteger(input.expectedRevision)||input.expectedRevision<0||!/^[a-f0-9]{64}$/.test(input.expectedHash||''))throw fail('PROCESSING_INVALID_INPUT',400);
  const currentActor=await actor(req.user.id),auth=identity(currentActor),row=await candidate(currentActor,id);
  if(!row)throw fail('PROCESSING_PARENT_UNAVAILABLE',404);
  if((row.__v||0)!==input.expectedRevision||row.cvOriginal?.sha256!==input.expectedHash)throw fail('PROCESSING_SOURCE_CHANGED',409);
  await indexes();
  const sourceFingerprint=fingerprint(row),contextKey=hash(JSON.stringify([currentActor.user.id,String(row._id),sourceFingerprint,'parse','rules-2']));
  const existing=await Jobs.findOne({contextKey}).maxTimeMS(1000).lean();
  const latest=await actor(req.user.id),fresh=await candidate(latest,id);
  if(identity(latest)!==auth)throw fail('PROCESSING_AUTH_CHANGED',403);
  if(!fresh)throw fail('PROCESSING_PARENT_UNAVAILABLE',404);
  if(fingerprint(fresh)!==sourceFingerprint)throw fail('PROCESSING_SOURCE_CHANGED',409);
  if(existing)return {...dto(existing),replayed:true};
  for(let i=0;i<8;i++) {
   const queueSlot=slot();if(!Number.isInteger(queueSlot)||queueSlot<0||queueSlot>63)throw fail('PROCESSING_INVALID_CONFIG',400);
   try { const created=await Jobs.create({actorId:req.user.id,candidateId:row._id,sourceHash:input.expectedHash,sourceRevision:input.expectedRevision,sourceFingerprint,contextKey,kind:'parse',state:'queued',attempts:0,queueSlot,actorSlot:i%4,nextAttemptAt:now(),events:[{state:'queued',code:'QUEUED',at:now(),attempt:0}]});return {...dto(created),replayed:false}; }
   catch(error) { if(error.code!==11000)throw fail('PROCESSING_UNAVAILABLE');const duplicate=await Jobs.findOne({contextKey}).maxTimeMS(1000).lean();if(duplicate)return {...dto(duplicate),replayed:true}; }
  }
  throw fail('PROCESSING_QUEUE_FULL',429);
 }
 async function get(req,id) {
  available();if(!require('mongoose').isObjectIdOrHexString(id))throw fail('PROCESSING_INVALID_INPUT',400);
  const current=await actor(req.user.id),auth=identity(current),job=await Jobs.findById(id).select('+result').maxTimeMS(1000).lean();
  if(!job||!await candidate(current,job.candidateId,false))throw fail('PROCESSING_PARENT_UNAVAILABLE',404);
  const fresh=await actor(req.user.id),row=await candidate(fresh,job.candidateId,false);
  if(identity(fresh)!==auth)throw fail('PROCESSING_AUTH_CHANGED',403);
  if(!row)throw fail('PROCESSING_PARENT_UNAVAILABLE',404);
  const currentSource=fingerprint(row)===job.sourceFingerprint;
  return {...dto(job,currentSource?job.result:undefined),currentSource};
 }
 async function list(req,id) {
  available();if(!require('mongoose').isObjectIdOrHexString(id))throw fail('PROCESSING_INVALID_INPUT',400);
  const current=await actor(req.user.id),auth=identity(current),row=await candidate(current,id,false);
  if(!row)throw fail('PROCESSING_PARENT_UNAVAILABLE',404);await indexes();
  const jobs=await Jobs.find({candidateId:id}).sort({createdAt:-1,_id:-1}).limit(20).maxTimeMS(1000).lean();
  const fresh=await actor(req.user.id),latest=await candidate(fresh,id,false);if(identity(fresh)!==auth)throw fail('PROCESSING_AUTH_CHANGED',403);if(!latest)throw fail('PROCESSING_PARENT_UNAVAILABLE',404);
  return {items:jobs.map(job=>({...dto(job),currentSource:fingerprint(latest)===job.sourceFingerprint})),limit:20};
 }
 async function retry(req,id,input) {
  available();
  if(!require('mongoose').isObjectIdOrHexString(id)||!input||Object.keys(input).some(k=>!['expectedRevision','expectedHash','expectedUpdatedAt','commandId'].includes(k))||!Number.isInteger(input.expectedRevision)||input.expectedRevision<0||typeof input.expectedHash!=='string'||!/^[a-f0-9]{64}$/.test(input.expectedHash)||typeof input.expectedUpdatedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.expectedUpdatedAt)||!Number.isFinite(Date.parse(input.expectedUpdatedAt))||new Date(input.expectedUpdatedAt).toISOString()!==input.expectedUpdatedAt||typeof input.commandId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(input.commandId||''))throw fail('PROCESSING_INVALID_INPUT',400);
  const current=await actor(req.user.id),auth=identity(current),job=await Jobs.findById(id).select('+retryCommandHash').maxTimeMS(1000).lean();
  if(!job)throw fail('PROCESSING_JOB_UNAVAILABLE',404);
  const parent=await candidate(current,job.candidateId);
  if(!parent)throw fail('PROCESSING_PARENT_UNAVAILABLE',404);
  if((parent.__v||0)!==input.expectedRevision||parent.cvOriginal?.sha256!==input.expectedHash||fingerprint(parent)!==job.sourceFingerprint)throw fail('PROCESSING_SOURCE_CHANGED',409);
  // Keep original creator authority, and also require the current retry actor.
  // Retry does not replace a revoked creator with another user's privilege.
  const origin=await actor(job.actorId),originAuth=identity(origin);
  if(!await candidate(origin,job.candidateId))throw fail('PROCESSING_AUTH_REVOKED',403);
  await indexes();
  const fresh=await actor(req.user.id),freshOrigin=await actor(job.actorId),latest=await candidate(fresh,job.candidateId);
  if(identity(fresh)!==auth||identity(freshOrigin)!==originAuth)throw fail('PROCESSING_AUTH_CHANGED',403);
  if(!latest||!await candidate(freshOrigin,job.candidateId))throw fail('PROCESSING_PARENT_UNAVAILABLE',404);
  if(fingerprint(latest)!==job.sourceFingerprint)throw fail('PROCESSING_SOURCE_CHANGED',409);
  const commandHash=hash(JSON.stringify([req.user.id,input.commandId])),replay=row=>({...dto(row),replayed:true});
  if(job.retryCommandHash===commandHash)return replay(job);
  const count=job.manualRetries??0;
  if(job.state!=='blocked'||!['SOURCE_MISSING','STORAGE_NOT_CONFIGURED'].includes(job.code)||!Number.isInteger(job.attempts)||job.attempts<1||job.attempts>=3||!Number.isInteger(count)||count<0||count>=2||job.updatedAt?.toISOString()!==input.expectedUpdatedAt)throw fail('PROCESSING_RETRY_CONFLICT',409);
  for(let i=0;i<8;i++) {
   const queueSlot=slot();if(!Number.isInteger(queueSlot)||queueSlot<0||queueSlot>63)throw fail('PROCESSING_INVALID_CONFIG',400);
   try {
    const row=await Jobs.findOneAndUpdate({_id:job._id,state:job.state,code:job.code,attempts:job.attempts,updatedAt:job.updatedAt},{$set:{state:'queued',code:'QUEUED',queueSlot,actorSlot:i%4,nextAttemptAt:now(),retryActorId:req.user.id,retryCommandHash:commandHash},$inc:{manualRetries:1},$unset:{result:1,leaseToken:1,leaseUntil:1},$push:{events:{state:'queued',code:'MANUAL_RETRY',at:now(),attempt:job.attempts,actorId:req.user.id}}},{returnDocument:'after'}).maxTimeMS(1000).lean();
    if(row)return {...dto(row),replayed:false};
    const raced=await Jobs.findById(id).select('+retryCommandHash').maxTimeMS(1000).lean();if(raced?.retryCommandHash===commandHash)return replay(raced);throw fail('PROCESSING_RETRY_CONFLICT',409);
   }catch(error){if(error.code!==11000)throw error;const raced=await Jobs.findById(id).select('+retryCommandHash').maxTimeMS(1000).lean();if(raced?.retryCommandHash===commandHash)return replay(raced);}
  }
  throw fail('PROCESSING_QUEUE_FULL',429);
 }
 let busy=false,timer;
 async function finish(job,token,state,code,result) {
  const terminal=!['queued','running','retry'].includes(state),at=now();
  return Jobs.updateOne({_id:job._id,state:'running',leaseToken:token,leaseUntil:{$gt:at}},{$set:{state,code,...(result?{result}:{}),...(state==='retry'?{nextAttemptAt:new Date(at.getTime()+[60000,300000][Math.min(job.attempts-1,1)])}:{})},$unset:{leaseToken:1,leaseUntil:1,...(terminal?{queueSlot:1,actorSlot:1,nextAttemptAt:1}:{})},$push:{events:{state,code,at,attempt:job.attempts}}}).maxTimeMS(1000);
 }
 async function work(job,token) {
  const controller=new AbortController();let deadline,timedOut=false;
  try{
   const execute=async()=>{
    const req=await actor(job.actorId),auth=identity(req),row=await candidate(req,job.candidateId);
    if(!row)throw fail('PROCESSING_AUTH_REVOKED',403);
    const retryActor=job.retryActorId?await actor(job.retryActorId):null,retryAuth=retryActor?identity(retryActor):null;
    if(retryActor&&!await candidate(retryActor,job.candidateId))throw fail('PROCESSING_AUTH_REVOKED',403);
    if(fingerprint(row)!==job.sourceFingerprint)throw fail('PROCESSING_SOURCE_CHANGED',409);
    const bytes=await read(row,{signal:controller.signal});if(controller.signal.aborted)throw fail('PROCESSING_TIMEOUT');if(!bytes)throw fail('PROCESSING_SOURCE_MISSING',404);
    if(hash(bytes)!==job.sourceHash)throw fail('PROCESSING_SOURCE_CHANGED',409);
    if(controller.signal.aborted)throw fail('PROCESSING_TIMEOUT');
    const output=await parse(bytes,path.basename(row.cvUrl),{signal:controller.signal});
    if(controller.signal.aborted)throw fail('PROCESSING_TIMEOUT');
    const latest=await actor(job.actorId),fresh=await candidate(latest,job.candidateId);
    if(identity(latest)!==auth||!fresh)throw fail('PROCESSING_AUTH_REVOKED',403);
    if(retryActor){const latestRetry=await actor(job.retryActorId);if(identity(latestRetry)!==retryAuth||!await candidate(latestRetry,job.candidateId))throw fail('PROCESSING_AUTH_REVOKED',403);}
    if(fingerprint(fresh)!==job.sourceFingerprint)throw fail('PROCESSING_SOURCE_CHANGED',409);
    if(!output.parsed)return {state:'blocked',code:'OCR_REQUIRED'};
    // No raw text, file bytes/key/name, token or exception payload in job result.
    const facts=Object.fromEntries(['name','email','phone','phoneRaw','role','education','skills','experience','languages','certificates','employmentHistory','educationHistory','certificationHistory'].filter(k=>output.parsed[k]!==undefined).map(k=>[k,output.parsed[k]]));
    if(output.parsed.extraction?.version!=='rules-2'||output.parsed.extraction?.provider!=='rule-based')throw fail('PROCESSING_INVALID_RESULT',422);
    const result={parsed:facts,review:{...output.parsed.extraction,processingStatus:'extracted'},parserVersion:'rules-2',requiresApproval:true};
    if(Buffer.byteLength(JSON.stringify(result))>128*1024)throw fail('PROCESSING_RESULT_LIMIT',422);
    return {state:'succeeded',code:'REVIEW_REQUIRED',result};
   };
   const result=await Promise.race([execute(),new Promise((_,reject)=>{deadline=setTimeout(()=>{timedOut=true;controller.abort();reject(fail('PROCESSING_TIMEOUT'));},timeoutMs);})]);
   await finish(job,token,result.state,result.code,result.result);
  }catch(error){
   const code=error.code==='PROCESSING_AUTH_REVOKED'?'AUTH_REVOKED':['PROCESSING_SOURCE_CHANGED','STORAGE_IDENTITY_MISMATCH'].includes(error.code)?'SOURCE_CHANGED':error.code==='PROCESSING_SOURCE_MISSING'||['ENOENT','ENOTDIR','STORAGE_NOT_FOUND'].includes(error.code)?'SOURCE_MISSING':error.code==='STORAGE_NOT_CONFIGURED'?'STORAGE_NOT_CONFIGURED':error.code==='DOCUMENT_LIMIT'?'INPUT_LIMIT':error.code==='PROCESSING_RESULT_LIMIT'?'RESULT_LIMIT':timedOut?'PROCESSING_TIMEOUT':'PROCESSING_FAILED';
   const state=['AUTH_REVOKED','SOURCE_CHANGED'].includes(code)?'cancelled':['SOURCE_MISSING','RESULT_LIMIT','STORAGE_NOT_CONFIGURED','INPUT_LIMIT'].includes(code)?'blocked':job.attempts>=3?'failed':'retry';
   await finish(job,token,state,code);
  }finally{clearTimeout(deadline);controller.abort();}
 }
 async function runOnce(limit=2) {
  available();if(busy)return{processed:0,busy:true};busy=true;let processed=0;
  try{
   await indexes();
   const at=now();await Jobs.updateMany({state:'running',leaseUntil:{$lte:at},attempts:{$gte:3}},{$set:{state:'failed',code:'ATTEMPTS_EXHAUSTED'},$unset:{leaseToken:1,leaseUntil:1,queueSlot:1,actorSlot:1,nextAttemptAt:1},$push:{events:{state:'failed',code:'ATTEMPTS_EXHAUSTED',at,attempt:3}}}).maxTimeMS(1000);
   for(;processed<Math.max(1,Math.min(Number(limit)||2,4));processed++){
    const at=now(),token=crypto.randomUUID(),job=await Jobs.findOneAndUpdate({attempts:{$lt:3},$or:[{state:{$in:['queued','retry']},nextAttemptAt:{$lte:at}},{state:'running',leaseUntil:{$lte:at}}]},{$set:{state:'running',leaseToken:token,leaseUntil:new Date(at.getTime()+60000),code:'PROCESSING'},$inc:{attempts:1},$push:{events:{state:'running',code:'PROCESSING',at}}},{returnDocument:'after',sort:{createdAt:1,_id:1}}).select('+leaseToken +retryActorId').maxTimeMS(1000).lean();
    if(!job)break;await work(job,token);
   }
   return{processed};
  }finally{busy=false;}
 }
 function start(){available();if(timer)return;timer=setInterval(()=>void runOnce().catch(()=>console.error('CV processing temporarily unavailable.')),5000);timer.unref();}
 function stop(){clearInterval(timer);timer=undefined;}
 return{enqueue,get,list,retry,runOnce,start,stop};
}
module.exports={createProcessing,fingerprint};
