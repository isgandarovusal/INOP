// Restaurants currently have no trusted owner, department or assignment link.
// Preserve explicit global grants and deny unsupported scopes before any query.
exports.requireGlobalRestaurantAccess = (req, res, next) => {
  if (req.permission?.scope !== 'all') {
    return res.status(403).json({ message: 'Restaurant access requires an explicit all scope.' });
  }
  return next();
};
