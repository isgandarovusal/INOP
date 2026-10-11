const crypto=require('node:crypto'),mongoose=require('mongoose');
const Source=require('../models/hrCvIntake.model'),Candidate=require('../models/candidate.model'),Application=require('../models/application.model'),Job=require('../models/job.model');
const authority=require('./hrCreateRecovery.service'),{resourceFilter}=require('./hrResourceScope.service'),{contactPhone,historyInput}=require('./cvReview.service');
const {calculateApplicationMatch}=require('./applicationMatch.service'),{creationEvent}=require('./applicationLifecycle.service');
const fields=['name','role','email','phone','education','experience','skills','languages','certificates','employmentHistory','educationHistory','certificationHistory'];
const fail=(code,status=409)=>Object.assign(new Error('CV intake approval is unavailable.'),{code,status});
const sourceContext=row=>({blob:row.blob,original:row.original,scan:row.scan,result:row.result,taskVersion:row.taskVersion});
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'&&!(value instanceof Date)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function profile(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!fields.includes(k)))throw fail('INTAKE_APPROVAL_INPUT',400);
 const clean={};for(const field of fields){const value=input[field];if(value===undefined)continue;
  if(['skills','languages','certificates'].includes(field)){if(!Array.isArray(value)||value.length>100||value.some(v=>typeof v!=='string'||!v.trim()||v.length>120))throw fail('INTAKE_APPROVAL_INPUT',400);clean[field]=[...new Set(value.map(v=>v.trim()))];}
  else if(field.endsWith('History')){clean[field]=historyInput(value);if(clean[field]===null)throw fail('INTAKE_APPROVAL_INPUT',400);}
  else if(field==='experience'){if(value!==null&&(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100))throw fail('INTAKE_APPROVAL_INPUT',400);clean[field]=value;}
  else {if(typeof value!=='string'||value.length>(field==='phone'?80:500))throw fail('INTAKE_APPROVAL_INPUT',400);clean[field]=value.trim();}
 }
 if(!clean.name||!clean.role)throw fail('INTAKE_APPROVAL_INPUT',422);
 if(clean.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email))throw fail('INTAKE_APPROVAL_INPUT',400);
 clean.email=(clean.email||'').toLowerCase();Object.assign(clean,contactPhone(clean.phone||''));if(Buffer.byteLength(JSON.stringify(clean))>65536)throw fail('INTAKE_APPROVAL_INPUT',400);return clean;
}
function createApproval({original,available}){
 async function approve(req,id,input){
  available();if(!mongoose.isObjectIdOrHexString(id)||!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['confirmed','expectedHash','expectedUpdatedAt','profile','jobId','notes'].includes(k))||input.confirmed!==true||!/^[a-f0-9]{64}$/.test(input.expectedHash||'')||typeof input.expectedUpdatedAt!=='string'||!Number.isFinite(Date.parse(input.expectedUpdatedAt))||new Date(input.expectedUpdatedAt).toISOString()!==input.expectedUpdatedAt||(input.jobId!==undefined&&!mongoose.isObjectIdOrHexString(input.jobId))||(input.notes!==undefined&&(typeof input.notes!=='string'||input.notes.length>5000)))throw fail('INTAKE_APPROVAL_INPUT',400);
  id=new mongoose.Types.ObjectId(id).toHexString();
  const facts=profile(input.profile),jobId=input.jobId?new mongoose.Types.ObjectId(input.jobId).toHexString():null,notes=input.notes||'',commandHash=hash({facts,jobId,notes});
  let initial=await authority.current(req),auth=authority.identity(initial);
  const guard=async()=>{
   const fresh=await authority.current(req);if(authority.identity(fresh)!==auth)throw fail('INTAKE_AUTH_REVOKED',403);
   for(const [resource,action]of [['candidate','read'],['candidate','create'],...(jobId?[['application','create'],['recruitment','read']]:[])])if(resourceFilter(fresh,resource,action)._id?.$in?.length===0)throw fail('INTAKE_AUTH_REVOKED',403);
   const row=await Source.findOne({$and:[{_id:id},resourceFilter(fresh,'candidate'),resourceFilter(fresh,'candidate','create')]}).select('+blob +result +approval').maxTimeMS(1000).lean();
   if(!row)throw fail('INTAKE_SOURCE_UNAVAILABLE',404);
   await require('./hrCvIntakeScope.service').checkLinked(fresh,row,true);
   if(row.state!=='ready'||row.taskVersion!=='intake-rules-1'||row.result?.requiresApproval!==true||row.scan?.sha256!==row.original.sha256||row.original.sha256!==input.expectedHash)throw fail('INTAKE_SOURCE_CHANGED');
   if(row.approval){if(row.approval.contextHash!==hash(sourceContext(row))||row.approval.profileHash!==commandHash||String(row.approval.actor)!==fresh.user.id||row.approval.departmentId!==(fresh.user.departmentId||'')||row.approval.sourceUpdatedAt.toISOString()!==input.expectedUpdatedAt)throw fail('INTAKE_APPROVAL_CONFLICT');}
   else if(row.updatedAt.toISOString()!==input.expectedUpdatedAt)throw fail('INTAKE_SOURCE_CHANGED');
   let job;if(jobId){job=await Job.findOne({$and:[{_id:jobId},resourceFilter(fresh,'recruitment')]}).maxTimeMS(1000).lean();if(!job)throw fail('INTAKE_JOB_UNAVAILABLE',404);if(job.status!=='Open')throw fail('JOB_NOT_OPEN');}
   return{row,fresh,job};
  };
  let context=await guard();await original(req,id);context=await guard();
  if(!context.row.approval){const receipt={actor:initial.user.id,departmentId:initial.user.departmentId||'',profile:Object.fromEntries(fields.filter(k=>Object.hasOwn(facts,k)).map(k=>[k,k==='phone'?facts.phoneRaw:facts[k]])),notes,profileHash:commandHash,contextHash:hash(sourceContext(context.row)),sourceUpdatedAt:context.row.updatedAt,candidateId:new mongoose.Types.ObjectId(),...(jobId?{jobId,applicationId:new mongoose.Types.ObjectId()}:{}),at:new Date()};
   // Reserve identities before any Candidate/Application write, including lost acknowledgements.
   try{await Source.updateOne({_id:id,state:'ready',updatedAt:context.row.updatedAt,approval:{$exists:false}},{$set:{approval:receipt}});}catch{throw fail('INTAKE_APPROVAL_UNCERTAIN',503);}
   context=await guard();if(!context.row.approval)throw fail('INTAKE_APPROVAL_CONFLICT');
  }
  const receipt=context.row.approval,ownership={createdBy:receipt.actor,assignedTo:receipt.actor,departmentId:receipt.departmentId};
  let candidate=await Candidate.findOne({$and:[{_id:receipt.candidateId},resourceFilter(context.fresh,'candidate')]}).select('+privateCvIntake').lean();
  if(!candidate){const review=context.row.result.review,correctedFields=fields.filter(k=>Object.hasOwn(facts,k)&&JSON.stringify(facts[k])!==JSON.stringify(context.row.result.parsed?.[k]));
   const payload={_id:receipt.candidateId,...facts,...ownership,status:'new',privateCvIntake:context.row._id,privateCvBlob:context.row.blob,cvUrl:'/uploads/intake-'+context.row._id+(context.row.original.mimeType==='application/pdf'?'.pdf':'.docx'),cvOriginal:context.row.original,reviewedFields:fields.filter(k=>Object.hasOwn(facts,k)),cvReview:{...review,processingStatus:'extracted',reviewStatus:correctedFields.length?'corrected':'confirmed',correctedFields,reviewedBy:receipt.actor,reviewedAt:receipt.at}};
   await new Candidate(payload).validate();context=await guard();
   try{await Candidate.create(payload);}catch{/* Reconcile the reserved identity; never compensate/delete a possibly committed parent. */}
   candidate=await Candidate.findOne({$and:[{_id:receipt.candidateId},resourceFilter(context.fresh,'candidate')]}).select('+privateCvIntake').lean();if(!candidate){await guard();if(await Candidate.exists({_id:receipt.candidateId}))throw fail('INTAKE_SOURCE_UNAVAILABLE',404);throw fail('INTAKE_APPROVAL_UNCERTAIN',503);}
  }
  if(String(candidate.privateCvIntake)!==id)throw fail('INTAKE_APPROVAL_CONFLICT');
  const parent=async()=>{const checked=await guard();const current=await Candidate.findOne({$and:[{_id:candidate._id,privateCvIntake:id},resourceFilter(checked.fresh,'candidate'),resourceFilter(checked.fresh,'candidate','create')]}).lean();if(!current)throw fail('INTAKE_SOURCE_UNAVAILABLE',404);candidate=current;return checked;};
  let application;
  if(jobId){context=await parent();application=await Application.findOne({$and:[{_id:receipt.applicationId,candidateId:candidate._id,jobId},resourceFilter(context.fresh,'application','create')]}).lean();
   if(!application){if(receipt.completedAt)throw fail('INTAKE_COMPLETED_RESOURCE_UNAVAILABLE');const match=calculateApplicationMatch(context.job,candidate,{application:{jobId,candidateId:candidate._id}});const payload={_id:receipt.applicationId,jobId,candidateId:candidate._id,...ownership,status:'Applied',score:match.score,matching:match,scoreStatus:match.scoreStatus,notes,source:{key:'cv_upload',receivedAt:context.row.createdAt},events:[creationEvent(context.fresh)]};
    await new Application(payload).validate();context=await parent();try{await Application.create(payload);}catch{/* Same reserved identity only; no destructive rollback. */}
    application=await Application.findOne({$and:[{_id:receipt.applicationId,candidateId:candidate._id,jobId},resourceFilter(context.fresh,'application','create')]}).lean();if(!application){await guard();if(await Application.exists({_id:receipt.applicationId}))throw fail('INTAKE_SOURCE_UNAVAILABLE',404);throw fail('INTAKE_APPROVAL_UNCERTAIN',503);}
   }
  }
  context=await parent();if(!await Candidate.exists({$and:[{_id:candidate._id,privateCvIntake:id},resourceFilter(context.fresh,'candidate')]}))throw fail('INTAKE_SOURCE_UNAVAILABLE',404);
  await Source.updateOne({_id:id,'approval.profileHash':commandHash},{$set:{'approval.completedAt':receipt.completedAt||new Date()}});context=await guard();
  await guard();const readableApplication=application&&await Application.exists({$and:[{_id:application._id},resourceFilter(context.fresh,'application')]});
  return{candidateId:String(candidate._id),...(readableApplication?{applicationId:String(application._id)}:{}),evidenceMode:context.row.evidenceMode,approvalRequired:false};
 }
 async function reconcile(req,id,input){
  available();if(!mongoose.isObjectIdOrHexString(id)||!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==1||input.confirmed!==true)throw fail('INTAKE_APPROVAL_INPUT',400);
  const fresh=await authority.current(req),row=await Source.findOne({$and:[{_id:id},resourceFilter(fresh,'candidate'),resourceFilter(fresh,'candidate','create')]}).select('+approval').maxTimeMS(1000).lean();
  if(!row)throw fail('INTAKE_SOURCE_UNAVAILABLE',404);if(!row.approval?.profile)throw fail('INTAKE_APPROVAL_UNAVAILABLE');
  return approve(req,id,{confirmed:true,expectedHash:row.original.sha256,expectedUpdatedAt:row.approval.sourceUpdatedAt.toISOString(),profile:row.approval.profile,...(row.approval.jobId?{jobId:String(row.approval.jobId)}:{}),notes:row.approval.notes||''});
 }
 return Object.freeze({approve,reconcile});
}
module.exports={createApproval};
