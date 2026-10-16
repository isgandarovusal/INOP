const User = require('../models/user.model');
const Profile = require('../models/auditorProfile.model');
const Audit = require('../models/audit.model');
const { canonicalDirection } = require('./auditDirection.service');
async function assignmentCandidates(auditId) {
  const audit = await Audit.findById(auditId).lean();
  const direction = canonicalDirection(audit?.auditType);
  if (!direction) return [];
  let profiles = await Profile.find({ active: true, organizationId: 'gfc', ...require('./auditDirection.service').profileQuery(direction) }).select('_id').lean();
  if(audit.templateSnapshot?.hseSource&&['office','warehouse'].includes(audit.hseObjectType)){const ids=await require('../models/hseObjectGrant.model').distinct('userId',{objectId:audit.hseObjectId,active:true});profiles=profiles.filter(p=>ids.includes(String(p._id)));}
  const users = await User.find({ _id: { $in: profiles.map(row => row._id) }, isActive: true }).select('_id name').lean();
  return users.map(row => ({ id: String(row._id), name: row.name }));
}
async function reviewerCandidates(req) {
  const users = await User.find({ isActive: true, _id: { $ne: req.user.id } }).select('_id name role departmentId').lean();
  const audit = await Audit.findById(req.auditScopeId).lean();
  const contributors = (audit?.templateSnapshot?.standardSource||audit?.templateSnapshot?.hseSource)
    ? await require(`../models/${audit.templateSnapshot.hseSource?'hse':'standard'}AuditSave.model`).distinct('actor', { auditId: audit._id }) : [];
  if(audit?.hseSubmission?.actorId)contributors.push(audit.hseSubmission.actorId);
  if (audit?.standardSubmission?.actorId) contributors.push(audit.standardSubmission.actorId);
  const output = [];
  for (const user of users) {
    if (contributors.includes(String(user._id))) continue;
    const scope = await require('../middleware/auth.middleware').getPermissionScope(user.role, 'audit.approval', 'update');
    if (!scope || scope === 'none') continue;
    const profile = await Profile.findById(user._id).lean();
    if ((user.role === 'auditor' && !profile?.active) || (profile && !profile.active)) continue;
    const filter = await require('../middleware/auditScope.middleware').getAuditScopeFilter({ user: { id: String(user._id), role: user.role, departmentId: user.departmentId }, permission: { scope }, auditorProfile: profile || undefined });
    if (filter && await Audit.exists({ $and: [{ _id: req.auditScopeId }, filter] })) output.push({ id: String(user._id), name: user.name });
  }
  return output;
}
module.exports = { assignmentCandidates, reviewerCandidates };
