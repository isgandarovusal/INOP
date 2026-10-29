const mongoose=require('mongoose');
const fail=()=>Object.assign(new Error('Approved source identity is unavailable.'),{code:'INTAKE_ORIGIN_INVALID',status:400});
function canonical(row){return row?{key:row.key,identityHash:row.identityHash,receivedAt:new Date(row.receivedAt).toISOString(),matchReason:row.matchReason,...(row.jobId?{jobId:String(row.jobId).toLowerCase()}:{})}:undefined;}
function validate(input,now=new Date()){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['key','identityHash','receivedAt','matchReason','jobId'].includes(k))||!['outlook','kfc','pizzahut','jobsearch','external_form'].includes(input.key)||!/^[a-f0-9]{64}$/.test(input.identityHash||'')||typeof input.receivedAt!=='string'||!Number.isFinite(Date.parse(input.receivedAt))||new Date(input.receivedAt).toISOString()!==input.receivedAt||Date.parse(input.receivedAt)>now.getTime()+300000||!['exact_approved_mapping','ambiguous','unmatched','unavailable'].includes(input.matchReason)||(input.matchReason==='exact_approved_mapping'?!mongoose.isObjectIdOrHexString(input.jobId):input.jobId!==undefined))throw fail();return Object.freeze(canonical(input));
}
// Existing relay source keys map to the canonical Job.brandId values. This is
// source routing validation, never a per-user authorization grant.
function jobBrandFilter(key){
 return key==='kfc'?{brandId:'kfc'}:key==='pizzahut'?{brandId:'pizza-hut'}:{};
}
module.exports={canonical,validate,jobBrandFilter};
