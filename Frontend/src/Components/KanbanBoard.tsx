import React, { useCallback, useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useTranslation } from "react-i18next";
import type {
  Candidate,
  CandidateStatus,
} from "../Types/recruitment";

interface KanbanBoardProps {
  candidates: Candidate[];
  onStatusChange: (
    candidateId: string,
    newStatus: CandidateStatus,
  ) => Promise<void>;
  canChangeStatus?: boolean;
}

interface KanbanCandidateCardProps {
  candidate: Candidate;
  index: number;
  canChangeStatus: boolean;
  yearsExperienceLabel: string;
}

const KanbanCandidateCard = React.memo(
  ({
    candidate,
    index,
    canChangeStatus,
    yearsExperienceLabel,
  }: KanbanCandidateCardProps) => (
    <Draggable
      key={candidate.id}
      draggableId={
        candidate.id ||
        candidate._id ||
        `${candidate.name}-${index}`
      }
      index={index}
      isDragDisabled={!canChangeStatus}
    >
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="recruitment-kanban__card"
          style={provided.draggableProps.style}
        >
          <strong className="recruitment-kanban__name">
            {candidate.name}
          </strong>

          <span className="recruitment-kanban__meta">
            {candidate.experience} {yearsExperienceLabel}
          </span>
        </div>
      )}
    </Draggable>
  ),
);

KanbanCandidateCard.displayName = "KanbanCandidateCard";

const COLUMNS: CandidateStatus[] = [
  "new",
  "applied",
  "screening",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  candidates,
  onStatusChange,
  canChangeStatus = true,
}) => {
  const { t } = useTranslation();

  const columnTitle = (status: CandidateStatus) =>
    t(`components.kanban.${status}`);

  const candidatesByStatus = useMemo(
    () =>
      candidates.reduce<Record<CandidateStatus, Candidate[]>>(
        (columns, candidate) => {
          const status = candidate.status;

          if (columns[status]) {
            columns[status].push(candidate);
          }

          return columns;
        },
        {
          new: [],
          applied: [],
          screening: [],
          shortlisted: [],
          interview: [],
          offer: [],
          hired: [],
          rejected: [],
        },
      ),
    [candidates],
  );

  const handleOnDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result;

      if (!destination || !canChangeStatus) return;

      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      const newStatus = destination.droppableId as CandidateStatus;

      await onStatusChange(draggableId, newStatus);
    },
    [canChangeStatus, onStatusChange],
  );

  const yearsExperienceLabel = t("components.kanban.yearsExperience");

  return (
    <div className="recruitment-kanban">
      <DragDropContext onDragEnd={handleOnDragEnd}>
        {COLUMNS.map((status) => {
          const columnCandidates = candidatesByStatus[status];

          return (
            <section
              key={status}
              className={`recruitment-kanban__column recruitment-kanban__column--${status}`}
            >
              <header className="recruitment-kanban__header">
                <h3 className="recruitment-kanban__title">
                  {columnTitle(status)}
                </h3>
                <span className="recruitment-kanban__count">
                  {columnCandidates.length}
                </span>
              </header>

              <Droppable droppableId={status}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="recruitment-kanban__dropzone"
                  >
                    {columnCandidates.map((candidate, index) => (
                      <KanbanCandidateCard
                        key={candidate.id || candidate._id || `${candidate.name}-${index}`}
                        candidate={candidate}
                        index={index}
                        canChangeStatus={canChangeStatus}
                        yearsExperienceLabel={yearsExperienceLabel}
                      />
                    ))}

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </section>
          );
        })}
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;
