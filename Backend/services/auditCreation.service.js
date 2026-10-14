const mongoose = require('mongoose');
const Audit = require('../models/audit.model');
const Snapshot = require('../models/auditDepartmentSnapshot.model');

exports.createAuditWithDepartmentSnapshot = async (payload, user) => {
  if (!user?.id) throw new Error('Authenticated audit author is required');
  const direction = require('./auditDirection.service').canonicalDirection(payload.auditType);
  const restaurant = await require('../models/restaurant.model').findOne({ id: payload.restaurantId }).lean();
  const linked = restaurant?.organizationId === 'gfc' && require('./auditCatalog.service').brandIds.includes(restaurant.brandId);
  const profile = await require('../models/auditorProfile.model').findById(user.id).lean();
  if (user.role === 'auditor' || profile) {
    if (!profile?.active || !direction || direction !== profile.direction || !linked) throw Object.assign(new Error('Audit direction or organization denied.'), { status: 403 });
  }
  await require('./auditTemplateRevision.service').resolveForAudit(payload, restaurant, direction);
  require('./auditAssessment.service').sanitizeNew(payload);
  delete payload.organizationId;
  delete payload.direction;
  // Public id remains unchanged; internal identity and provenance are server-owned.
  const auditId = new mongoose.Types.ObjectId();
  return require('./auditTransaction.service').transaction(async session => {
    if (profile) {
      const current = await require('./auditorProfile.service').lockProfile(user.id, session);
      if (current.direction !== direction) throw Object.assign(new Error('Audit direction changed; retry.'), { status: 409 });
    }
    if (payload.templateRevisionId) {
      const bound = await require('../models/auditTemplate.model').updateOne({ _id: payload.templateId, status: 'active', publishedRevisionId: payload.templateRevisionId }, { $inc: { __v: 1 } }, { session });
      if (!bound.modifiedCount) throw Object.assign(new Error('Template revision changed; retry.'), { status: 409 });
    }
    await Snapshot.create([{ auditId, auditorId: user.id, departmentId: user.departmentId || null }], { session });
    const [audit] = await Audit.create([{ ...payload, _id: auditId, auditorId: user.id }], { session });
    if (direction && linked) await require('../models/auditContext.model').create([{ _id: auditId, organizationId: 'gfc', brandId: restaurant.brandId, direction, templateRevisionId: payload.templateRevisionId, restaurantId: restaurant.id, actorId: user.id }], { session });
    return audit;
  });
};
