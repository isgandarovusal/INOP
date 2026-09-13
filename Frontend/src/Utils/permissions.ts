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

  return (user.permissions || []).some((permission) =>
    permissionMatches(permission, resource, action),
  );
}

export function getPermissionScope(
  user: PublicUser | null,
  resource: string,
  action: string,
): Permission["scope"] | null {
  if (!user) {
    return null;
  }

  const permission = (user.permissions || []).find((item) =>
    permissionMatches(item, resource, action),
  );

  return permission?.scope || null;
}

const SECTION_PERMISSIONS: Record<Section, [string, string][]> = {
  dashboard: [["dashboard", "read"]],
  recruitment: [["recruitment", "read"]],
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

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  hr_manager: "HR Manager",
  assistant_hr: "Assistant HR",
  employee: "Employee",
  auditor: "Auditor",
  audit_manager: "Audit Manager",
  manager: "Manager",
};
