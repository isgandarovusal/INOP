import API_BASE_URL from "./../config/api";
export interface AuditTimelineItem {
  _id: string;
  action: string;
  description: string;
  createdAt: string;
}




export async function getAuditTimeline(
 id: string,
): Promise<{ data: AuditTimelineItem[] }> {

 const res =
 await fetch(
 `${API_BASE_URL}/audit-timeline/${id}`
 );

 return res.json();

}
