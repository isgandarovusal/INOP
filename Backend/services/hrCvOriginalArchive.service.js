const crypto = require('node:crypto'), mongoose = require('mongoose');
const Manifest = require('../models/hrCvOriginalManifest.model');
const Candidate = require('../models/candidate.model'), User = require('../models/user.model'), Role = require('../models/role.model');
const {resourceFilter} = require('./hrResourceScope.service');
const {fingerprint} = require('./hrCvProcessing.service');
const storage = require('./hrPrivateObjectStorage.service');
const {readCandidateOriginal} = require('../controllers/privateFiles.controller');
const fail=(code,status=503)=>Object.assign(new Error('Original CV archive is unavailable.'),{code,status});
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const selection='cvUrl cvOriginal cvReview.version __v updatedAt +privateCvBlob +privateCvArchive';
const signature=req=>JSON.stringify([req.user.id,req.user.role,req.user.departmentId,req.authRole.permissions]);
async function actor(id){
 const user=await User.findOne({_id:id,isActive:true}).select('_id role departmentId').maxTimeMS(1000).lean();
 const role=user&&await Role.findOne({key:String(user.role).toLowerCase(),isActive:true}).select('permissions').maxTimeMS(1000).lean();
 if(!role)throw fail('ARCHIVE_AUTH_REVOKED',403);
 const req={user:{id:String(user._id),role:user.role,departmentId:user.departmentId||''},authRole:role};
 for(const action of ['read','update'])if(resourceFilter(req,'candidate',action)._id?.$in?.length===0)throw fail('ARCHIVE_AUTH_REVOKED',403);
 return req;
}
async function parent(req,id){
 const row=await Candidate.findOne({$and:[{_id:id},resourceFilter(req,'candidate'),resourceFilter(req,'candidate','update')]}).select(selection).maxTimeMS(1000).lean();
 if(!row)throw fail('ARCHIVE_PARENT_UNAVAILABLE',404);return row;
}
async function indexes(){
 let rows;try{rows=await Manifest.collection.indexes();}catch{throw fail('ARCHIVE_DDL_REQUIRED');}
 if(!rows.some(r=>r.name==='hr_original_context_unique'&&r.unique&&JSON.stringify(r.key)==='{"contextKey":1}'&&!r.partialFilterExpression&&!r.sparse)||
 !rows.some(r=>r.name==='hr_original_active_slot'&&r.unique&&JSON.stringify(r.key)==='{"slot":1}'&&JSON.stringify(r.partialFilterExpression)==='{"slot":{"$type":"number"}}'&&!r.sparse))throw fail('ARCHIVE_DDL_REQUIRED');
}
const dto=(row,replayed=false)=>({id:String(row._id),candidateId:String(row.candidateId),state:row.state,code:row.code,attempts:row.attempts,
 evidenceMode:row.evidenceMode,sourceHash:row.sourceHash,sourceRevision:row.sourceRevision,verifiedAt:row.verifiedAt||null,replayed,
 candidateAttached:false,recoveryVerified:false});
