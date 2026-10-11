const crypto=require('node:crypto'),mongoose=require('mongoose');
const Candidate=require('../models/candidate.model'),Manifest=require('../models/hrCvOriginalManifest.model');
const User=require('../models/user.model'),Role=require('../models/role.model');
const {resourceFilter}=require('./hrResourceScope.service'),{fingerprint}=require('./hrCvProcessing.service');
const storage=require('./hrPrivateObjectStorage.service');
const fail=(code,status=503)=>Object.assign(new Error('CV original attachment is unavailable.'),{code,status});
const signature=req=>JSON.stringify([req.user.id,req.user.role,req.user.departmentId,req.authRole.permissions]);
const selection='cvUrl cvOriginal cvReview.version __v updatedAt +privateCvBlob +privateCvArchive +privateCvIntake';
async function actor(id){
 const user=await User.findOne({_id:id,isActive:true}).select('_id role departmentId').maxTimeMS(1000).lean();
 const role=user&&await Role.findOne({key:String(user.role).toLowerCase(),isActive:true}).select('permissions').maxTimeMS(1000).lean();
 if(!role)throw fail('ATTACHMENT_AUTH_REVOKED',403);
 const req={user:{id:String(user._id),role:user.role,departmentId:user.departmentId||''},authRole:role};
 for(const action of ['read','update'])if(resourceFilter(req,'candidate',action)._id?.$in?.length===0)throw fail('ATTACHMENT_AUTH_REVOKED',403);return req;
}
const scoped=(req,id,extra={})=>({$and:[{_id:id,...extra},resourceFilter(req,'candidate'),resourceFilter(req,'candidate','update')]});
async function parent(req,id){const row=await Candidate.findOne(scoped(req,id)).select(selection).maxTimeMS(1000).lean();if(!row)throw fail('ATTACHMENT_PARENT_UNAVAILABLE',404);return row;}
let active=0;
// Internal per-record preparation only: no HTTP/CLI/startup activation. Approval
// is a trusted server callback, never request data or a hosting environment flag.
function createAttachment({enabled=false,approve,store,timeoutMs=8000}={}){
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>8000)throw fail('ATTACHMENT_CONFIG',400);
 async function attach(req,id,input){
  if(!enabled)throw fail('ATTACHMENT_DISABLED');
  if(typeof req?.user?.id!=='string'||!mongoose.isObjectIdOrHexString(req.user.id)||!mongoose.isObjectIdOrHexString(id)||
   !input||Object.getPrototypeOf(input)!==Object.prototype||Object.keys(input).length!==4||Object.keys(input).some(k=>!['manifestId','expectedRevision','sourceHash','contextHash'].includes(k))||
   typeof input.manifestId!=='string'||!/^[a-f0-9]{24}$/.test(input.manifestId)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||typeof input.sourceHash!=='string'||!/^[a-f0-9]{64}$/.test(input.sourceHash)||typeof input.contextHash!=='string'||!/^[a-f0-9]{64}$/.test(input.contextHash))throw fail('ATTACHMENT_INPUT',400);
  const current=await actor(req.user.id),auth=signature(current),source=await parent(current,id);
  if(source.cvOriginal?.sha256!==input.sourceHash)throw fail('ATTACHMENT_SOURCE_CHANGED',409);
  const manifest=await Manifest.findOne({_id:input.manifestId,candidateId:id,state:'verified',evidenceMode:'provider',sourceHash:input.sourceHash,sourceFingerprint:input.contextHash,sourceRevision:input.expectedRevision}).select('+blob +scan').maxTimeMS(1000).lean();
  if(!manifest)throw fail('ATTACHMENT_MANIFEST_UNAVAILABLE',404);
  let blob;try{blob=storage.reference(manifest.blob);}catch{throw fail('ATTACHMENT_MANIFEST_INVALID',409);}
  if(blob.sha256!==input.sourceHash||blob.size!==source.cvOriginal.size||blob.mimeType!==source.cvOriginal.mimeType||manifest.scan?.sha256!==input.sourceHash||!manifest.verifiedAt)throw fail('ATTACHMENT_MANIFEST_INVALID',409);
  if(source.cvOriginal?.sha256!==input.sourceHash)throw fail('ATTACHMENT_SOURCE_CHANGED',409);
  if(String(source.privateCvArchive?.manifestId)===input.manifestId&&JSON.stringify(source.privateCvBlob)===JSON.stringify(blob)){
   const latest=await actor(req.user.id),fresh=await parent(latest,id);if(signature(latest)!==auth)throw fail('ATTACHMENT_AUTH_REVOKED',403);if(fingerprint(fresh)!==fingerprint(source)||JSON.stringify(fresh.privateCvArchive)!==JSON.stringify(source.privateCvArchive))throw fail('ATTACHMENT_SOURCE_CHANGED',409);
   return{candidateId:String(source._id),manifestId:String(manifest._id),revision:source.__v??0,attached:true,replayed:true,recoveryVerified:false};
  }
  if((source.__v??0)!==input.expectedRevision||fingerprint(source)!==input.contextHash)throw fail('ATTACHMENT_SOURCE_CHANGED',409);
  if(typeof approve!=='function'||!store||typeof store.get!=='function')throw fail('ATTACHMENT_ACTIVATION_REQUIRED');
  if(active>=2)throw fail('ATTACHMENT_BUSY',429);active++;
  const controller=new AbortController();let timer,writing=false;
  async function guard(){
   if(controller.signal.aborted)throw fail('ATTACHMENT_TIMEOUT');
   const latest=await actor(req.user.id);if(signature(latest)!==auth)throw fail('ATTACHMENT_AUTH_REVOKED',403);
   const fresh=await parent(latest,id);if(fingerprint(fresh)!==input.contextHash)throw fail('ATTACHMENT_SOURCE_CHANGED',409);
   const same=await Manifest.exists({_id:manifest._id,candidateId:id,state:'verified',evidenceMode:'provider',updatedAt:manifest.updatedAt,sourceHash:manifest.sourceHash,sourceRevision:manifest.sourceRevision,sourceFingerprint:input.contextHash,blob:manifest.blob,scan:manifest.scan}).maxTimeMS(1000);
   if(!same)throw fail('ATTACHMENT_MANIFEST_CHANGED',409);if(controller.signal.aborted)throw fail('ATTACHMENT_TIMEOUT');return latest;
  }
  const work=async()=>{
   let approval;try{approval=await approve({manifestId:String(manifest._id),candidateId:String(id),sourceHash:input.sourceHash,actorId:req.user.id,signal:controller.signal});}catch{throw fail('ATTACHMENT_ACTIVATION_REQUIRED');}
   if(approval!==true)throw fail('ATTACHMENT_ACTIVATION_REQUIRED');
   await guard();
   const bytes=await store.get(blob,{signal:controller.signal});
   if(!Buffer.isBuffer(bytes)||bytes.length!==blob.size||crypto.createHash('sha256').update(bytes).digest('hex')!==blob.sha256)throw fail('ATTACHMENT_READBACK',409);
   const latest=await guard();
   const exact={__v:source.__v===undefined?{$exists:false}:source.__v,updatedAt:source.updatedAt,cvUrl:source.cvUrl,cvOriginal:source.cvOriginal,privateCvBlob:source.privateCvBlob??{$exists:false},privateCvArchive:source.privateCvArchive??{$exists:false},'cvReview.version':source.cvReview?.version??{$exists:false}};
   if(controller.signal.aborted)throw fail('ATTACHMENT_TIMEOUT');
   // One resource write only. No cross-collection flag, original deletion,
   // profile/decision/scoring write or migration of any other record.
   writing=true;
   const updated=await Candidate.findOneAndUpdate(scoped(latest,id,exact),{$set:{privateCvBlob:blob,privateCvArchive:{manifestId:manifest._id,attachedBy:req.user.id,attachedAt:new Date()}},$inc:{__v:1}},{returnDocument:'after',runValidators:true}).select('_id __v').maxTimeMS(1000).lean();
   if(!updated)throw fail('ATTACHMENT_SOURCE_CHANGED',409);
   return{candidateId:String(updated._id),manifestId:String(manifest._id),revision:updated.__v,attached:true,recoveryVerified:false};
  };
  // A timed-out dependency may ignore abort. Keep its slot until it settles.
  const pending=work().finally(()=>{active--;});
  try{return await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(fail(writing?'ATTACHMENT_WRITE_UNCERTAIN':'ATTACHMENT_TIMEOUT'));},timeoutMs);})]);}
  catch(error){if(error?.code?.startsWith('ATTACHMENT_'))throw error;throw fail('ATTACHMENT_UNAVAILABLE');}
  finally{clearTimeout(timer);controller.abort();}
 }
 return Object.freeze({attach});
}
module.exports={createAttachment};
