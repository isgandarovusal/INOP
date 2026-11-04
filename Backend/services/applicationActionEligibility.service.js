const { getDataScope } = require('../middleware/dataScope.middleware');
const permissions = require('./directionalPermissions.service');
const { isHRMember } = require('./hrDepartmentAccess.service');

// Advisory scope eligibility, not stage/parent/command validation. Mutation
// routes remain authoritative. Reuse requirePermission's exact grant resolver
// and authorize's scope predicate; never reconstruct policy from read access.
function eligible(req, row, action) {
  if (!req.user?.id || !isHRMember(req.user) || !Array.isArray(req.authRole?.permissions)) return false;
  const scope = permissions.scope(req.authRole.permissions, 'application', action, permissions.requestDirection(req));
  const filter = getDataScope({ user: req.user, permission: { scope } });
  if (!filter) return false;
  // getDataScope currently emits only equality predicates. Fail closed if its
  // contract grows rather than interpreting an unfamiliar Mongo predicate.
  return Object.entries(filter).every(([field, value]) =>
    ['createdBy', 'assignedTo', 'departmentId'].includes(field) && value != null &&
    row[field] != null && String(row[field]) === String(value));
}
function actionEligibility(req, row) {
  return { version: 'application-actions-v1', applicationId: String(row._id), revision: row.__v || 0,
    update: eligible(req, row, 'update'), delete: eligible(req, row, 'delete') };
}
module.exports = { actionEligibility };
