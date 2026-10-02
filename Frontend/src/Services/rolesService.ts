import api from "../api/axios";
import type {
  Permission,
  PermissionScope,
  Role,
} from "../Types/auth";

export interface RoleRecord {
  id: string;
  name: string;
  key: Role;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean;
  isActive: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleInput {
  name: string;
  key: string;
  description?: string;
  permissions: Permission[];
}

export interface UpdateRoleInput {
  name?: string;
  key?: string;
  description?: string;
  permissions?: Permission[];
}

export interface PermissionInput {
  resource: string;
  action: string;
  scope: PermissionScope;
}

interface RolesResponse {
  roles: RoleRecord[];
}

interface RoleResponse {
  role: RoleRecord;
}

export async function getRoles(): Promise<RoleRecord[]> {
  const response = await api.get<RolesResponse>("/roles");
  return response.data.roles;
}

export async function getRoleById(
  id: string,
): Promise<RoleRecord> {
  const response = await api.get<RoleResponse>(`/roles/${id}`);
  return response.data.role;
}

export async function createRole(
  input: CreateRoleInput,
): Promise<RoleRecord> {
  const response = await api.post<RoleResponse>("/roles", input);
  return response.data.role;
}

export async function updateRole(
  id: string,
  patch: UpdateRoleInput,
): Promise<RoleRecord> {
  const response = await api.put<RoleResponse>(
    `/roles/${id}`,
    patch,
  );

  return response.data.role;
}

export async function setRoleActive(
  id: string,
  isActive: boolean,
): Promise<RoleRecord> {
  const response = await api.patch<RoleResponse>(
    `/roles/${id}/status`,
    { isActive },
  );

  return response.data.role;
}

export async function deleteRole(id: string): Promise<void> {
  await api.delete(`/roles/${id}`);
}
