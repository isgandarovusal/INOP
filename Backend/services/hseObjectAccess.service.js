const ObjectModel=require('../models/hseObject.model');
const Grant=require('../models/hseObjectGrant.model');
async function visibleIds(req){
 if(req.auditorProfile&&(!req.auditorProfile.active||req.auditorProfile.direction!=='occupational-safety'||req.auditorProfile.organizationId!=='gfc'))return[];
 if(req.user.role==='auditor'&&!req.auditorProfile)return[];
 const filter={organizationId:'gfc'};
 if(req.auditorProfile||req.permission?.scope!=='all'){const grants=await Grant.find({userId:req.user.id,active:true}).select('objectId').lean();filter.id={$in:grants.map(g=>g.objectId)};}
 return ObjectModel.distinct('id',filter).maxTimeMS(5000);
}
async function objects(req){return ObjectModel.find({id:{$in:await visibleIds(req)},organizationId:'gfc',active:true}).select('id name location objectType organizationId').lean();}
async function lockGrant(user,profile,scope,objectId,session){if(!profile&&scope==='all')return;const grant=await Grant.findOneAndUpdate({userId:user.id,objectId,active:true},{$inc:{writeVersion:1}},{session,returnDocument:'after'});if(!grant)throw require('./auditTransaction.service').auditError(403,'HSE object grant changed.');}
module.exports={visibleIds,objects,lockGrant};
