import type { Application, ApplicationStatus, ApplicationInterview, ApplicationNextAction } from '../Types/recruitment';
import type { ApplicationWorkflowInput } from '../Services/applicationsService';
export const applicationTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  applied: ['screening', 'shortlisted', 'interview', 'offered', 'rejected'],
  screening: ['applied', 'shortlisted', 'interview', 'offered', 'rejected'],
  shortlisted: ['screening', 'interview', 'offered', 'rejected'],
  interview: ['screening', 'shortlisted', 'offered', 'rejected'],
  offered: ['interview', 'hired', 'rejected'], hired: [], rejected: [],
};
export const applicationSubstatuses: Record<ApplicationStatus, string[]> = {
  applied: ['', 'new', 'review-required'], screening: ['', 'in-review', 'selected'], shortlisted: ['', 'selected', 'contacted'],
  interview: ['', 'scheduled', 'completed', 'no-show', 'rescheduled', 'cancelled'], offered: ['', 'sent', 'accepted', 'declined'], hired: ['', 'onboarding'], rejected: ['', 'closed'],
};
export function localDateTime(value?: string | null, timezone?: string | null): string {
  if (!value || !timezone) return ''; const date = new Date(value); if (!Number.isFinite(date.getTime())) return '';
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(part => [part.type, part.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  } catch { return ''; }
}


interface ScheduleDraft {
  status: ApplicationStatus; timezone: string; start: string; duration: number;
  feedback?: ApplicationInterview['feedback']; interviewer: string; interviewResult: ApplicationInterview['result'];
  action: ApplicationNextAction['kind']; due: string; actionNotes: string;
}

// The endpoint already supports partial workflow/interview updates. Do not
// reinterpret untouched instants through minute-only wall-time inputs: that can
// lose precision, move a different-zone deadline or reject an existing DST fold.
export function scheduleChanges(app: Application, draft: ScheduleDraft, currentUserId: string): Pick<ApplicationWorkflowInput, 'interview' | 'nextAction'> {
  const initialZone = app.interview?.timezone || app.nextAction?.timezone || 'Asia/Baku';
  const zoneChanged = draft.timezone !== initialZone;
  const change: Pick<ApplicationWorkflowInput, 'interview' | 'nextAction'> = {};
  const initialStart = localDateTime(app.interview?.startsAt, app.interview?.timezone);
  // An explicit empty edit must reach existing date validation, not silently
  // retain the old schedule or erase the whole interview/result envelope.
  if (draft.status === 'interview' && (draft.start || initialStart)) {
    const interview: NonNullable<ApplicationWorkflowInput['interview']> = {};
    if (zoneChanged || draft.start !== initialStart) {
      interview.localStart = draft.start; interview.timezone = draft.timezone;
    }
    if (draft.duration !== (app.interview?.durationMinutes || 30)) interview.durationMinutes = draft.duration;
    if (draft.interviewer !== (app.interview?.interviewerId || currentUserId || '')) interview.interviewerId = draft.interviewer;
    if (draft.interviewResult !== (app.interview?.result || 'pending')) interview.result = draft.interviewResult;
    if(draft.feedback && ['summary','strengths','concerns'].some(k=>draft.feedback?.[k as keyof typeof draft.feedback] !== (app.interview?.feedback?.[k as keyof NonNullable<ApplicationInterview['feedback']>] || ''))) interview.feedback = draft.feedback;
    // Entering Interview explicitly still validates the existing/new schedule.
    if (Object.keys(interview).length || draft.status !== app.status) change.interview = interview;
  }
  if(draft.status !== 'interview' && app.status === 'interview' && app.interview && draft.feedback && ['summary','strengths','concerns'].some(k=>draft.feedback?.[k as keyof typeof draft.feedback] !== (app.interview?.feedback?.[k as keyof NonNullable<ApplicationInterview['feedback']>] || ''))) change.interview={feedback:draft.feedback};
  const dueChanged = draft.due !== localDateTime(app.nextAction?.dueAt, initialZone);
  if (draft.action !== (app.nextAction?.kind || 'none') || draft.actionNotes !== (app.nextAction?.notes || '') || dueChanged || zoneChanged && !!app.nextAction) {
    change.nextAction = { kind: draft.action, notes: draft.actionNotes,
      ...(dueChanged || zoneChanged
        ? { timezone: draft.timezone, ...(draft.due ? { localDueAt: draft.due } : { dueAt: null }) }
        : { timezone: app.nextAction?.timezone || undefined, dueAt: app.nextAction?.dueAt || null }) };
  }
  return change;
}
