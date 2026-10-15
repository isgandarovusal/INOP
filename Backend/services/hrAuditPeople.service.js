const User=require('../models/user.model');
const Profile=require('../models/auditorProfile.model');
async function eligible(user,auditId,session){
 if(!user?.isActive)return false;
 const scope=await require('../middleware/auth.middleware').getPermissionScope(user.role,'audit.action','read');
 const profile=await Profile.findById(user._id).session(session||null).lean();
 const filter=await require('../middleware/auditScope.middleware').getAuditScopeFilter({user:{id:String(user._id),role:user.role,departmentId:user.departmentId},permission:{scope},auditorProfile:profile||undefined});
 return Boolean(filter&&await require('../models/audit.model').exists({$and:[{_id:auditId},filter]}).session(session||null));
}
exports.requireResponsible=async(id,auditId,session)=>{
 if(!require('mongoose').isObjectIdOrHexString(id))throw require('./auditTransaction.service').auditError(400,'Select an authorized responsible user.');
 const user=await User.findById(id).session(session).lean();
 if(!await eligible(user,auditId,session))throw require('./auditTransaction.service').auditError(403,'Responsible user cannot access this HR audit.');
};
exports.candidates=async(auditId,req)=>{
 const {scalar,pagination}=require('./auditQuery.service');const q=scalar(req.query.q,'q')||'';const window=pagination(req,50);
 const escaped=q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const users=await User.find({isActive:true,...(q?{name:{$regex:escaped,$options:'i'}}:{})}).select('_id name role departmentId isActive').sort({_id:1}).skip(window.skip).limit(window.limit+1).maxTimeMS(5000).lean();
 const output=[];for(const user of users.slice(0,window.limit))if(await eligible(user,auditId))output.push({id:String(user._id),name:user.name});return {data:output,hasMore:users.length>window.limit,page:window.page};
};
