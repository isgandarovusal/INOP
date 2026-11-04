import { isAxiosError } from 'axios';
import { applicationActionAllowed } from '../Utils/applicationActions';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/useAuth';
import { useHRActionContext } from '../Hooks/useHRActionContext';
import { useAuditResource } from '../Hooks/useAuditResource';
import { hasPermission } from '../Utils/permissions';
import { getErrorMessage } from '../Utils/getErrorMessage';
import { getApplicationById, recalculateApplicationMatch } from '../Services/applicationsService';
import HRResourceState from './HRResourceState';
import type { Application, ApplicationMatch } from '../Types/recruitment';

type ScoreApplication = Pick<Application, 'id' | 'revision' | 'score' | 'scoreStatus' | 'actionEligibility'> & { matching?: Omit<ApplicationMatch, 'jobHash' | 'candidateHash'> | null };
const evidenceSources: Readonly<Record<string, string>> = {
  'candidate.skills': 'skills',
  'candidate.certificates': 'certificates',
  'candidate.education': 'education',
  'application.hr-review': 'review',
  'candidate.experience:matching-role': 'role',
  'candidate.employmentHistory:unknown': 'historyUnknown',
  'candidate.employmentHistory:dated-matching-role': 'historyDated',
};
const validYears = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
function Badge({ application, onUpdated }: { application: ScoreApplication; onUpdated?: () => void }) {
  const { t, i18n } = useTranslation(); const { user } = useAuth(); const context = useHRActionContext(application.id);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [experience, setExperience] = useState(''), [reason, setReason] = useState('');
  const [wanted, setWanted] = useState(false);
  const lazy = application.matching?.summary === true;
  // List summaries never contain extraction/criterion evidence. Read only on demand.
  const detail = useAuditResource(wanted && (lazy || !application.matching) ? application.id : undefined, 'application', getApplicationById, { refreshOnFocus: false });
  const requested = wanted && (lazy || !application.matching);
  const resolved = requested && detail.status === 'ready' ? detail.data : requested ? undefined : application;
  const valid = resolved?.scoreStatus === 'calculated' && resolved.score !== null && !!resolved.matching;
  const canRecalculate = !accessDenied && applicationActionAllowed(application, 'update') && (!requested || detail.status === 'loading' || detail.status === 'ready' && !!detail.data && applicationActionAllowed(detail.data, 'update')) && hasPermission(user, 'application', 'update') && application.scoreStatus !== 'restricted';
  const recalculate = async () => {
    if (!canRecalculate || busy || requested && detail.status !== 'ready') return;
    const key = context.key; setBusy(true); setError('');
    try {
      await recalculateApplicationMatch(application.id, { expectedRevision: resolved?.revision ?? application.revision,
        ...(experience !== '' ? { relevantExperienceYears: Number(experience), reason } : {}) });
      if (context.current.current === key) onUpdated?.();
    } catch (e) { if (context.current.current === key) { if (isAxiosError(e) && [401,403,404].includes(e.response?.status || 0)) { setAccessDenied(true); onUpdated?.(); } setError(getErrorMessage(e, t('hrMatch.retryError'))); } }
    finally { if (context.current.current === key) setBusy(false); }
  };
  const open = (event: React.SyntheticEvent<HTMLDetailsElement>) => { if (event.currentTarget.open) setWanted(true); };
  const matching = resolved?.matching;
  const years = (value: unknown) => validYears(value)
    ? t('hrMatch.years', { count: value, value: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 20 }).format(value) })
    : t('cvReview.unknown');
  return <div data-application-score={application.id} data-score-status={resolved?.scoreStatus ?? (requested ? 'pending' : application.scoreStatus)} onClick={e => e.stopPropagation()}>
    <strong>{valid ? `${resolved.score}%` : t(`hrMatch.${resolved?.scoreStatus ?? (requested ? 'pending' : application.scoreStatus)}`)}</strong>
    {application.matching && <details onToggle={open}><summary>{t('hrMatch.explanation')}</summary>
      {wanted && (requested && detail.status !== 'ready' ? <HRResourceState status={detail.status} retry={detail.reload} /> : matching && <>
        {matching.version==='ats-v2'&&<p data-match-method>{t('hrMatch.deterministic')}</p>}
        <p>{t('hrMatch.coverage')}: {Math.round(matching.dataCoverage * 100)}% · {matching.version}</p>
        <p>{t('hrMatch.calculatedAt')}: {matching.calculatedAt}</p>
        {matching.criteria.map(c => <p key={c.key}>{t(`hrMatch.${c.key}`)} · {Math.round(c.weight * 100)}% · {c.key === 'experience'
          ? <>{t('hrMatch.candidateExperience', { value: years(c.known ? c.value : null) })} · {t('hrMatch.requiredExperience', { value: years(c.required) })}</>
          : c.known ? c.value ?? c.matched?.join(', ') ?? '' : t('cvReview.unknown')}
          {c.missing?.length ? ` · ${t('hrMatch.missing')}: ${c.missing.join(', ')}` : ''} · {t(`hrMatch.sources.${Object.hasOwn(evidenceSources, c.source) ? evidenceSources[c.source] : 'unknown'}`)}</p>)}
        {matching.reason && <p>{t(`hrMatch.reason.${matching.reason}`)}</p>}
      </>)}
    </details>}
    {canRecalculate && onUpdated && <details onToggle={open}><summary>{t('hrMatch.recalculate')}</summary>
      {wanted && <>
      {requested && detail.status !== 'ready' && <HRResourceState status={detail.status} retry={detail.reload} />}
      {matching?.criteria.some(c => c.key === 'experience' && !c.known) && <>
        <label>{t('hrMatch.reviewedExperience')}<input aria-label={t('hrMatch.reviewedExperience')} type="number" min="0" max="80" value={experience} onChange={e => setExperience(e.target.value)} /></label>
        <label>{t('hrMatch.reviewReason')}<input aria-label={t('hrMatch.reviewReason')} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
      </>}
      <button type="button" disabled={busy || requested && detail.status !== 'ready' || (experience !== '' && !reason.trim())} onClick={() => void recalculate()}>{t(busy ? 'hrMatch.recalculating' : 'hrMatch.recalculate')}</button>
      </>}
    </details>}
    {error && <span role="alert">{error}</span>}
  </div>;
}
const MatchScoreBadge = memo(function MatchScoreBadge(props: { application: ScoreApplication; onUpdated?: () => void }) {
  const context = useHRActionContext(props.application.id);
  return <Badge key={JSON.stringify([context.key, props.application.revision, props.application.scoreStatus, props.application.matching?.calculatedAt])} {...props} />;
});
export default MatchScoreBadge;
