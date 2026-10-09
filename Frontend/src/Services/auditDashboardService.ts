import { readJson } from "../api/readRequest";

export interface AuditDashboardStat {
  _id: string;
  count: number;
}

export interface AuditDashboardTrend {
  _id: { year: number; month: number };
  label: string;
  count: number;
  averageScore: number | null;
}

export interface AuditDashboardData {
  totalAudits: number;
  completedAudits: number;
  averageScore: number;
  scoredExecutions: number;
  riskStats: AuditDashboardStat[];
  typeStats: AuditDashboardStat[];
  trend: AuditDashboardTrend[];
}

export async function getAuditDashboard(_id = "dashboard", signal?: AbortSignal, scopeKey?: string): Promise<AuditDashboardData> {
  void _id; // The resource hook's identity key is not an endpoint parameter.
  const response = await readJson<{ success: boolean; data: AuditDashboardData }>("/audit-dashboard", { signal, scopeKey });
  return { ...response.data, trend: response.data.trend.map(item => ({ ...item, label: `${item._id.year}-${String(item._id.month).padStart(2, "0")}` })) };
}
