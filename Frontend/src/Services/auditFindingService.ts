import { readJson } from "../api/readRequest";
import api from "../api/axios";
export interface AuditFinding { _id: string; title: string; description: string; severity: string; status: string; }
export async function getFindings(id: string, signal?: AbortSignal, scopeKey?: string): Promise<{ data: AuditFinding[] }> {
  return readJson(`/audit-findings/${id}`, { signal, scopeKey });
}
export async function createFinding(data: Record<string, unknown>) { return (await api.post("/audit-findings", data)).data; }
