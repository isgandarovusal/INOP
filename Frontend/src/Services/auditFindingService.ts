import api from "../api/axios";
export interface AuditFinding { _id: string; title: string; description: string; severity: string; status: string; }
export async function getFindings(id: string, signal?: AbortSignal): Promise<{ data: AuditFinding[] }> {
  return (await api.get(`/audit-findings/${id}`, { signal })).data;
}
export async function createFinding(data: Record<string, unknown>) { return (await api.post("/audit-findings", data)).data; }
