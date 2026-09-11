const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3001/api";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`);

  if (!response.ok) {
    throw new Error(`Analytics request failed: ${response.status}`);
  }

  return response.json();
}

export interface AnalyticsResponse<T> {
  success: boolean;
  data: T;
}

export interface SummaryData {
  total: number;
  statusSummary: Array<{
    name: string;
    value: number;
  }>;
}

export interface TypeAnalyticsData {
  typeSummary: Array<{
    name: string;
    value: number;
  }>;
}

export interface TrendData {
  trend: Array<{
    label: string;
    value: number;
  }>;
}

export interface ServiceAnalyticsData {
  total: number;
  averageOverallPercentage: number;
  answerDistribution: Array<{
    name: string;
    value: number;
  }>;
  averageServiceTimeSeconds: number;
  trend: Array<{
    label: string;
    value: number;
  }>;
}

export interface StandardAnalyticsData {
  total: number;
  averageCompliancePercentage: number;
  findings: {
    critical: number;
    major: number;
    minor: number;
  };
  passed: number;
  failed: number;
  trend: Array<{
    label: string;
    value: number;
  }>;
}

export interface SafetyAnalyticsData {
  total: number;
  averageScorePercentage: number;
  averageTotalScore: number;
  averageMaxScore: number;
  answered: number;
  totalChecks: number;
  distribution: Array<{
    name: string;
    value: number;
  }>;
  trend: Array<{
    label: string;
    value: number;
  }>;
}

export function getAuditSummary() {
  return request<AnalyticsResponse<SummaryData>>(
    "/audit-analytics/summary"
  );
}

export function getAuditTypeAnalytics() {
  return request<AnalyticsResponse<TypeAnalyticsData>>(
    "/audit-analytics/type"
  );
}

export function getAuditTrend() {
  return request<AnalyticsResponse<TrendData>>(
    "/audit-analytics/trend"
  );
}

export function getServiceAnalytics() {
  return request<AnalyticsResponse<ServiceAnalyticsData>>(
    "/audit-analytics/service"
  );
}

export function getStandardAnalytics() {
  return request<AnalyticsResponse<StandardAnalyticsData>>(
    "/audit-analytics/standard"
  );
}

export function getSafetyAnalytics() {
  return request<AnalyticsResponse<SafetyAnalyticsData>>(
    "/audit-analytics/safety"
  );
}
