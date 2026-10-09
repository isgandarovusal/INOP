import api from "../api/axios";
import type { CandidateStatus } from "../Types/recruitment";

export interface CountSummary { total: number; }
export interface CandidateSummary extends CountSummary {
  shortlistedCount: number;
  statusBreakdown: {status:CandidateStatus; value:number}[];
  recentCandidates: {id:string; name:string; skills:string[]; createdAt:string}[];
}
export async function getJobsSummary(signal?: AbortSignal): Promise<CountSummary> {
  return (await api.get("/jobs/dashboard-summary", {signal})).data;
}
export async function getCandidatesSummary(signal?: AbortSignal): Promise<CandidateSummary> {
  return (await api.get("/candidates/dashboard-summary", {signal})).data;
}
export async function getApplicationsSummary(signal?: AbortSignal): Promise<CountSummary> {
  return (await api.get("/applications/dashboard-summary", {signal})).data;
}
