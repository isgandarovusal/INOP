// HR-declared routing context is not proof of a website/mailbox integration.
const mongoose=require('mongoose'),Job=require('../models/job.model');
const{resourceFilter}=require('./hrResourceScope.service');
const types=['manual','kfc','pizzahut','simit','jobsearch','outlook','external_form'];
const fail=()=>Object.assign(Error('Invalid or unavailable intake context.'),{code:'INTAKE_CONTEXT_INPUT',status:400});
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
async function validate(req,input){
 if(input===undefined)return undefined;
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['sourceType','sourceIdentifier','externalApplicationId','brandId','branchId','jobId','batchId'].includes(k)))throw fail();
 const out={sourceType:input.sourceType??'manual',declaredByHR:true};if(!types.includes(out.sourceType))throw fail();
 for(const k of ['sourceIdentifier','externalApplicationId'])if(input[k]!==undefined){if(typeof input[k]!=='string'||!input[k].trim()||input[k].length>120||/[\x00-\x1f\x7f]/.test(input[k]))throw fail();out[k]=input[k].trim();}
 if(input.batchId!==undefined){if(!uuid(input.batchId))throw fail();out.batchId=input.batchId;}
 if(input.brandId!==undefined){if(typeof input.brandId!=='string'||!(await require('./recruitmentCatalog.service').brands()).some(b=>b.id===input.brandId&&b.active))throw fail();out.brandId=input.brandId;}
 if(input.jobId!==undefined){if(!mongoose.isObjectIdOrHexString(input.jobId))throw fail();const job=await Job.findOne({$and:[{_id:input.jobId,archivedAt:null,status:'Open'},resourceFilter(req,'recruitment')]}).select('_id brandId branchId').maxTimeMS(1000).lean();if(!job||out.brandId&&out.brandId!==job.brandId)throw fail();out.jobId=String(job._id);if(job.brandId)out.brandId=job.brandId;if(job.branchId)out.branchId=String(job.branchId);}
 if(input.branchId!==undefined){if(!mongoose.isObjectIdOrHexString(input.branchId)||out.branchId&&out.branchId!==input.branchId)throw fail();out.branchId=String(input.branchId);}
 // Inherited Job links need the same current catalog/location authority as
 // explicitly selected links: a visible Job can reference a stale/foreign branch.
 if((out.brandId||out.branchId)&&await require('./recruitmentCatalog.service').validateLocation(req,{brandId:out.brandId??null,branchId:out.branchId??null}))throw fail();
 return out;
}
async function check(req,context){
 if(context?.jobId&&!await Job.exists({$and:[{_id:context.jobId},resourceFilter(req,'recruitment')]}).maxTimeMS(1000))throw Object.assign(fail(),{code:'INTAKE_SOURCE_UNAVAILABLE',status:404});
 if(context?.branchId&&!await require('../models/recruitmentBranch.model').exists({$and:[{_id:context.branchId},resourceFilter(req,'recruitment')]}).maxTimeMS(1000))throw Object.assign(fail(),{code:'INTAKE_SOURCE_UNAVAILABLE',status:404});
}
const identity=value=>value?JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)))):undefined;
module.exports={validate,check,types,uuid,identity};
