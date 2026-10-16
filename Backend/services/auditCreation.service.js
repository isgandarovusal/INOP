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
    if (!profile?.active || !direction || !require('./auditDirection.service').hasDirection(profile,direction) || !linked) throw Object.assign(new Error('Audit direction or organization denied.'), { status: 403 });
  }
  if(!await require('./auditAudience.service').mayCreateAt(user,profile,restaurant,direction))throw Object.assign(new Error('Restaurant is outside the audit assignment.'),{status:403});
  await require('./auditTemplateRevision.service').resolveForAudit(payload, restaurant, direction);
  if(profile&&direction==='standard'){if(!payload.templateSnapshot?.standardSource)throw Object.assign(new Error('A complete reviewed Standard catalogue is required.'),{status:409});require('./standardAuditAssessment.service').verifiedSource(payload.templateSnapshot);}
  if(payload.templateSnapshot?.standardSource){payload.standardRestaurantSnapshot={id:restaurant.id,name:restaurant.name,location:restaurant.location||'',organizationId:restaurant.organizationId,brandId:restaurant.brandId};payload.standardAuditorSnapshot={id:user.id,name:(await require('../models/user.model').findById(user.id).select('name').lean())?.name||''};}else{delete payload.standardRestaurantSnapshot;delete payload.standardAuditorSnapshot;}
  require('./auditAssessment.service').sanitizeNew(payload);
  delete payload.organizationId;
  delete payload.direction;
  // Public id remains unchanged; internal identity and provenance are server-owned.
  const auditId = new mongoose.Types.ObjectId();
  return require('./auditTransaction.service').transaction(async session => {
    if (profile) {
      const current = await require('./auditorProfile.service').lockProfile(user.id, session);
      if(!await require('./auditAudience.service').mayCreateAt(user,current,restaurant,direction))throw Object.assign(new Error('Restaurant assignment changed; retry.'),{status:403});
      if (!require('./auditDirection.service').hasDirection(current,direction)) throw Object.assign(new Error('Audit direction changed; retry.'), { status: 409 });
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
