import type { Application } from '../Types/recruitment';
// A response snapshot never substitutes for server authorization. Missing,
// malformed or revision-mismatched metadata is unavailable, not a read grant.
export function applicationActionAllowed(app: Pick<Application, 'id' | 'revision' | 'actionEligibility'>, action: 'update' | 'delete'): boolean {
  const e = app.actionEligibility;
  return e?.version === 'application-actions-v1' && e.applicationId === app.id && e.revision === app.revision && e[action] === true;
}
