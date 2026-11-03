import { FormSection, SectionCard } from '../../../Components/HRSection';
import { ClipboardList } from "lucide-react";
import ApplicationDelivery from '../../../Components/ApplicationDelivery';
import { useId, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { useAuth } from '../../../Context/useAuth';
import { useAuditResource } from '../../../Hooks/useAuditResource';
import { useHRActionContext } from '../../../Hooks/useHRActionContext';
import { hasPermission, getPermissionScope } from '../../../Utils/permissions';
import { applicationTransitions, applicationSubstatuses, localDateTime } from '../../../Utils/applicationWorkflow';
import { hrCrudErrorKey } from '../../../Utils/hrCrudError';
import { getApplicationById, getApplicationHistory, getApplicationInterviewers, updateApplicationWorkflow } from '../../../Services/applicationsService';
import type { Application, ApplicationStatus, ApplicationInterview, ApplicationNextAction, ApplicationEvent } from '../../../Types/recruitment';
import PageHeader from '../../../Components/PageHeader';
import HRResourceState from '../../../Components/HRResourceState';
import MatchScoreBadge from '../../../Components/MatchScoreBadge';
import { brandLabel } from '../../../Services/recruitmentCatalogService';
import {applicationWorkflowKey} from '../../../Utils/applicationWorkflowKey';

// Only explicitly supported fields from the already-authorized history response.
const historyRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const historyId = (value: unknown): string | undefined => typeof value === 'string' && value.trim() ? value : typeof historyRecord(value)._id === 'string' ? historyRecord(value)._id as string : undefined;
function HistoryEvent({ event }: { event: ApplicationEvent }) {
  const { t, i18n } = useTranslation();
  const before = historyRecord(event.before), after = historyRecord(event.after);
  const actions = ['none', 'review', 'call', 'interview', 'offer', 'follow_up'];
  const unavailable = t('hrHistory.unavailable');
  const text = (value: unknown) => typeof value === 'string' ? value : unavailable;
  const time = (value: unknown, zone: unknown = 'UTC') => {
    if (typeof value !== 'string' || !value) return unavailable;
    // Do not infer a timezone for legacy timestamps without an explicit offset.
    if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) || !Number.isFinite(Date.parse(value))) return <time>{value}</time>;
    const timezone = typeof zone === 'string' && zone ? zone : 'UTC';
    try { return <time dateTime={value} title={value}>{new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'medium', timeZone: timezone }).format(new Date(value))} ({timezone})</time>; }
    catch { return <time dateTime={value} title={value}>{value} ({timezone})</time>; }
  };
  const status = (value: unknown) => typeof value === 'string' && Object.hasOwn(applicationTransitions, value.toLowerCase()) ? t(`recruitment.applications.${value.toLowerCase()}`) : unavailable;
  const assignee = (value: unknown) => value === null ? t('hrHistory.unassigned') : historyId(value) || unavailable;
  const nextAction = (value: unknown) => {
    if (value === null) return t('hrWorkflow.action.none');
    const row = historyRecord(value);
    return <>{typeof row.kind === 'string' && actions.includes(row.kind) ? t(`hrWorkflow.action.${row.kind}`) : unavailable}
      {typeof row.dueAt === 'string' && row.dueAt ? <> · {time(row.dueAt, row.timezone)}</> : typeof row.timezone === 'string' && row.timezone ? <> · {t('hrWorkflow.timezone')}: {row.timezone}</> : null}
      {typeof row.notes === 'string' && row.notes && <> · {t('hrWorkflow.actionNotes')}: {row.notes}</>}</>;
  };
  const signature = (row: Record<string, unknown>, key: string) => {
    if (!Object.hasOwn(row, key)) return ['missing'];
    const value = row[key];
    if (value === null) return ['null'];
    if (key === 'assignedTo') return ['id', historyId(value)];
    if (key === 'nextAction') { const action = historyRecord(value); return ['action', ...['kind','dueAt','timezone','notes'].map(k => [Object.hasOwn(action, k), typeof action[k] === 'string' ? action[k] : null])]; }
    return ['text', typeof value === 'string' ? value : null];
  };
  const changed = (key: string) => JSON.stringify(signature(before, key)) !== JSON.stringify(signature(after, key));
  // Interview snapshots are already authorized with this Application. Never expand
  // them into parent profiles or render arbitrary legacy/nested properties.
  const interview = (value: unknown) => {
    const row = historyRecord(value);
    const startsAt = typeof row.startsAt === 'string' && row.startsAt.length <= 64 && /(?:Z|[+-]\d{2}:\d{2})$/i.test(row.startsAt) && Number.isFinite(Date.parse(row.startsAt)) ? new Date(row.startsAt).toISOString() : undefined;
    let timezone: string | undefined;
    if (typeof row.timezone === 'string' && row.timezone.length <= 120) {
      try { new Intl.DateTimeFormat('en', { timeZone: row.timezone }).format(); timezone = row.timezone; } catch { /* Unknown legacy zone stays unknown. */ }
    }
    return { startsAt, timezone,
      duration: typeof row.durationMinutes === 'number' && Number.isInteger(row.durationMinutes) && row.durationMinutes >= 5 && row.durationMinutes <= 480 ? row.durationMinutes : undefined,
      interviewer: typeof row.interviewerId === 'string' && /^[a-f0-9]{24}$/i.test(row.interviewerId) ? row.interviewerId : undefined };
  };
  const oldInterview = interview(before.interview), newInterview = interview(after.interview);
  const interviewChanged = (key: keyof typeof oldInterview) => oldInterview[key] !== newInterview[key];
  const interviewTimeChanged = interviewChanged('startsAt') || interviewChanged('timezone');
  const interviewTime = (row: typeof oldInterview) => !row.startsAt ? unavailable : row.timezone ? time(row.startsAt, row.timezone) : <time dateTime={row.startsAt} title={row.startsAt}>{row.startsAt}</time>;
  const substatusValue = (row: Record<string, unknown>): string | undefined => {
    // Empty is an explicit unset value; missing or invalid legacy data is unknown.
    if (row.substatus === '') return '';
    const stage = typeof row.status === 'string' ? row.status.toLowerCase() : '';
    return Object.hasOwn(applicationSubstatuses, stage) && typeof row.substatus === 'string' && applicationSubstatuses[stage as ApplicationStatus].includes(row.substatus) ? row.substatus : undefined;
  };
  const substatus = (row: Record<string, unknown>) => { const value = substatusValue(row); return value === undefined ? unavailable : value === '' ? t('hrCatalog.unset') : t(`hrWorkflow.sub.${value}`); };
  const substatusChanged = substatusValue(before) !== substatusValue(after);
  const hasDetails = substatusChanged || ['status','assignedTo','nextAction','notes'].some(changed) || interviewTimeChanged || interviewChanged('duration') || interviewChanged('interviewer');
  const eventKey = ['create','status','workflow','score','reorder','notification_retry'].includes(event.type) ? `hrWorkflow.event.${event.type}` : 'hrHistory.otherEvent';
  return <>
    <p>{time(event.at)} · {t(eventKey)} · {t('hrWorkflow.actor')}: {historyId(event.actor) || unavailable}</p>
    {changed('status') && <p data-history-field="stage"><strong>{t('recruitment.applications.status')}: </strong>{status(before.status)} → {status(after.status)}</p>}
    {substatusChanged && <p data-history-field="substatus"><strong>{t('hrWorkflow.substatus')}: </strong>{substatus(before)} → {substatus(after)}</p>}
    {changed('assignedTo') && <p data-history-field="assignment"><strong>{t('hrWorkflow.assignee')}: </strong>{assignee(before.assignedTo)} → {assignee(after.assignedTo)}</p>}
    {changed('nextAction') && <p data-history-field="next-action"><strong>{t('hrWorkflow.nextAction')}: </strong>{nextAction(before.nextAction)} → {nextAction(after.nextAction)}</p>}
    {changed('notes') && <p data-history-field="notes"><strong>{t('hrWorkflow.notes')}: </strong>{text(before.notes)} → {text(after.notes)}</p>}
    {interviewTimeChanged && <p data-history-field="interview-time"><strong>{t('hrWorkflow.interviewStart')}: </strong>{interviewTime(oldInterview)} → {interviewTime(newInterview)}</p>}
    {interviewChanged('timezone') && <p data-history-field="interview-timezone"><strong>{t('hrWorkflow.timezone')}: </strong>{oldInterview.timezone || unavailable} → {newInterview.timezone || unavailable}</p>}
    {interviewChanged('duration') && <p data-history-field="interview-duration"><strong>{t('hrWorkflow.duration')}: </strong>{oldInterview.duration ?? unavailable} → {newInterview.duration ?? unavailable}</p>}
    {interviewChanged('interviewer') && <p data-history-field="interview-interviewer"><strong>{t('hrWorkflow.interviewer')}: </strong>{oldInterview.interviewer || unavailable} → {newInterview.interviewer || unavailable}</p>}
    {!hasDetails && <p>{t('hrHistory.noDetails')}</p>}
    {typeof event.reason === 'string' && event.reason && <p><strong>{t('hrWorkflow.reason')}: </strong>{event.reason}</p>}
  </>;
}

