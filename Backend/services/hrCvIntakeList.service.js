const Source=require('../models/hrCvIntake.model'),Candidate=require('../models/candidate.model');
const authority=require('./hrCreateRecovery.service'),{aggregateResourceFilter,resourceFilter}=require('./hrResourceScope.service');
const fail=(code,status=400)=>Object.assign(new Error('Private source queue is unavailable.'),{code,status});
const states=new Set(['reserved','queued','running','retry','ready','blocked','quarantined','failed','cancelled']);
const pick={original:1,taskVersion:1,state:1,code:1,attempts:1,uploadAttempts:1,updatedAt:1,createdAt:1,evidenceMode:1,intakeContext:1,'origin.key':1,'approval.completedAt':1,'approval.candidateId':1};
function candidateScoped(req,filter={}){
 const scope=aggregateResourceFilter(req,'candidate');
 // Unattached sources have no parent to authorize. Avoid 50k null-id lookups;
 // receipts still take BOTH current independent Source/Candidate scope checks.
 const linked=[{$match:{$and:[filter,scope,{'approval.candidateId':{$exists:true}}]}},{$project:pick},{$lookup:{from:Candidate.collection.name,localField:'approval.candidateId',foreignField:'_id',pipeline:[{$project:{_id:1}}],as:'knownParent'}},{$lookup:{from:Candidate.collection.name,localField:'approval.candidateId',foreignField:'_id',pipeline:[{$match:aggregateResourceFilter(req,'candidate')},{$project:{_id:1}}],as:'readableParent'}},{$match:{$expr:{$or:[{$gt:[{$size:'$readableParent'},0]},{$and:[{$eq:[{$size:'$knownParent'},0]},{$eq:[{$type:'$approval.completedAt'},'missing']}]}]}}}];
 return[{$match:{$and:[filter,scope,{approval:{$exists:false}}]}},{$project:pick},{$unionWith:{coll:Source.collection.name,pipeline:linked}}];
}
function scoped(req,filter={}){
 const missing={'intakeContext.jobId':{$exists:false},'intakeContext.branchId':{$exists:false}};
 const base=candidateScoped(req,{$and:[filter,missing]});
 const bound=candidateScoped(req,{$and:[filter,{$or:[{'intakeContext.jobId':{$exists:true}},{'intakeContext.branchId':{$exists:true}}]}]});
 for(const [key,model]of [['jobId','job.model'],['branchId','recruitmentBranch.model']]){
  bound.push({$lookup:{from:require('../models/'+model).collection.name,let:{parent:{$convert:{input:'$intakeContext.'+key,to:'objectId',onError:null,onNull:null}}},pipeline:[{$match:{$and:[aggregateResourceFilter(req,'recruitment'),{$expr:{$eq:['$_id','$$parent']}}]}},{$project:{_id:1}}],as:'contextParent'}},{$match:{$or:[{['intakeContext.'+key]:{$exists:false}},{'contextParent.0':{$exists:true}}]}});
 }
 return[...base,{$unionWith:{coll:Source.collection.name,pipeline:bound}}];
}
function metadata(row){return{id:String(row._id),receivedAt:row.createdAt,sourceType:row.intakeContext?.sourceType||row.origin?.key||'unknown',taskVersion:row.taskVersion,state:row.state,code:row.code,attempts:row.attempts,uploadAttempts:row.uploadAttempts,original:row.original,...(row.intakeContext?{intakeContext:row.intakeContext}:{}),updatedAt:row.updatedAt,evidenceMode:row.evidenceMode,requiresApproval:true,...(row.approval?{approvalState:row.approval.completedAt?'completed':'reserved'}:{})};}
function createList({available,ddl,evidenceMode}){
 return async function list(req,query={}){
  available();if(!query||typeof query!=='object'||Array.isArray(query)||Object.keys(query).some(k=>!['page','pageSize','status','q','sourceType','brandId','jobId','batchId'].includes(k)))throw fail('INTAKE_LIST_INPUT');
  const integer=(value,fallback,max)=>{if(value===undefined)return fallback;if(!((typeof value==='string'&&/^[1-9]\d{0,3}$/.test(value))||typeof value==='number'&&Number.isInteger(value))||Number(value)<1||Number(value)>max)throw fail('INTAKE_LIST_INPUT');return Number(value);};
  const page=integer(query.page,1,2000),pageSize=integer(query.pageSize,30,30),status=query.status||'',q=query.q||'';
  if(typeof status!=='string'||status&&!states.has(status)||typeof q!=='string'||q.length>80)throw fail('INTAKE_LIST_INPUT');
  for(const key of ['sourceType','brandId','jobId','batchId'])if(query[key]!==undefined&&(typeof query[key]!=='string'||query[key].length>120||/[\x00-\x1f]/.test(query[key])))throw fail('INTAKE_LIST_INPUT');
  if(query.sourceType&&![...require('./hrCvIntakeContext.service').types,'unknown'].includes(query.sourceType)||query.jobId&&!require('mongoose').isObjectIdOrHexString(query.jobId)||query.batchId&&!require('./hrCvIntakeContext.service').uuid(query.batchId))throw fail('INTAKE_LIST_INPUT');
  const fresh=await authority.current(req),signature=authority.identity(fresh);if(resourceFilter(fresh,'candidate')._id?.$in?.length===0)throw fail('INTAKE_AUTH_REVOKED',403);await ddl();
  const contextFilters=Object.fromEntries(['brandId','jobId','batchId'].filter(k=>query[k]).map(k=>['intakeContext.'+k,query[k]]));
  const sourceFilter=query.sourceType==='unknown'?{'intakeContext.sourceType':{$exists:false},'origin.key':{$exists:false}}:query.sourceType?{$or:[{'intakeContext.sourceType':query.sourceType},{'intakeContext.sourceType':{$exists:false},'origin.key':query.sourceType}]}:{};
  const match={...contextFilters,...sourceFilter,...(status?{state:status}:{}),...(q.trim()?{'original.originalName':{$regex:q.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'}}:{})};
  const pipeline=[...scoped(fresh,match),{$facet:{items:[{$sort:{createdAt:-1,_id:-1}},{$skip:(page-1)*pageSize},{$limit:pageSize},{$project:pick}],total:[{$count:'value'}],states:[{$group:{_id:'$state',count:{$sum:1},pendingReview:{$sum:{$cond:[{$and:[{$eq:['$state','ready']},{$eq:[{$type:'$approval'},'missing']}]},1,0]}},recoveryPending:{$sum:{$cond:[{$and:[{$ne:[{$type:'$approval'},'missing']},{$eq:[{$type:'$approval.completedAt'},'missing']}]},1,0]}}}}]}}];
  const [rows]=await Source.aggregate(pipeline).option({maxTimeMS:2000,allowDiskUse:false});
  const after=await authority.current(req);if(authority.identity(after)!==signature)throw fail('INTAKE_AUTH_REVOKED',403);
  // One bounded follow-up aggregation for the page, never one network query per row.
  if(rows.items.length){const current=await Source.aggregate([...scoped(after,{_id:{$in:rows.items.map(v=>v._id)}}),{$project:pick}]).option({maxTimeMS:1000,allowDiskUse:false});if(current.length!==rows.items.length||rows.items.some(row=>{const next=current.find(v=>String(v._id)===String(row._id));return!next||next.updatedAt.toISOString()!==row.updatedAt.toISOString();}))throw fail('INTAKE_CONTEXT_CHANGED',409);}
  if(authority.identity(await authority.current(req))!==signature)throw fail('INTAKE_AUTH_REVOKED',403);
  const total=rows.total[0]?.value||0,counters=Object.fromEntries([...states].map(s=>[s,0]));let pendingReview=0,recoveryPending=0;for(const row of rows.states){if(states.has(row._id))counters[row._id]=row.count;pendingReview+=row.pendingReview;recoveryPending+=row.recoveryPending;}
  return{version:'hr-page-v1',items:rows.items.map(metadata),page,pageSize,total,hasMore:page*pageSize<total,nextCursor:null,summary:{counts:counters,pendingReview,recoveryPending,filtered:true},evidenceMode};
 };
}
module.exports={createList};
