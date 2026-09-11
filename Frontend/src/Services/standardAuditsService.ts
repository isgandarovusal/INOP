import request from "./api";
import type { StandardAudit } from "../Types/Audit";

const BASE = "/audits";

export async function getStandardAudits(): Promise<StandardAudit[]> {
  const { data } = await request.get(BASE);
  return (data as StandardAudit[]).filter(
    (audit) => (audit as StandardAudit & { auditType?: string }).auditType === "standard"
  );
}

export async function getStandardAuditById(
  id: string
): Promise<StandardAudit | undefined> {
  const { data } = await request.get(`${BASE}/${id}`);
  return data;
}

export async function createStandardAudit(
  input: Omit<StandardAudit, "id" | "auditorId" | "createdAt">
): Promise<StandardAudit> {
  const { data } = await request.post(BASE, input);
  return data;
}

export async function updateStandardAudit(
  audit: StandardAudit
): Promise<StandardAudit> {
  const { data } = await request.put(`${BASE}/${audit.id}`, audit);
  return data;
}

export async function deleteStandardAudit(id: string): Promise<void> {
  await request.delete(`${BASE}/${id}`);
}
