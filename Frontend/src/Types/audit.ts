export type RestaurantStatus = "active" | "inactive";

export interface Restaurant {
  organizationId?: "gfc" | null;
  brandId?: "kfc" | "pizza-hut" | "simit-sarayi" | null;
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
  assessmentStatus?: string;
  hrAssessment?: {contract:string;sections:{id:string;title:string;percentage:number|null}[]};
  hrDetails?: import('../Services/hrAuditService').HRDetails;
  id: string;
  restaurantId: string;
  auditorId: string;
  auditType: string;
  date: string;
  scores: AuditScores;
  comments: string;
  photos: AuditFile[];
  attachments: AuditFile[];
  overallPercentage?: number;
  status?: string;
  checks?: unknown[];
  findings?: unknown[];
  recommendations?: unknown[];
  createdAt: string;
}