const historyLoad = (key: string, signal?: AbortSignal, scopeKey?: string) => { const [id, offset] = JSON.parse(key) as [string, number]; return getApplicationHistory(id, offset, signal, scopeKey); };
function History({ app, reload }: { app: Application; reload: () => void }) {
  const { t } = useTranslation(); const [offset, setOffset] = useState(0);
  const id = app.id, revision = app.revision;
  const result = useAuditResource(JSON.stringify([id, offset]), 'application', historyLoad, { retainOnReload: true });
  const parentsReadable = !!app.candidateId && typeof app.candidateId === 'object' && !!app.jobId && typeof app.jobId === 'object';
  const latest = offset === 0 ? result.data?.items.find(e => e.delivery && String(historyRecord(e.after).status || '').toLowerCase() === app.status) : undefined;
  return <section data-application-history><h3>{t('hrWorkflow.history')}</h3>
    {result.status !== 'ready' ? <HRResourceState status={result.status} retry={result.reload} /> : <>
      {result.data?.items.length === 0 && <p>{t("hrWorkflow.historyEmpty")}</p>}<ol>{result.data?.items.map(e => <li key={e.id} style={{ overflowWrap: 'anywhere' }}>
        <HistoryEvent event={e} />
        {e.delivery && <ApplicationDelivery key={e.id + ':' + revision} id={id} event={e} revision={revision} retryEligible={parentsReadable && latest?.id === e.id && !['cancelled','declined'].includes(app.substatus || '') && !(app.status === 'interview' && app.interview?.result === 'cancelled')} onUpdated={reload} onAccessDenied={reload} />}
      </li>)}</ol>
      {offset > 0 && <button type="button" onClick={() => setOffset(Math.max(0, offset - 50))}>{t('common.actions.previous')}</button>}
      {result.data?.hasMore && <button type="button" onClick={() => setOffset(offset + 50)}>{t('common.actions.next')}</button>}
    </>}
  </section>;
}
function WorkflowForm({ app, reload }: { app: Application; reload: () => void }) {
  const timezoneHelpId = useId();
  const { t } = useTranslation(); const { user } = useAuth(); const context = useHRActionContext(app.id);
  const roster = useAuditResource(app.id, 'application', getApplicationInterviewers, { refreshOnFocus: false });
  const [status, setStatus] = useState(app.status), [substatus, setSubstatus] = useState(app.substatus || '');
  const [timezone, setTimezone] = useState(app.interview?.timezone || app.nextAction?.timezone || 'Asia/Baku');
  const [start, setStart] = useState(localDateTime(app.interview?.startsAt, app.interview?.timezone));
  const [duration, setDuration] = useState(app.interview?.durationMinutes || 30);
  const [interviewer, setInterviewer] = useState(app.interview?.interviewerId || user?.id || '');
  const [interviewResult, setInterviewResult] = useState<ApplicationInterview['result']>(app.interview?.result || 'pending');
  const [action, setAction] = useState<ApplicationNextAction['kind']>(app.nextAction?.kind || 'none');
  const [due, setDue] = useState(localDateTime(app.nextAction?.dueAt, app.nextAction?.timezone || timezone));
  const [actionNotes, setActionNotes] = useState(app.nextAction?.notes || ''), [notes, setNotes] = useState(app.notes || '');
  const [assignee, setAssignee] = useState(app.assignedTo || '');
  const canAssign = getPermissionScope(user, 'application', 'update') === 'all';
  const [reason, setReason] = useState(''), [reopen, setReopen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const canReopen = getPermissionScope(user, 'application', 'update') === 'all' && ['hired', 'rejected'].includes(app.status);
  const choices = reopen ? ['applied', 'screening', 'shortlisted', 'interview', 'offered'] as ApplicationStatus[] : [app.status, ...applicationTransitions[app.status]];
  const people = useMemo(() => [...new Map([...(user ? [{ id: user.id, name: user.name }] : []), ...(roster.data || [])].map(u => [u.id, u])).values()], [user, roster.data]);
  return <form className="form-grid" data-application-workflow onSubmit={async e => {
    e.preventDefault(); if (busy) return; const key = context.key; setBusy(true); setError('');
    try {
      await updateApplicationWorkflow(app.id, { expectedRevision: app.revision, status, substatus, reason, reopen, notes,
        ...(canAssign && assignee !== (app.assignedTo || '') ? { assignedTo: assignee } : {}),
        ...(status === 'interview' && start ? { interview: { localStart: start, timezone, durationMinutes: duration, interviewerId: interviewer, result: interviewResult } } : {}),
        nextAction: { kind: action, ...(due ? { localDueAt: due } : {}), timezone, notes: actionNotes } });
      if (context.current.current === key) reload();
    } catch (err) { if (context.current.current === key) { setError(isAxiosError(err) && err.response?.status === 409 ? 'hrWorkflow.conflict' : hrCrudErrorKey(err)); } }
    finally { if (context.current.current === key) setBusy(false); }
  }}>
    {error && <p role="alert" className="form-group--full">{t(error)} <button type="button" onClick={reload}>{t('hrStates.retry')}</button></p>}
    <FormSection disabled={busy} className="form-group--full">
      {canReopen && <label><input type="checkbox" checked={reopen} onChange={e => { setReopen(e.target.checked); setStatus(e.target.checked ? 'screening' : app.status); setSubstatus(''); }} />{t('hrWorkflow.reopen')}</label>}
      <label>{t('recruitment.applications.status')}<select aria-label={t('recruitment.applications.status')} value={status} onChange={e => { setStatus(e.target.value as ApplicationStatus); setSubstatus(''); }}>{choices.map(s => <option key={s} value={s}>{t(`recruitment.applications.${s}`)}</option>)}</select></label>
      <label>{t('hrWorkflow.substatus')}<select aria-label={t('hrWorkflow.substatus')} value={substatus} onChange={e => setSubstatus(e.target.value)}>{applicationSubstatuses[status].map(s => <option key={s} value={s}>{s ? t(`hrWorkflow.sub.${s}`) : t('hrCatalog.unset')}</option>)}</select></label>
      {canAssign && <label>{t("hrWorkflow.assignee")}<select aria-label={t("hrWorkflow.assignee")} value={assignee} onChange={e => setAssignee(e.target.value)}>{!people.some(p => p.id === assignee) && <option value={assignee}>{t("hrWorkflow.existingInterviewer")}</option>}{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
      <label>{t('hrWorkflow.timezone')}<input aria-label={t('hrWorkflow.timezone')} aria-describedby={timezoneHelpId} value={timezone} maxLength={80} onChange={e => setTimezone(e.target.value)} required /><small id={timezoneHelpId} className="form-hint">{t('hrWorkflow.timezoneHelp')}</small></label>
      {status === 'interview' && <>
        <label>{t('hrWorkflow.interviewStart')}<input aria-label={t('hrWorkflow.interviewStart')} type="datetime-local" value={start} onChange={e => setStart(e.target.value)} /></label>
        <label>{t('hrWorkflow.duration')}<input aria-label={t('hrWorkflow.duration')} type="number" min={5} max={480} value={duration} onChange={e => setDuration(Number(e.target.value))} /></label>
        <label>{t('hrWorkflow.interviewer')}<select aria-label={t('hrWorkflow.interviewer')} value={interviewer} onChange={e => setInterviewer(e.target.value)}>{!people.some(p => p.id === interviewer) && <option value={interviewer}>{t('hrWorkflow.existingInterviewer')}</option>}{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>{t('hrWorkflow.result')}<select aria-label={t('hrWorkflow.result')} value={interviewResult} onChange={e => setInterviewResult(e.target.value as typeof interviewResult)}>{['pending', 'passed', 'failed', 'no_show', 'cancelled'].map(r => <option key={r} value={r}>{t(`hrWorkflow.resultState.${r}`)}</option>)}</select></label>
        {roster.status !== 'ready' && roster.status !== 'loading' && <p role="alert">{t('hrStates.secondaryError')}</p>}
      </>}
      <label>{t('hrWorkflow.nextAction')}<select aria-label={t('hrWorkflow.nextAction')} value={action} onChange={e => setAction(e.target.value as typeof action)}>{['none', 'review', 'call', 'interview', 'offer', 'follow_up'].map(a => <option key={a} value={a}>{t(`hrWorkflow.action.${a}`)}</option>)}</select></label>
      <label>{t('hrWorkflow.due')}<input aria-label={t('hrWorkflow.due')} type="datetime-local" value={due} onChange={e => setDue(e.target.value)} /></label>
      <label>{t('hrWorkflow.actionNotes')}<textarea aria-label={t('hrWorkflow.actionNotes')} maxLength={500} value={actionNotes} onChange={e => setActionNotes(e.target.value)} /></label>
      <label>{t('hrWorkflow.notes')}<textarea aria-label={t('hrWorkflow.notes')} maxLength={5000} value={notes} onChange={e => setNotes(e.target.value)} /></label>
      <label>{t('hrWorkflow.reason')}<textarea aria-label={t('hrWorkflow.reason')} maxLength={500} required={reopen || canAssign && assignee !== (app.assignedTo || '')} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <div className="form-actions"><button className="btn-primary" type="submit" disabled={busy}>{t(busy ? 'common.actions.loading' : 'common.actions.save')}</button></div>
    </FormSection>
  </form>;
}
export default function ApplicationDetail() {
  const { id } = useParams(); const { t } = useTranslation(); const { user } = useAuth();
  const resource = useAuditResource(id, 'application', getApplicationById, { retainOnReload: true });
  const context = useHRActionContext(id); const app = resource.data;
  if (resource.status !== 'ready' || !app) return <HRResourceState status={resource.status} retry={resource.reload} />;
  const handoff = resource.refreshing ? undefined : app.handoffContext;
  return <div className="hr-workspace hr-application-detail">
    <PageHeader icon={<ClipboardList size={26} />} title={t('hrWorkflow.application')} subtitle={app.candidateId && typeof app.candidateId === 'object' ? app.candidateId.name : handoff?.candidate.name || t('hrStates.restricted')} actions={<>
      <Link className="btn-secondary" to="/app/recruitment/applications">{t('common.actions.back')}</Link>
      {app.candidateId && typeof app.candidateId === 'object' && <><Link className="btn-secondary" to={`/app/recruitment/candidates/${app.candidateId.id}`}>{app.candidateId.name}</Link>{hasPermission(user,'candidate','update')&&<Link className="btn-secondary" to={`/app/recruitment/candidates/${app.candidateId.id}/edit`}>{t('common.actions.edit')}</Link>}</>}
    </>} />
    <p>{typeof app.jobId === 'object' && app.jobId ? app.jobId.position : t('hrStates.restricted')} · {t(`recruitment.applications.${app.status}`)}</p>
    {app.handoffContext && resource.refreshing && <p role="status" data-handoff-refreshing>{t('hrHandoff.refreshing')}</p>}
    {handoff && <SectionCard className="detail-card" data-application-handoff>
      <h2>{t('hrHandoff.title')}</h2><p role="status">{t('hrHandoff.readOnly')}</p>
      <h3>{t('recruitment.candidateForm.candidateInformation')}</h3>
      <dl className="hr-profile-facts">
        {([['recruitment.candidateForm.fullName', handoff.candidate.name], ['recruitment.candidateForm.position', handoff.candidate.role], ['recruitment.candidateDetail.email', handoff.candidate.email], ['recruitment.candidateDetail.phone', handoff.candidate.phone], ['recruitment.candidateDetail.skills', handoff.candidate.skills.join(', ')], ['recruitment.candidateDetail.experience', handoff.candidate.experience == null ? '' : String(handoff.candidate.experience)], ['recruitment.candidateDetail.education', handoff.candidate.education], ['recruitment.candidateDetail.languages', handoff.candidate.languages.join(', ')], ['recruitment.candidateDetail.certificates', handoff.candidate.certificates.join(', ')]] as const).map(([label,value]) => <div key={label}><dt>{t(label)}</dt><dd>{value || t('cvReview.unknown')}</dd></div>)}
      </dl>
      <h3>{t('hrHandoff.job')}</h3><p>{handoff.job.title} · {t(`recruitment.jobStatus.${handoff.job.status.toLowerCase()}`)}</p>
      <p>{[handoff.job.brandId ? brandLabel(handoff.job.brandId) : '', handoff.job.department, handoff.job.location, handoff.job.type].filter(Boolean).join(' · ')}</p>
      <dl className="hr-profile-facts">
        <div><dt>{t('recruitment.jobDetail.requiredSkills')}</dt><dd>{handoff.job.requiredSkills.join(', ') || t('recruitment.jobDetail.noneSpecified')}</dd></div>
        <div><dt>{t('recruitment.jobDetail.preferredSkills')}</dt><dd>{handoff.job.preferredSkills.join(', ') || t('recruitment.jobDetail.noneSpecified')}</dd></div>
        <div><dt>{t('hrHandoff.requiredExperience')}</dt><dd>{handoff.job.experienceYears}</dd></div>
        <div><dt>{t('hrHandoff.requiredEducation')}</dt><dd>{handoff.job.requiredEducation.join(', ') || t('recruitment.jobDetail.noneSpecified')}</dd></div>
        <div><dt>{t('hrHandoff.requiredCertificates')}</dt><dd>{handoff.job.requiredCertificates.join(', ') || t('recruitment.jobDetail.noneSpecified')}</dd></div>
      </dl>
      <MatchScoreBadge application={{ ...app, score: handoff.score, scoreStatus: handoff.scoreStatus, matching: handoff.matching }} />
    </SectionCard>}
    {!handoff && <MatchScoreBadge application={app} onUpdated={resource.reload} />}
    {hasPermission(user, 'application', 'update') && <WorkflowForm key={'workflow:' + context.key + ':' + applicationWorkflowKey(app)} app={app} reload={resource.reload} />}
    <History key={'history:' + context.key + ':' + app.revision} app={app} reload={resource.reload} />
  </div>;
}
