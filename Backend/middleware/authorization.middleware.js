const {
  requirePermission,
  requireAnyPermission,
  getPermissionScope,
} = require("./auth.middleware");

const {
  getDataScope,
} = require("./dataScope.middleware");

exports.authorize = (resource, action) => {
  return [
    requirePermission(resource, action),
    (req, res, next) => {
      req.dataScope = getDataScope(req);

      if (req.dataScope === null) {
        return res.status(403).json({
          message:
            "Bu məlumat səviyyəsinə giriş üçün kifayət qədər icazəniz yoxdur.",
        });
      }

      req.authorizedScopes ||= {};
      req.authorizedScopes[`${resource}:${action}`] = {
        permission: { ...req.permission }, dataScope: { ...req.dataScope },
      };

      next();
    },
  ];
};

exports.authorizeAny = (permissions) => {
  return [
    requireAnyPermission(permissions),
    (req, res, next) => {
      req.dataScope = getDataScope(req);

      if (req.dataScope === null) {
        return res.status(403).json({
          message:
            "Bu məlumat səviyyəsinə giriş üçün kifayət qədər icazəniz yoxdur.",
        });
      }

      req.authorizedScopes ||= {};
      req.authorizedScopes[`${req.permission.resource}:${req.permission.action}`] = {
        permission: { ...req.permission }, dataScope: { ...req.dataScope },
      };

      next();
    },
  ];
};

exports.getUserPermissionScope = async (
  role,
  resource,
  action
) => {
  return getPermissionScope(role, resource, action);
};
