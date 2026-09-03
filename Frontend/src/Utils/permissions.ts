import type { Role } from "../Types/auth";

export type Section =
  | "dashboard"
  | "recruitment"
  | "audit"
  | "users"
  | "departments"
  | "roles"
  | "activityLog";

const SECTION_ACCESS: Record<Role, Section[]> = {
  admin: ["dashboard", "recruitment", "audit", "users", "departments", "roles", "activityLog"],
  hr: ["dashboard", "recruitment"],
  auditor: ["dashboard", "audit"],
  manager: ["dashboard", "audit"],
};

export function canAccessSection(role: Role, section: Section): boolean {
  return SECTION_ACCESS[role]?.includes(section) ?? false;
}

export function canManageRecruitment(role: Role): boolean {
  return role === "admin" || role === "hr";
}

export function canManageAudit(role: Role): boolean {
  return role === "admin" || role === "auditor";
}

export function canManageCore(role: Role): boolean {
  return role === "admin";
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  hr: "HR",
  auditor: "Auditor",
  manager: "Manager",
};
