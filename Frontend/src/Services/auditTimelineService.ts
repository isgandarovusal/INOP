import api from "../api/axios";
export interface AuditTimelineItem { _id: string; action: string; description: string; createdAt: string; }
export async function getAuditTimeline(id: string, signal?: AbortSignal): Promise<{ data: AuditTimelineItem[] }> {
  return (await api.get(`/audit-timeline/${id}`, { signal })).data;
}
