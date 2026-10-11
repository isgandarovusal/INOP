const mongoose=require('mongoose'),User=require('../models/user.model'),Role=require('../models/role.model');
const contexts=new WeakMap();
const fail=(code,status=403)=>Object.assign(new Error('Approved HR background identity is unavailable.'),{code,status});
// Not serialized, not an HTTP header/body field, not a persisted user JWT.
// Only explicitly enabled server-side adapter construction creates the identity.
function createActorContext({enabled=false,actorId,approvalRecorded=false}={}){
 if(enabled&&(!mongoose.isObjectIdOrHexString(actorId)||approvalRecorded!==true))throw fail('HR_BACKGROUND_APPROVAL_REQUIRED',400);
 return Object.freeze({request(){if(!enabled)throw fail('HR_BACKGROUND_DISABLED',503);const request=Object.freeze({headers:Object.freeze({})});contexts.set(request,String(actorId).toLowerCase());return request;}});
}
async function resolve(req){
 const id=contexts.get(req);if(!id)return null;
 let user,role;try{user=await User.findOne({_id:id,isActive:true}).select('_id role departmentId').maxTimeMS(1000).lean();role=user&&await Role.findOne({key:String(user.role).toLowerCase(),isActive:true}).select('permissions').maxTimeMS(1000).lean();}catch{throw fail('HR_BACKGROUND_UNAVAILABLE',503);}
 if(!user||!role||!require('./hrDepartmentAccess.service').isHRMember(user))throw fail('HR_BACKGROUND_REVOKED');
 return{user:{id:String(user._id),role:user.role,departmentId:user.departmentId||''},authRole:role};
}
module.exports={createActorContext,resolve};
