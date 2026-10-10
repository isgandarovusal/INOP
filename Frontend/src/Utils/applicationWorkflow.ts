import type { ApplicationStatus } from '../Types/recruitment';
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
