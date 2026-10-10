import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import MatchScoreBadge from './MatchScoreBadge';
import { brandLabel } from '../Services/recruitmentCatalogService';
import { applicationTransitions, localDateTime } from '../Utils/applicationWorkflow';
import type { Application, ApplicationStatus } from '../Types/recruitment';
const stages: (ApplicationStatus | 'processing')[] = ['applied', 'processing', 'screening', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'];
export default function ApplicationKanban({ applications, reload, canChangeStatus = false, pendingIds = [], onStatusChange }: {
  applications: Application[]; reload: () => void; canChangeStatus?: boolean; pendingIds?: string[];
  onStatusChange?: (id: string, status: ApplicationStatus) => Promise<void>;
}) {
  const { t } = useTranslation();
  const columns = useMemo(() => {
    const result = { applied: [], processing: [], screening: [], shortlisted: [], interview: [], offered: [], hired: [], rejected: [] } as Record<(typeof stages)[number], Application[]>;
    for (const app of applications) result[app.status === 'applied' && ['queued', 'running'].includes(app.processingState || '') ? 'processing' : app.status].push(app);
    return result;
  }, [applications]);
  const dropped = async ({ destination, source, draggableId }: DropResult) => {
    if (!destination || !canChangeStatus || !onStatusChange || destination.droppableId === 'processing' || source.droppableId === destination.droppableId) return;
    const app = applications.find(a => a.id === draggableId), status = destination.droppableId as ApplicationStatus;
    if (!app || pendingIds.includes(app.id) || !applicationTransitions[app.status].includes(status)) return;
    await onStatusChange(app.id, status);
  };
  return <DragDropContext onDragEnd={result => { void dropped(result); }}><div className="hr-application-board" data-application-kanban>
    {stages.map(stage => <Droppable key={stage} droppableId={stage} isDropDisabled={stage === 'processing' || !canChangeStatus}>
      {provided => <section ref={provided.innerRef} {...provided.droppableProps} aria-label={t(stage === 'processing' ? 'hrWorkflow.processing' : `recruitment.applications.${stage}`)}>
        <h3>{t(stage === 'processing' ? 'hrWorkflow.processing' : `recruitment.applications.${stage}`)} ({columns[stage].length})</h3>
        {columns[stage].map((a, index) => <Draggable key={a.id} draggableId={a.id} index={index} isDragDisabled={!canChangeStatus || pendingIds.includes(a.id) || !applicationTransitions[a.status].length}>
          {drag => <article ref={drag.innerRef} {...drag.draggableProps} style={drag.draggableProps.style} className="recruitment-kanban__card" data-application-card={a.id}>
            <div {...drag.dragHandleProps} aria-label={`${t('hrWorkflow.move')} ${a.candidateId && typeof a.candidateId === 'object' ? a.candidateId.name : t('hrStates.restricted')}`}>
              {a.candidateId && typeof a.candidateId === 'object' ? a.candidateId.name : t('hrStates.restricted')}
            </div>
            <p>{a.jobId && typeof a.jobId === 'object' ? `${a.jobId.position} · ${a.jobId.brandName || brandLabel(a.jobId.brandId)}` : t('hrStates.restricted')}</p>
            {a.processingState !== 'idle' && <p>{t(`hrWorkflow.processingState.${a.processingState}`)}</p>}
            {a.interview && <p>{localDateTime(a.interview.startsAt, a.interview.timezone).replace('T', ' ') || t('cvReview.unknown')} · {a.interview.timezone}</p>}
            <MatchScoreBadge application={a} onUpdated={reload} />
            <Link to={`/app/recruitment/applications/${a.id}`}>{t('hrWorkflow.details')}</Link>
          </article>}
        </Draggable>)}
        {provided.placeholder}
      </section>}
    </Droppable>)}
  </div></DragDropContext>;
}
