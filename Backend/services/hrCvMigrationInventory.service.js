const mongoose = require('mongoose');
const Candidate = require('../models/candidate.model');
const User = require('../models/user.model');
const Role = require('../models/role.model');
const {resourceFilter} = require('./hrResourceScope.service');
const {fingerprint} = require('./hrCvProcessing.service');
const storage = require('./hrPrivateObjectStorage.service');
const fail=(code,status)=>Object.assign(new Error('CV migration inventory is unavailable.'),{code,status});
const selection='cvUrl cvOriginal cvReview.version __v updatedAt +privateCvBlob +privateCvArchive +privateCvIntake';
const signature=req=>JSON.stringify([req.user.id,req.user.role,req.user.departmentId,req.authRole.permissions]);
async function actor(id){
 const user=await User.findOne({_id:id,isActive:true}).select('_id role departmentId').maxTimeMS(1000).lean();
 const role=user&&await Role.findOne({key:String(user.role).toLowerCase(),isActive:true}).select('permissions').maxTimeMS(1000).lean();
 if(!role)throw fail('MIGRATION_AUTH_REVOKED',403);
 const req={user:{id:String(user._id),role:user.role,departmentId:user.departmentId||''},authRole:role};
 for(const action of ['read','update'])if(resourceFilter(req,'candidate',action)._id?.$in?.length===0)throw fail('MIGRATION_AUTH_REVOKED',403);
 return req;
}
function item(row){
 const base={candidateId:String(row._id),revision:row.__v??0},original=row.cvOriginal;
 let kind='none',reason='NO_ORIGINAL';
 if(row.privateCvBlob){
  kind='private';try{const ref=storage.reference(row.privateCvBlob);reason=original?.sha256===ref.sha256&&original?.size===ref.size&&original?.mimeType===ref.mimeType?'OBJECT_RECOVERY_VERIFICATION_REQUIRED':'SOURCE_METADATA_REVIEW';}catch{reason='INVALID_REFERENCE';}
 }else if(row.cvUrl){kind='native';reason=typeof row.cvUrl==='string'&&/^\/uploads\/[a-z0-9_-]+\.(pdf|docx)$/i.test(row.cvUrl)?'NATIVE_BYTES_VERIFICATION_REQUIRED':'SOURCE_LOCATOR_REVIEW';}
 const valid=typeof original?.sha256==='string'&&/^[a-f0-9]{64}$/.test(original.sha256)&&Number.isInteger(original.size)&&original.size>0&&original.size<=storage.MAX_BYTES&&['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(original.mimeType);
 if(kind!=='none'&&!valid&&reason!=='INVALID_REFERENCE'&&reason!=='SOURCE_LOCATOR_REVIEW')reason='SOURCE_METADATA_REVIEW';
 return {...base,kind,reason,...(valid?{sourceHash:original.sha256,contextHash:fingerprint(row)}:{})};
}
// Internal, read-only preparation. The eventual server caller must authenticate
// its JWT before supplying req.user.id; no HTTP/CLI/worker activates this module.
async function inventory(req,input={}){
 if(!req?.user||typeof req.user.id!=='string'||!mongoose.isObjectIdOrHexString(req.user.id)||!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['limit','after'].includes(k))||
  (input.limit!==undefined&&(!Number.isInteger(input.limit)||input.limit<1||input.limit>200))||(input.after!==undefined&&(typeof input.after!=='string'||!/^[a-f0-9]{24}$/.test(input.after))))throw fail('MIGRATION_INPUT',400);
 const limit=input.limit??50,current=await actor(req.user.id),auth=signature(current),filter={$and:[resourceFilter(current,'candidate'),resourceFilter(current,'candidate','update'),...(input.after?[{_id:{$gt:input.after}}]:[])]};
 const rows=await Candidate.find(filter).select(selection).sort({_id:1}).limit(limit+1).maxTimeMS(1000).lean();
 const refresh=async()=>{const fresh=await actor(req.user.id);if(signature(fresh)!==auth)throw fail('MIGRATION_AUTH_CHANGED',403);return fresh;};
 const latest=await refresh(),freshRows=rows.length?await Candidate.find({$and:[{_id:{$in:rows.map(row=>row._id)}},resourceFilter(latest,'candidate'),resourceFilter(latest,'candidate','update')]}).select(selection).maxTimeMS(1000).lean():[];
 const map=new Map(freshRows.map(row=>[String(row._id),row]));
 // A changing/losing-scope page is refused in full: neither counts nor cursors
 // reveal an obsolete/foreign row, and the caller can retry from its own cursor.
 if(rows.some(row=>!map.has(String(row._id))||fingerprint(row)!==fingerprint(map.get(String(row._id)))))throw fail('MIGRATION_SOURCE_CHANGED',409);
 await refresh();
 const items=rows.slice(0,limit).map(item),counts={native:0,private:0,none:0,review:0};
 for(const row of items){counts[row.kind]++;if(['SOURCE_METADATA_REVIEW','INVALID_REFERENCE','SOURCE_LOCATOR_REVIEW'].includes(row.reason))counts.review++;}
 const hasMore=rows.length>limit;
 return {mode:'dry-run',metadataOnly:true,bytesVerified:false,limit,hasMore,nextCursor:hasMore?items.at(-1).candidateId:null,items,counts,
  requiredGates:['BACKUP_RECOVERY','PRIVATE_STORAGE','MALWARE_SCAN','DURABLE_MANIFEST','HASH_READBACK','CURRENT_SOURCE_CAS','MIGRATION_APPROVAL','RETENTION_POLICY']};
}
module.exports={inventory};
