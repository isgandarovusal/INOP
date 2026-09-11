export type AuditStatus = "draft" | "completed" | "failed";

export interface AuditMeta {
  id: string;
  restaurantId: string;
  auditorId: string;
  date: string;
  shift: string;
  status: AuditStatus;
  createdAt: string;
}

export interface AuditFinding {
  id: string;
  note: string;
}
