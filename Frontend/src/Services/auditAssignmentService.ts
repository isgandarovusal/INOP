import api from "../api/axios";
export interface AuditAssignment { _id: string; auditor?: { name?: string } | string | null; status: string; }
export async function getAssignments(id: string, signal?: AbortSignal): Promise<{ data: AuditAssignment[] }> {
  return (await api.get(`/audit-assignments/${id}`, { signal })).data;
}
export async function assignAudit(data: Record<string, unknown>) { return (await api.post("/audit-assignments", data)).data; }
