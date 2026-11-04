import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useHRPage } from '../Hooks/useHRPage';
import HRPageControls from './HRPageControls';
import { useAuth } from '../Context/useAuth';
import { hasPermission } from '../Utils/permissions';
import { getApplicationPage } from '../Services/hrPageService';
import MatchScoreBadge from './MatchScoreBadge';
import HRResourceState from './HRResourceState';
import Badge from './Badge';
function Matches({ candidateId }: { candidateId: string }) {
  const { t } = useTranslation(); const result = useHRPage('application', { candidateId }, getApplicationPage);
  return <section data-candidate-matches><h3>{t('hrMatch.applications')}</h3>
    {result.status !== 'ready' ? <HRResourceState status={result.status} retry={result.reload} /> : result.data?.items.length ? result.data.items.map(a => <article key={a.id}>
      <p>{typeof a.jobId === 'object' && a.jobId ? a.jobId.position : t('hrStates.restricted')}</p>
      <p data-application-stage={a.id}><strong>{t('hrMatch.applicationStage')}: </strong><Badge>{a.statusKnown === true && ['applied', 'screening', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'].includes(a.status) ? t(`recruitment.applications.${a.status}`) : t('hrHistory.unavailable')}</Badge></p>
      <MatchScoreBadge application={a} onUpdated={result.reload} />
      {!result.refreshing && /^[a-f0-9]{24}$/i.test(a.id) && <Link data-candidate-application-link aria-label={`${t('hrWorkflow.details')} · ${typeof a.jobId === 'object' && a.jobId ? a.jobId.position : a.id}`} to={`/app/recruitment/applications/${a.id}`}>{t('hrWorkflow.details')}</Link>}
    </article>) : <p>{t('hrMatch.empty')}</p>}
    <HRPageControls data={result.data} page={result.page} onPage={result.setPage} disabled={result.status !== 'ready'} />
  </section>;
}
export default function CandidateApplicationMatches(props: { candidateId: string }) {
  const { user } = useAuth(); return hasPermission(user, 'application', 'read') ? <Matches {...props} /> : null;
}