// Internal preparation only: deliberately no route, environment activation, worker,
// Candidate attachment, public intake or delete. Injected adapters are server-owned.
function createArchive({enabled=false,read=readCandidateOriginal,store,scanner,evidenceMode='provider',now=()=>new Date(),timeoutMs=30000,slot=()=>crypto.randomInt(8)}={}){
 if(!['provider','test'].includes(evidenceMode)||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw fail('ARCHIVE_CONFIG');
 async function archive(req,candidateId,input){
  if(!enabled)throw fail('ARCHIVE_DISABLED');
  if(typeof req?.user?.id!=='string'||!mongoose.isObjectIdOrHexString(req.user.id)||!mongoose.isObjectIdOrHexString(candidateId)||
   !input||Object.getPrototypeOf(input)!==Object.prototype||Object.keys(input).length!==3||Object.keys(input).some(k=>!['expectedRevision','sourceHash','contextHash'].includes(k))||
   !Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||typeof input.sourceHash!=='string'||!/^[a-f0-9]{64}$/.test(input.sourceHash)||typeof input.contextHash!=='string'||!/^[a-f0-9]{64}$/.test(input.contextHash))throw fail('ARCHIVE_INPUT',400);
  let current=await actor(req.user.id),auth=signature(current),source=await parent(current,candidateId);
  if((source.__v??0)!==input.expectedRevision||source.cvOriginal?.sha256!==input.sourceHash||fingerprint(source)!==input.contextHash)throw fail('ARCHIVE_SOURCE_CHANGED',409);
  await indexes();
  const contextKey=hash(JSON.stringify([String(candidateId),input.contextHash,evidenceMode]));
  let row=await Manifest.findOne({contextKey}).select('+blob +sourceFingerprint +contextKey +leaseToken +slot').lean();
  if(!row){try{row=(await Manifest.create({candidateId,actorId:req.user.id,contextKey,sourceFingerprint:input.contextHash,sourceRevision:input.expectedRevision,sourceHash:input.sourceHash,evidenceMode,state:'reserved',code:'RESERVED'})).toObject();}
   catch(error){if(error.code!==11000)throw fail('ARCHIVE_DATABASE');row=await Manifest.findOne({contextKey}).select('+blob +sourceFingerprint +contextKey +leaseToken +slot').lean();}}
  if(!row)throw fail('ARCHIVE_DATABASE');
  async function guard(controller,lease){
   if(controller?.signal.aborted)throw fail('ARCHIVE_TIMEOUT');
   const fresh=await actor(req.user.id);if(signature(fresh)!==auth)throw fail('ARCHIVE_AUTH_REVOKED',403);
   const freshParent=await parent(fresh,candidateId);if(fingerprint(freshParent)!==input.contextHash)throw fail('ARCHIVE_SOURCE_CHANGED',409);
   // The initiating actor must also retain its independent parent grants.
   if(String(row.actorId)!==req.user.id){const owner=await actor(String(row.actorId));await parent(owner,candidateId);}
   if(lease&&!await Manifest.exists({_id:row._id,state:'running',leaseToken:lease,leaseUntil:{$gt:now()}}))throw fail('ARCHIVE_LEASE_LOST',409);
   if(controller?.signal.aborted)throw fail('ARCHIVE_TIMEOUT');return freshParent;
  }
  await guard();
  if(['verified','blocked','obsolete','failed'].includes(row.state))return dto(row,true);
  if(row.attempts>=3){const updated=await Manifest.findOneAndUpdate({_id:row._id,attempts:{$gte:3},$or:[{state:{$ne:'running'}},{leaseUntil:{$lte:now()}}]},{$set:{state:'failed',code:'ATTEMPTS_EXHAUSTED'},$unset:{slot:1,leaseToken:1,leaseUntil:1}},{returnDocument:'after'}).lean();if(updated)return dto(updated);throw fail('ARCHIVE_BUSY',409);}
  const lease=crypto.randomUUID();let claimed;
  for(let i=0;i<16&&!claimed;i++)try{
   const value=slot();if(!Number.isInteger(value)||value<0||value>7)throw fail('ARCHIVE_CONFIG');
   claimed=await Manifest.findOneAndUpdate({_id:row._id,attempts:{$lt:3},$or:[{state:{$in:['reserved','retry']}},{state:'running',leaseUntil:{$lte:now()}}]},
    {$set:{state:'running',code:'RUNNING',leaseToken:lease,leaseUntil:new Date(now().getTime()+60000),slot:value},$inc:{attempts:1}},{returnDocument:'after'}).select('+blob +sourceFingerprint +leaseToken').lean();
  }catch(error){if(error.code!==11000)throw error;}
  if(!claimed)throw fail('ARCHIVE_BUSY',409);row=claimed;
  const controller=new AbortController();let timer;
  const finish=async(state,code,extra={})=>{
   const saved=await Manifest.findOneAndUpdate({_id:row._id,state:'running',leaseToken:lease},{$set:{state,code,...extra},$unset:{slot:1,leaseToken:1,leaseUntil:1}},{returnDocument:'after'}).lean();
   if(!saved)throw fail('ARCHIVE_LEASE_LOST',409);return dto(saved);
  };
  const work=async()=>{
   source=await guard(controller,lease);
   const bytes=Buffer.from(await read(source,{signal:controller.signal}));
   if(!bytes.length||bytes.length>storage.MAX_BYTES||hash(bytes)!==row.sourceHash||source.cvOriginal?.size!==bytes.length||!['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(source.cvOriginal?.mimeType))throw fail('ARCHIVE_SOURCE_BYTES',409);
   await guard(controller,lease);
   if(!scanner||typeof scanner.scan!=='function')throw fail('ARCHIVE_SCAN_REQUIRED');
   const scan=await scanner.scan(Buffer.from(bytes),{sha256:row.sourceHash,mimeType:source.cvOriginal.mimeType,signal:controller.signal});
   if(!scan||scan.verdict!=='clean'||scan.sha256!==row.sourceHash||typeof scan.engine!=='string'||!/^[a-zA-Z0-9_.-]{1,64}$/.test(scan.engine)||typeof scan.version!=='string'||!/^[a-zA-Z0-9_.-]{1,64}$/.test(scan.version))throw fail(scan?.verdict==='infected'?'ARCHIVE_QUARANTINED':'ARCHIVE_SCAN_REQUIRED');
   await guard(controller,lease);
   if(!store||typeof store.put!=='function'||typeof store.get!=='function')throw fail('ARCHIVE_STORAGE_REQUIRED');
   let blob=row.blob;
   if(!blob){blob=storage.prepare(bytes,source.cvOriginal.mimeType);const saved=await Manifest.findOneAndUpdate({_id:row._id,state:'running',leaseToken:lease,blob:{$exists:false}},{$set:{blob,scan:{engine:scan.engine,version:scan.version,sha256:scan.sha256,at:now()}}},{returnDocument:'after'}).select('+blob').lean();if(!saved)throw fail('ARCHIVE_LEASE_LOST',409);blob=saved.blob;}
   blob=storage.reference(blob);
   if(blob.sha256!==row.sourceHash||blob.size!==bytes.length||blob.mimeType!==source.cvOriginal.mimeType)throw fail('ARCHIVE_MANIFEST_CONFLICT',409);
   let recovered;
   try{recovered=await store.get(blob,{signal:controller.signal});}catch(error){if(error.code!=='STORAGE_NOT_FOUND')throw error;}
   await guard(controller,lease);
   if(!recovered){try{await store.put(blob,bytes,{signal:controller.signal});}catch(error){if(error.code!=='STORAGE_WRITE_CONFLICT')throw error;}await guard(controller,lease);recovered=await store.get(blob,{signal:controller.signal});}
   if(!Buffer.isBuffer(recovered)||recovered.length!==blob.size||hash(recovered)!==blob.sha256)throw fail('ARCHIVE_READBACK',409);
   await guard(controller,lease);
   return finish('verified','HASH_READBACK_VERIFIED',{verifiedAt:now()});
  };
  try{return await Promise.race([work(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(fail('ARCHIVE_TIMEOUT'));},timeoutMs);})]);}
  catch(error){controller.abort();const code=error?.code;
   if(['ARCHIVE_AUTH_REVOKED','ARCHIVE_PARENT_UNAVAILABLE','ARCHIVE_SOURCE_CHANGED'].includes(code)){await finish('obsolete',code);throw fail(code,error.status||409);}
   if(code==='ARCHIVE_LEASE_LOST')throw fail(code,409);
   const blocks=['ARCHIVE_SCAN_REQUIRED','ARCHIVE_QUARANTINED','ARCHIVE_STORAGE_REQUIRED','ARCHIVE_SOURCE_BYTES','ARCHIVE_MANIFEST_CONFLICT','ARCHIVE_READBACK'];
   const safe=blocks.includes(code)?code:code==='STORAGE_WRITE_UNCERTAIN'?'ARCHIVE_WRITE_UNCERTAIN':code==='ARCHIVE_TIMEOUT'?code:'ARCHIVE_PROVIDER_UNAVAILABLE';
   return finish(blocks.includes(code)?'blocked':row.attempts>=3?'failed':'retry',safe);
  }finally{clearTimeout(timer);controller.abort();}
 }
 return Object.freeze({archive});
}
module.exports={createArchive};
