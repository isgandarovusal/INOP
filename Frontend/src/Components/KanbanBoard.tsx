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
          style={{
            userSelect: "none",
            padding: "12px",
            margin: "0 0 8px 0",
            backgroundColor: "#fff",
            borderRadius: "6px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            ...provided.draggableProps.style,
          }}
        >
          <strong
            style={{
              display: "block",
              color: "#111827",
            }}
          >
            {candidate.name}
          </strong>

          <span
            style={{
              fontSize: "13px",
              color: "#6b7280",
            }}
          >
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
    <div
      style={{
        display: "flex",
        gap: "16px",
        padding: "10px 0",
        overflowX: "auto",
      }}
    >
      <DragDropContext onDragEnd={handleOnDragEnd}>
        {COLUMNS.map((status) => {
          const columnCandidates = candidatesByStatus[status];

          return (
            <div
              key={status}
              style={{
                flex: "1",
                minWidth: "260px",
                backgroundColor: "#f4f5f7",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <h3
                style={{
                  fontSize: "16px",
                  marginBottom: "12px",
                  color: "#374151",
                }}
              >
                {columnTitle(status)} ({columnCandidates.length})
              </h3>

              <Droppable droppableId={status}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{ minHeight: "300px" }}
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
            </div>
          );
        })}
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;
