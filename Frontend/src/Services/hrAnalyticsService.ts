import { isAxiosError } from 'axios';
import { readJson } from '../api/readRequest';
import type { RecruitmentBrand } from './recruitmentCatalogService';
export interface HRAnalyticsFilters { brandId?: string; branchId?: string; jobId?: string; from?: string; to?: string; source?: string; status?: string }
export interface HRAnalytics {
  version: 'hr-analytics-v1'; generatedAt: string; filters: HRAnalyticsFilters;
  coverage: { candidateReadable: boolean; restrictedCandidateApplications: number; scoreScanConsistent: boolean };
  totals: { activeVacancies: number; applications: number; newApplications: number; processing: number };
  funnel: { status: string; count: number }[];
  sources: { key: string; count: number }[];
  byBrand: { id: string; applications: number; activeVacancies: number }[];
  byBrandTruncated: boolean;
  review: { pending: number; failed: number; ocrRequired: number };
  duplicateAlerts: { groups: number; extraProfiles: number };
  interviews: { result: string; count: number }[];
  timeInStage: { status: string; samples: number; averageDays: number | null }[];
  timeToHire: { samples: number; averageDays: number | null };
  scores: { states: Record<string, number>; buckets: { min: number; max: number; count: number }[] } | null;
  deliveryQueue: { state: string; count: number }[];
  integrations: Record<string, string>;
  options: { brands: RecruitmentBrand[]; jobs: { id: string; title: string; brandId: string | null; branchId: string | null }[]; branches: { id: string; name: string; brandId: string | null }[]; jobsTruncated: boolean; brandsTruncated: boolean };
}
export async function getHRAnalytics(key: string, signal?: AbortSignal, scopeKey?: string): Promise<HRAnalytics> {
  const filters = JSON.parse(key) as HRAnalyticsFilters;
  const query = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && !!entry[1]));
  const data = await readJson<HRAnalytics>('/hr/analytics' + (query.size ? '?' + query.toString() : ''), { signal, scopeKey });
  if (data?.version !== 'hr-analytics-v1' || !data.totals || !data.coverage || !data.review || !data.duplicateAlerts || !data.timeToHire || !data.integrations ||
      ![data.funnel, data.sources, data.byBrand, data.interviews, data.timeInStage, data.deliveryQueue, data.options?.brands, data.options?.jobs, data.options?.branches].every(Array.isArray) ||
      !Object.values(data.totals).every(value => Number.isSafeInteger(value) && value >= 0)) throw Error('Invalid HR analytics response.');
  return data;
}

export type HRAnalyticsOverview = Pick<HRAnalytics, 'generatedAt' | 'filters' | 'totals' | 'funnel' | 'sources' | 'byBrand' | 'byBrandTruncated' | 'options'> & { version: 'hr-analytics-overview-v1'; coverage: Pick<HRAnalytics['coverage'], 'candidateReadable'> };
export interface HRAnalyticsScores { version: 'hr-analytics-scores-v1'; generatedAt: string; total: number; consistent: boolean; scores: HRAnalytics['scores'] }
async function view<T>(name: string, key: string, signal?: AbortSignal, scopeKey?: string): Promise<T> {
  const query = new URLSearchParams(Object.entries(JSON.parse(key) as HRAnalyticsFilters).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && !!entry[1]));
  try { return await readJson<T>('/hr/analytics/' + name + (query.size ? '?' + query.toString() : ''), { signal, scopeKey }); }
  catch (error) {
    // Auto-deploys can serve the old Backend briefly. Only missing additive
    // routes fall back; authorization, timeout and server errors never do.
    if (!isAxiosError(error) || error.response?.status !== 404) throw error;
    const full = await getHRAnalytics(key, signal, scopeKey);
    return (name === 'overview' ? { ...full, version: 'hr-analytics-overview-v1' } : name === 'scores' ? {
      version: 'hr-analytics-scores-v1', generatedAt: full.generatedAt, total: full.totals.applications,
      consistent: full.coverage.scoreScanConsistent, scores: full.scores,
    } : full) as T;
  }
}
export async function getHRAnalyticsOverview(key: string, signal?: AbortSignal, scopeKey?: string) {
  const data = await view<HRAnalyticsOverview>('overview', key, signal, scopeKey);
  if (data?.version !== 'hr-analytics-overview-v1' || !data.coverage || !data.totals ||
    !['activeVacancies','applications','newApplications','processing'].every(k => Number.isSafeInteger(data.totals[k as keyof typeof data.totals]) && data.totals[k as keyof typeof data.totals] >= 0) ||
    ![data.funnel,data.sources,data.byBrand,data.options?.brands,data.options?.jobs,data.options?.branches].every(Array.isArray)) throw Error('Invalid HR analytics overview response.');
  return data;
}
export async function getHRAnalyticsScores(key: string, signal?: AbortSignal, scopeKey?: string) {
  const data = await view<HRAnalyticsScores>('scores', key, signal, scopeKey);
  if (data?.version !== 'hr-analytics-scores-v1' || !Number.isSafeInteger(data.total) || data.total < 0 || typeof data.consistent !== 'boolean' ||
    (data.scores !== null && (!data.scores?.states || !Array.isArray(data.scores?.buckets)))) throw Error('Invalid HR analytics score response.');
  return data;
}
export async function getHRAnalyticsOperations(key: string, signal?: AbortSignal, scopeKey?: string) {
  const data = await view<HRAnalytics>('operations', key, signal, scopeKey);
  if(data?.version !== 'hr-analytics-v1' || !data.coverage || !data.review || !data.duplicateAlerts || !data.timeToHire || !data.integrations ||
    ![data.byBrand,data.interviews,data.timeInStage,data.deliveryQueue].every(Array.isArray)) throw Error('Invalid HR analytics operations response.');
  return data;
}
