// Unsupported legacy ownership scopes remain fail-closed.
exports.requireGlobalRestaurantAccess = async (req, res, next) => {
  if (req.permission?.scope !== 'all') return res.status(403).json({ message: 'Restaurant access requires an explicit all scope.' });
  if (req.auditorProfile && !['GET','HEAD'].includes(req.method)) {
    const { brandIds } = require('../services/auditCatalog.service');
    if (req.method === 'POST' && (req.body.organizationId !== 'gfc' || !brandIds.includes(req.body.brandId))) return res.status(403).json({ message: 'Verified organization/brand required.' });
    if (req.params.id) {
      const restaurant = await require('../models/restaurant.model').findOne({ id: req.params.id, organizationId: 'gfc', brandId: { $in: brandIds } }).lean();
      if (!restaurant) return res.status(403).json({ message: 'Restaurant organization denied.' });
      if (Object.hasOwn(req.body || {}, 'organizationId') && req.body.organizationId !== 'gfc') return res.status(403).json({ message: 'Organization reassignment requires management.' });
    }
  }
  next();
};
