import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import MatchScoreBadge from './MatchScoreBadge';
import { brandLabel } from '../Services/recruitmentCatalogService';
import type { Application, ApplicationStatus } from '../Types/recruitment';
const stages: ApplicationStatus[] = ['applied', 'screening', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'];
export default function ApplicationKanban({ applications, reload }: { applications: Application[]; reload: () => void }) {
  const { t } = useTranslation();
  return <div className="recruitment-kanban" data-application-kanban style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
    {stages.map(stage => <section key={stage} aria-label={t(`recruitment.applications.${stage}`)} style={{ minWidth: 240, flex: '1 0 240px' }}>
      <h3>{t(`recruitment.applications.${stage}`)} ({applications.filter(a => a.status === stage).length})</h3>
      {applications.filter(a => a.status === stage).map(a => <article key={a.id} className="recruitment-kanban__card">
        {a.candidateId && typeof a.candidateId === 'object' ? <Link to={`/app/recruitment/candidates/${a.candidateId.id}`}>{a.candidateId.name}</Link> : <span>{t('hrStates.restricted')}</span>}
        <p>{a.jobId && typeof a.jobId === 'object' ? `${a.jobId.position} · ${a.jobId.brandName || brandLabel(a.jobId.brandId)}` : t('hrStates.restricted')}</p>
        <MatchScoreBadge application={a} onUpdated={reload} />
      </article>)}
    </section>)}
  </div>;
}
