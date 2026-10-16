// Unsupported legacy ownership scopes remain fail-closed.
exports.requireGlobalRestaurantAccess = async (req, res, next) => {
  if (req.permission?.scope !== 'all') return res.status(403).json({ message: 'Restaurant access requires an explicit all scope.' });
  if (req.auditorProfile && !['GET','HEAD'].includes(req.method)) {
    const brandIds = await require('../services/auditAudience.service').visibleBrands(req);
    const assignedFilter=await require('../services/auditAudience.service').restaurantFilter(req);
    if (req.method === 'POST' && (req.body.organizationId !== 'gfc' || !brandIds.includes(req.body.brandId))) return res.status(403).json({ message: 'Verified organization/brand required.' });
    if (req.params.id) {
      const restaurant = await require('../models/restaurant.model').findOne({ $and:[{id:req.params.id},assignedFilter] }).lean();
      if (!restaurant) return res.status(403).json({ message: 'Restaurant organization denied.' });
      if(Object.hasOwn(req.body||{},'brandId')&&req.body.brandId!==restaurant.brandId)return res.status(403).json({message:'Brand reassignment requires central management.'});
      if (Object.hasOwn(req.body || {}, 'organizationId') && req.body.organizationId !== 'gfc') return res.status(403).json({ message: 'Organization reassignment requires management.' });
    }
  }
  next();
};
