const { getUserPermissionScope } = require("../middleware/authorization.middleware");
const { getDataScope } = require("../middleware/dataScope.middleware");

async function referenceScope(req, resource, action = "read") {
  const scope = await getUserPermissionScope(req.user?.role, resource, action);
  const filter = getDataScope({ ...req, permission: { resource, action, scope } });
  if (!scope || scope === "none" || filter === null) {
    const error = new Error(`Permission ${resource}.${action} is required.`);
    error.status = 403;
    throw error;
  }
  return filter;
}

module.exports = { referenceScope };
