// The existing audit ownership/assignment relation is the authority. No brand or
// restaurant grant is inferred from a request, a worksheet name or a role label.
const Restaurant = require('../models/restaurant.model');
const { brandIds } = require('./auditCatalog.service');
async function restaurantFilter(req) {
  if (!req.auditorProfile && req.permission?.scope === 'all') return {organizationId:{$in:['gfc','',null]}};
  const scope = await require('../middleware/auditScope.middleware').getAuditScopeFilter(req);
  if (!scope) return { id: { $in: [] } };
  const ids = await require('../models/audit.model').distinct('restaurantId', scope).maxTimeMS(5000);
  return { id: { $in: ids }, organizationId: 'gfc', brandId: { $in: brandIds }, archivedAt: null };
}
async function visibleBrands(req) {
  if (!req.auditorProfile && req.permission?.scope === 'all') return brandIds;
  return Restaurant.distinct('brandId', await restaurantFilter(req)).maxTimeMS(5000);
}
async function mayCreateAt(user, profile, restaurant) {
  if (!profile) return user.role !== 'auditor';
  const filter = await restaurantFilter({ user, auditorProfile: profile, permission: { scope: 'assigned' } });
  return Boolean(restaurant && await Restaurant.exists({ $and: [filter, { _id: restaurant._id }] }));
}
module.exports = { restaurantFilter, visibleBrands, mayCreateAt };
