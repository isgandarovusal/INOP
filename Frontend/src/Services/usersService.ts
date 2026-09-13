import api from "../api/axios";
import type { PublicUser, Role } from "../Types/auth";

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  departmentId: string;
  position: string;
}

export type UpdateUserInput = Partial<
  Omit<CreateUserInput, "password">
> & {
  password?: string;
};

interface UsersResponse {
  users: PublicUser[];
}

interface UserResponse {
  user: PublicUser;
}

export async function getUsers(): Promise<PublicUser[]> {
  const response = await api.get<UsersResponse>("/users");
  return response.data.users;
}

export async function getUserById(
  id: string,
): Promise<PublicUser> {
  const response = await api.get<UserResponse>(`/users/${id}`);
  return response.data.user;
}

export async function createUser(
  input: CreateUserInput,
): Promise<PublicUser> {
  const response = await api.post<UserResponse>("/users", input);
  return response.data.user;
}

export async function updateUser(
  id: string,
  patch: UpdateUserInput,
): Promise<PublicUser> {
  const response = await api.put<UserResponse>(
    `/users/${id}`,
    patch,
  );

  return response.data.user;
}

export async function setUserActive(
  id: string,
  isActive: boolean,
): Promise<PublicUser> {
  const response = await api.patch<UserResponse>(
    `/users/${id}/status`,
    { isActive },
  );

  return response.data.user;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}
