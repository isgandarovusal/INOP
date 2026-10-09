import { readJson } from "../api/readRequest";
import api from "../api/axios";
export interface AuditAssignment { _id: string; auditor?: { name?: string } | string | null; status: string; }
export async function getAssignments(id: string, signal?: AbortSignal, scopeKey?: string): Promise<{ data: AuditAssignment[] }> {
  return readJson(`/audit-assignments/${id}`, { signal, scopeKey });
}
export async function assignAudit(data: Record<string, unknown>) { return (await api.post("/audit-assignments", data)).data; }
