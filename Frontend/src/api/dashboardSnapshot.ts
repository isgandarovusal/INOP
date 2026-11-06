import { aggregateEpoch } from './aggregateCache';
import { onClientSessionReset } from './clientSession';
import type { CountSummary, CandidateSummary, ApplicationSummary } from '../Services/dashboardSummaryService';
import type { AuditAnalytics } from '../Services/analyticsService';
export interface DashboardSnapshot { jobs?: CountSummary; candidates?: CandidateSummary; applications?: ApplicationSummary; analytics?: AuditAnalytics; }
// One bounded, session/backend/permission-keyed RAM snapshot. Never serialized.
// It may contain authorized recent names, so logout/revocation clears it and
// it must not be promoted into persistent/offline storage.
let entry: { key: string; epoch: number; times: Partial<Record<keyof DashboardSnapshot, number>>; value: DashboardSnapshot } | undefined;
onClientSessionReset(() => { entry = undefined; });
export function dashboardSnapshot(key: string) {
  if (!entry || entry.key !== key || entry.epoch !== aggregateEpoch()) return undefined;
  const value = structuredClone(entry.value);
  const fields = Object.keys(value) as (keyof DashboardSnapshot)[];
  for (const field of fields) if (Date.now() - (entry.times[field] ?? 0) >= 60000) delete value[field];
  const remaining = Object.keys(value) as (keyof DashboardSnapshot)[];
  if (!remaining.length) return undefined;
  return { value, fresh: remaining.every(field => Date.now() - (entry!.times[field] ?? 0) < 10000) };
}
export function keepDashboardSnapshot(key: string, epoch: number, patch: DashboardSnapshot) {
  if (epoch !== aggregateEpoch()) return;
  const previous = dashboardSnapshot(key);
  const times = previous ? {...entry!.times} : {};
  for (const field of Object.keys(patch) as (keyof DashboardSnapshot)[]) times[field] = Date.now();
  entry = {key, epoch, times, value: {...previous?.value, ...structuredClone(patch)}};
}
export function clearDashboardSnapshot() { entry = undefined; }
