import { readJson } from '../api/readRequest';
import { normalizeJob } from './jobsService';
import { normalizeCandidate } from './candidatesService';
import { normalizeApplication } from './applicationsService';
import type { RecruitmentBrand, RecruitmentBranch } from './recruitmentCatalogService';
import type { Job, Candidate, Application } from '../Types/recruitment';
export interface HRPage<T> { version: 'hr-page-v1'; items: T[]; page: number; pageSize: number; total: number; hasMore: boolean; nextCursor: string | null }
export interface HRPageQuery { page?: number; pageSize?: number; q?: string; status?: string; sort?: 'newest' | 'name'; brandId?: string; branchId?: string; jobId?: string; candidateId?: string; excludeJobId?: string; after?: string }
async function page<T extends { id: string }>(resource: string, query: HRPageQuery, normalize: (raw: unknown) => T, signal?: AbortSignal, scopeKey?: string): Promise<HRPage<T>> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value));
  const raw = await readJson<HRPage<unknown>>(`/hr/v2/${resource}?${params}`, { signal, scopeKey });
  if (!raw || raw.version !== 'hr-page-v1' || !Array.isArray(raw.items) || !Number.isInteger(raw.page) || raw.page < 1 || !Number.isInteger(raw.pageSize) || raw.pageSize < 1 || raw.pageSize > 100 || raw.items.length > raw.pageSize || !Number.isInteger(raw.total) || raw.total < raw.items.length || typeof raw.hasMore !== 'boolean' || (raw.nextCursor !== null && typeof raw.nextCursor !== 'string')) throw new Error('Invalid HR page response.');
  const items = raw.items.map(normalize);
  if (items.some(row => typeof row.id !== "string" || !row.id) || new Set(items.map(row => row.id)).size !== items.length) throw new Error('Invalid HR page identities.');
  return { ...raw, items };
}
export const getJobPage = (query: HRPageQuery, signal?: AbortSignal, scopeKey?: string): Promise<HRPage<Job>> => page('jobs', query, normalizeJob, signal, scopeKey);
export const getCandidatePage = (query: HRPageQuery, signal?: AbortSignal, scopeKey?: string): Promise<HRPage<Candidate>> => page('candidates', query, normalizeCandidate, signal, scopeKey);
export const getApplicationPage = (query: HRPageQuery, signal?: AbortSignal, scopeKey?: string): Promise<HRPage<Application>> => page('applications', query, normalizeApplication, signal, scopeKey);
export function canonicalHRStatus(status: string) { return status.charAt(0).toUpperCase() + status.slice(1); }

export const getBrandPage = (query: HRPageQuery, signal?: AbortSignal, scopeKey?: string) => page('brands', query, raw => {
  const row = raw as RecruitmentBrand; return { id: row?.id, name: row?.name, active: row?.active };
}, signal, scopeKey);
export const getBranchPage = (query: HRPageQuery, signal?: AbortSignal, scopeKey?: string) => page('branches', query, raw => {
  const row = raw as RecruitmentBranch; return { ...row, id: row?._id };
}, signal, scopeKey);
