import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import MatchScoreBadge from './MatchScoreBadge';
import { brandLabel } from '../Services/recruitmentCatalogService';
import { applicationTransitions, localDateTime } from '../Utils/applicationWorkflow';
import type { Application, ApplicationStatus } from '../Types/recruitment';
import { boardStages, applicationLane, type BoardStage, type BoardColumn } from '../Services/hrBoardService';
import type { ApplicationPlacement } from '../Services/applicationsService';
const stages = boardStages;
export default function ApplicationKanban({ applications, reload, canChangeStatus = false, pendingIds = [], onStatusChange, manualOrder = false, pages = {}, laneState = {}, onPage }: {
  applications: Application[]; reload: () => void; canChangeStatus?: boolean; pendingIds?: string[];
  onStatusChange?: (id: string, status: ApplicationStatus, placement?: ApplicationPlacement, ordered?: Application[]) => Promise<void>;
  manualOrder?: boolean; pages?: Partial<Record<BoardStage, BoardColumn>>; laneState?: Partial<Record<BoardStage, { loading?: boolean; error?: boolean }>>;
  onPage?: (stage: BoardStage, delta: -1 | 1) => void;
}) {
  const { t } = useTranslation();
  const columns = useMemo(() => {
    const result = { applied: [], processing: [], screening: [], shortlisted: [], interview: [], offered: [], hired: [], rejected: [] } as Record<(typeof stages)[number], Application[]>;
    for (const app of applications) result[applicationLane(app)].push(app);
    return result;
  }, [applications]);
  const dropped = async ({ destination, source, draggableId }: DropResult) => {
    if (!destination || !canChangeStatus || !onStatusChange || destination.droppableId === 'processing' || source.droppableId === destination.droppableId && (!manualOrder || source.index === destination.index)) return;
    const app = applications.find(a => a.id === draggableId), status = destination.droppableId as ApplicationStatus;
    if (!app || pendingIds.includes(app.id) || status !== app.status && !applicationTransitions[app.status].includes(status)) return;
    if (!manualOrder) { await onStatusChange(app.id, status); return; }
    const destinationCards = columns[status].filter(row => row.id !== app.id), index = Math.min(destination.index, destinationCards.length);
    const anchor = (row: Application | undefined) => row ? { id: row.id, expectedRevision: row.revision || 0 } : null;
    const placement = { before: anchor(destinationCards[index - 1]) || pages[status]?.before || null, after: anchor(destinationCards[index]) || pages[status]?.after || null };
    destinationCards.splice(index, 0, { ...app, status });
    const ordered = stages.flatMap(stage => stage === status ? destinationCards : columns[stage].filter(row => row.id !== app.id));
    await onStatusChange(app.id, status, placement, ordered);
  };
  return <DragDropContext onDragEnd={result => { void dropped(result); }}><div className="hr-application-board" data-application-kanban role="region" aria-label={t('hrMatch.board')} tabIndex={0}>
    {stages.map(stage => <Droppable key={stage} droppableId={stage} isDropDisabled={stage === 'processing' || !canChangeStatus}>
      {provided => <section ref={provided.innerRef} {...provided.droppableProps} data-board-lane={stage} aria-busy={laneState[stage]?.loading || undefined} aria-label={t(stage === 'processing' ? 'hrWorkflow.processing' : `recruitment.applications.${stage}`)}>
        <h3><span>{t(stage === 'processing' ? 'hrWorkflow.processing' : `recruitment.applications.${stage}`)}</span><span className="hr-lane-count">{pages[stage]?.total ?? columns[stage].length}</span></h3>
        {laneState[stage]?.error && <p role="alert">{t('hrBoard.changed')} <button type="button" onClick={reload}>{t('hrStates.retry')}</button></p>}
        {!columns[stage].length && <p>{t('hrBoard.empty')}</p>}
        {columns[stage].map((a, index) => <Draggable key={a.id} draggableId={a.id} index={index} isDragDisabled={!canChangeStatus || !!pendingIds.length || !!laneState[stage]?.loading || !(manualOrder && stage !== 'processing') && !applicationTransitions[a.status].length}>
          {drag => <article ref={drag.innerRef} {...drag.draggableProps} style={drag.draggableProps.style} className="recruitment-kanban__card" data-application-card={a.id}>
            <div className="hr-board-card-title" {...drag.dragHandleProps} aria-label={`${t('hrWorkflow.move')} ${a.candidateId && typeof a.candidateId === 'object' ? a.candidateId.name : t('hrStates.restricted')}`}>
              {a.candidateId && typeof a.candidateId === 'object' ? a.candidateId.name : t('hrStates.restricted')}
            </div>
            <p className="hr-board-card-job">{a.jobId && typeof a.jobId === 'object' ? `${a.jobId.position} · ${a.jobId.brandName || brandLabel(a.jobId.brandId)}` : t('hrStates.restricted')}</p>
            {a.processingState !== 'idle' && <p className="hr-board-card-state">{t(`hrWorkflow.processingState.${a.processingState}`)}</p>}
            {a.interview && <p className="hr-board-card-interview">{localDateTime(a.interview.startsAt, a.interview.timezone).replace('T', ' ') || t('cvReview.unknown')} · {a.interview.timezone}</p>}
            <div className="hr-board-card-actions">
              <MatchScoreBadge application={a} onUpdated={reload} />
              <Link to={`/app/recruitment/applications/${a.id}`}>{t('hrWorkflow.details')}</Link>
            </div>
          </article>}
        </Draggable>)}
        {provided.placeholder}
        {pages[stage] && <nav aria-label={t('hrBoard.pages', { stage: t(stage === 'processing' ? 'hrWorkflow.processing' : `recruitment.applications.${stage}`) })}>
          <button type="button" disabled={pages[stage]!.page <= 1 || !!pendingIds.length || !!laneState[stage]?.loading} onClick={() => onPage?.(stage, -1)}>{t('hrBoard.previous')}</button>
          <span aria-live="polite">{t('hrBoard.page', { page: pages[stage]!.page })}</span>
          <button type="button" disabled={!pages[stage]!.hasMore || !!pendingIds.length || !!laneState[stage]?.loading} onClick={() => onPage?.(stage, 1)}>{t('hrBoard.next')}</button>
        </nav>}
      </section>}
    </Droppable>)}
  </div></DragDropContext>;
}
