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
    let profile = await Profile.findById(userId).session(session);
    if (profile) {
      profile = await lockProfile(userId, session);
      // Writing the profile serializes direction changes and assignment creation.
      if (await Assignment.exists({ auditor: userId, status: { $in: ['assigned', 'accepted', 'started'] } }).session(session)) throw auditError(409, 'Finish or revoke active assignments before changing direction.');
    }
    const from = profile?.direction || null;
    if (!profile) profile = new Profile({ _id: userId, organizationId: 'gfc', direction });
    profile.direction = direction;
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
    if (!user || !audit || canonicalDirection(audit.auditType) !== profile.direction) throw auditError(403, 'Auditor direction does not match audit.');
    const Restaurant = require('../models/restaurant.model');
    if (!(await Restaurant.exists({ id: audit.restaurantId, organizationId: profile.organizationId, brandId: { $in: require('./auditCatalog.service').brandIds } }).session(session))) throw auditError(403, 'Audit organization is not verified.');
    const existing = await Assignment.findOne({ auditId, auditor }).session(session);
    if (existing) return { assignment: existing, created: false };
    const [assignment] = await Assignment.create([{ auditId, auditor, assignedBy: actorId, status: 'assigned' }], { session });
    return { assignment, created: true };
  });
}
module.exports = { changeDirection, assignAudit, lockProfile };
