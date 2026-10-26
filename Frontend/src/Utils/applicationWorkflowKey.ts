import type {Application} from '../Types/recruitment';

// Score-only revisions must not discard an unsaved hiring decision. Authority
// remains part of the caller's key; changed persisted workflow resets the draft.
export function applicationWorkflowKey(app: Application): string {
  return JSON.stringify([app.id, app.status, app.substatus, app.stageEnteredAt,
    app.notes, app.assignedTo, app.interview, app.nextAction]);
}
