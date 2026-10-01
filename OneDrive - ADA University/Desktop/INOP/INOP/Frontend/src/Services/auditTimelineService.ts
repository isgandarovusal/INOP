import authenticatedFetch from "../api/authenticatedFetch";
export interface AuditTimelineItem {
  _id: string;
  action: string;
  description: string;
  createdAt: string;
}

const API = import.meta.env.VITE_API_BASE_URL || "/api";

export async function getAuditTimeline(
  id: string,
): Promise<{ data: AuditTimelineItem[] }> {
  const res = await authenticatedFetch(`${API}/audit-timeline/${id}`);

  return res.json();
}
