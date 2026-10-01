import api from "../api/axios";

export interface AuditDashboardStat {
  _id: string;
  count: number;
}

export interface AuditDashboardTrend {
  _id: string;
  count: number;
}

export interface AuditDashboardData {
  totalAudits: number;
  completedAudits: number;
  pendingAudits: number;
  averageScore: number;
  riskStats: AuditDashboardStat[];
  typeStats: AuditDashboardStat[];
  trend: AuditDashboardTrend[];
}

async function request<T>(path: string): Promise<T> {
  const response = await api.get<T>(path);

  return response.data;
}

export function getAuditDashboard(): Promise<AuditDashboardData> {
  return request<AuditDashboardData>("/audit-dashboard");
}
