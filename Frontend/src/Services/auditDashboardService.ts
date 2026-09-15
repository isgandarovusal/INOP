import API_BASE_URL from "./../config/api";
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
  const res = await fetch(`${API_BASE_URL}${path}`);

  if (!res.ok) {
    throw new Error("Audit dashboard request failed");
  }

  return res.json() as Promise<T>;
}

export function getAuditDashboard(): Promise<AuditDashboardData> {
  return request<AuditDashboardData>("/audit-dashboard");
}
