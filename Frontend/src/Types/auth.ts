export type Role =
  | "admin"
  | "hr_manager"
  | "assistant_hr"
  | "employee"
  | "auditor"
  | "audit_manager"
  | "manager";

export type PermissionScope =
  | "all"
  | "department"
  | "assigned"
  | "own"
  | "none";

export interface Permission {
  resource: string;
  action: string;
  scope: PermissionScope;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  departmentId: string;
  position: string;
  isActive: boolean;
  createdAt: string;
  permissions: Permission[];
}

export type PublicUser = Omit<User, "password">;
