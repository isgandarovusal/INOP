import { readJson } from "../api/readRequest";
export interface AuditTimelineItem { _id: string; action: string; description: string; createdAt: string; }
export async function getAuditTimeline(id: string, signal?: AbortSignal, scopeKey?: string): Promise<{ data: AuditTimelineItem[] }> {
  return readJson(`/audit-timeline/${id}`, { signal, scopeKey });
}
