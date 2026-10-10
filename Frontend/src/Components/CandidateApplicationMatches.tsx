import { useTranslation } from 'react-i18next';
import { useAuditResource } from '../Hooks/useAuditResource';
import { useAuth } from '../Context/useAuth';
import { hasPermission } from '../Utils/permissions';
import { getApplications } from '../Services/applicationsService';
import MatchScoreBadge from './MatchScoreBadge';
import HRResourceState from './HRResourceState';
const load = async (id: string, signal?: AbortSignal, scopeKey?: string) => (await getApplications(signal, scopeKey)).filter(a => (typeof a.candidateId === 'string' ? a.candidateId : a.candidateId?.id) === id);
function Matches({ candidateId }: { candidateId: string }) {
  const { t } = useTranslation(); const result = useAuditResource(candidateId, 'application', load);
  return <section data-candidate-matches><h3>{t('hrMatch.applications')}</h3>
    {result.status !== 'ready' ? <HRResourceState status={result.status} retry={result.reload} /> : result.data?.length ? result.data.map(a => <article key={a.id}>
      <p>{typeof a.jobId === 'object' && a.jobId ? a.jobId.position : t('hrStates.restricted')}</p>
      <MatchScoreBadge application={a} onUpdated={result.reload} />
    </article>) : <p>{t('hrMatch.empty')}</p>}
  </section>;
}
export default function CandidateApplicationMatches(props: { candidateId: string }) {
  const { user } = useAuth(); return hasPermission(user, 'application', 'read') ? <Matches {...props} /> : null;
}
