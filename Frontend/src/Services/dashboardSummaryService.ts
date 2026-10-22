import { readJson } from "../api/readRequest";
import type { CandidateStatus } from "../Types/recruitment";

export interface CountSummary { total: number; }
export interface ApplicationSummary extends CountSummary { pipeline?: { total: number; shortlistedCount: number; statusBreakdown: {status:string; count:number}[]; unknownCount:number } | null; }
export interface CandidateSummary extends CountSummary {
  profileStatusBreakdown?: {status:CandidateStatus; value:number}[];
  shortlistedCount: number;
  statusBreakdown: {status:CandidateStatus; value:number}[];
  recentCandidates: {id:string; name:string; skills:string[]; createdAt:string}[];
}
export async function getJobsSummary(signal?: AbortSignal, scopeKey?: string): Promise<CountSummary> {
  return readJson<CountSummary>("/jobs/dashboard-summary", {signal, scopeKey});
}
export async function getCandidatesSummary(signal?: AbortSignal, scopeKey?: string): Promise<CandidateSummary> {
  return readJson<CandidateSummary>("/candidates/dashboard-summary", {signal, scopeKey});
}
export async function getApplicationsSummary(signal?: AbortSignal, scopeKey?: string): Promise<ApplicationSummary> {
  return readJson<ApplicationSummary>("/applications/dashboard-summary", {signal, scopeKey});
}
