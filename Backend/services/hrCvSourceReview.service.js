const Candidate=require('../models/candidate.model'),Job=require('../models/job.model');
const authority=require('./hrCreateRecovery.service'),{resourceFilter}=require('./hrResourceScope.service');
const fail=(code,status=409)=>Object.assign(new Error('Private source review is unavailable.'),{code,status});
async function originHint(req,origin){
 if(!origin)return undefined;const value={key:origin.key,receivedAt:origin.receivedAt,matchReason:origin.matchReason,requiresJobReview:true};
 if(origin.jobId){const job=await Job.findOne({$and:[{_id:origin.jobId,status:'Open'},resourceFilter(req,'recruitment')]}).select('_id').maxTimeMS(1000).lean();if(job)return{...value,suggestedJobId:String(job._id)};value.matchReason='unavailable';}
 return value;
}
function createDuplicates({get,available}){return async function duplicates(req,id){
 available();const before=await get(req,id),fresh=await authority.current(req),signature=authority.identity(fresh);const pairs=[['cvOriginal.sha256',before.original.sha256],...(before.result?.parsed?.email?[['email',before.result.parsed.email.toLowerCase()]]:[]),...(before.result?.parsed?.phone?[['phone',before.result.parsed.phone]]:[])];
 const filter={$and:[resourceFilter(fresh,'candidate'),{$or:pairs.map(([k,v])=>({[k]:v}))},...(before.candidateId?[{_id:{$ne:before.candidateId}}]:[])]};
 const rows=await Candidate.find(filter).select('_id cvOriginal.sha256 email phone').sort({_id:1}).limit(5).maxTimeMS(1000).lean();
 const after=await get(req,id);if(before.updatedAt.toISOString()!==after.updatedAt.toISOString()||authority.identity(await authority.current(req))!==signature)throw fail('INTAKE_CONTEXT_CHANGED');
 if(rows.length){const current=await Candidate.find({$and:[filter,{_id:{$in:rows.map(v=>v._id)}}]}).select('_id cvOriginal.sha256 email phone').maxTimeMS(1000).lean();if(current.length!==rows.length||rows.some(v=>{const next=current.find(c=>String(c._id)===String(v._id));return!next||v.cvOriginal?.sha256!==next.cvOriginal?.sha256||v.email!==next.email||v.phone!==next.phone;}))throw fail('INTAKE_CONTEXT_CHANGED');}
 if(authority.identity(await authority.current(req))!==signature)throw fail('INTAKE_AUTH_REVOKED',403);
 return{reviewRequired:true,automaticMerge:false,limit:5,items:rows.map(row=>({candidateId:String(row._id),reasons:[...(row.cvOriginal?.sha256===before.original.sha256?['same_original']:[]),...(before.result?.parsed?.email&&row.email===before.result.parsed.email.toLowerCase()?['same_email']:[]),...(before.result?.parsed?.phone&&row.phone===before.result.parsed.phone?['same_phone']:[])]}))};
};}
module.exports={originHint,createDuplicates};
