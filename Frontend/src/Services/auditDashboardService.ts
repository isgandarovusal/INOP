const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3001/api";

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
  const res = await fetch(`${API}${path}`);

  if (!res.ok) {
    throw new Error("Audit dashboard request failed");
  }

  return res.json() as Promise<T>;
}

export function getAuditDashboard(): Promise<AuditDashboardData> {
  return request<AuditDashboardData>("/audit-dashboard");
}
