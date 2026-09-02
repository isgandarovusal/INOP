export type RestaurantStatus = "active" | "inactive";

export interface Restaurant {
  id: string;
  name: string;
  location: string;
  status: RestaurantStatus;
  createdAt: string;
}

export interface AuditScores {
  cleanliness: number;
  service: number;
  food: number;
  staff: number;
}

export interface AuditFile {
  name: string;
  size: number;
  blobUrl: string | null;
}

export interface Audit {
  id: string;
  restaurantId: string;
  auditorId: string;
  auditType: string;
  date: string;
  scores: AuditScores;
  comments: string;
  photos: AuditFile[];
  attachments: AuditFile[];
  createdAt: string;
}
