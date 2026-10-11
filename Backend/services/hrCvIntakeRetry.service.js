const crypto=require('node:crypto'),mongoose=require('mongoose'),Source=require('../models/hrCvIntake.model');
const authority=require('./hrCreateRecovery.service'),{resourceFilter}=require('./hrResourceScope.service');
const User=require('../models/user.model'),Role=require('../models/role.model');
async function creatorContext(id){const user=await User.findOne({_id:id,isActive:true}).select('_id role departmentId').maxTimeMS(1000).lean();const role=user&&await Role.findOne({key:String(user.role).toLowerCase(),isActive:true}).select('permissions').maxTimeMS(1000).lean();if(!role)throw fail('INTAKE_AUTH_REVOKED',403);return{user:{id:String(user._id),role:user.role,departmentId:user.departmentId||''},authRole:role};}
const fail=(code,status=409)=>Object.assign(new Error('Private source retry is unavailable.'),{code,status});
const repairable=new Set(['OCR_REQUIRED','INTAKE_SCAN_REQUIRED','INTAKE_RESULT','INTAKE_READBACK','INTAKE_PROVIDER_UNAVAILABLE','INTAKE_TIMEOUT']);
function createRetry({get,available,ddl,now=()=>new Date()}){return async function retry(req,id,input){
 available();if(!mongoose.isObjectIdOrHexString(id)||!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==3||!['expectedHash','expectedUpdatedAt','commandId'].every(k=>Object.hasOwn(input,k))||!/^[a-f0-9]{64}$/.test(input.expectedHash||'')||typeof input.expectedUpdatedAt!=='string'||!Number.isFinite(Date.parse(input.expectedUpdatedAt))||new Date(input.expectedUpdatedAt).toISOString()!==input.expectedUpdatedAt||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(input.commandId||''))throw fail('INTAKE_RETRY_INPUT',400);
 input=Object.freeze({...input});
 id=new mongoose.Types.ObjectId(id).toHexString();
 const initial=await authority.current(req),signature=authority.identity(initial),commandHash=crypto.createHash('sha256').update(JSON.stringify([initial.user.id,id,input.commandId,input.expectedHash,input.expectedUpdatedAt])).digest('hex');
 const current=async()=>{
  const fresh=await authority.current(req);if(authority.identity(fresh)!==signature)throw fail('INTAKE_AUTH_REVOKED',403);
  for(const action of ['read','create'])if(resourceFilter(fresh,'candidate',action)._id?.$in?.length===0)throw fail('INTAKE_AUTH_REVOKED',403);
  const row=await Source.findOne({$and:[{_id:id},resourceFilter(fresh,'candidate'),resourceFilter(fresh,'candidate','create')]}).select('+approval +retryCommandHash').maxTimeMS(1000).lean();
  if(!row)throw fail('INTAKE_SOURCE_UNAVAILABLE',404);await require('./hrCvIntakeScope.service').checkLinked(fresh,row,true);if(row.original.sha256!==input.expectedHash||row.taskVersion!=='intake-rules-1')throw fail('INTAKE_SOURCE_CHANGED');
  const creator=await creatorContext(row.createdBy);if(!await Source.exists({$and:[{_id:id},resourceFilter(creator,'candidate'),resourceFilter(creator,'candidate','create')]}))throw fail('INTAKE_AUTH_REVOKED',403);
  return row;
 };
 let row=await current();
 // A replay uses the exact original command even if the first HTTP ack was lost.
 if(row.retryCommandHash===commandHash){await current();return{...await get(req,id),replayed:true};}
 if(row.approval||!['blocked','failed'].includes(row.state)||!repairable.has(row.code)||row.attempts>=3||(row.manualRetries??0)>=2||row.updatedAt.toISOString()!==input.expectedUpdatedAt)throw fail('INTAKE_RETRY_UNAVAILABLE');
 await ddl();
 for(let i=0;i<64;i++){
  row=await current();if(row.retryCommandHash===commandHash)return{...await get(req,id),replayed:true};if(row.approval||row.updatedAt.toISOString()!==input.expectedUpdatedAt)throw fail('INTAKE_SOURCE_CHANGED');
  try{
   const saved=await Source.findOneAndUpdate({_id:id,state:row.state,code:row.code,updatedAt:row.updatedAt,attempts:row.attempts,approval:{$exists:false}},{$set:{state:'queued',code:'MANUAL_RETRY',queueSlot:crypto.randomInt(64),actorSlot:i%4,nextAttemptAt:now(),retryCommandHash:commandHash},$inc:{manualRetries:1},$unset:{scan:1,result:1,leaseToken:1,leaseUntil:1},$push:{events:{state:'queued',code:'MANUAL_RETRY',at:now(),attempt:row.attempts}}},{returnDocument:'after'}).lean();
   if(!saved)throw fail('INTAKE_SOURCE_CHANGED');await current();return{...await get(req,id),replayed:false};
  }catch(error){if(error.code===11000)continue;throw error;}
 }
 throw fail('INTAKE_QUEUE_FULL',429);
};}
module.exports={createRetry};
