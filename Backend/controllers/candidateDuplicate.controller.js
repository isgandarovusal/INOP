const crypto=require('node:crypto'),mongoose=require('mongoose'),Candidate=require('../models/candidate.model'),Review=require('../models/candidateDuplicateReview.model');
const authority=require('../services/hrCreateRecovery.service'),{resourceFilter}=require('../services/hrResourceScope.service');
const fail=status=>Object.assign(Error('Candidate duplicate review is unavailable.'),{status});
const fingerprint=row=>crypto.createHash('sha256').update(JSON.stringify([String(row._id),row.updatedAt,row.email,row.cvOriginal?.sha256,row.archivedAt])).digest('hex');
const select='_id name email cvOriginal.sha256 updatedAt archivedAt';
async function context(req,id,action='read'){
 if(!mongoose.isObjectIdOrHexString(id))throw fail(404);const fresh=await authority.current(req);
 const row=await Candidate.findOne({$and:[{_id:id,archivedAt:null},resourceFilter(fresh,'candidate'),resourceFilter(fresh,'candidate',action)]}).select(select).maxTimeMS(1000).lean();if(!row)throw fail(404);return{fresh,row};
}
function reasons(a,b){return[...(/^[a-f0-9]{64}$/.test(a.cvOriginal?.sha256||'')&&a.cvOriginal.sha256===b.cvOriginal?.sha256?['same_original']:[]),...(a.email&&a.email===b.email?['same_email']:[])];}
const dto=row=>({id:String(row._id),decision:row.decision,note:row.note,at:row.createdAt});
exports.list=async(req,res)=>{try{
 const{fresh,row}=await context(req,req.params.id),signature=authority.identity(fresh),conditions=[];
 if(/^[a-f0-9]{64}$/.test(row.cvOriginal?.sha256||''))conditions.push({'cvOriginal.sha256':row.cvOriginal.sha256});if(row.email)conditions.push({email:row.email});
 const peers=conditions.length?await Candidate.find({$and:[{_id:{$ne:row._id},archivedAt:null},resourceFilter(fresh,'candidate'),{$or:conditions}]}).select(select).sort({_id:1}).limit(6).maxTimeMS(1000).lean():[];
 const ids=peers.slice(0,5).map(p=>p._id),writable=await Candidate.find({$and:[{_id:{$in:[row._id,...ids]}},resourceFilter(fresh,'candidate','update')]}).select('_id').lean().maxTimeMS(1000),allowed=new Set(writable.map(v=>String(v._id)));
 const history=ids.length?await Review.find({pair:{$all:[row._id],$in:ids}}).sort({createdAt:-1,_id:-1}).limit(100).lean().maxTimeMS(1000):[];
 const final=await context(req,req.params.id);if(authority.identity(final.fresh)!==signature||fingerprint(final.row)!==fingerprint(row))throw fail(409);
 const currentPeers=ids.length?await Candidate.find({$and:[{_id:{$in:ids},archivedAt:null},resourceFilter(final.fresh,'candidate')]}).select(select).lean().maxTimeMS(1000):[];
 if(currentPeers.length!==ids.length||peers.slice(0,5).some(p=>fingerprint(p)!==fingerprint(currentPeers.find(v=>String(v._id)===String(p._id)))))throw fail(409);
 res.json({revision:fingerprint(row),hasMore:peers.length>5,automaticMerge:false,items:peers.slice(0,5).map(peer=>{const pair=[row,peer].sort((a,b)=>String(a._id).localeCompare(String(b._id))),fp=pair.map(fingerprint),review=history.find(r=>r.pair.map(String).join()===pair.map(v=>String(v._id)).join()&&r.fingerprints.join()===fp.join());return{id:String(peer._id),name:peer.name,revision:fingerprint(peer),reasons:reasons(row,peer),canReview:allowed.has(String(row._id))&&allowed.has(String(peer._id)),review:review?dto(review):null};})});
 }catch(e){res.status(e.status||500).json({message:'Candidate duplicate review is unavailable.'});}};
exports.create=async(req,res)=>{try{
 const b=req.body;if(!b||Array.isArray(b)||Object.keys(b).some(k=>!['otherId','revision','otherRevision','decision','note','commandId'].includes(k))||!mongoose.isObjectIdOrHexString(b.otherId)||!['same_person','different_people','uncertain'].includes(b.decision)||typeof b.note!=='string'||b.note.length>1000||!/^[-a-zA-Z0-9]{16,80}$/.test(b.commandId||'')||![b.revision,b.otherRevision].every(v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)))throw fail(400);
 if(String(req.params.id)===String(b.otherId))throw fail(400);
 const a=await context(req,req.params.id,'update'),c=await context(req,b.otherId,'update');if(authority.identity(a.fresh)!==authority.identity(c.fresh)||fingerprint(a.row)!==b.revision||fingerprint(c.row)!==b.otherRevision||!reasons(a.row,c.row).length)throw fail(409);
 const pair=[a.row,c.row].sort((x,y)=>String(x._id).localeCompare(String(y._id))),payload={pair:pair.map(v=>v._id),fingerprints:pair.map(fingerprint),actor:a.fresh.user.id,commandId:b.commandId,decision:b.decision,note:b.note.trim()};
 const latest=await context(req,req.params.id,'update'),other=await context(req,b.otherId,'update');if(authority.identity(latest.fresh)!==authority.identity(a.fresh)||authority.identity(other.fresh)!==authority.identity(a.fresh)||fingerprint(latest.row)!==b.revision||fingerprint(other.row)!==b.otherRevision)throw fail(409);
 if(!await Review.collection.indexExists('actor_1_commandId_1').catch(()=>false))throw fail(503);
 let review=await Review.findOne({actor:payload.actor,commandId:b.commandId});if(!review)try{review=await Review.create(payload);}catch(e){if(e.code!==11000)throw e;review=await Review.findOne({actor:payload.actor,commandId:b.commandId});}
 if(!review||JSON.stringify(review.pair.map(String))!==JSON.stringify(payload.pair.map(String))||review.fingerprints.join()!==payload.fingerprints.join()||review.decision!==payload.decision||review.note!==payload.note)throw fail(409);
 const finalA=await context(req,req.params.id,'update'),finalB=await context(req,b.otherId,'update');if(authority.identity(finalA.fresh)!==authority.identity(a.fresh)||authority.identity(finalB.fresh)!==authority.identity(a.fresh)||fingerprint(finalA.row)!==b.revision||fingerprint(finalB.row)!==b.otherRevision)throw fail(409);
 res.json({review:dto(review),automaticMerge:false});
 }catch(e){res.status(e.status||500).json({message:'Candidate duplicate review is unavailable.'});}};
