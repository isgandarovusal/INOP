import { readJson } from "../api/readRequest";

async function request<T>(path: string, signal?: AbortSignal, scopeKey?: string): Promise<T> {
  const result = await readJson<T>(path,{signal,scopeKey});
  const envelope=result as {success?:boolean;data?:unknown};
  if(envelope.success!==true || envelope.data==null)throw new Error('Analytics response is unavailable.');
  return result;
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
  averageOverallPercentage: number | null;
  answerDistribution: Array<{
    name: string;
    value: number;
  }>;
  averageServiceTimeSeconds: number | null;
  trend: Array<{
    label: string;
    value: number;
  }>;
}

export interface StandardAnalyticsData {
  total: number;
  averageCompliancePercentage: number | null;
  findings: {
    critical: number;
    major: number;
    minor: number;
  };
  passed: number;
  failed: number;
  trend: Array<{
    label: string;
    value: number | null;
  }>;
}

export interface SafetyAnalyticsData {
  total: number;
  averageScorePercentage: number | null;
  averageTotalScore: number | null;
  averageMaxScore: number | null;
  answered: number;
  totalChecks: number;
  distribution: Array<{
    name: string;
    value: number | null;
  }>;
  trend: Array<{
    label: string;
    value: number | null;
  }>;
}

export function getAuditSummary(signal?: AbortSignal, scopeKey?: string) {
  return request<AnalyticsResponse<SummaryData>>(
    "/audit-analytics/summary", signal, scopeKey
  );
}

export function getAuditTypeAnalytics(signal?: AbortSignal, scopeKey?: string) {
  return request<AnalyticsResponse<TypeAnalyticsData>>(
    "/audit-analytics/type", signal, scopeKey
  );
}

export function getAuditTrend(signal?: AbortSignal, scopeKey?: string) {
  return request<AnalyticsResponse<TrendData>>(
    "/audit-analytics/trend", signal, scopeKey
  );
}

export function getServiceAnalytics(signal?: AbortSignal, scopeKey?: string) {
  return request<AnalyticsResponse<ServiceAnalyticsData>>(
    "/audit-analytics/service", signal, scopeKey
  );
}

export function getStandardAnalytics(signal?: AbortSignal, scopeKey?: string) {
  return request<AnalyticsResponse<StandardAnalyticsData>>(
    "/audit-analytics/standard", signal, scopeKey
  );
}

export function getSafetyAnalytics(signal?: AbortSignal, scopeKey?: string) {
  return request<AnalyticsResponse<SafetyAnalyticsData>>(
    "/audit-analytics/safety", signal, scopeKey
  );
}
