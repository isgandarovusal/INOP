import type {
  Permission,
  PublicUser,
  Role,
} from "../Types/auth";

export type Section =
  | "dashboard"
  | "recruitment"
  | "audit"
  | "users"
  | "departments"
  | "roles"
  | "activityLog";

export function hasHRAccess(user: PublicUser | null): boolean {
  if (!user) return false;
  // Server metadata is authoritative for the UI. Legacy canonical membership
  // keeps a coordinated frontend/backend upgrade compatible; API still checks DB.
  return user.role === 'admin' || (user.departmentId === 'dep_hr' && user.hrAccess !== false);
}

function permissionMatches(
  permission: Permission,
  resource: string,
  action: string,
): boolean {
  const resourceMatches =
    permission.resource === "*" ||
    permission.resource === resource;

  const actionMatches =
    permission.action === "*" ||
    permission.action === action;

  return resourceMatches && actionMatches;
}

export function hasPermission(
  user: PublicUser | null,
  resource: string,
  action: string,
): boolean {
  if (!user) {
    return false;
  }

  const scope = getPermissionScope(user, resource, action);
  return scope !== null && scope !== "none";
}

export function getPermissionScope(
  user: PublicUser | null,
  resource: string,
  action: string,
): Permission["scope"] | null {
  if (!user) {
    return null;
  }

  if (['recruitment', 'candidate', 'application'].includes(resource) && !hasHRAccess(user)) return null;

  const permission = (user.permissions || []).find((item) =>
    permissionMatches(item, resource, action),
  );

  return permission?.scope || null;
}

const SECTION_PERMISSIONS: Record<Section, [string, string][]> = {
  dashboard: [["dashboard", "read"]],
  recruitment: [["recruitment", "read"], ["candidate", "read"], ["application", "read"]],
  audit: [["audit", "read"]],
  users: [["user", "read"]],
  departments: [["department", "read"]],
  roles: [["role", "read"]],
  activityLog: [["activity_log", "read"]],
};

export function canAccessSection(
  user: PublicUser | null,
  section: Section,
): boolean {
  const requiredPermissions = SECTION_PERMISSIONS[section] || [];

  return requiredPermissions.some(([resource, action]) =>
    hasPermission(user, resource, action),
  );
}

export function canManageRecruitment(
  user: PublicUser | null,
): boolean {
  return (
    hasPermission(user, "recruitment", "create") ||
    hasPermission(user, "recruitment", "update") ||
    hasPermission(user, "candidate", "create") ||
    hasPermission(user, "candidate", "update") ||
    hasPermission(user, "application", "create") ||
    hasPermission(user, "application", "update")
  );
}

export function canManageAudit(
  user: PublicUser | null,
): boolean {
  return (
    hasPermission(user, "audit", "create") ||
    hasPermission(user, "audit", "update")
  );
}

export function canManageCore(
  user: PublicUser | null,
): boolean {
  return (
    hasPermission(user, "user", "create") ||
    hasPermission(user, "user", "update") ||
    hasPermission(user, "role", "create") ||
    hasPermission(user, "role", "update")
  );
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  hr_manager: "HR Manager",
  assistant_hr: "Assistant HR",
  employee: "Employee",
  auditor: "Auditor",
  audit_manager: "Audit Manager",
  manager: "Manager",
};

export function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role] || role;
}

export function canAccessAuditDirection(user: PublicUser | null, direction: string, resource = 'audit'): boolean {
  if (!hasPermission(user, resource, 'read')) return false;
  if (user?.role === 'auditor' && !user.auditDirection) return false;
  return !user?.auditDirection || (user.auditDirections || [user.auditDirection]).includes(direction as NonNullable<PublicUser['auditDirection']>);
}
