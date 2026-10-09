import api from "../api/axios";
export async function closeAudit(payload: { auditId: string; executionId?: string; comment?: string }, signal?: AbortSignal) {
  return (await api.post("/audit-closure", payload, { signal })).data;
}
export async function getClosure(auditId: string, signal?: AbortSignal) { return (await api.get(`/audit-closure/${auditId}`, { signal })).data; }
