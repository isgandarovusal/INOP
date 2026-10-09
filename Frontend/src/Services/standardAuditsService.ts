import { readJson } from "../api/readRequest";
import request from "../api/axios";
import type { StandardAudit } from "../Types/Audit";

const BASE = "/audits";

export async function getStandardAudits(): Promise<StandardAudit[]> {
  const { data } = await request.get(BASE);
  return (data as StandardAudit[]).filter(
    (audit) => (audit as StandardAudit & { auditType?: string }).auditType === "standard"
  );
}

export async function getStandardAuditById(
  id: string, signal?: AbortSignal, scopeKey?: string
): Promise<StandardAudit | undefined> {
  return readJson<StandardAudit | undefined>(`${BASE}/${id}`, { signal, scopeKey });
}

export async function createStandardAudit(
  input: Omit<StandardAudit, "id" | "auditorId" | "createdAt">
): Promise<StandardAudit> {
  const payload = {
    ...input,
    id: `standard-audit-${crypto.randomUUID()}`,
    auditType: "standard",
  };
  const { data } = await request.post(BASE, payload);
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
