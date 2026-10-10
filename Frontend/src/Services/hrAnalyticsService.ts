import { readJson } from '../api/readRequest';
import type { RecruitmentBrand } from './recruitmentCatalogService';
export interface HRAnalyticsFilters { brandId?: string; branchId?: string; jobId?: string; from?: string; to?: string; source?: string; status?: string }
export interface HRAnalytics {
  version: 'hr-analytics-v1'; generatedAt: string;
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
