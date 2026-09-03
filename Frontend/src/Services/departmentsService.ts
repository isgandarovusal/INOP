import { makeCrud } from "./collection";
import { generateId } from "./storage";
import type { Department } from "../Types/core";

const crud = makeCrud<Department>("departments", "Department", (d) => d.name);

export const getDepartments = crud.getAll;
export const getDepartmentById = crud.getById;
export const deleteDepartment = crud.remove;

export interface DepartmentInput {
  name: string;
  description: string;
}

export async function createDepartment(input: DepartmentInput): Promise<Department> {
  const department: Department = {
    id: generateId("dep"),
    createdAt: new Date().toISOString(),
    ...input,
  };
  return crud.create(department);
}

export async function updateDepartment(
  id: string,
  patch: Partial<DepartmentInput>,
): Promise<Department | undefined> {
  return crud.update(id, patch);
}
