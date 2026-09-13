import api from "../api/axios";
import type { Department } from "../Types/core";

interface DepartmentsResponse {
  departments: Department[];
}

interface DepartmentResponse {
  department: Department;
}

export interface DepartmentInput {
  name: string;
  description: string;
}

export async function getDepartments(): Promise<Department[]> {
  const response =
    await api.get<DepartmentsResponse>("/departments");

  return response.data.departments;
}

export async function getDepartmentById(
  id: string,
): Promise<Department> {
  const response = await api.get<DepartmentResponse>(
    `/departments/${id}`,
  );

  return response.data.department;
}

export async function createDepartment(
  input: DepartmentInput,
): Promise<Department> {
  const response = await api.post<DepartmentResponse>(
    "/departments",
    input,
  );

  return response.data.department;
}

export async function updateDepartment(
  id: string,
  patch: Partial<DepartmentInput>,
): Promise<Department> {
  const response = await api.put<DepartmentResponse>(
    `/departments/${id}`,
    patch,
  );

  return response.data.department;
}

export async function deleteDepartment(
  id: string,
): Promise<void> {
  await api.delete(`/departments/${id}`);
}
