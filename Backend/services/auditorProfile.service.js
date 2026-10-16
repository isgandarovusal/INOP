const Profile = require('../models/auditorProfile.model');
const Assignment = require('../models/auditAssignment.model');
const Audit = require('../models/audit.model');
const User = require('../models/user.model');
const { canonicalDirection } = require('./auditDirection.service');
const { transaction, auditError } = require('./auditTransaction.service');
async function lockProfile(userId, session) {
  const profile = await Profile.findOneAndUpdate({ _id: userId, active: true }, { $inc: { version: 1 } }, { returnDocument: 'after', session });
  if (!profile) throw auditError(403, 'Active auditor direction is required.');
  return profile;
}
async function changeDirection(userId, direction, actorId, reason) {
  direction = canonicalDirection(direction);
  if (!direction || typeof reason !== 'string' || !reason.trim() || reason.length > 500) throw auditError(400, 'Canonical direction and change reason are required.');
  return transaction(async session => {
    const user = await User.findOne({ _id: userId, isActive: true }).session(session);
    if (!user) throw auditError(404, 'Active user not found.');
    const scope=await require('../middleware/auth.middleware').getPermissionScope(user.role,'audit','read');
    if (['admin','audit_manager'].includes(user.role) || !scope || scope==='none') throw auditError(400,'Profile requires an audit worker account; management roles remain separate.');
    let profile = await Profile.findById(userId).session(session);
    if (profile) {
      profile = await lockProfile(userId, session);
      // Writing the profile serializes direction changes and assignment creation.
      if (await Assignment.exists({ auditor: userId, status: { $in: ['assigned', 'accepted', 'started'] } }).session(session)) throw auditError(409, 'Finish or revoke active assignments before changing direction.');
    }
    if (!profile && await Assignment.exists({ auditor: userId, status: { $in: ['assigned','accepted','started'] } }).session(session)) throw auditError(409, 'Review/revoke legacy assignments before creating a profile.');
    const from = profile ? require('./auditDirection.service').profileDirections(profile).join(',') : null;
    if (!profile) profile = new Profile({ _id: userId, organizationId: 'gfc', direction });
    profile.direction = direction; profile.directions = undefined;
    profile.history.push({ from, to: direction, actorId, reason: reason.trim(), changedAt: new Date() });
    await profile.save({ session });
    return profile;
  });
}
async function assignAudit({ auditId, auditor, actorId }) {
  return transaction(async session => {
    const profile = await lockProfile(auditor, session);
    const user = await User.findOne({ _id: auditor, isActive: true }).session(session);
    const audit = await Audit.findById(auditId).session(session);
    if (!user || !audit || !require('./auditDirection.service').hasDirection(profile,audit.auditType)) throw auditError(403, 'Auditor direction does not match audit.');
    const Restaurant = require('../models/restaurant.model');
    if(audit.templateSnapshot?.hseSource&&['office','warehouse'].includes(audit.hseObjectType)){
      if(!await require('../models/hseObject.model').exists({id:audit.hseObjectId,objectType:audit.hseObjectType,organizationId:profile.organizationId,active:true}).session(session))throw auditError(403,'HSE object organization is not verified.');
      await require('./hseObjectAccess.service').lockGrant({id:String(user._id)},profile,'assigned',audit.hseObjectId,session);
    }else if (!(await Restaurant.exists({ id: audit.restaurantId, organizationId: profile.organizationId, brandId: { $in: require('./auditCatalog.service').brandIds } }).session(session))) throw auditError(403, 'Audit organization is not verified.');
    const existing = await Assignment.findOne({ auditId, auditor }).session(session);
    if (existing) return { assignment: existing, created: false };
    const [assignment] = await Assignment.create([{ auditId, auditor, assignedBy: actorId, status: 'assigned' }], { session });
    return { assignment, created: true };
  });
}
module.exports = { changeDirection, assignAudit, lockProfile };
module.exports.changeDirections=async(userId,values,expectedVersion,actorId,reason)=>{
 const {directions,profileDirections}=require('./auditDirection.service');
 if(!Array.isArray(values)||!values.length||values.length>4||new Set(values).size!==values.length||values.some(d=>!directions.includes(d))||!Number.isInteger(expectedVersion)||typeof reason!=='string'||!reason.trim()||reason.length>500)throw auditError(400,'Explicit canonical directions, version and reason required.');
 return transaction(async session=>{
  const user=await User.findOne({_id:userId,isActive:true}).session(session);
  if(!user||['admin','audit_manager'].includes(user.role))throw auditError(400,'An active audit worker account is required.');
  const readScope=await require('../middleware/auth.middleware').getPermissionScope(user.role,'audit','read');if(!readScope||readScope==='none')throw auditError(400,'An audit worker permission is required.');
  const profile=await Profile.findOne({_id:userId,organizationId:'gfc',active:true,version:expectedVersion}).session(session);
  if(!profile)throw auditError(409,'Profile changed; reload before granting directions.');
  const removed=profileDirections(profile).filter(d=>!values.includes(d));
  const active=await Assignment.find({auditor:userId,status:{$in:['assigned','accepted','started']}}).select('auditId').session(session).lean();
  if(removed.length&&await Audit.exists({_id:{$in:active.map(a=>a.auditId)},auditType:{$in:removed.flatMap(require('./auditDirection.service').aliasesFor)}}).session(session))throw auditError(409,'Revoke or finish assignments before removing their direction.');
  const changed=await Profile.findOneAndUpdate({_id:userId,active:true,version:expectedVersion},{$set:{direction:values.includes(profile.direction)?profile.direction:values[0],directions:values},$inc:{version:1},$push:{history:{from:profileDirections(profile).join(','),to:values.join(','),actorId,reason:reason.trim(),changedAt:new Date()}}},{session,returnDocument:'after',runValidators:true});
  if(!changed)throw auditError(409,'Profile changed.');return changed;
 });
};
