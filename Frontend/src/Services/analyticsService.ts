import api from "../api/axios";
export interface RestaurantScore {
  restaurantId: string;
  name: string;
  score: number;
}
export interface CategoryScore {
  category: string;
  score: number;
}
export interface TrendPoint {
  label: string;
  score: number;
}
export interface AuditAnalytics {
  overallScore: number;
  totalAudits: number;
  restaurantsAudited: number;
  criticalCount: number;
  restaurantComparison: RestaurantScore[];
  categoryAnalysis: CategoryScore[];
  historicalTrend: TrendPoint[];
}
export async function getAuditAnalytics(): Promise<AuditAnalytics> {
  return (await api.get("/audits/analytics")).data;
}
