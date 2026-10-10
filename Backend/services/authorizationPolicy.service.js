const VALID_SCOPES = new Set(["all", "department", "assigned", "own", "none"]);

// An exact rule takes precedence over wildcard rules, including explicit denials.
function permissionScope(permissions, resource, action) {
  const matches = (permissions || []).filter((permission) =>
    permission && VALID_SCOPES.has(permission.scope) &&
    (permission.resource === resource || permission.resource === "*") &&
    (permission.action === action || permission.action === "*")
  );
  if (!matches.length) return null;
  const specificity = (permission) =>
    Number(permission.resource === resource) + Number(permission.action === action);
  const best = Math.max(...matches.map(specificity));
  const scopes = matches.filter((permission) => specificity(permission) === best)
    .map((permission) => permission.scope);
  if (scopes.includes("none")) return null;
  return ["all", "department", "assigned", "own"].find((scope) => scopes.includes(scope)) || null;
}

function unrestricted(permissions) {
  return (permissions || []).some((permission) =>
    permission.resource === "*" && permission.action === "*" && permission.scope === "all"
  ) && (permissions || []).every((permission) => permission.scope === "all");
}

const BASELINE_PERMISSIONS = new Set([
  "dashboard:read", "profile:read", "profile:update",
  "internal_request:read", "internal_request:create", "internal_request:update",
]);

function canDelegate(actorPermissions, targetPermissions) {
  if (unrestricted(actorPermissions)) return true;
  return (targetPermissions || []).every((permission) => {
    if (permission.scope === "none") return true;
    // Partial wildcard authority can contain exact denials. Re-delegating a
    // wildcard would omit those denials and turn restricted access into full
    // access; only an unrestricted administrator may grant wildcards.
    if (permission.resource === "*" || permission.action === "*") return false;
    // Employees may operate their own profile and requests without giving HR
    // permission to read or change those private resources on their behalf.
    if (permission.scope === "own" &&
        BASELINE_PERMISSIONS.has(`${permission.resource}:${permission.action}`)) return true;
    const allowed = permissionScope(actorPermissions, permission.resource, permission.action);
    return Boolean(allowed && (allowed === "all" || allowed === permission.scope));
  });
}

function privileged(permissions) {
  return unrestricted(permissions) || ["user", "role"].some((resource) =>
    ["create", "update", "delete"].some((action) => permissionScope(permissions, resource, action))
  );
}

module.exports = { permissionScope, unrestricted, canDelegate, privileged };
