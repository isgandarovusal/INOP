const { getPermissionScope } = require('../middleware/auth.middleware');
exports.checkAuditAccess = async (req, res, next) => {
  try {
    const scope = await getPermissionScope(req.user.role, 'audit', 'read');
    return res.json({ success: true, access: Boolean(scope) });
  } catch (error) { return next(error); }
};
