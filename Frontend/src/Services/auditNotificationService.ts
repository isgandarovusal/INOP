import api from "../api/axios";
export interface AuditNotification { _id: string; title: string; message: string; read: boolean; }
export async function getAuditNotifications(): Promise<{ data: AuditNotification[] }> {
  return (await api.get<{ data: AuditNotification[] }>("/audit-notification")).data;
}
export async function markNotificationRead(id: string) {
  return (await api.patch(`/audit-notification/${encodeURIComponent(id)}/read`)).data;
}
