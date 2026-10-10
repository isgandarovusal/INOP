import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/useAuth';
import { useMounted } from '../Hooks/useMounted';
import { hasPermission } from '../Utils/permissions';
import { getErrorMessage } from '../Utils/getErrorMessage';
import { recalculateApplicationMatch } from '../Services/applicationsService';
import type { Application } from '../Types/recruitment';

export default function MatchScoreBadge({ application, onUpdated }: { application: Application; onUpdated?: () => void }) {
  const { t } = useTranslation(); const { user } = useAuth(); const mounted = useMounted();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [experience, setExperience] = useState(''), [reason, setReason] = useState('');
  const valid = application.scoreStatus === 'calculated' && application.score !== null && !!application.matching;
  const canRecalculate = hasPermission(user, 'application', 'update') && application.scoreStatus !== 'restricted';
  const recalculate = async () => {
    if (busy) return; setBusy(true); setError('');
    try {
      await recalculateApplicationMatch(application.id, { expectedRevision: application.revision,
        ...(experience !== '' ? { relevantExperienceYears: Number(experience), reason } : {}) });
      if (mounted.current) onUpdated?.();
    } catch (e) { if (mounted.current) setError(getErrorMessage(e, t('hrMatch.retryError'))); }
    finally { if (mounted.current) setBusy(false); }
  };
  return <div data-application-score={application.id} data-score-status={application.scoreStatus} onClick={e => e.stopPropagation()}>
    <strong>{valid ? `${application.score}%` : t(`hrMatch.${application.scoreStatus}`)}</strong>
    {application.matching && <details><summary>{t('hrMatch.explanation')}</summary>
      <p>{t('hrMatch.coverage')}: {Math.round(application.matching.dataCoverage * 100)}% · {application.matching.version}</p>
      <p>{t('hrMatch.calculatedAt')}: {application.matching.calculatedAt}</p>
      {application.matching.criteria.map(c => <p key={c.key}>{t(`hrMatch.${c.key}`)} · {Math.round(c.weight * 100)}% · {c.known ? c.value ?? c.matched?.join(', ') ?? '' : t('cvReview.unknown')}
        {c.missing?.length ? ` · ${t('hrMatch.missing')}: ${c.missing.join(', ')}` : ''} · {c.source}</p>)}
      {application.matching.reason && <p>{t(`hrMatch.reason.${application.matching.reason}`)}</p>}
    </details>}
    {canRecalculate && onUpdated && <details><summary>{t('hrMatch.recalculate')}</summary>
      {application.matching?.criteria.some(c => c.key === 'experience' && !c.known) && <>
        <label>{t('hrMatch.reviewedExperience')}<input aria-label={t('hrMatch.reviewedExperience')} type="number" min="0" max="80" value={experience} onChange={e => setExperience(e.target.value)} /></label>
        <label>{t('hrMatch.reviewReason')}<input aria-label={t('hrMatch.reviewReason')} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
      </>}
      <button type="button" disabled={busy || (experience !== '' && !reason.trim())} onClick={() => void recalculate()}>{t(busy ? 'hrMatch.recalculating' : 'hrMatch.recalculate')}</button>
    </details>}
    {error && <span role="alert">{error}</span>}
  </div>;
}
