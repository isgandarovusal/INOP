import { useTranslation } from 'react-i18next';
import { useHRPage } from '../Hooks/useHRPage';
import HRPageControls from './HRPageControls';
import { useAuth } from '../Context/useAuth';
import { hasPermission } from '../Utils/permissions';
import { getApplicationPage } from '../Services/hrPageService';
import MatchScoreBadge from './MatchScoreBadge';
import HRResourceState from './HRResourceState';
function Matches({ candidateId }: { candidateId: string }) {
  const { t } = useTranslation(); const result = useHRPage('application', { candidateId }, getApplicationPage);
  return <section data-candidate-matches><h3>{t('hrMatch.applications')}</h3>
    {result.status !== 'ready' ? <HRResourceState status={result.status} retry={result.reload} /> : result.data?.items.length ? result.data.items.map(a => <article key={a.id}>
      <p>{typeof a.jobId === 'object' && a.jobId ? a.jobId.position : t('hrStates.restricted')}</p>
      <MatchScoreBadge application={a} onUpdated={result.reload} />
    </article>) : <p>{t('hrMatch.empty')}</p>}
    <HRPageControls data={result.data} page={result.page} onPage={result.setPage} disabled={result.status !== 'ready'} />
  </section>;
}
export default function CandidateApplicationMatches(props: { candidateId: string }) {
  const { user } = useAuth(); return hasPermission(user, 'application', 'read') ? <Matches {...props} /> : null;
}
