// Canonical membership, independent of grants. Never infer it from a name,
// role, wildcard permission, JWT claim, request body or department label.
// Adding any other department requires an explicitly confirmed policy change.
function isHRMember(user) {
  return Boolean(user && (user.role === 'admin' || user.departmentId === 'dep_hr'));
}
function isHRResource(resource) {
  return ['candidate', 'application', 'recruitment'].includes(resource);
}
module.exports = { isHRMember, isHRResource };
