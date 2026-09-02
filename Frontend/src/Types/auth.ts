export type Role = "admin" | "hr" | "auditor" | "manager";

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
}

export type PublicUser = Omit<User, "password">;
