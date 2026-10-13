import { FormSection } from '../../../Components/HRSection';
import { ClipboardList } from "lucide-react";
import ApplicationDelivery from '../../../Components/ApplicationDelivery';
import { useMemo, useState } from 'react';
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
import type { Application, ApplicationStatus, ApplicationInterview, ApplicationNextAction } from '../../../Types/recruitment';
import PageHeader from '../../../Components/PageHeader';
import HRResourceState from '../../../Components/HRResourceState';
import MatchScoreBadge from '../../../Components/MatchScoreBadge';

const historyLoad = (key: string, signal?: AbortSignal, scopeKey?: string) => { const [id, offset] = JSON.parse(key) as [string, number]; return getApplicationHistory(id, offset, signal, scopeKey); };
function History({ app, reload }: { app: Application; reload: () => void }) {
  const { t } = useTranslation(); const [offset, setOffset] = useState(0);
  const id = app.id, revision = app.revision;
  const result = useAuditResource(JSON.stringify([id, offset]), 'application', historyLoad, { retainOnReload: true });
  const latest = offset === 0 ? result.data?.items.find(e => e.delivery && String(e.after.status || '').toLowerCase() === app.status) : undefined;
  return <section><h3>{t('hrWorkflow.history')}</h3>
    {result.status !== 'ready' ? <HRResourceState status={result.status} retry={result.reload} /> : <>
      {result.data?.items.length === 0 && <p>{t("hrWorkflow.historyEmpty")}</p>}<ol>{result.data?.items.map(e => <li key={e.id}><time>{e.at}</time> · {t(`hrWorkflow.event.${e.type}`)} · {t('hrWorkflow.actor')}: {e.actor}
        <p>{e.before?.status ? t(`recruitment.applications.${String(e.before.status).toLowerCase()}`) : ''}{e.after.status ? ` → ${t(`recruitment.applications.${String(e.after.status).toLowerCase()}`)}` : ''} {e.reason}</p>
        {e.delivery && <ApplicationDelivery key={e.id + ':' + revision} id={id} event={e} revision={revision} retryEligible={latest?.id === e.id && !['cancelled','declined'].includes(app.substatus || '') && !(app.status === 'interview' && app.interview?.result === 'cancelled')} onUpdated={reload} onAccessDenied={reload} />}
      </li>)}</ol>
      {offset > 0 && <button type="button" onClick={() => setOffset(Math.max(0, offset - 50))}>{t('common.actions.previous')}</button>}
      {result.data?.hasMore && <button type="button" onClick={() => setOffset(offset + 50)}>{t('common.actions.next')}</button>}
    </>}
  </section>;
}
function WorkflowForm({ app, reload }: { app: Application; reload: () => void }) {
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
      <label>{t('hrWorkflow.timezone')}<input aria-label={t('hrWorkflow.timezone')} value={timezone} maxLength={80} onChange={e => setTimezone(e.target.value)} required /></label>
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
  return <div className="hr-workspace hr-application-detail">
    <PageHeader icon={<ClipboardList size={26} />} title={t('hrWorkflow.application')} subtitle={app.candidateId && typeof app.candidateId === 'object' ? app.candidateId.name : t('hrStates.restricted')} actions={<>
      <Link className="btn-secondary" to="/app/recruitment/applications">{t('common.actions.back')}</Link>
      {app.candidateId && typeof app.candidateId === 'object' && <><Link className="btn-secondary" to={`/app/recruitment/candidates/${app.candidateId.id}`}>{app.candidateId.name}</Link>{hasPermission(user,'candidate','update')&&<Link className="btn-secondary" to={`/app/recruitment/candidates/${app.candidateId.id}/edit`}>{t('common.actions.edit')}</Link>}</>}
    </>} />
    <p>{typeof app.jobId === 'object' && app.jobId ? app.jobId.position : t('hrStates.restricted')} · {t(`recruitment.applications.${app.status}`)}</p>
    <MatchScoreBadge application={app} onUpdated={resource.reload} />
    {hasPermission(user, 'application', 'update') && <WorkflowForm key={context.key + ':' + app.revision} app={app} reload={resource.reload} />}
    <History key={context.key + ':' + app.revision} app={app} reload={resource.reload} />
  </div>;
}
