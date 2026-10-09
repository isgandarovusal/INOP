import { readJson } from "../api/readRequest";
import type { CandidateStatus } from "../Types/recruitment";

export interface CountSummary { total: number; }
export interface CandidateSummary extends CountSummary {
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
export async function getApplicationsSummary(signal?: AbortSignal, scopeKey?: string): Promise<CountSummary> {
  return readJson<CountSummary>("/applications/dashboard-summary", {signal, scopeKey});
}
