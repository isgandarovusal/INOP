import type { Application } from "../Types/recruitment";
// One authority: only server-calculated Application scores are ranked.
export function applicationScoreOrder(a: Application, b: Application): number {
  return (b.score ?? -1) - (a.score ?? -1);
}
export function rankApplicationsForJob(applications: Application[], jobId: string): Application[] {
  return applications.filter(a => (typeof a.jobId === 'string' ? a.jobId : a.jobId?.id) === jobId).sort(applicationScoreOrder);
}
