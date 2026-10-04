const fail = (message, status = 403) => {
  const e = new Error(message);
  e.statusCode = status;
  throw e;
};
function checkUserChange(req, target, body) {
  if (req.user.role === "admin") return;
  if (req.user.role !== "hr_manager")
    fail("Only administrators and HR managers can manage users.");
  const allowed = ["employee", "assistant_hr"];
  if (target && !allowed.includes(target.role))
    fail("This role cannot be managed by HR.");
  if (body.role !== undefined && !allowed.includes(body.role))
    fail("HR may only assign employee or assistant_hr roles.");
  if (!target && !allowed.includes(body.role)) fail("Invalid role assignment.");
  if (
    !req.user.departmentId ||
    (body.departmentId !== undefined &&
      body.departmentId !== req.user.departmentId)
  )
    fail("Users must remain in your department.");
}
function requireManager(req) {
  if (!["admin", "audit_manager"].includes(req.user.role))
    fail("Audit manager permission required.");
}
module.exports = { fail, checkUserChange, requireManager };
